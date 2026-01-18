import { DateTime } from 'luxon'
import VttConnection from '#models/vtt_connection'
import { campaign as Campaign } from '#models/campaign'
import Character from '#models/character'
import DiceRoll from '#models/dice_roll'
import DiceRollService from '#services/vtt/dice_roll_service'
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
}

export default class VttWebhookService {
  /**
   * Traite un événement de dice roll provenant d'un VTT
   */
  async processDiceRoll(vttConnection: VttConnection, payload: DiceRollPayload): Promise<DiceRoll> {
    // 1. Trouver la campagne Tumulte correspondante
    const campaign = await Campaign.query()
      .where('vtt_connection_id', vttConnection.id)
      .where('vtt_campaign_id', payload.campaignId)
      .firstOrFail()

    // 2. Trouver ou créer le personnage
    const character = await this.findOrCreateCharacter(campaign, payload)

    // 3. Vérifier si le roll existe déjà (déduplication)
    if (payload.rollId) {
      const existingRoll = await DiceRoll.query()
        .where('campaign_id', campaign.id)
        .where('vtt_roll_id', payload.rollId)
        .first()

      if (existingRoll) {
        // Roll déjà traité, retourner l'existant
        return existingRoll
      }
    }

    // 4. Créer le dice roll via le service
    const diceRollService = new DiceRollService()
    const diceRoll = await diceRollService.recordDiceRoll({
      campaignId: campaign.id,
      characterId: character.id,
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
    })

    return diceRoll
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
      characterType?: 'pc' | 'npc'
      stats?: Record<string, unknown> | null
      inventory?: Record<string, unknown> | null
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

    // Chercher ou créer le personnage
    let character = await Character.query()
      .where('campaign_id', campaign.id)
      .where('vtt_character_id', characterData.vttCharacterId)
      .first()

    if (character) {
      // Mettre à jour les données existantes
      character.merge({
        name: characterData.name,
        avatarUrl: characterData.avatarUrl,
        characterType: characterData.characterType || character.characterType,
        stats: characterData.stats || character.stats,
        inventory: characterData.inventory || character.inventory,
        vttData: characterData.vttData || character.vttData,
        lastSyncAt: DateTime.now(),
      })
      await character.save()
    } else {
      // Créer un nouveau personnage
      character = await Character.create({
        campaignId: campaign.id,
        vttCharacterId: characterData.vttCharacterId,
        name: characterData.name,
        avatarUrl: characterData.avatarUrl || null,
        characterType: characterData.characterType || 'pc',
        stats: characterData.stats || null,
        inventory: characterData.inventory || null,
        vttData: characterData.vttData || null,
        lastSyncAt: DateTime.now(),
      })
    }

    return character
  }
}
