import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { poll as Poll } from './poll.js'
import { campaign as Campaign } from './campaign.js'

export type PollResultStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

class PollResult extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare pollId: string

  @column()
  declare campaignId: string

  @column()
  declare status: PollResultStatus

  @column({
    prepare: (value: Record<string, any>) => JSON.stringify(value),
    consume: (value: string | null) => {
      if (!value) return {}
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return {}
      }
    },
  })
  declare twitchPolls: Record<string, any>

  @column()
  declare totalVotes: number

  @column({
    prepare: (value: Record<string, number>) => JSON.stringify(value),
    consume: (value: string | null) => {
      if (!value) return {}
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return {}
      }
    },
  })
  declare votesByOption: Record<string, number>

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare endedAt: DateTime | null

  @column()
  declare cancelledBy: string | null

  @column.dateTime()
  declare cancelledAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Poll, {
    foreignKey: 'pollId',
  })
  declare poll: BelongsTo<typeof Poll>

  @belongsTo(() => Campaign, {
    foreignKey: 'campaignId',
  })
  declare campaign: BelongsTo<typeof Campaign>
}

export { PollResult as pollResult }
