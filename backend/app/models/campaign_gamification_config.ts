import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from '#models/campaign'
import GamificationEvent from '#models/gamification_event'

/**
 * CampaignGamificationConfig - Configuration d'un événement de gamification par campagne
 *
 * Permet au MJ d'activer/désactiver et personnaliser les événements
 * pour sa campagne spécifique.
 */
class CampaignGamificationConfig extends BaseModel {
  static table = 'campaign_gamification_configs'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'campaign_id' })
  declare campaignId: string

  @column({ columnName: 'event_id' })
  declare eventId: string

  /** Événement activé pour cette campagne */
  @column()
  declare isEnabled: boolean

  /** Override du coût (null = utilise defaultCost de l'événement) */
  @column()
  declare cost: number | null

  /** Override du coefficient objectif */
  @column()
  declare objectiveCoefficient: number | null

  /** Override de l'objectif minimum */
  @column()
  declare minimumObjective: number | null

  /** Override de la durée en secondes */
  @column()
  declare duration: number | null

  /** Override du cooldown en secondes (après succès) */
  @column()
  declare cooldown: number | null

  /** Limite de clics par utilisateur par session (0 = illimité) */
  @column()
  declare maxClicksPerUserPerSession: number

  /** ID du reward Twitch créé (null si pas encore créé) */
  @column()
  declare twitchRewardId: string | null

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

  @belongsTo(() => GamificationEvent, {
    foreignKey: 'eventId',
  })
  declare event: BelongsTo<typeof GamificationEvent>

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  /**
   * Retourne le coût effectif (override ou défaut)
   */
  getEffectiveCost(event: GamificationEvent): number {
    return this.cost ?? event.defaultCost
  }

  /**
   * Retourne le coefficient effectif (override ou défaut)
   */
  getEffectiveCoefficient(event: GamificationEvent): number {
    return this.objectiveCoefficient ?? event.defaultObjectiveCoefficient
  }

  /**
   * Retourne l'objectif minimum effectif (override ou défaut)
   */
  getEffectiveMinimumObjective(event: GamificationEvent): number {
    return this.minimumObjective ?? event.defaultMinimumObjective
  }

  /**
   * Retourne la durée effective en secondes (override ou défaut)
   */
  getEffectiveDuration(event: GamificationEvent): number {
    return this.duration ?? event.defaultDuration
  }
}

export default CampaignGamificationConfig
export { CampaignGamificationConfig as campaignGamificationConfig }
