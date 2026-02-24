import { DateTime } from 'luxon'
import VttConnection from '#models/vtt_connection'
import { campaign as Campaign } from '#models/campaign'
import Character, { type SpellInfo, type FeatureInfo } from '#models/character'
import CharacterAssignment from '#models/character_assignment'
import { streamer as Streamer } from '#models/streamer'
import DiceRoll from '#models/dice_roll'
import DiceRollService from '#services/vtt/dice_roll_service'
import { SystemPresetService } from '#services/campaigns/system_preset_service'
import type { GamificationService } from '#services/gamification/gamification_service'
import type { DiceRollData } from '#services/gamification/trigger_evaluator'
import logger from '@adonisjs/core/services/logger'

interface DiceRollPayload {
  campaignId: string // VTT campaign ID
  characterId: string // VTT character ID
  characterName: string
  rollId?: string
  rollFormula: string
  result: number
  diceResults: number[]
  isCritical: boolean
  criticalType?: 'success' | 'failure' | null
  isHidden?: boolean
  rollType?: string | null
  metadata?: Record<string, unknown>
  // Enriched flavor data from FlavorParser
  skill?: string | null
  skillRaw?: string | null
  ability?: string | null
  abilityRaw?: string | null
  modifiers?: string[] | null
  // Criticality enrichment V2
  severity?: 'minor' | 'major' | 'extreme' | null
  criticalLabel?: string | null
  criticalCategory?: string | null
}

export default class VttWebhookService {
  private gamificationService: GamificationService | null

  constructor(gamificationService?: GamificationService | null) {
    this.gamificationService = gamificationService ?? null
  }

  /**
   * Traite un événement de dice roll provenant d'un VTT
   *
   * Logic for GM rolls:
   * 1. If the character from VTT belongs to a player (has CharacterAssignment) → use that character
   * 2. If no player assignment (GM rolling as NPC or unassigned character):
   *    a. If GM has an active character set → use that character
   *    b. If no active character → create pending roll for manual attribution
   */
  async processDiceRoll(
    vttConnection: VttConnection,
    payload: DiceRollPayload
  ): Promise<{ diceRoll: DiceRoll; pendingAttribution: boolean }> {
    // 1. Trouver la campagne Tumulte correspondante
    const campaign = await Campaign.query()
      .where('vtt_connection_id', vttConnection.id)
      .where('vtt_campaign_id', payload.campaignId)
      .firstOrFail()

    // 1b. Detect game system from metadata (lazy detection on first dice roll)
    const metadataSystem = payload.metadata?.system as string | undefined
    if (metadataSystem && campaign.gameSystemId !== metadataSystem) {
      await this.detectAndApplySystem(campaign, metadataSystem)
    }

    // 2. Trouver ou créer le personnage from VTT
    const vttCharacter = await this.findOrCreateCharacter(campaign, payload)

    // 3. Vérifier si le roll existe déjà (déduplication)
    if (payload.rollId) {
      const existingRoll = await DiceRoll.query()
        .where('campaign_id', campaign.id)
        .where('vtt_roll_id', payload.rollId)
        .first()

      if (existingRoll) {
        // Roll déjà traité, retourner l'existant
        return { diceRoll: existingRoll, pendingAttribution: existingRoll.pendingAttribution }
      }
    }

    // 4. Determine which character to attribute this roll to
    const {
      characterId,
      vttCharacterId: resolvedVttCharacterId,
      pendingAttribution,
      streamerId,
      streamerName,
      resolvedCharacterName,
    } = await this.resolveCharacterForRoll(campaign, vttCharacter)

    // 5. Créer le dice roll via le service
    const diceRollService = new DiceRollService()
    const diceRoll = await diceRollService.recordDiceRoll({
      campaignId: campaign.id,
      characterId,
      vttRollId: payload.rollId || null,
      rollFormula: payload.rollFormula,
      result: payload.result,
      diceResults: payload.diceResults,
      isCritical: payload.isCritical,
      criticalType: payload.criticalType || null,
      isHidden: payload.isHidden || false,
      rollType: payload.rollType || null,
      vttData: payload.metadata || null,
      // Enriched flavor data from FlavorParser
      skill: payload.skill || null,
      skillRaw: payload.skillRaw || null,
      ability: payload.ability || null,
      abilityRaw: payload.abilityRaw || null,
      modifiers: payload.modifiers || null,
      // Criticality enrichment V2 (fallback for older Foundry modules)
      severity: payload.severity || (payload.isCritical ? 'major' : null),
      criticalLabel:
        payload.criticalLabel ||
        (payload.isCritical && payload.criticalType === 'success'
          ? 'Critical Success'
          : payload.isCritical && payload.criticalType === 'failure'
            ? 'Critical Failure'
            : null),
      criticalCategory:
        payload.criticalCategory ||
        (payload.isCritical && payload.criticalType === 'success'
          ? 'generic_success'
          : payload.isCritical && payload.criticalType === 'failure'
            ? 'generic_failure'
            : null),
      pendingAttribution,
    })

    // 6. Notify gamification system (non-blocking — dice roll is already saved)
    if (this.gamificationService && !pendingAttribution && streamerId) {
      const diceRollData: DiceRollData = {
        rollId: diceRoll.id,
        characterId,
        vttCharacterId: resolvedVttCharacterId,
        characterName: resolvedCharacterName ?? vttCharacter.name,
        formula: payload.rollFormula,
        result: payload.result,
        diceResults: payload.diceResults,
        isCritical: payload.isCritical,
        criticalType: payload.criticalType ?? null,
        // Criticality enrichment V2
        severity: diceRoll.severity ?? null,
        criticalLabel: diceRoll.criticalLabel ?? null,
        criticalCategory: diceRoll.criticalCategory ?? null,
      }

      try {
        await this.gamificationService.onDiceRoll(
          campaign.id,
          streamerId,
          streamerName ?? 'Unknown',
          0,
          diceRollData
        )
      } catch (error) {
        logger.error(
          {
            event: 'gamification_on_dice_roll_error',
            campaignId: campaign.id,
            rollId: diceRoll.id,
            error: (error as Error).message,
          },
          'Failed to process gamification on dice roll (non-fatal)'
        )
      }
    }

    return { diceRoll, pendingAttribution }
  }

