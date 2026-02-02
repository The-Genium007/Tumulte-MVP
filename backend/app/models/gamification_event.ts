import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import CampaignGamificationConfig from '#models/campaign_gamification_config'

// ========================================
// TYPES
// ========================================

export type GamificationEventType = 'individual' | 'group'

export type GamificationTriggerType = 'dice_critical' | 'manual' | 'custom'

export type GamificationActionType = 'dice_invert' | 'chat_message' | 'stat_modify' | 'custom'

export type GamificationCooldownType = 'time' | 'gm_validation' | 'event_complete'

export interface TriggerConfig {
  /** Pour dice_critical: conditions de déclenchement */
  criticalSuccess?: {
    enabled: boolean
    /** Ex: pour D20, valeur >= 20 */
    threshold?: number
    /** Ex: 'd20' */
    diceType?: string
  }
  criticalFailure?: {
    enabled: boolean
    /** Ex: pour D20, valeur <= 1 */
    threshold?: number
    diceType?: string
  }
  /** Pour custom: règles personnalisées */
  customRules?: Record<string, unknown>
}

export interface ActionConfig {
  /** Pour dice_invert: configuration de l'inversion */
  diceInvert?: {
    /** Message troll affiché dans Foundry */
    trollMessage?: string
    /** Supprimer le message original */
    deleteOriginal?: boolean
  }
  /** Pour chat_message: message à envoyer */
  chatMessage?: {
    content?: string
    speaker?: string
  }
  /** Pour stat_modify: modifications de stats */
  statModify?: {
    actorId?: string
    updates?: Record<string, unknown>
  }
  /** Pour custom: actions personnalisées */
  customActions?: Record<string, unknown>
}

export interface CooldownConfig {
  /** Durée en secondes (pour type 'time') */
  durationSeconds?: number
  /** ID de l'événement à attendre (pour type 'event_complete') */
  waitForEventId?: string
}

/**
 * GamificationEvent - Définition d'un type d'événement de gamification
 *
 * Représente un template d'événement qui peut être activé dans les campagnes.
 * Les événements système (isSystemEvent=true) sont fournis par défaut,
 * les autres peuvent être créés par les MJ.
 */
class GamificationEvent extends BaseModel {
  static table = 'gamification_events'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare description: string | null

  @column()
  declare type: GamificationEventType

  @column()
  declare triggerType: GamificationTriggerType

  @column({
    prepare: (value: TriggerConfig | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | TriggerConfig | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare triggerConfig: TriggerConfig | null

  @column()
  declare actionType: GamificationActionType

  @column({
    prepare: (value: ActionConfig | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | ActionConfig | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare actionConfig: ActionConfig | null

  /** Coût en points de chaîne par clic (valeur par défaut) */
  @column()
  declare defaultCost: number

  /** Coefficient pour calcul objectif: objectif = max(min, viewerCount * coefficient) */
  @column()
  declare defaultObjectiveCoefficient: number

  /** Objectif minimum (protège les petites audiences) */
  @column()
  declare defaultMinimumObjective: number

  /** Durée de l'instance en secondes (temps pour remplir la jauge) */
  @column()
  declare defaultDuration: number

  @column()
  declare cooldownType: GamificationCooldownType

  @column({
    prepare: (value: CooldownConfig | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | CooldownConfig | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare cooldownConfig: CooldownConfig | null

  /** Couleur hex pour le bouton Twitch Channel Points */
  @column()
  declare rewardColor: string

  /** true = événement fourni par le système, false = créé par un MJ */
  @column()
  declare isSystemEvent: boolean

  /** ID du créateur (null si événement système) */
  @column({ columnName: 'created_by_id' })
  declare createdById: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ========================================
  // RELATIONS
  // ========================================

  @hasMany(() => CampaignGamificationConfig, {
    foreignKey: 'eventId',
  })
  declare campaignConfigs: HasMany<typeof CampaignGamificationConfig>
}

export default GamificationEvent
export { GamificationEvent as gamificationEvent }
