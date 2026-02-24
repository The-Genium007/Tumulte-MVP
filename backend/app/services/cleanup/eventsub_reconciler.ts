import logger from '@adonisjs/core/services/logger'
import * as Sentry from '@sentry/node'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'
import type {
  TwitchEventSubService,
  EventSubSubscription,
} from '#services/twitch/twitch_eventsub_service'

export interface EventSubReconciliationResult {
  subscriptionsChecked: number
  missingRecreated: number
  failedRecreated: number
  orphanedDeleted: number
  errors: Array<{ streamerId: string; error: string }>
}

/**
 * EventSubReconciler - Réconciliation des subscriptions EventSub au démarrage
 *
 * Vérifie que chaque config DB avec un reward actif a bien une subscription
 * EventSub correspondante côté Twitch. Recrée les subscriptions manquantes
 * et supprime les orphelines.
 */
export class EventSubReconciler {
  constructor(
    private streamerConfigRepo: StreamerGamificationConfigRepository,
    private eventSubService: TwitchEventSubService
  ) {}

  async reconcile(): Promise<EventSubReconciliationResult> {
    const result: EventSubReconciliationResult = {
      subscriptionsChecked: 0,
      missingRecreated: 0,
      failedRecreated: 0,
      orphanedDeleted: 0,
      errors: [],
    }

    logger.info('[EventSubReconciler] Starting EventSub reconciliation...')

    try {
      // 1. Lister toutes les subscriptions EventSub côté Twitch pour notre type
      const twitchSubscriptions = await this.eventSubService.listSubscriptions(
        'channel.channel_points_custom_reward_redemption.add'
      )

      logger.info(
        { count: twitchSubscriptions.length },
        '[EventSubReconciler] Found Twitch EventSub subscriptions'
      )

      // 2. Trouver tous les streamers avec des configs actives en DB
      const activeStreamerIds = await this.streamerConfigRepo.findStreamersWithActiveConfigs()

      if (activeStreamerIds.length === 0) {
        logger.info('[EventSubReconciler] No active configs in DB, checking for orphans only')
        // Supprimer les subscriptions orphelines s'il y en a
        result.orphanedDeleted = await this.cleanupOrphanedSubscriptions(twitchSubscriptions, [])
        return result
      }

      // 3. Pour chaque streamer actif, vérifier les subscriptions
      for (const streamerId of activeStreamerIds) {
        try {
          const configs = await this.streamerConfigRepo.findByStreamerWithAnyReward(streamerId)
          const activeConfigs = configs.filter(
            (c) => c.twitchRewardStatus === 'active' && c.twitchRewardId
          )

          if (activeConfigs.length === 0) continue

          // Charger le streamer pour avoir le twitchUserId
          const firstConfig = activeConfigs[0]
          await firstConfig.load('streamer')
          const streamer = firstConfig.streamer

          if (!streamer) {
            logger.warn(
              { streamerId },
              '[EventSubReconciler] Streamer not found for config, skipping'
            )
            continue
          }

          // Vérifier chaque config active
          for (const config of activeConfigs) {
            result.subscriptionsChecked++

            const hasSubscription = this.findMatchingSubscription(
              twitchSubscriptions,
              streamer.twitchUserId,
              config.twitchRewardId!
            )

            if (!hasSubscription) {
              logger.warn(
                {
                  streamerId,
                  broadcasterId: streamer.twitchUserId,
                  rewardId: config.twitchRewardId,
                  eventId: config.eventId,
                },
                '[EventSubReconciler] Missing EventSub subscription, recreating...'
              )

              /* eslint-disable camelcase */
              const sub = await this.eventSubService.createSubscription({
                type: 'channel.channel_points_custom_reward_redemption.add',
                condition: {
                  broadcaster_user_id: streamer.twitchUserId,
                  reward_id: config.twitchRewardId!,
                },
                /* eslint-enable camelcase */
                metadata: {
                  source: 'eventsub_reconciler',
                  streamerId,
                  eventId: config.eventId,
                },
              })

              if (sub) {
                result.missingRecreated++
                logger.info(
                  {
                    streamerId,
                    rewardId: config.twitchRewardId,
                    subscriptionId: sub.id,
                  },
                  '[EventSubReconciler] EventSub subscription recreated successfully'
                )
              } else {
                result.failedRecreated++
                result.errors.push({
                  streamerId,
                  error: `Failed to recreate subscription for reward ${config.twitchRewardId}`,
                })
              }
            }
          }
        } catch (error) {
          result.errors.push({
            streamerId,
            error: error instanceof Error ? error.message : String(error),
          })
          logger.error(
            { streamerId, error: error instanceof Error ? error.message : String(error) },
            '[EventSubReconciler] Error reconciling streamer'
          )
        }
      }

      // 4. Supprimer les subscriptions orphelines (pas de config active correspondante)
      const allActiveConfigs = await this.getAllActiveRewardIds()
      result.orphanedDeleted = await this.cleanupOrphanedSubscriptions(
        twitchSubscriptions,
        allActiveConfigs
      )
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[EventSubReconciler] Fatal error during reconciliation'
      )
      Sentry.captureException(error, {
        tags: { service: 'eventsub_reconciler', operation: 'reconcile' },
      })
      result.errors.push({
        streamerId: 'global',
        error: error instanceof Error ? error.message : String(error),
      })
    }

    logger.info(
      {
        event: 'eventsub_reconciliation_completed',
        ...result,
        errorCount: result.errors.length,
      },
      '[EventSubReconciler] EventSub reconciliation completed'
    )

    return result
  }

  /**
   * Cherche une subscription EventSub correspondant à un broadcaster + reward
   */
  private findMatchingSubscription(
    subscriptions: EventSubSubscription[],
    broadcasterId: string,
    rewardId: string
  ): boolean {
    return subscriptions.some(
      (sub) =>
        sub.condition.broadcaster_user_id === broadcasterId &&
        sub.condition.reward_id === rewardId &&
        (sub.status === 'enabled' || sub.status === 'webhook_callback_verification_pending')
    )
  }

  /**
   * Supprime les subscriptions EventSub qui n'ont pas de config active en DB
   */
  private async cleanupOrphanedSubscriptions(
    subscriptions: EventSubSubscription[],
    activeRewardIds: string[]
  ): Promise<number> {
    let deleted = 0

    for (const sub of subscriptions) {
      const rewardId = sub.condition.reward_id
      if (!rewardId) continue

      // Si cette subscription a un reward_id qui n'est pas dans nos configs actives
      if (!activeRewardIds.includes(rewardId)) {
        logger.info(
          {
            subscriptionId: sub.id,
            broadcasterId: sub.condition.broadcaster_user_id,
            rewardId,
            status: sub.status,
          },
          '[EventSubReconciler] Deleting orphaned EventSub subscription'
        )

        const success = await this.eventSubService.deleteSubscription(sub.id)
        if (success) {
          deleted++
        }
      }
    }

    return deleted
  }

  /**
   * Récupère tous les reward IDs actifs en DB
   */
  private async getAllActiveRewardIds(): Promise<string[]> {
    const activeStreamerIds = await this.streamerConfigRepo.findStreamersWithActiveConfigs()
    const allRewardIds: string[] = []

    for (const streamerId of activeStreamerIds) {
      const configs = await this.streamerConfigRepo.findByStreamerWithAnyReward(streamerId)
      for (const config of configs) {
        if (config.twitchRewardStatus === 'active' && config.twitchRewardId) {
          allRewardIds.push(config.twitchRewardId)
        }
      }
    }

    return allRewardIds
  }
}

export default EventSubReconciler
