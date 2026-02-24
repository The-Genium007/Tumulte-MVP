import CampaignItemCategoryRule from '#models/campaign_item_category_rule'

export class CampaignItemCategoryRuleRepository {
  async findById(id: string): Promise<CampaignItemCategoryRule | null> {
    return CampaignItemCategoryRule.find(id)
  }

  async findByCampaign(campaignId: string): Promise<CampaignItemCategoryRule[]> {
    return CampaignItemCategoryRule.query()
      .where('campaignId', campaignId)
      .orderBy('category', 'asc')
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'asc')
  }

  async findByCampaignAndCategory(
    campaignId: string,
    category: string
  ): Promise<CampaignItemCategoryRule[]> {
    return CampaignItemCategoryRule.query()
      .where('campaignId', campaignId)
      .where('category', category)
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'asc')
  }

  async findTargetableByCampaign(
    campaignId: string,
    category: string
  ): Promise<CampaignItemCategoryRule[]> {
    return CampaignItemCategoryRule.query()
      .where('campaignId', campaignId)
      .where('category', category)
      .where('isEnabled', true)
      .where('isTargetable', true)
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'asc')
  }

  async countByCampaign(campaignId: string): Promise<number> {
    const result = await CampaignItemCategoryRule.query()
      .where('campaignId', campaignId)
      .count('* as total')
    return Number(result[0].$extras.total)
  }

  async create(data: Partial<CampaignItemCategoryRule>): Promise<CampaignItemCategoryRule> {
    return CampaignItemCategoryRule.create(data)
  }

  async createMany(data: Partial<CampaignItemCategoryRule>[]): Promise<CampaignItemCategoryRule[]> {
    return CampaignItemCategoryRule.createMany(data)
  }

  async update(rule: CampaignItemCategoryRule): Promise<CampaignItemCategoryRule> {
    await rule.save()
    return rule
  }

  async delete(rule: CampaignItemCategoryRule): Promise<void> {
    await rule.delete()
  }

  async deleteByCampaign(campaignId: string): Promise<void> {
    await CampaignItemCategoryRule.query().where('campaignId', campaignId).delete()
  }
}

export default CampaignItemCategoryRuleRepository
