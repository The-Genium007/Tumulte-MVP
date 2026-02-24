import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { OrphanDetector } from './orphan_detector.js'
import { TwitchRewardReconciler } from './twitch_reward_reconciler.js'
import { CleanupAuditService } from './cleanup_audit_service.js'
import type { EventSubReconciler, EventSubReconciliationResult } from './eventsub_reconciler.js'

/**
 * Résultat de la réconciliation au démarrage
 */
export interface ReconciliationResult {
  expiredInstances: number
  refundedContributions: number
  orphanedRewardsFound: number
  orphanedRewardsCleaned: number
  orphanedRewardsAlreadyDeleted: number
  phantomsFixed: number
  eventSubReconciliation: EventSubReconciliationResult | null
  durationMs: number
  errors: Array<{ task: string; error: string }>
}

/**
 * StartupReconciliationService - Service de réconciliation au démarrage
 *
 * Ce service s'exécute une fois au démarrage du serveur (dans app.ready())
 * pour nettoyer tout état incohérent qui pourrait exister à cause de:
 * - Redémarrage pendant une opération
 * - Échecs d'API précédents
 * - Données orphelines historiques
 *
 * La réconciliation est IDEMPOTENTE - elle peut être exécutée plusieurs fois
 * sans effet de bord.
 */
@inject()
export class StartupReconciliationService {
  private eventSubReconciler: EventSubReconciler | null = null

  constructor(
    private orphanDetector: OrphanDetector,
    private reconciler: TwitchRewardReconciler,
    private auditService: CleanupAuditService
  ) {}

  /**
   * Injecte l'EventSubReconciler (optionnel, setter injection)
   */
  setEventSubReconciler(reconciler: EventSubReconciler): void {
    this.eventSubReconciler = reconciler
  }

  /**
   * Point d'entrée principal - exécute la réconciliation complète
   *
   * Étapes:
   * 1. Expirer les instances de gamification dépassées
   * 2. Traiter les remboursements en attente
   * 3. Nettoyer les configs orphelines (status='orphaned')
   * 4. Réconciliation complète DB vs Twitch (pour les cadavres historiques)
   */
  async reconcile(): Promise<ReconciliationResult> {
    const startTime = Date.now()

    const result: ReconciliationResult = {
      expiredInstances: 0,
      refundedContributions: 0,
      orphanedRewardsFound: 0,
      orphanedRewardsCleaned: 0,
      orphanedRewardsAlreadyDeleted: 0,
      phantomsFixed: 0,
      eventSubReconciliation: null,
      durationMs: 0,
      errors: [],
    }

    logger.info('[StartupReconciliation] Starting startup reconciliation...')
    this.auditService.logReconciliationStarted()

    // Étape 1: Expirer les instances dépassées
    try {
      result.expiredInstances = await this.expireStaleInstances()
      this.auditService.logExpiredInstances(result.expiredInstances)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push({ task: 'expireInstances', error: errorMsg })
      logger.error({ error }, '[StartupReconciliation] Failed to expire instances')
    }

    // Étape 2: Traiter les remboursements
    try {
      result.refundedContributions = await this.processRefunds()
      this.auditService.logRefunds(result.refundedContributions)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push({ task: 'processRefunds', error: errorMsg })
      logger.error({ error }, '[StartupReconciliation] Failed to process refunds')
    }

    // Étape 3: Nettoyer les configs orphelines (status='orphaned' en DB)
    try {
      const orphans = await this.orphanDetector.findOrphansDueForRetry()
      result.orphanedRewardsFound = orphans.length

      if (orphans.length > 0) {
        const cleanupResult = await this.reconciler.cleanupOrphans(orphans)
        result.orphanedRewardsCleaned = cleanupResult.cleaned
        result.orphanedRewardsAlreadyDeleted = cleanupResult.alreadyDeleted

        for (const err of cleanupResult.errors) {
          result.errors.push({ task: `orphanCleanup:${err.configId}`, error: err.error })
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push({ task: 'orphanCleanup', error: errorMsg })
      logger.error({ error }, '[StartupReconciliation] Failed to cleanup orphans')
    }

    // Étape 4: Réconciliation complète DB vs Twitch
    // Cette étape attrape les "cadavres" historiques
    try {
      const fullResult = await this.reconciler.fullReconciliation()
      result.orphanedRewardsFound += fullResult.orphansFound
      result.orphanedRewardsCleaned += fullResult.orphansCleaned
      result.phantomsFixed = fullResult.phantomsFixed

      for (const err of fullResult.errors) {
        result.errors.push({ task: `fullReconciliation:${err.streamerId}`, error: err.error })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push({ task: 'fullReconciliation', error: errorMsg })
      logger.error({ error }, '[StartupReconciliation] Failed full reconciliation')
    }

    // Étape 5: Réconciliation EventSub (subscriptions manquantes ou orphelines)
    if (this.eventSubReconciler) {
      try {
        result.eventSubReconciliation = await this.eventSubReconciler.reconcile()

        for (const err of result.eventSubReconciliation.errors) {
          result.errors.push({
            task: `eventSubReconciliation:${err.streamerId}`,
            error: err.error,
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        result.errors.push({ task: 'eventSubReconciliation', error: errorMsg })
        logger.error({ error }, '[StartupReconciliation] Failed EventSub reconciliation')
      }
    } else {
      logger.debug('[StartupReconciliation] EventSub reconciler not available, skipping step 5')
    }

    result.durationMs = Date.now() - startTime

    this.auditService.logReconciliationCompleted({
      expiredInstances: result.expiredInstances,
      refundedContributions: result.refundedContributions,
      orphansFound: result.orphanedRewardsFound,
      orphansCleaned: result.orphanedRewardsCleaned,
      durationMs: result.durationMs,
    })

    logger.info(
      {
        event: 'startup_reconciliation_completed',
        ...result,
      },
      '[StartupReconciliation] Startup reconciliation completed'
    )

    return result
  }

  /**
   * Expire les instances de gamification dont le temps est écoulé
   */
  private async expireStaleInstances(): Promise<number> {
    // Import dynamique pour éviter les dépendances circulaires
    const { InstanceManager } = await import('#services/gamification/instance_manager')
    const { ObjectiveCalculator } = await import('#services/gamification/objective_calculator')
    const { ActionExecutor } = await import('#services/gamification/action_executor')
    const { ExecutionTracker } = await import('#services/gamification/execution_tracker')

    const objectiveCalc = new ObjectiveCalculator()
    const actionExecutor = new ActionExecutor()
    const executionTracker = new ExecutionTracker()
    const instanceManager = new InstanceManager(objectiveCalc, actionExecutor, executionTracker)

    return instanceManager.checkAndExpireInstances()
  }

  /**
   * Traite les remboursements pour les instances expirées
   */
  private async processRefunds(): Promise<number> {
    // Import dynamique pour éviter les dépendances circulaires
    const { RefundService } = await import('#services/gamification/refund_service')
    const { TwitchRewardService } = await import('#services/twitch/twitch_reward_service')

    const twitchRewardService = new TwitchRewardService()
    const refundService = new RefundService(twitchRewardService)

    return refundService.processExpiredInstances()
  }
}

export default StartupReconciliationService
