import CampaignItemCategoryRule from '#models/campaign_item_category_rule'
import { CampaignItemCategoryRuleRepository } from '#repositories/campaign_item_category_rule_repository'
import type {
  CreateItemCategoryRuleDto,
  UpdateItemCategoryRuleDto,
} from '#validators/mj/item_category_rule_validator'

export class ItemCategoryRuleService {
  constructor(private repository: CampaignItemCategoryRuleRepository) {}

  async list(campaignId: string): Promise<CampaignItemCategoryRule[]> {
    return this.repository.findByCampaign(campaignId)
  }

  async listByCategory(campaignId: string, category: string): Promise<CampaignItemCategoryRule[]> {
    return this.repository.findByCampaignAndCategory(campaignId, category)
  }

  async listTargetable(campaignId: string, category: string): Promise<CampaignItemCategoryRule[]> {
    return this.repository.findTargetableByCampaign(campaignId, category)
  }

  async create(
    campaignId: string,
    data: CreateItemCategoryRuleDto
  ): Promise<CampaignItemCategoryRule> {
    return this.repository.create({
      campaignId,
      category: data.category,
      subcategory: data.subcategory,
      itemType: data.itemType,
      matchField: data.matchField ?? null,
      matchValue: data.matchValue ?? null,
      label: data.label,
      description: data.description ?? null,
      icon: data.icon ?? null,
      color: data.color ?? null,
      isTargetable: data.isTargetable,
      weight: data.weight,
      priority: data.priority,
      isEnabled: data.isEnabled,
    })
  }

  async update(
    ruleId: string,
    campaignId: string,
    data: UpdateItemCategoryRuleDto
  ): Promise<CampaignItemCategoryRule> {
    const rule = await this.repository.findById(ruleId)
    if (!rule || rule.campaignId !== campaignId) {
      throw new Error('Rule not found')
    }

    rule.merge({
      ...(data.category !== undefined && { category: data.category }),
      ...(data.subcategory !== undefined && { subcategory: data.subcategory }),
      ...(data.itemType !== undefined && { itemType: data.itemType }),
      ...(data.matchField !== undefined && { matchField: data.matchField ?? null }),
      ...(data.matchValue !== undefined && { matchValue: data.matchValue ?? null }),
      ...(data.label !== undefined && { label: data.label }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.icon !== undefined && { icon: data.icon ?? null }),
      ...(data.color !== undefined && { color: data.color ?? null }),
      ...(data.isTargetable !== undefined && { isTargetable: data.isTargetable }),
      ...(data.weight !== undefined && { weight: data.weight }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
    })

    return this.repository.update(rule)
  }

  async delete(ruleId: string, campaignId: string): Promise<void> {
    const rule = await this.repository.findById(ruleId)
    if (!rule || rule.campaignId !== campaignId) {
      throw new Error('Rule not found')
    }

    await this.repository.delete(rule)
  }
}

export default ItemCategoryRuleService