  /**
   * Resolve which character a dice roll should be attributed to
   *
   * @returns characterId, pendingAttribution flag, streamerId/streamerName, and resolvedCharacterName
   */
  private async resolveCharacterForRoll(
    campaign: Campaign,
    vttCharacter: Character
  ): Promise<{
    characterId: string | null
    vttCharacterId: string | null
    pendingAttribution: boolean
    streamerId: string | null
    streamerName: string | null
    resolvedCharacterName: string | null
  }> {
    // Check if this character is assigned to a player (streamer)
    const playerAssignment = await CharacterAssignment.query()
      .where('character_id', vttCharacter.id)
      .where('campaign_id', campaign.id)
      .preload('streamer')
      .first()

    if (playerAssignment) {
      // This is a player's character - attribute to them
      logger.debug('Roll attributed to player character', {
        characterId: vttCharacter.id,
        vttCharacterId: vttCharacter.vttCharacterId,
        characterName: vttCharacter.name,
      })
      return {
        characterId: vttCharacter.id,
        vttCharacterId: vttCharacter.vttCharacterId,
        pendingAttribution: false,
        streamerId: playerAssignment.streamerId,
        streamerName:
          playerAssignment.streamer?.twitchDisplayName ||
          playerAssignment.streamer?.twitchLogin ||
          null,
        resolvedCharacterName: vttCharacter.name,
      }
    }

    // This is a GM roll (no player owns this character)
    // Resolve the GM's streamer for gamification
    const gmStreamer = await Streamer.query().where('userId', campaign.ownerId).first()

    // Check if GM has an active character set
    if (campaign.gmActiveCharacterId) {
      // Load the GM's active character
      const gmActiveCharacter = await Character.find(campaign.gmActiveCharacterId)

      logger.debug('Roll attributed to GM active character', {
        gmActiveCharacterId: campaign.gmActiveCharacterId,
        gmActiveVttCharacterId: gmActiveCharacter?.vttCharacterId,
        gmActiveCharacterName: gmActiveCharacter?.name,
        originalCharacterId: vttCharacter.id,
      })
      return {
        characterId: campaign.gmActiveCharacterId,
        vttCharacterId: gmActiveCharacter?.vttCharacterId ?? null,
        pendingAttribution: false,
        streamerId: gmStreamer?.id ?? null,
        streamerName: gmStreamer?.twitchDisplayName || gmStreamer?.twitchLogin || null,
        resolvedCharacterName: gmActiveCharacter?.name ?? vttCharacter.name,
      }
    }

    // No active character - roll needs manual attribution
    logger.info('Roll pending attribution (no GM active character)', {
      campaignId: campaign.id,
      vttCharacterId: vttCharacter.vttCharacterId,
    })
    return {
      characterId: null,
      vttCharacterId: null,
      pendingAttribution: true,
      streamerId: null,
      streamerName: null,
      resolvedCharacterName: null,
    }
  }

