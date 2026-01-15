import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import VttConnection from '#models/vtt_connection'

export type TokenType = 'session' | 'refresh' | 'pairing'

export default class TokenRevocationList extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare jti: string

  @column()
  declare tokenType: TokenType

  @column()
  declare vttConnectionId: string | null

  @column.dateTime()
  declare revokedAt: DateTime

  @column()
  declare revokedReason: string | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => VttConnection)
  declare vttConnection: BelongsTo<typeof VttConnection>

  /**
   * Check if a token is revoked by its JTI
   */
  static async isRevoked(jti: string): Promise<boolean> {
    const entry = await this.query().where('jti', jti).first()
    return entry !== null
  }

  /**
   * Revoke a token by its JTI
   */
  static async revokeToken(
    jti: string,
    tokenType: TokenType,
    expiresAt: DateTime,
    vttConnectionId?: string,
    reason?: string
  ): Promise<TokenRevocationList> {
    return await this.create({
      jti,
      tokenType,
      expiresAt,
      vttConnectionId: vttConnectionId || null,
      revokedAt: DateTime.now(),
      revokedReason: reason || null,
    })
  }

  /**
   * Clean up expired revocation entries
   */
  static async cleanupExpired(): Promise<number> {
    const result = await this.query().where('expires_at', '<', DateTime.now().toSQL()).delete()
    return result[0] || 0
  }
}
