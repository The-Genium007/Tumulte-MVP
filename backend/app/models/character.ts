import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from '#models/campaign'
import CharacterAssignment from '#models/character_assignment'
import DiceRoll from '#models/dice_roll'

export default class Character extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare campaignId: string

  @column()
  declare vttCharacterId: string

  @column()
  declare name: string

  @column()
  declare avatarUrl: string | null

  @column()
  declare characterType: 'pc' | 'npc'

  @column()
  declare stats: object | null

  @column()
  declare inventory: object | null

  @column()
  declare vttData: object | null

  @column.dateTime()
  declare lastSyncAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  @hasMany(() => CharacterAssignment)
  declare assignments: HasMany<typeof CharacterAssignment>

  @hasMany(() => DiceRoll)
  declare diceRolls: HasMany<typeof DiceRoll>
}