  /**
   * Trouve ou crée un personnage dans Tumulte à partir des données VTT
   */
  private async findOrCreateCharacter(
    campaign: Campaign,
    payload: DiceRollPayload
  ): Promise<Character> {
    // Chercher le personnage existant
    let character = await Character.query()
      .where('campaign_id', campaign.id)
      .where('vtt_character_id', payload.characterId)
      .first()

    if (character) {
      // Mettre à jour le nom si changé dans le VTT
      if (character.name !== payload.characterName) {
        character.name = payload.characterName
        character.lastSyncAt = DateTime.now()
        await character.save()
      }
      return character
    }

    // Créer le personnage s'il n'existe pas
    character = await Character.create({
      campaignId: campaign.id,
      vttCharacterId: payload.characterId,
      name: payload.characterName,
      characterType: 'pc', // Par défaut PC, pourra être mis à jour plus tard
      stats: null,
      inventory: null,
      vttData: null,
      lastSyncAt: DateTime.now(),
    })

    return character
  }

  /**
   * Synchronise les données complètes d'un personnage depuis le VTT
   * (Pour une future API de sync complète)
   */
  async syncCharacter(
    vttConnection: VttConnection,
    campaignId: string,
    characterData: {
      vttCharacterId: string
      name: string
      avatarUrl?: string | null
      characterType?: 'pc' | 'npc' | 'monster'
      stats?: Record<string, unknown> | null
      inventory?: Record<string, unknown> | null
      spells?: SpellInfo[] | null
      features?: FeatureInfo[] | null
      vttData?: Record<string, unknown> | null
    }
  ): Promise<Character> {
    // Trouver la campagne
    logger.info('syncCharacter looking for campaign', {
      vttConnectionId: vttConnection.id,
      campaignId,
    })

    // First try to find by both vtt_connection_id AND vtt_campaign_id
    let campaign = await Campaign.query()
      .where('vtt_connection_id', vttConnection.id)
      .where('vtt_campaign_id', campaignId)
      .first()

    // If not found, try by vtt_connection_id only (for backwards compatibility
    // when vtt_campaign_id might be null or different)
    if (!campaign) {
      logger.info('Campaign not found with exact match, trying by connection only', {
        vttConnectionId: vttConnection.id,
        campaignId,
      })

      campaign = await Campaign.query().where('vtt_connection_id', vttConnection.id).first()

      // If found, update the vtt_campaign_id for future lookups
      if (campaign && !campaign.vttCampaignId) {
        logger.info('Updating campaign vtt_campaign_id', {
          campaignId: campaign.id,
          vttCampaignId: campaignId,
        })
        campaign.vttCampaignId = campaignId
        await campaign.save()
      }
    }

    if (!campaign) {
      logger.error('Campaign not found for character sync', {
        vttConnectionId: vttConnection.id,
        campaignId,
        characterName: characterData.name,
      })
      throw new Error(
        `Campaign not found: vttConnectionId=${vttConnection.id}, campaignId=${campaignId}`
      )
    }

    // Déterminer le characterType de manière fiable
    // Le module Foundry envoie maintenant directement le type classifié (pc, npc, ou monster)
    // via actor-classifier.js qui gère la logique multi-système
    const resolveCharacterType = (): 'pc' | 'npc' | 'monster' => {
      // Le module envoie le characterType déjà résolu par actor-classifier.js
      // qui prend en compte hasPlayerOwner, actor.type, et la logique système-spécifique
      if (characterData.characterType) {
        return characterData.characterType
      }

      // Fallback legacy: si characterType n'est pas fourni, utiliser vttData.type
      const vttType = characterData.vttData?.type as string | undefined
      if (vttType) {
        const lowerType = vttType.toLowerCase()
        // Types connus pour les PCs dans différents systèmes
        const pcTypes = ['character', 'pc', 'player', 'investigator']
        if (pcTypes.includes(lowerType)) return 'pc'
        // Types connus pour les monsters
        const monsterTypes = ['creature', 'monster', 'enemy', 'adversary', 'beast', 'vaesen']
        if (monsterTypes.includes(lowerType)) return 'monster'
        // Tout le reste est NPC
        return 'npc'
      }

      // Défaut final
      return 'pc'
    }

    const resolvedCharacterType = resolveCharacterType()

    // Chercher ou créer le personnage
    let character = await Character.query()
      .where('campaign_id', campaign.id)
      .where('vtt_character_id', characterData.vttCharacterId)
      .first()

    if (character) {
      // Check if anything actually changed before writing to DB
      // If the GM manually overrode the character type, preserve it during sync
      const effectiveCharacterType = character.characterTypeOverride
        ? character.characterType
        : resolvedCharacterType

      const newData = {
        name: characterData.name,
        avatarUrl: characterData.avatarUrl,
        characterType: effectiveCharacterType,
        stats: characterData.stats || character.stats,
        inventory: characterData.inventory || character.inventory,
        spells: characterData.spells || character.spells,
        features: characterData.features || character.features,
        vttData: characterData.vttData || character.vttData,
      }

      const hasChanges =
        character.name !== newData.name ||
        character.avatarUrl !== newData.avatarUrl ||
        character.characterType !== newData.characterType ||
        JSON.stringify(character.stats) !== JSON.stringify(newData.stats) ||
        JSON.stringify(character.inventory) !== JSON.stringify(newData.inventory) ||
        JSON.stringify(character.spells) !== JSON.stringify(newData.spells) ||
        JSON.stringify(character.features) !== JSON.stringify(newData.features) ||
        JSON.stringify(character.vttData) !== JSON.stringify(newData.vttData)

      if (hasChanges) {
        character.merge({ ...newData, lastSyncAt: DateTime.now() })
        await character.save()
      } else {
        logger.debug('Character sync skipped (no changes)', {
          characterId: character.id,
          characterName: character.name,
        })
      }
    } else {
      // Créer un nouveau personnage
      character = await Character.create({
        campaignId: campaign.id,
        vttCharacterId: characterData.vttCharacterId,
        name: characterData.name,
        avatarUrl: characterData.avatarUrl || null,
        characterType: resolvedCharacterType,
        stats: characterData.stats || null,
        inventory: characterData.inventory || null,
        spells: characterData.spells || null,
        features: characterData.features || null,
        vttData: characterData.vttData || null,
        lastSyncAt: DateTime.now(),
      })
    }

    return character
  }

