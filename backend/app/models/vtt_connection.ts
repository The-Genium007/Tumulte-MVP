import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { user as User } from '#models/user'
import VttProvider from '#models/vtt_provider'
import { campaign as Campaign } from '#models/campaign'

export default class VttConnection extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare vttProviderId: string

  @column()
  declare name: string

  @column()
  declare apiKey: string // API key générée par Tumulte pour ce module/script

  @column()
  declare webhookUrl: string

  @column()
  declare status: 'pending' | 'active' | 'expired' | 'revoked'

  @column.dateTime()
  declare lastWebhookAt: DateTime | null

  // Secure connection fields
  @column()
  declare worldId: string | null

  @column()
  declare worldName: string | null

  @column()
  declare pairingCode: string | null

  @column()
  declare encryptedCredentials: string | null

  @column()
  declare tunnelStatus: 'disconnected' | 'connecting' | 'connected' | 'error'

  @column.dateTime()
  declare lastHeartbeatAt: DateTime | null

  @column()
  declare moduleVersion: string | null

  // Token version for instant invalidation of all tokens
  @column()
  declare tokenVersion: number

  // Connection fingerprint for security validation
  // Hash of worldId + initial moduleVersion, validated on token refresh
  @column()
  declare connectionFingerprint: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => VttProvider)
  declare provider: BelongsTo<typeof VttProvider>

  @hasMany(() => Campaign, {
    foreignKey: 'vttConnectionId',
  })
  declare campaigns: HasMany<typeof Campaign>
}
