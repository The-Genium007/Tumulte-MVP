import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from '#models/campaign'

class CampaignCriticalityRule extends BaseModel {
  static table = 'campaign_criticality_rules'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'campaign_id' })
  declare campaignId: string

  /** Dice formula to match, e.g. "d20", "d100", "2d6", "*" for any */
  @column()
  declare diceFormula: string | null

  /** Condition expression, e.g. "== 20", "<= 1", ">= 96" */
  @column()
  declare resultCondition: string

  /** Which value to evaluate: 'max_die', 'min_die', 'total', 'any_die' */
  @column()
  declare resultField: string

  /** 'success' or 'failure' */
  @column()
  declare criticalType: 'success' | 'failure'

  /** 'minor', 'major', or 'extreme' */
  @column()
  declare severity: 'minor' | 'major' | 'extreme'

  /** Free-text label shown to users, e.g. "Fumble cosmique" */
  @column()
  declare label: string

  /** Optional explanation */
  @column()
  declare description: string | null

  /** Higher = evaluated first */
  @column()
  declare priority: number

  @column()
  declare isEnabled: boolean

  /** True for auto-generated rules from system presets */
  @column()
  declare isSystemPreset: boolean

  /** Unique preset identifier for idempotent upsert, e.g. 'dnd5e:nat20' */
  @column()
  declare presetKey: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Campaign, {
    foreignKey: 'campaignId',
  })
  declare campaign: BelongsTo<typeof Campaign>
}

export default CampaignCriticalityRule
export { CampaignCriticalityRule }
