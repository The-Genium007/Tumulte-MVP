import { DateTime } from 'luxon'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import { streamer as Streamer } from './streamer.js'

export type UserRole = 'MJ' | 'STREAMER'

class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare role: UserRole

  @column()
  declare displayName: string

  @column()
  declare email: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @hasOne(() => Streamer, {
    foreignKey: 'userId',
  })
  declare streamer: HasOne<typeof Streamer>

  // Token providers
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)
  static accessTokens = DbAccessTokensProvider.forModel(User)
}

export { User as user }
export default User
