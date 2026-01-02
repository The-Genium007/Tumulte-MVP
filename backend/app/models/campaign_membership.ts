import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from './campaign.js'
import { streamer as Streamer } from './streamer.js'

type MembershipStatus = 'PENDING' | 'ACTIVE'

class CampaignMembership extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'campaign_id' })
  declare campaignId: string

  @column({ columnName: 'streamer_id' })
  declare streamerId: string

  @column()
  declare status: MembershipStatus

  @column.dateTime({ columnName: 'invited_at' })
  declare invitedAt: DateTime

  @column.dateTime({ columnName: 'accepted_at' })
  declare acceptedAt: DateTime | null

  @column.dateTime({ columnName: 'poll_authorization_granted_at' })
  declare pollAuthorizationGrantedAt: DateTime | null

  @column.dateTime({ columnName: 'poll_authorization_expires_at' })
  declare pollAuthorizationExpiresAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Check if poll authorization is currently active
   */
  get isPollAuthorizationActive(): boolean {
    if (!this.pollAuthorizationExpiresAt) return false
    return this.pollAuthorizationExpiresAt > DateTime.now()
  }

  /**
   * Get remaining authorization time in seconds (or null if not authorized)
   */
  get authorizationRemainingSeconds(): number | null {
    if (!this.isPollAuthorizationActive) return null
    return Math.floor(this.pollAuthorizationExpiresAt!.diff(DateTime.now(), 'seconds').seconds)
  }

  // Relations
  @belongsTo(() => Campaign, {
    foreignKey: 'campaignId',
  })
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => Streamer, {
    foreignKey: 'streamerId',
  })
  declare streamer: BelongsTo<typeof Streamer>
}

export { CampaignMembership as campaignMembership }
