import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import encryption from '@adonisjs/core/services/encryption'
import { user as User } from './user.js'

class Streamer extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string | null

  @column()
  declare twitchUserId: string

  @column()
  declare twitchLogin: string

  @column()
  declare twitchDisplayName: string

  @column()
  declare profileImageUrl: string | null

  @column()
  declare broadcasterType: string

  @column({ serializeAs: null })
  declare accessTokenEncrypted: string | null

  @column({ serializeAs: null })
  declare refreshTokenEncrypted: string | null

  @column({
    prepare: (value: string[]) => {
      // Si c'est déjà une chaîne JSON, la retourner telle quelle
      if (typeof value === 'string') return value
      // Sinon, convertir le tableau en JSON
      return JSON.stringify(value)
    },
    consume: (value: string | string[]) => {
      // Si c'est déjà un tableau, le retourner tel quel
      if (Array.isArray(value)) return value
      // Si c'est une chaîne, la parser
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          // Si le parsing échoue, retourner un tableau vide
          return []
        }
      }
      return []
    },
  })
  declare scopes: string[]

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Méthodes de chiffrement/déchiffrement
  async getDecryptedAccessToken(): Promise<string> {
    if (!this.accessTokenEncrypted) return ''
    return encryption.decrypt(this.accessTokenEncrypted) ?? ''
  }

  async getDecryptedRefreshToken(): Promise<string> {
    if (!this.refreshTokenEncrypted) return ''
    return encryption.decrypt(this.refreshTokenEncrypted) ?? ''
  }

  async updateTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessTokenEncrypted = encryption.encrypt(accessToken)
    this.refreshTokenEncrypted = encryption.encrypt(refreshToken)
    await this.save()
  }

  static async createWithEncryptedTokens(data: {
    userId: string
    twitchUserId: string
    twitchLogin: string
    twitchDisplayName: string
    profileImageUrl?: string
    broadcasterType?: string
    accessToken: string
    refreshToken: string
    scopes: string[]
    isActive?: boolean
  }): Promise<Streamer> {
    const streamer = new Streamer()
    streamer.userId = data.userId
    streamer.twitchUserId = data.twitchUserId
    streamer.twitchLogin = data.twitchLogin
    streamer.twitchDisplayName = data.twitchDisplayName
    streamer.profileImageUrl = data.profileImageUrl ?? null
    streamer.broadcasterType = data.broadcasterType ?? ''
    streamer.accessTokenEncrypted = encryption.encrypt(data.accessToken)
    streamer.refreshTokenEncrypted = encryption.encrypt(data.refreshToken)
    streamer.scopes = data.scopes
    streamer.isActive = data.isActive ?? true
    await streamer.save()
    return streamer
  }
}

export { Streamer as streamer }
