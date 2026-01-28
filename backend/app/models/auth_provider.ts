import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import encryption from '@adonisjs/core/services/encryption'
import User from './user.js'

export type AuthProviderType = 'google' | 'twitch' | 'microsoft' | 'apple'

/**
 * AuthProvider model - stores OAuth provider connections for users
 *
 * A user can have multiple auth providers linked (e.g., Google + Twitch).
 * Tokens are encrypted at rest using AdonisJS Encryption service.
 */
class AuthProvider extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare provider: AuthProviderType

  @column()
  declare providerUserId: string

  @column()
  declare providerEmail: string | null

  @column()
  declare providerDisplayName: string | null

  @column({ serializeAs: null })
  declare accessTokenEncrypted: string | null

  @column({ serializeAs: null })
  declare refreshTokenEncrypted: string | null

  @column.dateTime()
  declare tokenExpiresAt: DateTime | null

  @column({
    prepare: (value: Record<string, unknown> | null) => {
      if (!value) return null
      return JSON.stringify(value)
    },
    consume: (value: string | Record<string, unknown> | null) => {
      if (!value) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    },
  })
  declare providerData: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  /**
   * Get decrypted access token
   */
  getDecryptedAccessToken(): string | null {
    if (!this.accessTokenEncrypted) return null
    return encryption.decrypt(this.accessTokenEncrypted) ?? null
  }

  /**
   * Get decrypted refresh token
   */
  getDecryptedRefreshToken(): string | null {
    if (!this.refreshTokenEncrypted) return null
    return encryption.decrypt(this.refreshTokenEncrypted) ?? null
  }

  /**
   * Update OAuth tokens (encrypts before saving)
   */
  async updateTokens(
    accessToken: string,
    refreshToken?: string,
    expiresAt?: DateTime
  ): Promise<void> {
    this.accessTokenEncrypted = encryption.encrypt(accessToken)
    if (refreshToken) {
      this.refreshTokenEncrypted = encryption.encrypt(refreshToken)
    }
    if (expiresAt) {
      this.tokenExpiresAt = expiresAt
    }
    await this.save()
  }

  /**
   * Check if the token is expired or expiring soon
   */
  get isTokenExpiringSoon(): boolean {
    if (!this.tokenExpiresAt) return true
    return this.tokenExpiresAt < DateTime.now().plus({ minutes: 5 })
  }

  /**
   * Check if the token is expired
   */
  get isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) return true
    return this.tokenExpiresAt < DateTime.now()
  }

  /**
   * Create a new auth provider with encrypted tokens
   */
  static async createWithEncryptedTokens(data: {
    userId: string
    provider: AuthProviderType
    providerUserId: string
    providerEmail?: string | null
    providerDisplayName?: string | null
    accessToken?: string
    refreshToken?: string
    tokenExpiresAt?: DateTime
    providerData?: Record<string, unknown>
  }): Promise<AuthProvider> {
    const authProvider = new AuthProvider()
    authProvider.userId = data.userId
    authProvider.provider = data.provider
    authProvider.providerUserId = data.providerUserId
    authProvider.providerEmail = data.providerEmail ?? null
    authProvider.providerDisplayName = data.providerDisplayName ?? null
    authProvider.providerData = data.providerData ?? null

    if (data.accessToken) {
      authProvider.accessTokenEncrypted = encryption.encrypt(data.accessToken)
    }
    if (data.refreshToken) {
      authProvider.refreshTokenEncrypted = encryption.encrypt(data.refreshToken)
    }
    if (data.tokenExpiresAt) {
      authProvider.tokenExpiresAt = data.tokenExpiresAt
    }

    await authProvider.save()
    return authProvider
  }
}

export { AuthProvider as authProvider }
export default AuthProvider
