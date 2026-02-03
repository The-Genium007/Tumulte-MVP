import DiceRoll from '#models/dice_roll'
import Character from '#models/character'
import { campaign as Campaign } from '#models/campaign'
import CharacterAssignment from '#models/character_assignment'
import { streamer as Streamer } from '#models/streamer'
import transmit from '@adonisjs/transmit/services/main'

interface CreateDiceRollData {
  campaignId: string
  characterId: string | null // Nullable for pending GM rolls
  vttRollId: string | null
  rollFormula: string
  result: number
  diceResults: number[]
  isCritical: boolean
  criticalType: 'success' | 'failure' | null
  isHidden: boolean
  rollType: string | null
  vttData: object | null
  // Enriched flavor data
  skill: string | null
  skillRaw: string | null
  ability: string | null
  abilityRaw: string | null
  modifiers: string[] | null
  // GM attribution
  pendingAttribution?: boolean
}

export default class DiceRollService {
  /**
   * Enregistre un dice roll et émet les événements WebSocket appropriés
   */
  async recordDiceRoll(data: CreateDiceRollData): Promise<DiceRoll> {
    // 1. Créer le dice roll en base
    const diceRoll = await DiceRoll.create({
      campaignId: data.campaignId,
      characterId: data.characterId,
      vttRollId: data.vttRollId,
      rollFormula: data.rollFormula,
      result: data.result,
      diceResults: data.diceResults,
      isCritical: data.isCritical,
      criticalType: data.criticalType,
      isHidden: data.isHidden,
      rollType: data.rollType,
      vttData: data.vttData,
      // Enriched flavor data
      skill: data.skill,
      skillRaw: data.skillRaw,
      ability: data.ability,
      abilityRaw: data.abilityRaw,
      modifiers: data.modifiers,
      // GM attribution
      pendingAttribution: data.pendingAttribution ?? false,
    })

    // 2. Charger les relations nécessaires (only if character exists)
    if (data.characterId) {
      await diceRoll.load('character')
    }
    await diceRoll.load('campaign')

    // 3. Émettre les événements WebSocket (only if not pending)
    if (!data.pendingAttribution) {
      await this.emitDiceRollEvents(diceRoll)
    }

    return diceRoll
  }

  /**
   * Émet les événements WebSocket pour le dice roll
   * - Event global vers le channel de campagne
   * - Events spécifiques vers les channels des streamers assignés
   *
   * Note: Pour les rolls avec pendingAttribution=true ou sans personnage,
   * cette méthode ne devrait pas être appelée (vérifiée en amont).
   */
  private async emitDiceRollEvents(diceRoll: DiceRoll): Promise<void> {
    const character = diceRoll.character
    const campaign = diceRoll.campaign

    // Guard: Si pas de personnage, on ne peut pas émettre les événements standards
    // (Les rolls sans personnage sont soit pending, soit ignorés)
    if (!character) {
      // Émettre uniquement l'event global sans données personnage
      transmit.broadcast(`campaign/${campaign.id}/dice-rolls`, {
        event: 'dice-roll:new',
        data: {
          id: diceRoll.id,
          campaignId: campaign.id,
          characterId: null,
          characterName: 'Inconnu',
          characterAvatar: null,
          rollFormula: diceRoll.rollFormula,
          result: diceRoll.result,
          diceResults: diceRoll.diceResults,
          isCritical: diceRoll.isCritical,
          criticalType: diceRoll.criticalType,
          isHidden: diceRoll.isHidden,
          rollType: diceRoll.rollType,
          rolledAt: diceRoll.rolledAt.toISO(),
          skill: diceRoll.skill,
          skillRaw: diceRoll.skillRaw,
          ability: diceRoll.ability,
          abilityRaw: diceRoll.abilityRaw,
          modifiers: diceRoll.modifiers,
        },
      })
      return
    }

    // Préparer le payload de base
    const basePayload = {
      id: diceRoll.id,
      campaignId: campaign.id,
      characterId: character.id,
      characterName: character.name,
      characterAvatar: character.avatarUrl,
      rollFormula: diceRoll.rollFormula,
      result: diceRoll.result,
      diceResults: diceRoll.diceResults,
      isCritical: diceRoll.isCritical,
      criticalType: diceRoll.criticalType,
      isHidden: diceRoll.isHidden,
      rollType: diceRoll.rollType,
      rolledAt: diceRoll.rolledAt.toISO(),
      // Enriched flavor data
      skill: diceRoll.skill,
      skillRaw: diceRoll.skillRaw,
      ability: diceRoll.ability,
      abilityRaw: diceRoll.abilityRaw,
      modifiers: diceRoll.modifiers,
    }

    // 1. Event global vers le channel de campagne (pour le GM)
    transmit.broadcast(`campaign/${campaign.id}/dice-rolls`, {
      event: 'dice-roll:new',
      data: basePayload,
    })

    // 2. Events spécifiques pour les streamers
    // Si le roll est critique OU non-caché, notifier les streamers
    if (diceRoll.isCritical || !diceRoll.isHidden) {
      await this.notifyStreamers(campaign, character, diceRoll, basePayload)
    }
  }

