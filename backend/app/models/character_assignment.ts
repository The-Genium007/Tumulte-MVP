import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Character from '#models/character'
import { streamer as Streamer } from '#models/streamer'
import { campaign as Campaign } from '#models/campaign'

export default class CharacterAssignment extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare characterId: string

  @column()
  declare streamerId: string

  @column()
  declare campaignId: string

  @column.dateTime({ autoCreate: true })
  declare assignedAt: DateTime

  // Relations
  @belongsTo(() => Character)
  declare character: BelongsTo<typeof Character>

  @belongsTo(() => Streamer)
  declare streamer: BelongsTo<typeof Streamer>

  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>
}
