import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from '#models/campaign'
import CharacterAssignment from '#models/character_assignment'
import DiceRoll from '#models/dice_roll'

export interface SpellInfo {
  id: string
  name: string
  img: string | null
  type: string
  level: number | null
  school: string | null
  prepared: boolean | null
  uses: { value: number | null; max: number | null } | null
  activeEffect?: { type: string; expiresAt?: number | null } | null
}

export interface FeatureInfo {
  id: string
  name: string
  img: string | null
  type: string
  subtype: string | null
  uses: { value: number | null; max: number | null; per: string | null } | null
}

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
  declare characterType: 'pc' | 'npc' | 'monster'

  @column()
  declare characterTypeOverride: boolean

  @column({
    prepare: (value: object | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | object | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare stats: object | null

  @column({
    prepare: (value: object | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | object | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare inventory: object | null

  @column({
    prepare: (value: SpellInfo[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | SpellInfo[] | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare spells: SpellInfo[] | null

  @column({
    prepare: (value: FeatureInfo[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | FeatureInfo[] | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare features: FeatureInfo[] | null

  @column({
    prepare: (value: object | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | object | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare vttData: object | null

  @column({
    prepare: (value: Record<string, Record<string, number>> | null) =>
      value ? JSON.stringify(value) : null,
    consume: (value: string | Record<string, Record<string, number>> | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare itemCategorySummary: Record<string, Record<string, number>> | null

  @column()
  declare itemCategoryHash: string | null

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
