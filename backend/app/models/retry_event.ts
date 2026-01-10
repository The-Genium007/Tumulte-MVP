import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { streamer as Streamer } from './streamer.js'
import { campaign as Campaign } from './campaign.js'
import { pollInstance as PollInstance } from './poll_instance.js'

/**
 * RetryEvent Model
 * Stores retry events for analytics and debugging
 */
class RetryEvent extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare service: string

  @column()
  declare operation: string

  @column()
  declare attempts: number

  @column()
  declare success: boolean

  @column()
  declare totalDurationMs: number

  @column()
  declare finalStatusCode: number | null

  @column()
  declare errorMessage: string | null

  @column()
  declare circuitBreakerTriggered: boolean

  @column()
  declare circuitBreakerKey: string | null

  @column({
    prepare: (value: Record<string, unknown> | null) => {
      if (value === null) return null
      return JSON.stringify(value)
    },
    consume: (value: string | Record<string, unknown> | null) => {
      if (value === null) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    },
  })
  declare metadata: Record<string, unknown> | null

  @column()
  declare streamerId: string | null

  @column()
  declare campaignId: string | null

  @column()
  declare pollInstanceId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @belongsTo(() => Streamer)
  declare streamer: BelongsTo<typeof Streamer>

  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => PollInstance)
  declare pollInstance: BelongsTo<typeof PollInstance>
}

export { RetryEvent as retryEvent }
export default RetryEvent
