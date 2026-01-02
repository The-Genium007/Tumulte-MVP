import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { pollSession as PollSession } from './poll_session.js'

export type PollType = 'STANDARD' | 'UNIQUE'

class Poll extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'session_id' })
  declare sessionId: string

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
  declare orderIndex: number

  @column()
  declare channelPointsEnabled: boolean

  @column()
  declare channelPointsAmount: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => PollSession, {
    foreignKey: 'sessionId',
  })
  declare session: BelongsTo<typeof PollSession>
}

export { Poll as poll }
