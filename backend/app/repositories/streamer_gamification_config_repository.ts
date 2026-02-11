import { DateTime } from 'luxon'
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

  /**
   * Find all active rewards for a streamer in a specific campaign
   * Used when disabling rewards on authorization revoke/expiry
   */
  async findActiveByStreamerAndCampaign(
    streamerId: string,
    campaignId: string
  ): Promise<StreamerGamificationConfig[]> {
    return StreamerGamificationConfig.query()
      .where('streamerId', streamerId)
      .where('campaignId', campaignId)
      .where('twitchRewardStatus', 'active')
      .whereNotNull('twitchRewardId')
      .preload('event')
      .preload('streamer')
  }

  /**
   * Find ALL configs with a twitchRewardId for a streamer in a campaign
   * regardless of status (active, paused, orphaned).
   * Used during authorization revoke to ensure complete Twitch cleanup.
   */
  async findWithRewardIdByStreamerAndCampaign(
    streamerId: string,
    campaignId: string
  ): Promise<StreamerGamificationConfig[]> {
    return StreamerGamificationConfig.query()
      .where('streamerId', streamerId)
      .where('campaignId', campaignId)
      .whereNotNull('twitchRewardId')
      .preload('event')
      .preload('streamer')
  }

  // ========================================
  // CLEANUP & ORPHAN DETECTION
  // ========================================

  /**
   * Find all orphaned configs (deletion failed, reward may still exist on Twitch)
   * These are configs where status='orphaned' and twitchRewardId is not null
   */
  async findOrphanedConfigs(): Promise<StreamerGamificationConfig[]> {
    return StreamerGamificationConfig.query()
      .where('twitchRewardStatus', 'orphaned')
      .whereNotNull('twitchRewardId')
      .preload('streamer')
      .preload('event')
  }

  /**
   * Find orphaned configs that are due for cleanup retry
   * Based on nextDeletionRetryAt timestamp
   */
  async findOrphanedConfigsDueForRetry(): Promise<StreamerGamificationConfig[]> {
    return StreamerGamificationConfig.query()
      .where('twitchRewardStatus', 'orphaned')
      .whereNotNull('twitchRewardId')
      .where((query) => {
        query
          .whereNull('nextDeletionRetryAt')
          .orWhere('nextDeletionRetryAt', '<=', DateTime.now().toSQL())
      })
      .preload('streamer')
      .preload('event')
  }

  /**
   * Find all configs for a streamer that have a twitchRewardId
   * Used for full reconciliation (comparing DB state with Twitch state)
   */
  async findByStreamerWithAnyReward(streamerId: string): Promise<StreamerGamificationConfig[]> {
    return StreamerGamificationConfig.query()
      .where('streamerId', streamerId)
      .whereNotNull('twitchRewardId')
      .preload('event')
  }

  /**
   * Find all streamers that have active gamification configs
   * Returns unique streamer IDs
   */
  async findStreamersWithActiveConfigs(): Promise<string[]> {
    const configs = await StreamerGamificationConfig.query()
      .where('twitchRewardStatus', 'active')
      .whereNotNull('twitchRewardId')
      .select('streamerId')
      .distinct('streamerId')

    return configs.map((c) => c.streamerId)
  }

  /**
   * Mark a config as successfully cleaned up (orphan resolved)
   */
  async markAsDeleted(id: string): Promise<void> {
    const config = await StreamerGamificationConfig.find(id)
    if (!config) return

    config.twitchRewardId = null
    config.twitchRewardStatus = 'deleted'
    config.deletionFailedAt = null
    config.deletionRetryCount = 0
    config.nextDeletionRetryAt = null
    await config.save()
  }

  /**
   * Update orphan retry tracking after a failed cleanup attempt
   */
  async updateOrphanRetry(id: string, nextRetryAt: DateTime): Promise<void> {
    const config = await StreamerGamificationConfig.find(id)
    if (!config) return

    config.deletionRetryCount = (config.deletionRetryCount || 0) + 1
    config.nextDeletionRetryAt = nextRetryAt
    await config.save()
  }
}

export default StreamerGamificationConfigRepository
