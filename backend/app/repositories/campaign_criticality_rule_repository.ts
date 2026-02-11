import CampaignCriticalityRule from '#models/campaign_criticality_rule'

export class CampaignCriticalityRuleRepository {
  /**
   * Trouve une règle par son ID
   */
  async findById(id: string): Promise<CampaignCriticalityRule | null> {
    return CampaignCriticalityRule.find(id)
  }

  /**
   * Récupère toutes les règles d'une campagne (triées par priorité desc)
   */
  async findByCampaign(campaignId: string): Promise<CampaignCriticalityRule[]> {
    return CampaignCriticalityRule.query()
      .where('campaignId', campaignId)
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'asc')
  }

  /**
   * Récupère uniquement les règles actives d'une campagne
   */
  async findEnabledByCampaign(campaignId: string): Promise<CampaignCriticalityRule[]> {
    return CampaignCriticalityRule.query()
      .where('campaignId', campaignId)
      .where('isEnabled', true)
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'asc')
  }

  /**
   * Crée une nouvelle règle
   */
  async create(data: Partial<CampaignCriticalityRule>): Promise<CampaignCriticalityRule> {
    return CampaignCriticalityRule.create(data)
  }

  /**
   * Met à jour une règle existante
   */
  async update(rule: CampaignCriticalityRule): Promise<CampaignCriticalityRule> {
    await rule.save()
    return rule
  }

  /**
   * Supprime une règle
   */
  async delete(rule: CampaignCriticalityRule): Promise<void> {
    await rule.delete()
  }
}

export default CampaignCriticalityRuleRepository
