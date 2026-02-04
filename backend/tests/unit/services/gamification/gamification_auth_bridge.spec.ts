import { test } from '@japa/runner'
import { GamificationAuthBridge } from '#services/gamification/gamification_auth_bridge'
import type { streamer as Streamer } from '#models/streamer'

/**
 * Unit tests for GamificationAuthBridge
 *
 * This service bridges authorization events to gamification reward management.
 * When authorization is granted, rewards are created.
 * When authorization is revoked, rewards are deleted.
 */
test.group('GamificationAuthBridge', () => {
  // Helper to create mock services
  function createMocks(
    overrides: {
      enabledEvents?: Array<{ eventId: string }>
      existingConfig?: { twitchRewardStatus: string } | null
      activeConfigs?: Array<{
        eventId: string
        twitchRewardId: string | null
        save: () => Promise<void>
      }>
      deleteRewardSuccess?: boolean
    } = {}
  ) {
    const mockRewardManager = {
      enableForStreamer: async () => {},
    }

    const mockStreamerConfigRepo = {
      findByStreamerCampaignAndEvent: async () => overrides.existingConfig ?? null,
      findActiveByStreamerAndCampaign: async () => overrides.activeConfigs ?? [],
    }

    const mockCampaignConfigRepo = {
      findEnabledByCampaign: async () => overrides.enabledEvents ?? [],
    }

    const mockTwitchRewardService = {
      deleteReward: async () => overrides.deleteRewardSuccess ?? true,
    }

    return {
      mockRewardManager,
      mockStreamerConfigRepo,
      mockCampaignConfigRepo,
      mockTwitchRewardService,
    }
  }

  // ========================================
  // onAuthorizationGranted tests
  // ========================================

  test('onAuthorizationGranted should return empty result when no enabled events', async ({
    assert,
  }) => {
    const {
      mockRewardManager,
      mockStreamerConfigRepo,
      mockCampaignConfigRepo,
      mockTwitchRewardService,
    } = createMocks({ enabledEvents: [] })

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationGranted('campaign-1', mockStreamer)

    assert.equal(result.created, 0)
    assert.equal(result.enabled, 0)
    assert.equal(result.failed, 0)
    assert.lengthOf(result.errors, 0)
  })

  test('onAuthorizationGranted should skip already active rewards', async ({ assert }) => {
    const {
      mockRewardManager,
      mockStreamerConfigRepo,
      mockCampaignConfigRepo,
      mockTwitchRewardService,
    } = createMocks({
      enabledEvents: [{ eventId: 'event-1' }],
      existingConfig: { twitchRewardStatus: 'active' },
    })

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationGranted('campaign-1', mockStreamer)

    assert.equal(result.created, 0)
    assert.equal(result.enabled, 0)
  })

  test('onAuthorizationGranted should create new rewards', async ({ assert }) => {
    const {
      mockRewardManager,
      mockStreamerConfigRepo,
      mockCampaignConfigRepo,
      mockTwitchRewardService,
    } = createMocks({
      enabledEvents: [{ eventId: 'event-1' }, { eventId: 'event-2' }],
      existingConfig: null,
    })

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationGranted('campaign-1', mockStreamer)

    assert.equal(result.created, 2)
  })

  test('onAuthorizationGranted should re-enable paused rewards', async ({ assert }) => {
    const { mockRewardManager, mockCampaignConfigRepo, mockTwitchRewardService } = createMocks({
      enabledEvents: [{ eventId: 'event-1' }],
    })

    // Return paused config on first call
    const mockStreamerConfigRepo = {
      findByStreamerCampaignAndEvent: async () => ({
        twitchRewardStatus: 'paused',
        costOverride: null,
      }),
      findActiveByStreamerAndCampaign: async () => [],
    }

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationGranted('campaign-1', mockStreamer)

    assert.equal(result.enabled, 1)
  })

  test('onAuthorizationGranted should collect errors on failure', async ({ assert }) => {
    const { mockStreamerConfigRepo, mockCampaignConfigRepo, mockTwitchRewardService } = createMocks(
      {
        enabledEvents: [{ eventId: 'event-1' }],
        existingConfig: null,
      }
    )

    const mockRewardManager = {
      enableForStreamer: async () => {
        throw new Error('Twitch API error')
      },
    }

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationGranted('campaign-1', mockStreamer)

    assert.equal(result.failed, 1)
    assert.lengthOf(result.errors, 1)
    assert.include(result.errors[0].error, 'Twitch API error')
  })

  // ========================================
  // onAuthorizationRevoked tests
  // ========================================

  test('onAuthorizationRevoked should return empty result when no active rewards', async ({
    assert,
  }) => {
    const {
      mockRewardManager,
      mockStreamerConfigRepo,
      mockCampaignConfigRepo,
      mockTwitchRewardService,
    } = createMocks({ activeConfigs: [] })

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationRevoked('campaign-1', mockStreamer)

    assert.equal(result.deleted, 0)
    assert.equal(result.failed, 0)
    assert.lengthOf(result.errors, 0)
  })

  test('onAuthorizationRevoked should skip configs without rewardId', async ({ assert }) => {
    const {
      mockRewardManager,
      mockStreamerConfigRepo,
      mockCampaignConfigRepo,
      mockTwitchRewardService,
    } = createMocks({
      activeConfigs: [
        {
          eventId: 'event-1',
          twitchRewardId: null,
          save: async () => {},
        },
      ],
    })

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationRevoked('campaign-1', mockStreamer)

    assert.equal(result.deleted, 0)
  })

  test('onAuthorizationRevoked should delete active rewards', async ({ assert }) => {
    const { mockRewardManager, mockCampaignConfigRepo, mockTwitchRewardService } = createMocks({
      deleteRewardSuccess: true,
    })

    const mockConfig = {
      eventId: 'event-1',
      twitchRewardId: 'reward-123',
      twitchRewardStatus: 'active',
      isEnabled: true,
      save: async () => {},
    }

    const mockStreamerConfigRepo = {
      findByStreamerCampaignAndEvent: async () => null,
      findActiveByStreamerAndCampaign: async () => [mockConfig],
    }

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationRevoked('campaign-1', mockStreamer)

    assert.equal(result.deleted, 1)
    assert.equal(mockConfig.twitchRewardStatus, 'deleted')
    assert.isNull(mockConfig.twitchRewardId)
    assert.isFalse(mockConfig.isEnabled)
  })

  test('onAuthorizationRevoked should mark as orphaned on deletion failure', async ({ assert }) => {
    const { mockRewardManager, mockCampaignConfigRepo } = createMocks()

    const mockTwitchRewardService = {
      deleteReward: async () => false,
    }

    const mockConfig = {
      eventId: 'event-1',
      twitchRewardId: 'reward-123',
      twitchRewardStatus: 'active',
      isEnabled: true,
      deletionFailedAt: null as any,
      deletionRetryCount: 0,
      nextDeletionRetryAt: null as any,
      save: async () => {},
    }

    const mockStreamerConfigRepo = {
      findByStreamerCampaignAndEvent: async () => null,
      findActiveByStreamerAndCampaign: async () => [mockConfig],
    }

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationRevoked('campaign-1', mockStreamer)

    assert.equal(result.failed, 1)
    assert.equal(mockConfig.twitchRewardStatus, 'orphaned')
    assert.isFalse(mockConfig.isEnabled)
    assert.isNotNull(mockConfig.deletionFailedAt)
    assert.equal(mockConfig.deletionRetryCount, 1)
    assert.isNotNull(mockConfig.nextDeletionRetryAt)
    assert.lengthOf(result.errors, 1)
  })

  test('onAuthorizationRevoked should collect errors on exception', async ({ assert }) => {
    const { mockRewardManager, mockCampaignConfigRepo } = createMocks()

    const mockTwitchRewardService = {
      deleteReward: async () => {
        throw new Error('Network error')
      },
    }

    const mockConfig = {
      eventId: 'event-1',
      twitchRewardId: 'reward-123',
      save: async () => {},
    }

    const mockStreamerConfigRepo = {
      findByStreamerCampaignAndEvent: async () => null,
      findActiveByStreamerAndCampaign: async () => [mockConfig],
    }

    const bridge = new GamificationAuthBridge(
      mockRewardManager as any,
      mockStreamerConfigRepo as any,
      mockCampaignConfigRepo as any,
      mockTwitchRewardService as any
    )

    const mockStreamer = {
      id: 'streamer-1',
      twitchDisplayName: 'TestStreamer',
    } as unknown as Streamer

    const result = await bridge.onAuthorizationRevoked('campaign-1', mockStreamer)

    assert.equal(result.failed, 1)
    assert.lengthOf(result.errors, 1)
    assert.include(result.errors[0].error, 'Network error')
  })
})

/**
 * Tests for result types
 */
test.group('GamificationAuthBridge - Types', () => {
  test('AuthorizationGrantResult should have correct structure', async ({ assert }) => {
    const result = {
      created: 5,
      enabled: 2,
      failed: 1,
      errors: [{ eventId: 'event-1', error: 'Some error' }],
    }

    assert.equal(result.created, 5)
    assert.equal(result.enabled, 2)
    assert.equal(result.failed, 1)
    assert.lengthOf(result.errors, 1)
    assert.equal(result.errors[0].eventId, 'event-1')
  })

  test('AuthorizationRevokeResult should have correct structure', async ({ assert }) => {
    const result = {
      deleted: 3,
      failed: 1,
      errors: [{ eventId: 'event-2', error: 'Deletion failed' }],
    }

    assert.equal(result.deleted, 3)
    assert.equal(result.failed, 1)
    assert.lengthOf(result.errors, 1)
    assert.equal(result.errors[0].eventId, 'event-2')
  })
})
