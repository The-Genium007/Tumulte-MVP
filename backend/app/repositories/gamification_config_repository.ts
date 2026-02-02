import CampaignGamificationConfig from '#models/campaign_gamification_config'

/**
 * GamificationConfigRepository - Accès aux configurations de gamification par campagne
 */
export class GamificationConfigRepository {
  /**
   * Trouve une config par son ID
   */
  async findById(id: string): Promise<CampaignGamificationConfig | null> {
    return CampaignGamificationConfig.find(id)
  }

  /**
   * Trouve une config par campagne et événement
   */
  async findByCampaignAndEvent(
    campaignId: string,
    eventId: string
  ): Promise<CampaignGamificationConfig | null> {
    return CampaignGamificationConfig.query()
      .where('campaignId', campaignId)
      .where('eventId', eventId)
      .preload('event')
      .first()
  }

  /**
   * Récupère toutes les configs d'une campagne
   */
  async findByCampaign(campaignId: string): Promise<CampaignGamificationConfig[]> {
    return CampaignGamificationConfig.query()
      .where('campaignId', campaignId)
      .preload('event')
      .orderBy('createdAt', 'asc')
  }

  /**
   * Récupère les configs actives d'une campagne
   */
  async findEnabledByCampaign(campaignId: string): Promise<CampaignGamificationConfig[]> {
    return CampaignGamificationConfig.query()
      .where('campaignId', campaignId)
      .where('isEnabled', true)
      .preload('event')
      .orderBy('createdAt', 'asc')
  }

  /**
   * Trouve une config par son Twitch Reward ID
   */
  async findByTwitchRewardId(rewardId: string): Promise<CampaignGamificationConfig | null> {
    return CampaignGamificationConfig.query()
      .where('twitchRewardId', rewardId)
      .preload('event')
      .first()
  }

  /**
   * Récupère les configs avec un trigger type spécifique
   */
  async findEnabledByTriggerType(
    campaignId: string,
    triggerType: 'dice_critical' | 'manual' | 'custom'
  ): Promise<CampaignGamificationConfig[]> {
    return CampaignGamificationConfig.query()
      .where('campaignId', campaignId)
      .where('isEnabled', true)
      .preload('event', (query) => {
        query.where('triggerType', triggerType)
      })
      .orderBy('createdAt', 'asc')
  }

  /**
   * Crée une nouvelle config
   */
  async create(data: Partial<CampaignGamificationConfig>): Promise<CampaignGamificationConfig> {
    return CampaignGamificationConfig.create(data)
  }

  /**
   * Met à jour une config
   */
  async update(config: CampaignGamificationConfig): Promise<CampaignGamificationConfig> {
    await config.save()
    return config
  }

  /**
   * Supprime une config
   */
  async delete(config: CampaignGamificationConfig): Promise<void> {
    await config.delete()
  }

  /**
   * Met à jour le Twitch Reward ID
   */
  async updateTwitchRewardId(configId: string, rewardId: string | null): Promise<void> {
    await CampaignGamificationConfig.query().where('id', configId).update({
      twitchRewardId: rewardId,
    })
  }

  /**
   * Active ou désactive une config
   */
  async setEnabled(configId: string, enabled: boolean): Promise<void> {
    await CampaignGamificationConfig.query().where('id', configId).update({
      isEnabled: enabled,
    })
  }
}

export default GamificationConfigRepository
