import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { user as User } from './user.js'
import { campaignMembership as CampaignMembership } from './campaign_membership.js'
import { pollTemplate as PollTemplate } from './poll_template.js'
import { pollInstance as PollInstance } from './poll_instance.js'
import { poll as Poll } from './poll.js'
import VttConnection from '#models/vtt_connection'
import Character from '#models/character'
import DiceRoll from '#models/dice_roll'

class Campaign extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column({ columnName: 'owner_id' })
  declare ownerId: string

  // VTT fields
  @column()
  declare vttConnectionId: string | null

  @column()
  declare vttCampaignId: string | null

  @column()
  declare vttCampaignName: string | null

  @column()
  declare vttData: object | null

  @column.dateTime()
  declare lastVttSyncAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User, {
    foreignKey: 'ownerId',
  })
  declare owner: BelongsTo<typeof User>

  @hasMany(() => CampaignMembership, {
    foreignKey: 'campaignId',
  })
  declare memberships: HasMany<typeof CampaignMembership>

  @hasMany(() => PollTemplate, {
    foreignKey: 'campaignId',
  })
  declare templates: HasMany<typeof PollTemplate>

  @hasMany(() => PollInstance, {
    foreignKey: 'campaignId',
  })
  declare pollInstances: HasMany<typeof PollInstance>

  @hasMany(() => Poll, {
    foreignKey: 'campaignId',
  })
  declare polls: HasMany<typeof Poll>

  // VTT Relations
  @belongsTo(() => VttConnection)
  declare vttConnection: BelongsTo<typeof VttConnection>

  @hasMany(() => Character)
  declare characters: HasMany<typeof Character>

  @hasMany(() => DiceRoll)
  declare diceRolls: HasMany<typeof DiceRoll>
}

export { Campaign as campaign }
