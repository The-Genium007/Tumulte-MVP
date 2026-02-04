import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { streamer as Streamer } from '#models/streamer'
import StreamerGamificationConfig from '#models/streamer_gamification_config'
import { TwitchRewardService } from '#services/twitch/twitch_reward_service'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'
import { CleanupAuditService } from './cleanup_audit_service.js'

/**
 * Rapport de réconciliation pour un streamer
 */
export interface StreamerReconciliationReport {
  streamerId: string
  streamerName: string
  dbRewardIds: string[]
  twitchRewardIds: string[]
  orphansOnTwitch: string[] // Rewards sur Twitch mais DB dit deleted/orphaned
  phantomsInDb: string[] // DB dit active mais pas sur Twitch
}

/**
 * Résultat du nettoyage des orphelins
 */
export interface OrphanCleanupResult {
  total: number
  cleaned: number
  alreadyDeleted: number
  failed: number
  errors: Array<{ configId: string; error: string }>
}

/**
 * Résultat de la réconciliation complète
 */
export interface FullReconciliationResult {
  streamersProcessed: number
  orphansFound: number
  orphansCleaned: number
  phantomsFixed: number
  errors: Array<{ streamerId: string; error: string }>
}

/**
 * TwitchRewardReconciler - Compare l'état DB avec l'état réel Twitch
 *
 * Ce service est responsable de:
 * 1. Nettoyer les configs orphelines (status='orphaned' avec twitchRewardId)
 * 2. Comparer l'état DB avec l'état réel Twitch pour détecter les incohérences
 * 3. Nettoyer les "cadavres" historiques (rewards sur Twitch non trackés en DB)
 */
@inject()
export class TwitchRewardReconciler {
  constructor(
    private twitchRewardService: TwitchRewardService,
    private configRepo: StreamerGamificationConfigRepository,
    private auditService: CleanupAuditService
  ) {}

  /**
   * Nettoie les configs orphelines (suppression avec retry)
   *
   * Pour chaque config orpheline:
   * 1. Tente de supprimer le reward sur Twitch
   * 2. Si succès ou 404: marque comme deleted
   * 3. Si échec: incrémente le retry counter avec backoff
   */
  async cleanupOrphans(orphanConfigs: StreamerGamificationConfig[]): Promise<OrphanCleanupResult> {
    const result: OrphanCleanupResult = {
      total: orphanConfigs.length,
      cleaned: 0,
      alreadyDeleted: 0,
      failed: 0,
      errors: [],
    }

    for (const config of orphanConfigs) {
      try {
        if (!config.twitchRewardId) {
          // Pas d'ID, juste marquer comme deleted
          await this.configRepo.markAsDeleted(config.id)
          result.cleaned++
          continue
        }

        // S'assurer que le streamer est chargé
        if (!config.streamer) {
          await config.load('streamer')
        }

        const streamer = config.streamer
        if (!streamer) {
          logger.warn(
            { configId: config.id, streamerId: config.streamerId },
            '[Reconciler] Streamer not found for orphan config'
          )
          result.failed++
          result.errors.push({ configId: config.id, error: 'Streamer not found' })
          continue
        }

        this.auditService.logOrphanDetected(config.id, streamer.id, config.twitchRewardId)

        // Tenter la suppression avec retry
        const deleteResult = await this.twitchRewardService.deleteRewardWithRetry(
          streamer,
          config.twitchRewardId,
          {
            service: 'TwitchRewardReconciler',
            operation: 'cleanupOrphan',
            metadata: { configId: config.id, streamerId: streamer.id },
          }
        )

        if (deleteResult.success) {
          await this.configRepo.markAsDeleted(config.id)

          if (deleteResult.isAlreadyDeleted) {
            this.auditService.logOrphanAlreadyDeleted(config.id, streamer.id, config.twitchRewardId)
            result.alreadyDeleted++
          } else {
            this.auditService.logOrphanCleaned(config.id, streamer.id, config.twitchRewardId)
            result.cleaned++
          }
        } else {
          // Échec - planifier un retry avec backoff
          const retryCount = (config.deletionRetryCount || 0) + 1
          const backoffHours = Math.min(Math.pow(2, retryCount - 1), 24)
          const nextRetry = DateTime.now().plus({ hours: backoffHours })

          await this.configRepo.updateOrphanRetry(config.id, nextRetry)

          this.auditService.logOrphanCleanupFailed(
            config.id,
            streamer.id,
            config.twitchRewardId,
            `Retry scheduled in ${backoffHours}h`
          )

          result.failed++
          result.errors.push({
            configId: config.id,
            error: `Deletion failed, retry #${retryCount} in ${backoffHours}h`,
          })
        }
      } catch (error) {
        result.failed++
        result.errors.push({
          configId: config.id,
          error: error instanceof Error ? error.message : String(error),
        })
        logger.error({ configId: config.id, error }, '[Reconciler] Error cleaning orphan config')
      }
    }

    logger.info(
      {
        event: 'orphan_cleanup_completed',
        total: result.total,
        cleaned: result.cleaned,
        alreadyDeleted: result.alreadyDeleted,
        failed: result.failed,
      },
      '[Reconciler] Orphan cleanup completed'
    )

    return result
  }

