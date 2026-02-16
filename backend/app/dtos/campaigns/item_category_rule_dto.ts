import type CampaignItemCategoryRule from '#models/campaign_item_category_rule'

export class ItemCategoryRuleDto {
  id: string
  campaignId: string
  category: string
  subcategory: string
  itemType: string
  matchField: string | null
  matchValue: string | null
  label: string
  description: string | null
  icon: string | null
  color: string | null
  isTargetable: boolean
  weight: number
  priority: number
  isEnabled: boolean
  createdAt: string
  updatedAt: string

  constructor(rule: CampaignItemCategoryRule) {
    this.id = rule.id
    this.campaignId = rule.campaignId
    this.category = rule.category
    this.subcategory = rule.subcategory
    this.itemType = rule.itemType
    this.matchField = rule.matchField
    this.matchValue = rule.matchValue
    this.label = rule.label
    this.description = rule.description
    this.icon = rule.icon
    this.color = rule.color
    this.isTargetable = rule.isTargetable
    this.weight = rule.weight
    this.priority = rule.priority
    this.isEnabled = rule.isEnabled
    this.createdAt = rule.createdAt?.toISO() ?? ''
    this.updatedAt = rule.updatedAt?.toISO() ?? ''
  }

  static fromModel(rule: CampaignItemCategoryRule): ItemCategoryRuleDto {
    return new ItemCategoryRuleDto(rule)
  }

  static fromModelArray(rules: CampaignItemCategoryRule[]): ItemCategoryRuleDto[] {
    return rules.map((rule) => new ItemCategoryRuleDto(rule))
  }
}

export default ItemCategoryRuleDto
