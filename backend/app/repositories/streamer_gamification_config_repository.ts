import StreamerGamificationConfig from '#models/streamer_gamification_config'
import type { TwitchRewardStatus } from '#models/streamer_gamification_config'

/**
 * StreamerGamificationConfigRepository - Accès aux configs gamification des streamers
 */
export class StreamerGamificationConfigRepository {
  /**
   * Trouve une config par son ID
   */
  async findById(id: string): Promise<StreamerGamificationConfig | null> {
    return StreamerGamificationConfig.find(id)
  }

  /**
   * Trouve toutes les configs d'un streamer pour une campagne
   */
  async findByStreamerAndCampaign(
    streamerId: string,
    campaignId: string
  ): Promise<StreamerGamificationConfig[]> {
    return StreamerGamificationConfig.query()
      .where('streamerId', streamerId)
      .where('campaignId', campaignId)
      .preload('event')
  }

  /**
   * Trouve une config spécifique (streamer + campagne + événement)
   */
  async findByStreamerCampaignAndEvent(
    streamerId: string,
    campaignId: string,
    eventId: string
  ): Promise<StreamerGamificationConfig | null> {
    return StreamerGamificationConfig.query()
      .where('streamerId', streamerId)
      .where('campaignId', campaignId)
      .where('eventId', eventId)
      .preload('event')
      .first()
  }

  /**
   * Trouve une config par son Twitch Reward ID
   */
  async findByTwitchRewardId(twitchRewardId: string): Promise<StreamerGamificationConfig | null> {
    return StreamerGamificationConfig.query()
      .where('twitchRewardId', twitchRewardId)
      .preload('event')
      .preload('streamer')
      .first()
  }

  /**
   * Trouve toutes les configs actives pour une campagne et un événement
   * (pour désactiver en cascade quand le MJ désactive)
   */
  async findEnabledByCampaignAndEvent(
    campaignId: string,
    eventId: string
  ): Promise<StreamerGamificationConfig[]> {
    return StreamerGamificationConfig.query()
      .where('campaignId', campaignId)
      .where('eventId', eventId)
      .where('isEnabled', true)
      .preload('streamer')
  }

  /**
   * Trouve toutes les configs avec un reward Twitch actif pour une campagne
   */
  async findWithActiveRewardsByCampaign(campaignId: string): Promise<StreamerGamificationConfig[]> {
    return StreamerGamificationConfig.query()
      .where('campaignId', campaignId)
      .where('twitchRewardStatus', 'active')
      .whereNotNull('twitchRewardId')
      .preload('streamer')
      .preload('event')
  }

  /**
   * Crée une nouvelle config
   */
  async create(data: {
    campaignId: string
    streamerId: string
    eventId: string
    isEnabled?: boolean
    costOverride?: number | null
  }): Promise<StreamerGamificationConfig> {
    return StreamerGamificationConfig.create({
      campaignId: data.campaignId,
      streamerId: data.streamerId,
      eventId: data.eventId,
      isEnabled: data.isEnabled ?? false,
      costOverride: data.costOverride ?? null,
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
    })
  }

  /**
   * Met à jour le statut du reward Twitch
   */
  async updateTwitchReward(
    id: string,
    twitchRewardId: string | null,
    status: TwitchRewardStatus
  ): Promise<StreamerGamificationConfig | null> {
    const config = await StreamerGamificationConfig.find(id)
    if (!config) return null

    config.twitchRewardId = twitchRewardId
    config.twitchRewardStatus = status
    await config.save()

    return config
  }

  /**
   * Active ou désactive une config
   */
  async setEnabled(id: string, isEnabled: boolean): Promise<StreamerGamificationConfig | null> {
    const config = await StreamerGamificationConfig.find(id)
    if (!config) return null

    config.isEnabled = isEnabled
    await config.save()

    return config
  }

  /**
   * Met à jour le coût override
   */
  async updateCostOverride(
    id: string,
    costOverride: number | null
  ): Promise<StreamerGamificationConfig | null> {
    const config = await StreamerGamificationConfig.find(id)
    if (!config) return null

    config.costOverride = costOverride
    await config.save()

    return config
  }

  /**
   * Supprime une config
   */
  async delete(id: string): Promise<boolean> {
    const config = await StreamerGamificationConfig.find(id)
    if (!config) return false

    await config.delete()
    return true
  }
}

export default StreamerGamificationConfigRepository
