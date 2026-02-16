import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { campaign as Campaign } from '#models/campaign'

class CampaignItemCategoryRule extends BaseModel {
  static table = 'campaign_item_category_rules'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'campaign_id' })
  declare campaignId: string

  /** Parent category: 'spell' | 'feature' | 'inventory' */
  @column()
  declare category: 'spell' | 'feature' | 'inventory'

  /** Sub-category (RPG-system dependent), e.g. 'evocation', 'cantrip', 'weapon' */
  @column()
  declare subcategory: string

  /** Raw Foundry VTT item type, e.g. 'spell', 'feat', 'weapon' */
  @column()
  declare itemType: string

  /** Field path to match inside the item data, e.g. 'system.school', 'system.type.value' */
  @column()
  declare matchField: string | null

  /** Expected value for matchField, e.g. 'evo', 'cantrip' */
  @column()
  declare matchValue: string | null

  /** Display label, e.g. "Évocation", "Cantrips", "Armes de mêlée" */
  @column()
  declare label: string

  /** Optional description */
  @column()
  declare description: string | null

  /** Lucide icon name, e.g. 'flame', 'sword', 'shield' */
  @column()
  declare icon: string | null

  /** Hex color for the badge, e.g. '#EF4444' */
  @column()
  declare color: string | null

  /** Whether this category can be targeted by spell_disable/buff/debuff */
  @column()
  declare isTargetable: boolean

  /** Weight for random selection (higher = more likely) */
  @column()
  declare weight: number

  /** Evaluation order (higher = evaluated first) */
  @column()
  declare priority: number

  @column()
  declare isEnabled: boolean

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

export default CampaignItemCategoryRule
export { CampaignItemCategoryRule }