  /**
   * Notifie les streamers concernés par ce dice roll
   * - Le streamer assigné au personnage (s'il y en a un)
   * - Le streamer du GM si c'est son personnage incarné (gmActiveCharacterId)
   * - Tous les streamers de la campagne si le roll est critique
   */
  private async notifyStreamers(
    campaign: Campaign,
    character: Character,
    diceRoll: DiceRoll,
    basePayload: Record<string, unknown>
  ): Promise<void> {
    // Trouver l'assignment du personnage (si existe)
    const characterAssignment = await CharacterAssignment.query()
      .where('character_id', character.id)
      .where('campaign_id', campaign.id)
      .first()

    // Vérifier si c'est le personnage incarné par le GM
    const isGmIncarnatedCharacter = campaign.gmActiveCharacterId === character.id

    // Trouver le streamer du GM (owner de la campagne) si nécessaire
    let gmStreamer: Streamer | null = null
    if (isGmIncarnatedCharacter) {
      gmStreamer = await Streamer.query().where('user_id', campaign.ownerId).first()
    }

    // Si roll critique, notifier TOUS les streamers de la campagne
    if (diceRoll.isCritical) {
      const allAssignments = await CharacterAssignment.query()
        .where('campaign_id', campaign.id)
        .preload('streamer')

      const notifiedStreamerIds = new Set<string>()

      for (const assignment of allAssignments) {
        notifiedStreamerIds.add(assignment.streamerId)
        // Use same channel as polls (streamer:${id}:polls) so overlay receives it
        transmit.broadcast(`streamer:${assignment.streamerId}:polls`, {
          event: 'dice-roll:critical',
          data: {
            ...basePayload,
            // Masquer les détails si le streamer n'est pas le propriétaire du perso
            isOwnCharacter: characterAssignment?.streamerId === assignment.streamerId,
          },
        })
      }

      // Notifier aussi le GM s'il n'a pas déjà été notifié via un assignment
      if (gmStreamer && !notifiedStreamerIds.has(gmStreamer.id)) {
        transmit.broadcast(`streamer:${gmStreamer.id}:polls`, {
          event: 'dice-roll:critical',
          data: {
            ...basePayload,
            isOwnCharacter: isGmIncarnatedCharacter,
          },
        })
      }
    } else if (characterAssignment) {
      // Notifier le streamer assigné au personnage (joueur)
      // Use same channel as polls (streamer:${id}:polls) so overlay receives it
      transmit.broadcast(`streamer:${characterAssignment.streamerId}:polls`, {
        event: 'dice-roll:new',
        data: {
          ...basePayload,
          isOwnCharacter: true,
        },
      })
    } else if (gmStreamer) {
      // Notifier le GM si c'est son personnage incarné
      transmit.broadcast(`streamer:${gmStreamer.id}:polls`, {
        event: 'dice-roll:new',
        data: {
          ...basePayload,
          isOwnCharacter: true,
        },
      })
    }
  }

  /**
   * Récupère l'historique des dice rolls d'une campagne
   * @param campaignId - ID de la campagne
   * @param limit - Nombre de rolls à récupérer (défaut: 50)
   * @param includeHidden - Inclure les rolls cachés (défaut: false)
   */
  async getCampaignRollHistory(
    campaignId: string,
    limit: number = 50,
    includeHidden: boolean = false
  ): Promise<DiceRoll[]> {
    const query = DiceRoll.query()
      .where('campaign_id', campaignId)
      .preload('character')
      .orderBy('rolled_at', 'desc')
      .limit(limit)

    if (!includeHidden) {
      query.where('is_hidden', false)
    }

    return query
  }

  /**
   * Récupère l'historique des dice rolls d'un personnage
   */
  async getCharacterRollHistory(characterId: string, limit: number = 50): Promise<DiceRoll[]> {
    return DiceRoll.query()
      .where('character_id', characterId)
      .orderBy('rolled_at', 'desc')
      .limit(limit)
  }

  /**
   * Récupère les statistiques de rolls d'un personnage
   */
  async getCharacterRollStats(characterId: string): Promise<{
    totalRolls: number
    criticalSuccesses: number
    criticalFailures: number
    averageRoll: number
  }> {
    const rolls = await DiceRoll.query().where('character_id', characterId)

    const totalRolls = rolls.length
    const criticalSuccesses = rolls.filter(
      (r) => r.isCritical && r.criticalType === 'success'
    ).length
    const criticalFailures = rolls.filter(
      (r) => r.isCritical && r.criticalType === 'failure'
    ).length

    const averageRoll =
      totalRolls > 0 ? rolls.reduce((sum, r) => sum + r.result, 0) / totalRolls : 0

    return {
      totalRolls,
      criticalSuccesses,
      criticalFailures,
      averageRoll: Math.round(averageRoll * 100) / 100, // Arrondir à 2 décimales
    }
  }
}
