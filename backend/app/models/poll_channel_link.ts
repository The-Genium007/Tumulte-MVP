import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { pollInstance as PollInstance } from './poll_instance.js'
import { streamer as Streamer } from './streamer.js'

export type PollChannelLinkStatus = 'CREATED' | 'RUNNING' | 'COMPLETED' | 'TERMINATED'

class PollChannelLink extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare pollInstanceId: string

  @column()
  declare streamerId: string

  @column()
  declare twitchPollId: string | null

  @column()
  declare status: PollChannelLinkStatus

  @column()
  declare totalVotes: number

  @column({
    prepare: (value: Record<string, number>) => JSON.stringify(value),
    consume: (value: string | Record<string, number>) => {
      // Si c'est déjà un objet, le retourner tel quel
      if (typeof value === 'object' && value !== null) {
        return value
      }
      // Si c'est une chaîne JSON, la parser
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          // Si le parsing échoue, retourner un objet vide
          return {}
        }
      }
      // Fallback : objet vide
      return {}
    },
  })
  declare votesByOption: Record<string, number>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => PollInstance, {
    foreignKey: 'pollInstanceId',
  })
  declare pollInstance: BelongsTo<typeof PollInstance>

  @belongsTo(() => Streamer, {
    foreignKey: 'streamerId',
  })
  declare streamer: BelongsTo<typeof Streamer>
}

export { PollChannelLink as pollChannelLink }
