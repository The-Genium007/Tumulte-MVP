import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from '#models/campaign'
import { streamer as Streamer } from '#models/streamer'
import GamificationEvent from '#models/gamification_event'
import CampaignGamificationConfig from '#models/campaign_gamification_config'

// ========================================
// TYPES
// ========================================

export type TwitchRewardStatus = 'not_created' | 'active' | 'paused' | 'deleted' | 'orphaned'

/**
 * StreamerGamificationConfig - Configuration des événements de gamification par streamer
 *
 * Permet à chaque streamer de personnaliser le coût des Channel Points
 * et de gérer l'activation du reward Twitch sur sa chaîne.
 *
 * Hiérarchie des coûts :
 * 1. streamerConfig.costOverride (si défini)
 * 2. campaignConfig.cost (si défini par le MJ)
 * 3. event.defaultCost (valeur par défaut de l'événement)
 */
class StreamerGamificationConfig extends BaseModel {
  static table = 'streamer_gamification_configs'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'campaign_id' })
  declare campaignId: string

  @column({ columnName: 'streamer_id' })
  declare streamerId: string

  @column({ columnName: 'event_id' })
  declare eventId: string

  /** Le streamer a activé cet événement sur sa chaîne */
  @column()
  declare isEnabled: boolean

  /** Override du coût en points de chaîne (null = utilise config MJ ou défaut) */
  @column()
  declare costOverride: number | null

  /** ID du reward Twitch créé sur la chaîne du streamer */
  @column()
  declare twitchRewardId: string | null

  /** Statut du reward Twitch */
  @column()
  declare twitchRewardStatus: TwitchRewardStatus

  // ========================================
  // TRACKING DES ORPHELINS
  // ========================================

  /** Timestamp de la première tentative de suppression échouée */
  @column.dateTime({ columnName: 'deletion_failed_at' })
  declare deletionFailedAt: DateTime | null

  /** Compteur de tentatives de suppression (pour backoff exponentiel) */
  @column({ columnName: 'deletion_retry_count' })
  declare deletionRetryCount: number

  /** Prochaine tentative de suppression planifiée */
  @column.dateTime({ columnName: 'next_deletion_retry_at' })
  declare nextDeletionRetryAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ========================================
  // RELATIONS
  // ========================================

  @belongsTo(() => Campaign, {
    foreignKey: 'campaignId',
  })
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => Streamer, {
    foreignKey: 'streamerId',
  })
  declare streamer: BelongsTo<typeof Streamer>

  @belongsTo(() => GamificationEvent, {
    foreignKey: 'eventId',
  })
  declare event: BelongsTo<typeof GamificationEvent>

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  /**
   * Calcule le coût effectif en suivant la hiérarchie :
   * 1. Override du streamer
   * 2. Config du MJ
   * 3. Défaut de l'événement
   */
  getEffectiveCost(
    campaignConfig: CampaignGamificationConfig | null,
    event: GamificationEvent
  ): number {
    // 1. Override du streamer
    if (this.costOverride !== null) {
      return this.costOverride
    }

    // 2. Config du MJ
    if (campaignConfig?.cost !== null && campaignConfig?.cost !== undefined) {
      return campaignConfig.cost
    }

    // 3. Défaut de l'événement
    return event.defaultCost
  }

  /**
   * Vérifie si le reward Twitch est actif et utilisable
   */
  get isTwitchRewardActive(): boolean {
    return this.twitchRewardId !== null && this.twitchRewardStatus === 'active'
  }

  /**
   * Vérifie si le reward peut être créé
   */
  get canCreateTwitchReward(): boolean {
    return (
      this.twitchRewardStatus === 'not_created' ||
      this.twitchRewardStatus === 'deleted' ||
      this.twitchRewardStatus === 'orphaned'
    )
  }

  /**
   * Vérifie si le reward est orphelin (suppression échouée)
   */
  get isOrphaned(): boolean {
    return this.twitchRewardStatus === 'orphaned' && this.twitchRewardId !== null
  }

  /**
   * Vérifie si une tentative de nettoyage est due
   */
  get isCleanupDue(): boolean {
    if (!this.isOrphaned) return false
    if (!this.nextDeletionRetryAt) return true
    return this.nextDeletionRetryAt <= DateTime.now()
  }
}

export default StreamerGamificationConfig
export { StreamerGamificationConfig as streamerGamificationConfig }
