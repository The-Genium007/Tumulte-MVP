import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import * as Sentry from '@sentry/node'
import { DateTime } from 'luxon'
import StreamerGamificationConfig from '#models/streamer_gamification_config'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'

const STALE_ORPHAN_THRESHOLD_DAYS = 3

/**
 * OrphanDetector - Détecte les rewards orphelins dans la base de données
 *
 * Un reward orphelin est une config avec:
 * - twitchRewardStatus = 'orphaned'
 * - twitchRewardId non null (on a encore la référence)
 *
 * Ces configs représentent des rewards qui existent potentiellement sur Twitch
 * mais dont la suppression a échoué.
 */
@inject()
export class OrphanDetector {
  constructor(private configRepo: StreamerGamificationConfigRepository) {}

  /**
   * Trouve toutes les configs orphelines (status = 'orphaned')
   */
  async findOrphanedConfigs(): Promise<StreamerGamificationConfig[]> {
    const orphans = await this.configRepo.findOrphanedConfigs()

    if (orphans.length > 0) {
      logger.info(
        {
          event: 'orphans_found',
          count: orphans.length,
          orphans: orphans.map((o) => ({
            configId: o.id,
            streamerId: o.streamerId,
            rewardId: o.twitchRewardId,
            retryCount: o.deletionRetryCount,
          })),
        },
        '[OrphanDetector] Found orphaned configs'
      )
    }

    return orphans
  }

  /**
   * Trouve les configs orphelines qui sont prêtes pour un retry
   * (nextDeletionRetryAt est null ou dans le passé)
   */
  async findOrphansDueForRetry(): Promise<StreamerGamificationConfig[]> {
    const dueOrphans = await this.configRepo.findOrphanedConfigsDueForRetry()

    if (dueOrphans.length > 0) {
      logger.debug(
        {
          event: 'orphans_due_for_retry',
          count: dueOrphans.length,
        },
        '[OrphanDetector] Found orphans due for cleanup retry'
      )
    }

    return dueOrphans
  }

  /**
   * Compte le nombre total d'orphelins
   */
  async countOrphans(): Promise<number> {
    const orphans = await this.configRepo.findOrphanedConfigs()
    return orphans.length
  }

  /**
   * Vérifie si une config spécifique est orpheline
   */
  async isOrphaned(configId: string): Promise<boolean> {
    const config = await this.configRepo.findById(configId)
    if (!config) return false
    return config.twitchRewardStatus === 'orphaned' && config.twitchRewardId !== null
  }

  /**
   * Détecte les orphelins stale (bloqués depuis plus de N jours)
   * et émet une alerte Sentry pour visibilité opérationnelle
   */
  async detectStaleOrphans(): Promise<StreamerGamificationConfig[]> {
    const threshold = DateTime.now().minus({ days: STALE_ORPHAN_THRESHOLD_DAYS })
    const staleOrphans = await this.configRepo.findStaleOrphans(threshold)

    if (staleOrphans.length > 0) {
      logger.error(
        {
          event: 'stale_orphans_detected',
          count: staleOrphans.length,
          orphans: staleOrphans.map((o) => ({
            configId: o.id,
            streamerId: o.streamerId,
            retryCount: o.deletionRetryCount,
            failedSince: o.deletionFailedAt?.toISO(),
          })),
        },
        `[OrphanDetector] Stale orphans detected (stuck > ${STALE_ORPHAN_THRESHOLD_DAYS} days)`
      )

      Sentry.captureMessage(`${staleOrphans.length} stale orphan rewards detected`, {
        level: 'warning',
        tags: { service: 'OrphanDetector' },
        extra: {
          count: staleOrphans.length,
          thresholdDays: STALE_ORPHAN_THRESHOLD_DAYS,
        },
      })
    }

    return staleOrphans
  }
}

export default OrphanDetector
