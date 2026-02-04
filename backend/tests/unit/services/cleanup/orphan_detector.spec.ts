import { test } from '@japa/runner'
import { OrphanDetector } from '#services/cleanup/orphan_detector'
import type StreamerGamificationConfig from '#models/streamer_gamification_config'

/**
 * Unit tests for OrphanDetector
 *
 * This service detects orphaned rewards in the database.
 * We use mocks to simulate the repository behavior.
 */
test.group('OrphanDetector', () => {
  test('findOrphanedConfigs should return orphans from repository', async ({ assert }) => {
    const mockOrphans = [
      {
        id: 'config-1',
        streamerId: 'streamer-1',
        twitchRewardId: 'reward-1',
        twitchRewardStatus: 'orphaned',
        deletionRetryCount: 0,
      },
      {
        id: 'config-2',
        streamerId: 'streamer-2',
        twitchRewardId: 'reward-2',
        twitchRewardStatus: 'orphaned',
        deletionRetryCount: 1,
      },
    ] as unknown as StreamerGamificationConfig[]

    const mockRepo = {
      findOrphanedConfigs: async () => mockOrphans,
      findOrphanedConfigsDueForRetry: async () => [],
      findById: async () => null,
    }

    const detector = new OrphanDetector(mockRepo as any)
    const result = await detector.findOrphanedConfigs()

    assert.lengthOf(result, 2)
    assert.equal(result[0].id, 'config-1')
    assert.equal(result[1].id, 'config-2')
  })

  test('findOrphanedConfigs should return empty array when no orphans', async ({ assert }) => {
    const mockRepo = {
      findOrphanedConfigs: async () => [],
      findOrphanedConfigsDueForRetry: async () => [],
      findById: async () => null,
    }

    const detector = new OrphanDetector(mockRepo as any)
    const result = await detector.findOrphanedConfigs()

    assert.lengthOf(result, 0)
  })

  test('findOrphansDueForRetry should return orphans ready for retry', async ({ assert }) => {
    const mockOrphans = [
      {
        id: 'config-1',
        streamerId: 'streamer-1',
        twitchRewardId: 'reward-1',
        twitchRewardStatus: 'orphaned',
        nextDeletionRetryAt: null,
      },
    ] as unknown as StreamerGamificationConfig[]

    const mockRepo = {
      findOrphanedConfigs: async () => [],
      findOrphanedConfigsDueForRetry: async () => mockOrphans,
      findById: async () => null,
    }

    const detector = new OrphanDetector(mockRepo as any)
    const result = await detector.findOrphansDueForRetry()

    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'config-1')
  })

  test('findOrphansDueForRetry should return empty array when no orphans due', async ({
    assert,
  }) => {
    const mockRepo = {
      findOrphanedConfigs: async () => [],
      findOrphanedConfigsDueForRetry: async () => [],
      findById: async () => null,
    }

    const detector = new OrphanDetector(mockRepo as any)
    const result = await detector.findOrphansDueForRetry()

    assert.lengthOf(result, 0)
  })

  test('countOrphans should return count of orphaned configs', async ({ assert }) => {
    const mockOrphans = [
      { id: 'config-1' },
      { id: 'config-2' },
      { id: 'config-3' },
    ] as unknown as StreamerGamificationConfig[]

    const mockRepo = {
      findOrphanedConfigs: async () => mockOrphans,
      findOrphanedConfigsDueForRetry: async () => [],
      findById: async () => null,
    }

    const detector = new OrphanDetector(mockRepo as any)
    const count = await detector.countOrphans()

    assert.equal(count, 3)
  })

  test('countOrphans should return zero when no orphans', async ({ assert }) => {
    const mockRepo = {
      findOrphanedConfigs: async () => [],
      findOrphanedConfigsDueForRetry: async () => [],
      findById: async () => null,
    }

    const detector = new OrphanDetector(mockRepo as any)
    const count = await detector.countOrphans()

    assert.equal(count, 0)
  })

  test('isOrphaned should return true for orphaned config', async ({ assert }) => {
    const mockConfig = {
      id: 'config-1',
      twitchRewardStatus: 'orphaned',
      twitchRewardId: 'reward-123',
    } as unknown as StreamerGamificationConfig

    const mockRepo = {
      findOrphanedConfigs: async () => [],
      findOrphanedConfigsDueForRetry: async () => [],
      findById: async (id: string) => (id === 'config-1' ? mockConfig : null),
    }

    const detector = new OrphanDetector(mockRepo as any)
    const result = await detector.isOrphaned('config-1')

    assert.isTrue(result)
  })

  test('isOrphaned should return false for non-orphaned config', async ({ assert }) => {
    const mockConfig = {
      id: 'config-1',
      twitchRewardStatus: 'active',
      twitchRewardId: 'reward-123',
    } as unknown as StreamerGamificationConfig

    const mockRepo = {
      findOrphanedConfigs: async () => [],
      findOrphanedConfigsDueForRetry: async () => [],
      findById: async (id: string) => (id === 'config-1' ? mockConfig : null),
    }

    const detector = new OrphanDetector(mockRepo as any)
    const result = await detector.isOrphaned('config-1')

    assert.isFalse(result)
  })

  test('isOrphaned should return false when config not found', async ({ assert }) => {
    const mockRepo = {
      findOrphanedConfigs: async () => [],
      findOrphanedConfigsDueForRetry: async () => [],
      findById: async () => null,
    }

    const detector = new OrphanDetector(mockRepo as any)
    const result = await detector.isOrphaned('non-existent')

    assert.isFalse(result)
  })

  test('isOrphaned should return false for orphaned status without rewardId', async ({
    assert,
  }) => {
    const mockConfig = {
      id: 'config-1',
      twitchRewardStatus: 'orphaned',
      twitchRewardId: null, // No reward ID
    } as unknown as StreamerGamificationConfig

    const mockRepo = {
      findOrphanedConfigs: async () => [],
      findOrphanedConfigsDueForRetry: async () => [],
      findById: async (id: string) => (id === 'config-1' ? mockConfig : null),
    }

    const detector = new OrphanDetector(mockRepo as any)
    const result = await detector.isOrphaned('config-1')

    assert.isFalse(result)
  })
})
