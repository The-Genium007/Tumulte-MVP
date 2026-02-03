import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from '#models/campaign'
import Character from '#models/character'

export default class DiceRoll extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare campaignId: string

  @column()
  declare characterId: string | null

  @column()
  declare pendingAttribution: boolean

  @column()
  declare vttRollId: string | null

  @column()
  declare rollFormula: string

  @column()
  declare result: number

  @column()
  declare diceResults: number[]

  @column()
  declare isCritical: boolean

  @column()
  declare criticalType: 'success' | 'failure' | null

  @column()
  declare isHidden: boolean

  @column()
  declare rollType: string | null

  @column()
  declare vttData: object | null

  // Enriched flavor data from FlavorParser
  @column()
  declare skill: string | null

  @column()
  declare skillRaw: string | null

  @column()
  declare ability: string | null

  @column()
  declare abilityRaw: string | null

  @column()
  declare modifiers: string[] | null

  @column.dateTime({ autoCreate: true })
  declare rolledAt: DateTime

  // Relations
  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => Character)
  declare character: BelongsTo<typeof Character>
}
