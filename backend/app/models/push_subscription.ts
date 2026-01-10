import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

class PushSubscription extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column()
  declare endpoint: string

  @column({ columnName: 'p256dh' })
  declare p256dh: string

  @column()
  declare auth: string

  @column({ columnName: 'user_agent' })
  declare userAgent: string | null

  @column({ columnName: 'device_name' })
  declare deviceName: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ columnName: 'last_used_at' })
  declare lastUsedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}

export { PushSubscription as pushSubscription }
export default PushSubscription
