import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import * as Sentry from '@sentry/node'
import { DateTime } from 'luxon'
import { streamer as Streamer } from '#models/streamer'
import { RewardManagerService } from '#services/gamification/reward_manager_service'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'
import { GamificationConfigRepository } from '#repositories/gamification_config_repository'
import { TwitchRewardService } from '#services/twitch/twitch_reward_service'
import type { TwitchEventSubService } from '#services/twitch/twitch_eventsub_service'

export interface AuthorizationGrantResult {
  created: number
  enabled: number
  failed: number
  errors: Array<{ eventId: string; error: string }>
}

export interface AuthorizationRevokeResult {
  deleted: number
  failed: number
  errors: Array<{ eventId: string; error: string }>
}

/**
 * GamificationAuthBridge - Bridge between authorization and gamification systems
 *
 * This service orchestrates the creation/deletion of Twitch Channel Points rewards
 * and EventSub subscriptions when a streamer grants or loses their 12h authorization
 * on a campaign.
 */
@inject()
export class GamificationAuthBridge {
  private eventSubService: TwitchEventSubService | null = null

  constructor(
    private rewardManager: RewardManagerService,
    private streamerConfigRepo: StreamerGamificationConfigRepository,
    private campaignConfigRepo: GamificationConfigRepository,
    private twitchRewardService: TwitchRewardService
  ) {}

  /**
   * Injecte le service EventSub (optionnel, setter injection)
   */
  setEventSubService(service: TwitchEventSubService): void {
    this.eventSubService = service
    logger.info('[GamificationAuthBridge] TwitchEventSubService injected successfully')
  }

  /**
   * Called when authorization is granted to a streamer (or MJ)
   * Creates/enables all Twitch rewards for enabled campaign events
   */
  async onAuthorizationGranted(
    campaignId: string,
    streamer: Streamer
  ): Promise<AuthorizationGrantResult> {
    logger.info(
      {
        campaignId,
        streamerId: streamer.id,
        hasEventSubService: !!this.eventSubService,
      },
      '[GamificationAuthBridge] onAuthorizationGranted called'
    )

    const result: AuthorizationGrantResult = {
      created: 0,
      enabled: 0,
      failed: 0,
      errors: [],
    }

    // Get all enabled gamification events for this campaign
    const enabledEvents = await this.campaignConfigRepo.findEnabledByCampaign(campaignId)

    if (enabledEvents.length === 0) {
      logger.info(
        { campaignId, streamerId: streamer.id },
        '[GamificationAuthBridge] No enabled events for campaign, skipping reward creation'
      )
      return result
    }

    logger.info(
      { campaignId, streamerId: streamer.id, eventCount: enabledEvents.length },
      '[GamificationAuthBridge] Creating rewards for enabled events'
    )

    // Create/enable reward for each enabled event
    for (const campaignConfig of enabledEvents) {
      try {
        // Check if streamer already has an active reward for this event
        const existingConfig = await this.streamerConfigRepo.findByStreamerCampaignAndEvent(
          streamer.id,
          campaignId,
          campaignConfig.eventId
        )

        if (existingConfig?.twitchRewardStatus === 'active') {
          // Already active, skip
          logger.debug(
            { campaignId, streamerId: streamer.id, eventId: campaignConfig.eventId },
            '[GamificationAuthBridge] Reward already active, skipping'
          )
          continue
        }

        // Create or re-enable the reward
        await this.rewardManager.enableForStreamer(
          streamer,
          campaignId,
          campaignConfig.eventId,
          existingConfig?.costOverride ?? undefined
        )

        if (
          existingConfig?.twitchRewardStatus === 'paused' ||
          existingConfig?.twitchRewardStatus === 'deleted'
        ) {
          result.enabled++
        } else {
          result.created++
        }
      } catch (error) {
        result.failed++
        result.errors.push({
          eventId: campaignConfig.eventId,
          error: error instanceof Error ? error.message : String(error),
        })
        logger.error(
          {
            campaignId,
            streamerId: streamer.id,
            eventId: campaignConfig.eventId,
            error: error instanceof Error ? error.message : String(error),
          },
          '[GamificationAuthBridge] Failed to create reward for event'
        )
      }
    }

    logger.info(
      {
        campaignId,
        streamerId: streamer.id,
        created: result.created,
        enabled: result.enabled,
        failed: result.failed,
      },
      '[GamificationAuthBridge] Finished creating rewards on authorization grant'
    )

    return result
  }