  /**
   * Réconcilie un streamer spécifique (compare DB vs Twitch)
   */
  async reconcileStreamer(streamer: Streamer): Promise<StreamerReconciliationReport> {
    const report: StreamerReconciliationReport = {
      streamerId: streamer.id,
      streamerName: streamer.twitchDisplayName || streamer.twitchUserId,
      dbRewardIds: [],
      twitchRewardIds: [],
      orphansOnTwitch: [],
      phantomsInDb: [],
    }

    try {
      // Récupérer les rewards sur Twitch
      const twitchRewards = await this.twitchRewardService.listRewards(streamer)
      report.twitchRewardIds = twitchRewards.map((r) => r.id)

      // Récupérer les configs DB avec un rewardId
      const dbConfigs = await this.configRepo.findByStreamerWithAnyReward(streamer.id)
      report.dbRewardIds = dbConfigs.filter((c) => c.twitchRewardId).map((c) => c.twitchRewardId!)

      // Configs "actives" en DB
      const activeDbRewardIds = dbConfigs
        .filter((c) => c.twitchRewardStatus === 'active' && c.twitchRewardId)
        .map((c) => c.twitchRewardId!)

      // Trouver les orphelins sur Twitch (exist sur Twitch mais pas actif en DB)
      for (const twitchReward of twitchRewards) {
        if (!activeDbRewardIds.includes(twitchReward.id)) {
          report.orphansOnTwitch.push(twitchReward.id)
          this.auditService.logRewardStateMismatch(
            streamer.id,
            twitchReward.id,
            'not_active_in_db',
            true
          )
        }
      }

      // Trouver les fantômes en DB (actif en DB mais pas sur Twitch)
      for (const dbRewardId of activeDbRewardIds) {
        if (!report.twitchRewardIds.includes(dbRewardId)) {
          report.phantomsInDb.push(dbRewardId)
          this.auditService.logRewardStateMismatch(streamer.id, dbRewardId, 'active', false)
        }
      }
    } catch (error) {
      logger.error({ streamerId: streamer.id, error }, '[Reconciler] Error reconciling streamer')
    }

    return report
  }

  /**
   * Réconciliation complète - compare tous les streamers avec Twitch
   *
   * Cette méthode est utilisée au démarrage pour nettoyer les "cadavres"
   * historiques qui existaient avant la correction du bug.
   */
  async fullReconciliation(): Promise<FullReconciliationResult> {
    const result: FullReconciliationResult = {
      streamersProcessed: 0,
      orphansFound: 0,
      orphansCleaned: 0,
      phantomsFixed: 0,
      errors: [],
    }

    // Trouver tous les streamers avec des configs actives
    const streamerIds = await this.configRepo.findStreamersWithActiveConfigs()
    this.auditService.logFullReconciliationStarted(streamerIds.length)

    logger.info({ streamerCount: streamerIds.length }, '[Reconciler] Starting full reconciliation')

    for (const streamerId of streamerIds) {
      try {
        const streamer = await Streamer.find(streamerId)
        if (!streamer) {
          result.errors.push({ streamerId, error: 'Streamer not found' })
          continue
        }

        const report = await this.reconcileStreamer(streamer)
        result.streamersProcessed++

        // Nettoyer les orphelins sur Twitch
        for (const orphanRewardId of report.orphansOnTwitch) {
          result.orphansFound++

          const deleteResult = await this.twitchRewardService.deleteRewardWithRetry(
            streamer,
            orphanRewardId,
            {
              service: 'TwitchRewardReconciler',
              operation: 'fullReconciliation',
              metadata: { streamerId, orphanRewardId },
            }
          )

          if (deleteResult.success) {
            result.orphansCleaned++
            logger.info(
              { streamerId, rewardId: orphanRewardId },
              '[Reconciler] Cleaned orphan reward from Twitch'
            )
          }
        }

        // Corriger les fantômes en DB (marquer comme deleted)
        for (const phantomRewardId of report.phantomsInDb) {
          const config = await this.configRepo.findByTwitchRewardId(phantomRewardId)
          if (config) {
            await this.configRepo.markAsDeleted(config.id)
            result.phantomsFixed++
            logger.warn(
              { streamerId, rewardId: phantomRewardId, configId: config.id },
              '[Reconciler] Fixed phantom config (reward missing from Twitch)'
            )
          }
        }
      } catch (error) {
        result.errors.push({
          streamerId,
          error: error instanceof Error ? error.message : String(error),
        })
        logger.error({ streamerId, error }, '[Reconciler] Error during full reconciliation')
      }
    }

    this.auditService.logFullReconciliationCompleted({
      found: result.orphansFound,
      cleaned: result.orphansCleaned,
      failed: result.errors.length,
    })

    logger.info(
      {
        event: 'full_reconciliation_completed',
        ...result,
      },
      '[Reconciler] Full reconciliation completed'
    )

    return result
  }
}

export default TwitchRewardReconciler
