import cron from 'node-cron'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import { GamificationAuthBridge } from '#services/gamification/gamification_auth_bridge'

// Run every 5 minutes to check for expired authorizations
const CRON_EXPRESSION = '*/5 * * * *'

/**
 * Scheduler for automatic authorization expiry handling
 *
 * This scheduler periodically checks for expired poll authorizations
 * and cleans them up by:
 * 1. Deleting associated Twitch Channel Points rewards
 * 2. Clearing the authorization timestamps in the database
 */
export class AuthorizationExpiryScheduler {
  private job: cron.ScheduledTask | null = null
  private membershipRepository: CampaignMembershipRepository
  private gamificationBridge: GamificationAuthBridge

  constructor() {
    this.membershipRepository = new CampaignMembershipRepository()
    // GamificationAuthBridge has dependencies, we need to instantiate them
    // Using dynamic import to avoid circular dependencies
    this.gamificationBridge = null as unknown as GamificationAuthBridge
  }

  /**
   * Initialize the bridge (called after container is ready)
   */
  private async initializeBridge(): Promise<void> {
    if (this.gamificationBridge) return

    const { RewardManagerService } = await import('#services/gamification/reward_manager_service')
    const { StreamerGamificationConfigRepository } =
      await import('#repositories/streamer_gamification_config_repository')
    const { GamificationConfigRepository } =
      await import('#repositories/gamification_config_repository')
    const { TwitchRewardService } = await import('#services/twitch/twitch_reward_service')

    const streamerConfigRepo = new StreamerGamificationConfigRepository()
    const campaignConfigRepo = new GamificationConfigRepository()
    const twitchRewardService = new TwitchRewardService()
    const rewardManager = new RewardManagerService(
      streamerConfigRepo,
      campaignConfigRepo,
      twitchRewardService
    )

    // Injecter le TwitchEventSubService si disponible dans le container
    let twitchEventSubService = null
    try {
      twitchEventSubService = await app.container.make('twitchEventSubService')
      rewardManager.setEventSubService(twitchEventSubService)
    } catch {
      // EventSub non disponible dans ce contexte — pas bloquant
    }

    this.gamificationBridge = new GamificationAuthBridge(
      rewardManager,
      streamerConfigRepo,
      campaignConfigRepo,
      twitchRewardService
    )

    // Injecter le TwitchEventSubService dans le bridge aussi
    if (twitchEventSubService) {
      this.gamificationBridge.setEventSubService(twitchEventSubService)
    }
  }

  /**
   * Start the scheduler
   * Called at application boot
   */
  start(): void {
    if (this.job) {
      logger.warn('[Scheduler] Authorization expiry scheduler already running')
      return
    }

    this.job = cron.schedule(CRON_EXPRESSION, async () => {
      await this.processExpiredAuthorizations()
    })

    logger.info('[Scheduler] Authorization expiry scheduler started (every 5 minutes)')
  }

  /**
   * Stop the scheduler
   * Called at application shutdown
   */
  stop(): void {
    if (this.job) {
      this.job.stop()
      this.job = null
    }
    logger.info('[Scheduler] Authorization expiry scheduler stopped')
  }

  /**
   * Process all expired authorizations
   */
  private async processExpiredAuthorizations(): Promise<void> {
    logger.info('[Scheduler] Starting expired authorization check')

    try {
      // Ensure bridge is initialized
      await this.initializeBridge()

      // Find all memberships with expired authorization
      const expiredMemberships = await this.membershipRepository.findExpiredAuthorizations()

      if (expiredMemberships.length === 0) {
        logger.debug('[Scheduler] No expired authorizations found')
        return
      }

      logger.info(
        { count: expiredMemberships.length },
        '[Scheduler] Found expired authorizations to process'
      )

      let processed = 0
      let failed = 0

      for (const membership of expiredMemberships) {
        try {
          // Load the streamer if not already loaded
          if (!membership.streamer) {
            await membership.load('streamer')
          }

          const streamer = membership.streamer
          if (!streamer) {
            logger.warn(
              { membershipId: membership.id },
              '[Scheduler] Membership has no streamer, skipping'
            )
            continue
          }

          // Delete gamification rewards
          const result = await this.gamificationBridge.onAuthorizationRevoked(
            membership.campaignId,
            streamer
          )

          logger.info(
            {
              membershipId: membership.id,
              campaignId: membership.campaignId,
              streamerId: streamer.id,
              rewardsDeleted: result.deleted,
              rewardsFailed: result.failed,
            },
            '[Scheduler] Processed expired authorization'
          )

          // Clear the authorization timestamps
          await this.membershipRepository.clearPollAuthorization(membership)

          processed++
        } catch (error) {
          failed++
          logger.error(
            {
              membershipId: membership.id,
              error: error instanceof Error ? error.message : String(error),
            },
            '[Scheduler] Failed to process expired authorization'
          )
        }
      }

      logger.info(
        { processed, failed, total: expiredMemberships.length },
        '[Scheduler] Completed expired authorization processing'
      )
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[Scheduler] Error during expired authorization check'
      )
    }
  }

  /**
   * Manually trigger processing (for testing)
   */
  async triggerManualProcessing(): Promise<void> {
    await this.processExpiredAuthorizations()
  }
}

export default AuthorizationExpiryScheduler