  /**
   * Called when authorization is revoked (manual or expiry)
   * Deletes ALL Twitch rewards for this streamer-campaign pair
   * regardless of their status (active, paused, orphaned).
   */
  async onAuthorizationRevoked(
    campaignId: string,
    streamer: Streamer
  ): Promise<AuthorizationRevokeResult> {
    const result: AuthorizationRevokeResult = {
      deleted: 0,
      failed: 0,
      errors: [],
    }

    // Find ALL configs with a twitchRewardId (not just active ones)
    // This ensures we clean up paused, orphaned, etc. rewards too
    const configs = await this.streamerConfigRepo.findWithRewardIdByStreamerAndCampaign(
      streamer.id,
      campaignId
    )

    if (configs.length === 0) {
      logger.info(
        { campaignId, streamerId: streamer.id },
        '[GamificationAuthBridge] No rewards with twitchRewardId to delete'
      )
      return result
    }

    logger.info(
      {
        campaignId,
        streamerId: streamer.id,
        rewardCount: configs.length,
        statuses: configs.map((c) => ({
          eventId: c.eventId,
          status: c.twitchRewardStatus,
          rewardId: c.twitchRewardId,
        })),
      },
      '[GamificationAuthBridge] Deleting ALL rewards on authorization revoke'
    )

    // Delete each reward from Twitch using deleteRewardWithRetry for resilience
    for (const config of configs) {
      try {
        if (!config.twitchRewardId) {
          continue
        }

        const deleteResult = await this.twitchRewardService.deleteRewardWithRetry(
          streamer,
          config.twitchRewardId
        )

        if (deleteResult.success) {
          // Clean DB state completely
          config.twitchRewardId = null
          config.twitchRewardStatus = 'deleted'
          config.isEnabled = false
          config.deletionFailedAt = null
          config.deletionRetryCount = 0
          config.nextDeletionRetryAt = null
          await config.save()

          result.deleted++
          logger.info(
            {
              campaignId,
              streamerId: streamer.id,
              eventId: config.eventId,
              wasAlreadyDeleted: deleteResult.isAlreadyDeleted,
            },
            '[GamificationAuthBridge] Reward deleted successfully'
          )
        } else {
          // Mark as orphaned for cleanup system
          config.twitchRewardStatus = 'orphaned'
          config.isEnabled = false
          config.deletionFailedAt = DateTime.now()
          config.deletionRetryCount = (config.deletionRetryCount || 0) + 1
          const backoffHours = Math.min(Math.pow(2, config.deletionRetryCount - 1), 24)
          config.nextDeletionRetryAt = DateTime.now().plus({ hours: backoffHours })
          await config.save()

          result.failed++
          result.errors.push({
            eventId: config.eventId,
            error: `Twitch API deletion failed, marked as orphaned. Next retry in ${backoffHours}h`,
          })

          logger.warn(
            {
              campaignId,
              streamerId: streamer.id,
              eventId: config.eventId,
              twitchRewardId: config.twitchRewardId,
              retryCount: config.deletionRetryCount,
              nextRetryAt: config.nextDeletionRetryAt?.toISO(),
            },
            '[GamificationAuthBridge] Reward deletion failed, marked as orphaned for cleanup'
          )
        }
      } catch (error) {
        result.failed++
        result.errors.push({
          eventId: config.eventId,
          error: error instanceof Error ? error.message : String(error),
        })
        logger.error(
          {
            campaignId,
            streamerId: streamer.id,
            eventId: config.eventId,
            error: error instanceof Error ? error.message : String(error),
          },
          '[GamificationAuthBridge] Failed to delete reward'
        )
      }
    }

    // Nettoyer les subscriptions EventSub pour ce broadcaster
    await this.cleanupEventSubSubscriptions(streamer, campaignId)

    logger.info(
      {
        campaignId,
        streamerId: streamer.id,
        deleted: result.deleted,
        failed: result.failed,
      },
      '[GamificationAuthBridge] Finished deleting rewards on authorization revoke'
    )

    return result
  }

  /**
   * Supprime les subscriptions EventSub pour un broadcaster lors de la révocation
   *
   * Méthode résiliente : un échec de cleanup EventSub ne bloque pas la
   * révocation d'autorisation. Les subscriptions orphelines seront nettoyées
   * par Twitch automatiquement (elles échoueront et seront révoquées).
   */
  private async cleanupEventSubSubscriptions(
    streamer: Streamer,
    campaignId: string
  ): Promise<void> {
    if (!this.eventSubService) {
      return
    }

    try {
      const cleanupResult = await this.eventSubService.deleteSubscriptionsForBroadcaster(
        streamer.twitchUserId,
        'channel.channel_points_custom_reward_redemption.add'
      )

      logger.info(
        {
          event: 'eventsub_cleanup_on_revoke',
          campaignId,
          streamerId: streamer.id,
          broadcasterId: streamer.twitchUserId,
          deleted: cleanupResult.deleted,
          failed: cleanupResult.failed,
        },
        '[GamificationAuthBridge] EventSub subscriptions cleanup completed'
      )
    } catch (error) {
      logger.error(
        {
          event: 'eventsub_cleanup_error',
          campaignId,
          streamerId: streamer.id,
          error: error instanceof Error ? error.message : String(error),
        },
        '[GamificationAuthBridge] Failed to cleanup EventSub subscriptions'
      )
      Sentry.captureException(error, {
        tags: {
          service: 'gamification_auth_bridge',
          operation: 'cleanupEventSubSubscriptions',
        },
        extra: { campaignId, streamerId: streamer.id },
      })
    }
  }
}

export default GamificationAuthBridge
