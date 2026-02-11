import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from '#models/campaign'
import { user as User } from '#models/user'
import type { CheckResult, EventCategory, RunMode } from '#services/preflight/types'

export default class PreflightReport extends BaseModel {
  static table = 'preflight_reports'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare campaignId: string | null

  @column()
  declare eventType: EventCategory

  @column()
  declare eventSlug: string | null

  @column()
  declare healthy: boolean

  @column()
  declare hasWarnings: boolean

  @column()
  declare checks: CheckResult[]

  @column()
  declare triggeredBy: string | null

  @column()
  declare mode: RunMode

  @column()
  declare durationMs: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @belongsTo(() => Campaign, { foreignKey: 'campaignId' })
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => User, { foreignKey: 'triggeredBy' })
  declare user: BelongsTo<typeof User>
}
