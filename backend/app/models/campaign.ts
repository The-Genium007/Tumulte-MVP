import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { user as User } from './user.js'
import { campaignMembership as CampaignMembership } from './campaign_membership.js'
import { pollTemplate as PollTemplate } from './poll_template.js'
import { pollInstance as PollInstance } from './poll_instance.js'

class Campaign extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare ownerId: string

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
  declare polls: HasMany<typeof PollInstance>
}

export { Campaign as campaign }
