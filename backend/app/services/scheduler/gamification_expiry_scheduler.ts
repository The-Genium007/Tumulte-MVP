import cron from 'node-cron'
import logger from '@adonisjs/core/services/logger'
import type StreamerGamificationConfig from '#models/streamer_gamification_config'
import type { OrphanCleanupResult } from '#services/cleanup/twitch_reward_reconciler'

// Run every minute to check for expired gamification instances
const INSTANCE_EXPIRY_CRON = '* * * * *'

// Run every 5 minutes to retry orphan cleanup
const ORPHAN_CLEANUP_CRON = '*/5 * * * *'

/**
 * GamificationExpiryScheduler - Gère l'expiration des instances et le cleanup des orphelins
 *
 * Ce scheduler est responsable de:
 * 1. Expirer les instances de gamification dont le temps est écoulé (toutes les minutes)
 * 2. Traiter les remboursements pour les instances expirées
 * 3. Nettoyer les rewards orphelins qui sont dus pour un retry (toutes les 5 minutes)
 *
 * Contrairement à AuthorizationExpiryScheduler qui gère l'expiration des autorisations,
 * ce scheduler gère le cycle de vie des instances de gamification elles-mêmes.
 */
export class GamificationExpiryScheduler {
  private instanceExpiryJob: cron.ScheduledTask | null = null
  private orphanCleanupJob: cron.ScheduledTask | null = null

  // Services initialisés de manière lazy
  private instanceManager: { checkAndExpireInstances: () => Promise<number> } | null = null
  private refundService: { processExpiredInstances: () => Promise<number> } | null = null
  private orphanDetector: {
    findOrphansDueForRetry: () => Promise<StreamerGamificationConfig[]>
  } | null = null
  private reconciler: {
    cleanupOrphans: (orphans: StreamerGamificationConfig[]) => Promise<OrphanCleanupResult>
  } | null = null

  /**
   * Initialise les services de manière lazy
   */
  private async initializeServices(): Promise<void> {
    if (this.instanceManager && this.refundService) return

    // Instance expiry services
    const { InstanceManager } = await import('#services/gamification/instance_manager')
    const { ObjectiveCalculator } = await import('#services/gamification/objective_calculator')
    const { ActionExecutor } = await import('#services/gamification/action_executor')
    const { ExecutionTracker } = await import('#services/gamification/execution_tracker')

    const objectiveCalc = new ObjectiveCalculator()
    const actionExecutor = new ActionExecutor()
    const executionTracker = new ExecutionTracker()
    this.instanceManager = new InstanceManager(objectiveCalc, actionExecutor, executionTracker)

    // Refund service
    const { RefundService } = await import('#services/gamification/refund_service')
    const { TwitchRewardService } = await import('#services/twitch/twitch_reward_service')
    const twitchRewardService = new TwitchRewardService()
    this.refundService = new RefundService(twitchRewardService)

    // Orphan cleanup services
    const { OrphanDetector } = await import('#services/cleanup/orphan_detector')
    const { TwitchRewardReconciler } = await import('#services/cleanup/twitch_reward_reconciler')
    const { CleanupAuditService } = await import('#services/cleanup/cleanup_audit_service')
    const { StreamerGamificationConfigRepository } =
      await import('#repositories/streamer_gamification_config_repository')

    const configRepo = new StreamerGamificationConfigRepository()
    const auditService = new CleanupAuditService()
    this.orphanDetector = new OrphanDetector(configRepo)
    this.reconciler = new TwitchRewardReconciler(twitchRewardService, configRepo, auditService)
  }

  /**
   * Démarre le scheduler
   */
  start(): void {
    if (this.instanceExpiryJob) {
      logger.warn('[GamificationScheduler] Already running')
      return
    }

    // Job 1: Expiration des instances (toutes les minutes)
    this.instanceExpiryJob = cron.schedule(INSTANCE_EXPIRY_CRON, async () => {
      await this.processInstanceExpiry()
    })

    // Job 2: Cleanup des orphelins (toutes les 5 minutes)
    this.orphanCleanupJob = cron.schedule(ORPHAN_CLEANUP_CRON, async () => {
      await this.processOrphanCleanup()
    })

    logger.info(
      '[GamificationScheduler] Started (instance expiry: every minute, orphan cleanup: every 5 minutes)'
    )
  }

  /**
   * Arrête le scheduler
   */
  stop(): void {
    if (this.instanceExpiryJob) {
      this.instanceExpiryJob.stop()
      this.instanceExpiryJob = null
    }
    if (this.orphanCleanupJob) {
      this.orphanCleanupJob.stop()
      this.orphanCleanupJob = null
    }
    logger.info('[GamificationScheduler] Stopped')
  }

  /**
   * Traite l'expiration des instances et les remboursements
   */
  private async processInstanceExpiry(): Promise<void> {
    try {
      await this.initializeServices()

      // Étape 1: Marquer les instances expirées
      const expired = await this.instanceManager!.checkAndExpireInstances()

      // Étape 2: Traiter les remboursements
      const refunded = await this.refundService!.processExpiredInstances()

      if (expired > 0 || refunded > 0) {
        logger.info({ expired, refunded }, '[GamificationScheduler] Processed instance expiry')
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[GamificationScheduler] Error processing instance expiry'
      )
    }
  }

  /**
   * Nettoie les rewards orphelins qui sont dus pour un retry
   */
  private async processOrphanCleanup(): Promise<void> {
    try {
      await this.initializeServices()

      // Trouver les orphelins dus pour un retry
      const orphans = await this.orphanDetector!.findOrphansDueForRetry()

      if (orphans.length === 0) {
        return
      }

      logger.info(
        { count: orphans.length },
        '[GamificationScheduler] Found orphans due for cleanup retry'
      )

      // Tenter le cleanup
      const result = await this.reconciler!.cleanupOrphans(orphans)

      logger.info({ result }, '[GamificationScheduler] Orphan cleanup completed')
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[GamificationScheduler] Error processing orphan cleanup'
      )
    }
  }

  /**
   * Déclenche manuellement le traitement (pour les tests)
   */
  async triggerManualProcessing(): Promise<void> {
    await this.processInstanceExpiry()
    await this.processOrphanCleanup()
  }
}

export default GamificationExpiryScheduler
