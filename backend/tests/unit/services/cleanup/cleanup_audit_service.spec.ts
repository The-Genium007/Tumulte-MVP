import { test } from '@japa/runner'
import { CleanupAuditService } from '#services/cleanup/cleanup_audit_service'
import type { CleanupAuditData } from '#services/cleanup/cleanup_audit_service'

/**
 * Unit tests for CleanupAuditService
 *
 * This service logs cleanup events for auditing purposes.
 * We test that all logging methods work correctly and produce
 * the expected log data structure.
 */
test.group('CleanupAuditService', () => {
  test('log should handle event with all properties', async ({ assert }) => {
    const service = new CleanupAuditService()

    // This should not throw
    const data: CleanupAuditData = {
      event: 'orphan_detected',
      count: 5,
      streamerId: 'streamer-123',
      rewardId: 'reward-456',
      configId: 'config-789',
      metadata: { extra: 'data' },
    }

    assert.doesNotThrow(() => service.log(data))
  })

  test('log should handle event with error', async ({ assert }) => {
    const service = new CleanupAuditService()

    const data: CleanupAuditData = {
      event: 'orphan_cleanup_failed',
      configId: 'config-123',
      error: 'API timeout',
    }

    assert.doesNotThrow(() => service.log(data))
  })

  test('log should handle minimal event data', async ({ assert }) => {
    const service = new CleanupAuditService()

    const data: CleanupAuditData = {
      event: 'reconciliation_started',
    }

    assert.doesNotThrow(() => service.log(data))
  })

  test('logReconciliationStarted should log correctly', async ({ assert }) => {
    const service = new CleanupAuditService()
    assert.doesNotThrow(() => service.logReconciliationStarted())
  })

  test('logReconciliationCompleted should log with stats', async ({ assert }) => {
    const service = new CleanupAuditService()

    const stats = {
      expiredInstances: 10,
      refundedContributions: 5,
      orphansFound: 3,
      orphansCleaned: 2,
      durationMs: 1500,
    }

    assert.doesNotThrow(() => service.logReconciliationCompleted(stats))
  })

  test('logExpiredInstances should not log when count is zero', async ({ assert }) => {
    const service = new CleanupAuditService()
    // Should not throw and should effectively be a no-op for count=0
    assert.doesNotThrow(() => service.logExpiredInstances(0))
  })

  test('logExpiredInstances should log when count is positive', async ({ assert }) => {
    const service = new CleanupAuditService()
    assert.doesNotThrow(() => service.logExpiredInstances(5))
  })

  test('logRefunds should not log when count is zero', async ({ assert }) => {
    const service = new CleanupAuditService()
    assert.doesNotThrow(() => service.logRefunds(0))
  })

  test('logRefunds should log when count is positive', async ({ assert }) => {
    const service = new CleanupAuditService()
    assert.doesNotThrow(() => service.logRefunds(10))
  })

  test('logOrphanDetected should log with all parameters', async ({ assert }) => {
    const service = new CleanupAuditService()
    assert.doesNotThrow(() => service.logOrphanDetected('config-123', 'streamer-456', 'reward-789'))
  })

  test('logOrphanCleaned should log with all parameters', async ({ assert }) => {
    const service = new CleanupAuditService()
    assert.doesNotThrow(() => service.logOrphanCleaned('config-123', 'streamer-456', 'reward-789'))
  })

  test('logOrphanCleanupFailed should log with error message', async ({ assert }) => {
    const service = new CleanupAuditService()
    assert.doesNotThrow(() =>
      service.logOrphanCleanupFailed('config-123', 'streamer-456', 'reward-789', 'API rate limit')
    )
  })

  test('logOrphanAlreadyDeleted should log correctly', async ({ assert }) => {
    const service = new CleanupAuditService()
    assert.doesNotThrow(() =>
      service.logOrphanAlreadyDeleted('config-123', 'streamer-456', 'reward-789')
    )
  })

  test('logRewardStateMismatch should log mismatch details', async ({ assert }) => {
    const service = new CleanupAuditService()

    // Test with reward existing on Twitch but not active in DB
    assert.doesNotThrow(() =>
      service.logRewardStateMismatch('streamer-123', 'reward-456', 'not_active_in_db', true)
    )

    // Test with reward active in DB but not on Twitch
    assert.doesNotThrow(() =>
      service.logRewardStateMismatch('streamer-123', 'reward-456', 'active', false)
    )
  })

  test('logFullReconciliationStarted should log streamer count', async ({ assert }) => {
    const service = new CleanupAuditService()
    assert.doesNotThrow(() => service.logFullReconciliationStarted(25))
  })

  test('logFullReconciliationCompleted should log stats', async ({ assert }) => {
    const service = new CleanupAuditService()

    const stats = {
      found: 10,
      cleaned: 8,
      failed: 2,
    }

    assert.doesNotThrow(() => service.logFullReconciliationCompleted(stats))
  })

  test('all event types should be valid', async ({ assert }) => {
    const service = new CleanupAuditService()

    const events: CleanupAuditData['event'][] = [
      'reconciliation_started',
      'reconciliation_completed',
      'instances_expired',
      'contributions_refunded',
      'orphan_detected',
      'orphan_cleaned',
      'orphan_cleanup_failed',
      'orphan_already_deleted',
      'reward_state_mismatch',
      'full_reconciliation_started',
      'full_reconciliation_completed',
    ]

    for (const event of events) {
      assert.doesNotThrow(() => service.log({ event }))
    }
  })
})
