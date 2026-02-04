import { test } from '@japa/runner'
import { StartupReconciliationService } from '#services/cleanup/startup_reconciliation_service'
import type StreamerGamificationConfig from '#models/streamer_gamification_config'

/**
 * Unit tests for StartupReconciliationService
 *
 * This service runs at startup to clean up orphaned state,
 * expire instances, and process refunds.
 */
test.group('StartupReconciliationService', () => {
  // Helper to create mock services
  function createMocks(
    overrides: {
      orphansDueForRetry?: StreamerGamificationConfig[]
      cleanupResult?: {
        cleaned: number
        alreadyDeleted: number
        errors: Array<{ configId: string; error: string }>
      }
      fullReconciliationResult?: {
        orphansFound: number
        orphansCleaned: number
        phantomsFixed: number
        errors: Array<{ streamerId: string; error: string }>
      }
    } = {}
  ) {
    const mockOrphanDetector = {
      findOrphansDueForRetry: async () => overrides.orphansDueForRetry ?? [],
    }

    const mockReconciler = {
      cleanupOrphans: async () =>
        overrides.cleanupResult ?? {
          total: 0,
          cleaned: 0,
          alreadyDeleted: 0,
          failed: 0,
          errors: [],
        },
      fullReconciliation: async () =>
        overrides.fullReconciliationResult ?? {
          streamersProcessed: 0,
          orphansFound: 0,
          orphansCleaned: 0,
          phantomsFixed: 0,
          errors: [],
        },
    }

    const mockAuditService = {
      logReconciliationStarted: () => {},
      logReconciliationCompleted: () => {},
      logExpiredInstances: () => {},
      logRefunds: () => {},
    }

    return { mockOrphanDetector, mockReconciler, mockAuditService }
  }

  test('reconcile should complete with empty results when nothing to process', async ({
    assert,
  }) => {
    const { mockOrphanDetector, mockReconciler, mockAuditService } = createMocks()

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    const result = await service.reconcile()

    assert.equal(result.expiredInstances, 0)
    assert.equal(result.refundedContributions, 0)
    assert.equal(result.orphanedRewardsFound, 0)
    assert.equal(result.orphanedRewardsCleaned, 0)
    assert.equal(result.orphanedRewardsAlreadyDeleted, 0)
    assert.equal(result.phantomsFixed, 0)
    assert.isAtLeast(result.durationMs, 0)
    assert.isArray(result.errors)
  })

  test('reconcile should process orphan cleanup', async ({ assert }) => {
    const mockOrphans = [
      { id: 'config-1', twitchRewardId: 'reward-1' },
      { id: 'config-2', twitchRewardId: 'reward-2' },
    ] as unknown as StreamerGamificationConfig[]

    const { mockOrphanDetector, mockReconciler, mockAuditService } = createMocks({
      orphansDueForRetry: mockOrphans,
      cleanupResult: {
        cleaned: 1,
        alreadyDeleted: 1,
        errors: [],
      },
    })

    // Override to return proper result
    mockReconciler.cleanupOrphans = async () => ({
      total: 2,
      cleaned: 1,
      alreadyDeleted: 1,
      failed: 0,
      errors: [],
    })

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    const result = await service.reconcile()

    assert.equal(result.orphanedRewardsFound, 2)
    assert.equal(result.orphanedRewardsCleaned, 1)
    assert.equal(result.orphanedRewardsAlreadyDeleted, 1)
  })

  test('reconcile should collect errors from orphan cleanup', async ({ assert }) => {
    const mockOrphans = [
      { id: 'config-1', twitchRewardId: 'reward-1' },
    ] as unknown as StreamerGamificationConfig[]

    const { mockOrphanDetector, mockReconciler, mockAuditService } = createMocks({
      orphansDueForRetry: mockOrphans,
    })

    mockReconciler.cleanupOrphans = async () => ({
      total: 1,
      cleaned: 0,
      alreadyDeleted: 0,
      failed: 1,
      errors: [{ configId: 'config-1', error: 'API timeout' }],
    })

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    const result = await service.reconcile()

    assert.isAtLeast(result.errors.length, 1)
    const orphanError = result.errors.find((e) => e.task.includes('orphanCleanup:config-1'))
    assert.exists(orphanError)
  })

  test('reconcile should run full reconciliation', async ({ assert }) => {
    const { mockOrphanDetector, mockReconciler, mockAuditService } = createMocks()

    mockReconciler.fullReconciliation = async () => ({
      streamersProcessed: 5,
      orphansFound: 3,
      orphansCleaned: 2,
      phantomsFixed: 1,
      errors: [],
    })

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    const result = await service.reconcile()

    assert.equal(result.orphanedRewardsFound, 3)
    assert.equal(result.orphanedRewardsCleaned, 2)
    assert.equal(result.phantomsFixed, 1)
  })

  test('reconcile should collect errors from full reconciliation', async ({ assert }) => {
    const { mockOrphanDetector, mockReconciler, mockAuditService } = createMocks()

    mockReconciler.fullReconciliation = async () => ({
      streamersProcessed: 1,
      orphansFound: 0,
      orphansCleaned: 0,
      phantomsFixed: 0,
      errors: [{ streamerId: 'streamer-1', error: 'Token expired' }],
    })

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    const result = await service.reconcile()

    assert.isAtLeast(result.errors.length, 1)
    const fullReconError = result.errors.find((e) =>
      e.task.includes('fullReconciliation:streamer-1')
    )
    assert.exists(fullReconError)
  })

  test('reconcile should handle exception in orphan detection', async ({ assert }) => {
    const { mockReconciler, mockAuditService } = createMocks()

    const mockOrphanDetector = {
      findOrphansDueForRetry: async () => {
        throw new Error('Database connection lost')
      },
    }

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    const result = await service.reconcile()

    const orphanError = result.errors.find((e) => e.task === 'orphanCleanup')
    assert.exists(orphanError)
    assert.include(orphanError!.error, 'Database connection lost')
  })

  test('reconcile should handle exception in full reconciliation', async ({ assert }) => {
    const { mockOrphanDetector, mockAuditService } = createMocks()

    const mockReconciler = {
      cleanupOrphans: async () => ({
        total: 0,
        cleaned: 0,
        alreadyDeleted: 0,
        failed: 0,
        errors: [],
      }),
      fullReconciliation: async () => {
        throw new Error('Twitch API unavailable')
      },
    }

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    const result = await service.reconcile()

    const fullReconError = result.errors.find((e) => e.task === 'fullReconciliation')
    assert.exists(fullReconError)
    assert.include(fullReconError!.error, 'Twitch API unavailable')
  })

  test('reconcile should measure duration correctly', async ({ assert }) => {
    const { mockOrphanDetector, mockReconciler, mockAuditService } = createMocks()

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    const startTime = Date.now()
    const result = await service.reconcile()
    const endTime = Date.now()

    assert.isAtLeast(result.durationMs, 0)
    assert.isAtMost(result.durationMs, endTime - startTime + 100) // Allow some margin
  })

  test('reconcile should call audit service methods', async ({ assert }) => {
    const { mockOrphanDetector, mockReconciler } = createMocks()

    let reconciliationStartedCalled = false
    let reconciliationCompletedCalled = false

    const mockAuditService = {
      logReconciliationStarted: () => {
        reconciliationStartedCalled = true
      },
      logReconciliationCompleted: () => {
        reconciliationCompletedCalled = true
      },
      logExpiredInstances: () => {},
      logRefunds: () => {},
    }

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    await service.reconcile()

    assert.isTrue(reconciliationStartedCalled)
    assert.isTrue(reconciliationCompletedCalled)
  })

  test('reconcile should accumulate orphan counts from both phases', async ({ assert }) => {
    const mockOrphans = [
      { id: 'config-1', twitchRewardId: 'reward-1' },
    ] as unknown as StreamerGamificationConfig[]

    const { mockOrphanDetector, mockReconciler, mockAuditService } = createMocks({
      orphansDueForRetry: mockOrphans,
    })

    // Phase 3: Orphan cleanup finds 1
    mockReconciler.cleanupOrphans = async () => ({
      total: 1,
      cleaned: 1,
      alreadyDeleted: 0,
      failed: 0,
      errors: [],
    })

    // Phase 4: Full reconciliation finds 2 more
    mockReconciler.fullReconciliation = async () => ({
      streamersProcessed: 1,
      orphansFound: 2,
      orphansCleaned: 2,
      phantomsFixed: 0,
      errors: [],
    })

    const service = new StartupReconciliationService(
      mockOrphanDetector as any,
      mockReconciler as any,
      mockAuditService as any
    )

    const result = await service.reconcile()

    // Should accumulate: 1 from orphan cleanup + 2 from full reconciliation
    assert.equal(result.orphanedRewardsFound, 3)
    assert.equal(result.orphanedRewardsCleaned, 3)
  })
})
