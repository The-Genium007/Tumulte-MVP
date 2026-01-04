import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

class NotificationPreference extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column({ columnName: 'push_enabled' })
  declare pushEnabled: boolean

  @column({ columnName: 'campaign_invitations' })
  declare campaignInvitations: boolean

  @column({ columnName: 'critical_alerts' })
  declare criticalAlerts: boolean

  @column({ columnName: 'poll_started' })
  declare pollStarted: boolean

  @column({ columnName: 'poll_ended' })
  declare pollEnded: boolean

  @column({ columnName: 'campaign_member_joined' })
  declare campaignMemberJoined: boolean

  @column({ columnName: 'session_reminder' })
  declare sessionReminder: boolean

  @column({ columnName: 'token_refresh_failed' })
  declare tokenRefreshFailed: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}

export { NotificationPreference as notificationPreference }
export default NotificationPreference