  /**
   * Detect game system from Foundry and apply preset criticality rules.
   * Called lazily: on first dice roll, pairing, or campaign sync.
   * Idempotent — safe to call multiple times for the same system.
   */
  private async detectAndApplySystem(
    campaign: InstanceType<typeof Campaign>,
    gameSystemId: string
  ): Promise<void> {
    const previous = campaign.gameSystemId

    campaign.gameSystemId = gameSystemId
    await campaign.save()

    const presetService = new SystemPresetService()

    try {
      if (previous && previous !== gameSystemId) {
        const result = await presetService.reapplyPresets(campaign.id, gameSystemId)
        logger.info({
          event: 'system_presets_reapplied',
          campaignId: campaign.id,
          previousSystem: previous,
          newSystem: gameSystemId,
          cleared: result.cleared,
          rulesCreated: result.rulesCreated,
        })
      } else {
        const result = await presetService.applyPresetsIfNeeded(campaign.id, gameSystemId)
        if (result.applied) {
          logger.info({
            event: 'system_presets_applied',
            campaignId: campaign.id,
            gameSystemId,
            systemName: result.systemName,
            rulesCreated: result.rulesCreated,
          })
        }
      }
    } catch (error) {
      logger.error(
        {
          event: 'system_preset_apply_error',
          campaignId: campaign.id,
          gameSystemId,
          error: (error as Error).message,
        },
        'Failed to apply system presets (non-fatal)'
      )
    }

    // Also auto-detect item categories (idempotent)
    try {
      const { ItemCategoryDetectionService } =
        await import('#services/campaigns/item_category_detection_service')
      const { CampaignItemCategoryRuleRepository } =
        await import('#repositories/campaign_item_category_rule_repository')
      const detectionService = new ItemCategoryDetectionService(
        new CampaignItemCategoryRuleRepository()
      )
      await detectionService.detectAndSeedCategories(campaign.id, gameSystemId)
    } catch (error) {
      logger.error(
        {
          event: 'item_category_detect_error',
          campaignId: campaign.id,
          gameSystemId,
          error: (error as Error).message,
        },
        'Failed to auto-detect item categories (non-fatal)'
      )
    }
  }
}
