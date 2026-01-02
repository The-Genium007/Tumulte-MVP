import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { user as User } from './user.js'
import { pollTemplate as PollTemplate } from './poll_template.js'
import { pollChannelLink as PollChannelLink } from './poll_channel_link.js'
import { campaign as Campaign } from './campaign.js'

export type PollInstanceStatus = 'PENDING' | 'RUNNING' | 'ENDED'
export type PollInstanceType = 'STANDARD' | 'UNIQUE'

class PollInstance extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare templateId: string | null

  @column()
  declare campaignId: string | null

  @column()
  declare title: string

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare options: string[]

  @column()
  declare durationSeconds: number

  @column()
  declare type: PollInstanceType

  @column()
  declare status: PollInstanceStatus

  @column()
  declare channelPointsEnabled: boolean

  @column()
  declare channelPointsAmount: number | null

  @column()
  declare finalTotalVotes: number | null

  @column({
    prepare: (value: Record<string, number> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, number> | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare finalVotesByOption: Record<string, number> | null

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare endedAt: DateTime | null

  @column()
  declare createdBy: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => PollTemplate, {
    foreignKey: 'templateId',
  })
  declare template: BelongsTo<typeof PollTemplate>

  @belongsTo(() => User, {
    foreignKey: 'createdBy',
  })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => Campaign, {
    foreignKey: 'campaignId',
  })
  declare campaign: BelongsTo<typeof Campaign>

  @hasMany(() => PollChannelLink, {
    foreignKey: 'pollInstanceId',
  })
  declare channelLinks: HasMany<typeof PollChannelLink>
}

export { PollInstance as pollInstance }
