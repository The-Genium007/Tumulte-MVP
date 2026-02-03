import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from '#models/campaign'
import GamificationEvent from '#models/gamification_event'
import { streamer as Streamer } from '#models/streamer'
import GamificationContribution from '#models/gamification_contribution'

// ========================================
// TYPES
// ========================================

export type GamificationInstanceStatus = 'active' | 'armed' | 'completed' | 'expired' | 'cancelled'

export type GamificationExecutionStatus = 'pending' | 'executed' | 'failed'

export interface TriggerData {
  /** Données du dé pour dice_critical */
  diceRoll?: {
    rollId: string
    characterId: string | null
    characterName: string | null
    formula: string
    result: number
    diceResults: number[]
    criticalType: 'success' | 'failure'
    messageId?: string
  }
  /** Données d'activation par redemption Channel Points */
  activation?: {
    triggeredBy: string
    twitchUserId: string
    redemptionId: string
  }
  /** Données personnalisées pour autres triggers */
  custom?: Record<string, unknown>
}

export interface StreamerSnapshot {
  streamerId: string
  streamerName: string
  viewerCount: number
  localObjective: number
  contributions: number
}

export interface ResultData {
  /** Résultat de l'action exécutée */
  success: boolean
  /** Message de résultat */
  message?: string
  /** Données spécifiques à l'action */
  actionResult?: Record<string, unknown>
  /** Erreur si échec */
  error?: string
  /** Indique si l'action a été exécutée (par Foundry) */
  executed?: boolean
  /** Date d'exécution de l'action */
  executedAt?: string
  /** Succès de l'exécution */
  executionSuccess?: boolean
  /** Message d'exécution */
  executionMessage?: string
}

/**
 * GamificationInstance - Instance active d'un événement de gamification
 *
 * Représente une occurrence d'un événement en cours (jauge à remplir).
 * Peut être individuelle (un streamer) ou groupée (tous les streamers).
 */
class GamificationInstance extends BaseModel {
  static table = 'gamification_instances'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'campaign_id' })
  declare campaignId: string

  @column({ columnName: 'event_id' })
  declare eventId: string

  @column()
  declare type: 'individual' | 'group'

  @column()
  declare status: GamificationInstanceStatus

  /** Données du déclencheur (ex: infos du dé critique) */
  @column({
    prepare: (value: TriggerData | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | TriggerData | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare triggerData: TriggerData | null

  /** Objectif calculé (nombre de clics/points nécessaires) */
  @column()
  declare objectiveTarget: number

  /** Progression actuelle */
  @column()
  declare currentProgress: number

  /** Durée de l'instance en secondes */
  @column()
  declare duration: number

  @column.dateTime()
  declare startsAt: DateTime

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  /** Résultat de l'action (si complété) */
  @column({
    prepare: (value: ResultData | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | ResultData | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare resultData: ResultData | null

  /** Fin du cooldown (null si expiré/annulé) */
  @column.dateTime()
  declare cooldownEndsAt: DateTime | null

  /** Statut d'exécution de l'action (null si pas complété, pending/executed/failed sinon) */
  @column({ columnName: 'execution_status' })
  declare executionStatus: GamificationExecutionStatus | null

  /** Date d'exécution de l'action */
  @column.dateTime({ columnName: 'executed_at' })
  declare executedAt: DateTime | null

  /** Date de passage en état "armed" (jauge remplie, en attente de critique) */
  @column.dateTime({ columnName: 'armed_at' })
  declare armedAt: DateTime | null

  // ========================================
  // CHAMPS POUR INSTANCES INDIVIDUELLES
  // ========================================

  /** ID du streamer (null si groupe) */
  @column({ columnName: 'streamer_id' })
  declare streamerId: string | null

  /** Nombre de viewers au moment du lancement */
  @column()
  declare viewerCountAtStart: number | null

  // ========================================
  // CHAMPS POUR INSTANCES GROUPÉES
  // ========================================

  /** Snapshots des streamers pour calcul équitable */
  @column({
    prepare: (value: StreamerSnapshot[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | StreamerSnapshot[] | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare streamerSnapshots: StreamerSnapshot[] | null

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

  @belongsTo(() => Streamer, {
    foreignKey: 'streamerId',
  })
  declare streamer: BelongsTo<typeof Streamer>

  @hasMany(() => GamificationContribution, {
    foreignKey: 'instanceId',
  })
  declare contributions: HasMany<typeof GamificationContribution>

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  /**
   * Vérifie si l'instance est encore active (pas expirée)
   */
  get isActive(): boolean {
    return this.status === 'active' && DateTime.now() < this.expiresAt
  }

  /**
   * Vérifie si l'objectif est atteint
   */
  get isObjectiveReached(): boolean {
    return this.currentProgress >= this.objectiveTarget
  }

  /**
   * Pourcentage de progression (0-100)
   */
  get progressPercentage(): number {
    if (this.objectiveTarget === 0) return 100
    return Math.min(100, Math.round((this.currentProgress / this.objectiveTarget) * 100))
  }

  /**
   * Temps restant en secondes
   */
  get remainingSeconds(): number {
    if (this.status !== 'active') return 0
    const diff = this.expiresAt.diff(DateTime.now(), 'seconds')
    return Math.max(0, Math.round(diff.seconds))
  }

  /**
   * Vérifie si l'instance est en cooldown
   */
  get isOnCooldown(): boolean {
    if (!this.cooldownEndsAt) return false
    return DateTime.now() < this.cooldownEndsAt
  }

  /**
   * Vérifie si l'instance est "armed" (jauge remplie, en attente d'un critique)
   */
  get isArmed(): boolean {
    return this.status === 'armed'
  }

  /**
   * Vérifie si l'instance peut être consommée (armed et prête à inverser un dé)
   */
  get canBeConsumed(): boolean {
    return this.status === 'armed'
  }

  /**
   * Vérifie si l'instance accepte encore des contributions
   */
  get acceptsContributions(): boolean {
    return this.status === 'active' && DateTime.now() < this.expiresAt
  }
}

export default GamificationInstance
export { GamificationInstance as gamificationInstance }
