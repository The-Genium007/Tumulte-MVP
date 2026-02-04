import logger from '@adonisjs/core/services/logger'

/**
 * Types d'événements pour l'audit du cleanup
 */
export type CleanupEventType =
  | 'reconciliation_started'
  | 'reconciliation_completed'
  | 'instances_expired'
  | 'contributions_refunded'
  | 'orphan_detected'
  | 'orphan_cleaned'
  | 'orphan_cleanup_failed'
  | 'orphan_already_deleted'
  | 'reward_state_mismatch'
  | 'full_reconciliation_started'
  | 'full_reconciliation_completed'

/**
 * Données d'audit pour le cleanup
 */
export interface CleanupAuditData {
  event: CleanupEventType
  count?: number
  streamerId?: string
  rewardId?: string
  configId?: string
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * CleanupAuditService - Service d'audit pour le système de cleanup
 *
 * Suit le pattern de AuthAuditService pour une traçabilité complète
 * des opérations de nettoyage des rewards orphelins.
 */
export class CleanupAuditService {
  private readonly prefix = '[CleanupAudit]'

  /**
   * Log un événement d'audit
   */
  log(data: CleanupAuditData): void {
    const logData = {
      audit: 'cleanup',
      event: data.event,
      count: data.count,
      streamerId: data.streamerId,
      rewardId: data.rewardId,
      configId: data.configId,
      error: data.error,
      ...data.metadata,
      timestamp: new Date().toISOString(),
    }

    if (data.error) {
      logger.error(logData, `${this.prefix} ${data.event}`)
    } else if (data.event.includes('failed')) {
      logger.warn(logData, `${this.prefix} ${data.event}`)
    } else {
      logger.info(logData, `${this.prefix} ${data.event}`)
    }
  }

  /**
   * Log le début de la réconciliation
   */
  logReconciliationStarted(): void {
    this.log({ event: 'reconciliation_started' })
  }

  /**
   * Log la fin de la réconciliation avec les stats
   */
  logReconciliationCompleted(stats: {
    expiredInstances: number
    refundedContributions: number
    orphansFound: number
    orphansCleaned: number
    durationMs: number
  }): void {
    this.log({
      event: 'reconciliation_completed',
      metadata: stats,
    })
  }

  /**
   * Log les instances expirées
   */
  logExpiredInstances(count: number): void {
    if (count > 0) {
      this.log({ event: 'instances_expired', count })
    }
  }

  /**
   * Log les contributions remboursées
   */
  logRefunds(count: number): void {
    if (count > 0) {
      this.log({ event: 'contributions_refunded', count })
    }
  }

  /**
   * Log la détection d'un orphelin
   */
  logOrphanDetected(configId: string, streamerId: string, rewardId: string): void {
    this.log({
      event: 'orphan_detected',
      configId,
      streamerId,
      rewardId,
    })
  }

  /**
   * Log le nettoyage réussi d'un orphelin
   */
  logOrphanCleaned(configId: string, streamerId: string, rewardId: string): void {
    this.log({
      event: 'orphan_cleaned',
      configId,
      streamerId,
      rewardId,
    })
  }

  /**
   * Log l'échec du nettoyage d'un orphelin
   */
  logOrphanCleanupFailed(
    configId: string,
    streamerId: string,
    rewardId: string,
    error: string
  ): void {
    this.log({
      event: 'orphan_cleanup_failed',
      configId,
      streamerId,
      rewardId,
      error,
    })
  }

  /**
   * Log quand un orphelin était déjà supprimé sur Twitch (404)
   */
  logOrphanAlreadyDeleted(configId: string, streamerId: string, rewardId: string): void {
    this.log({
      event: 'orphan_already_deleted',
      configId,
      streamerId,
      rewardId,
    })
  }

  /**
   * Log une incohérence entre l'état DB et l'état Twitch
   */
  logRewardStateMismatch(
    streamerId: string,
    rewardId: string,
    dbStatus: string,
    twitchExists: boolean
  ): void {
    this.log({
      event: 'reward_state_mismatch',
      streamerId,
      rewardId,
      metadata: { dbStatus, twitchExists },
    })
  }

  /**
   * Log le début de la réconciliation complète
   */
  logFullReconciliationStarted(streamerCount: number): void {
    this.log({
      event: 'full_reconciliation_started',
      count: streamerCount,
    })
  }

  /**
   * Log la fin de la réconciliation complète
   */
  logFullReconciliationCompleted(stats: { found: number; cleaned: number; failed: number }): void {
    this.log({
      event: 'full_reconciliation_completed',
      metadata: stats,
    })
  }
}

export default CleanupAuditService
