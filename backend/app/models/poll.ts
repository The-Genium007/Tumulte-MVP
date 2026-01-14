import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from './campaign.js'
import { pollInstance as PollInstance } from './poll_instance.js'

export type PollType = 'STANDARD' | 'UNIQUE'

class Poll extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'campaign_id' })
  declare campaignId: string

  @column()
  declare question: string

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string | null) => {
      if (!value) return []

      // Si c'est déjà un tableau, le retourner tel quel
      if (Array.isArray(value)) return value

      // Si ce n'est pas une chaîne, retourner un tableau vide
      if (typeof value !== 'string') return []

      try {
        return JSON.parse(value)
      } catch {
        // Fallback pour les anciennes données stockées comme chaîne séparée par des virgules
        return value.split(',').map((v) => v.trim())
      }
    },
  })
  declare options: string[]

  @column()
  declare type: PollType

  @column()
  declare durationSeconds: number

  @column()
  declare orderIndex: number

  @column()
  declare channelPointsEnabled: boolean

  @column()
  declare channelPointsAmount: number | null

  @column.dateTime()
  declare lastLaunchedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Campaign, {
    foreignKey: 'campaignId',
  })
  declare campaign: BelongsTo<typeof Campaign>

  @hasMany(() => PollInstance, {
    foreignKey: 'pollId',
  })
  declare instances: HasMany<typeof PollInstance>
}

export { Poll as poll }
