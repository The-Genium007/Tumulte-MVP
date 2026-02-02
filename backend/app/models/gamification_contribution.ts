import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import GamificationInstance from '#models/gamification_instance'
import { streamer as Streamer } from '#models/streamer'

/**
 * GamificationContribution - Tracking des clics/contributions des viewers
 *
 * Enregistre chaque redemption de points de chaîne Twitch pour une instance.
 * Permet le suivi des contributions par viewer et la déduplication.
 */
class GamificationContribution extends BaseModel {
  static table = 'gamification_contributions'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'instance_id' })
  declare instanceId: string

  /** ID du streamer sur la chaîne duquel le clic a eu lieu */
  @column({ columnName: 'streamer_id' })
  declare streamerId: string

  /** ID Twitch du viewer qui a cliqué */
  @column()
  declare twitchUserId: string

  /** Nom d'affichage Twitch du viewer */
  @column()
  declare twitchUsername: string

  /** Montant de points dépensés */
  @column()
  declare amount: number

  /** ID de la redemption Twitch (pour déduplication) */
  @column()
  declare twitchRedemptionId: string

  /** Indique si la contribution a été remboursée (en cas d'expiration) */
  @column()
  declare refunded: boolean

  /** Date du remboursement */
  @column.dateTime({ columnName: 'refunded_at' })
  declare refundedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // ========================================
  // RELATIONS
  // ========================================

  @belongsTo(() => GamificationInstance, {
    foreignKey: 'instanceId',
  })
  declare instance: BelongsTo<typeof GamificationInstance>

  @belongsTo(() => Streamer, {
    foreignKey: 'streamerId',
  })
  declare streamer: BelongsTo<typeof Streamer>
}

export default GamificationContribution
export { GamificationContribution as gamificationContribution }
