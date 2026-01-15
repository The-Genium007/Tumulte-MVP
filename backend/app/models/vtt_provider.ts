import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import VttConnection from '#models/vtt_connection'

export default class VttProvider extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string // 'foundry', 'roll20', 'alchemy'

  @column()
  declare displayName: string // 'Foundry VTT', 'Roll20', 'Alchemy RPG'

  @column()
  declare authType: string // 'api_key', 'oauth'

  @column()
  declare isActive: boolean

  @column()
  declare configSchema: object | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @hasMany(() => VttConnection)
  declare connections: HasMany<typeof VttConnection>
}
