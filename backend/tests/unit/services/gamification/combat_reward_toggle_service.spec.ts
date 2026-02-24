import { test } from '@japa/runner'
import {
  CombatRewardToggleService,
  COMBAT_REQUIRED_ACTION_TYPES,
} from '#services/gamification/combat_reward_toggle_service'
import type { streamer as Streamer } from '#models/streamer'

/**
 * Unit tests for CombatRewardToggleService
 *
 * This service orchestrates automatic enabling/disabling of Twitch Channel Point
 * rewards based on Foundry VTT combat state. When a combat starts, monster_buff
 * and monster_debuff rewards are unpaused; when it ends, they are paused and
 * active instances are cancelled.
 *
 * Private methods (cancelActiveCombatInstances, broadcastChatMessage) are stubbed
 * on the instance to isolate tests from GamificationInstance.query(), app.container,
 * and CampaignMembershipRepository.
 */

// ========================================
// MOCK FACTORIES
// ========================================

function createMockStreamer(overrides: Record<string, unknown> = {}): Streamer {
  return {
    id: 'streamer-123',
    twitchUserId: 'twitch-user-456',
    twitchDisplayName: 'TestStreamer',
    ...overrides,
  } as unknown as Streamer
}

function createMockStreamerConfig(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'config-123',
    campaignId: 'campaign-123',
    streamerId: 'streamer-123',
    eventId: 'event-123',
    isEnabled: true,
    costOverride: null,
    twitchRewardId: 'reward-abc',
    twitchRewardStatus: 'paused',
    streamer: createMockStreamer(),
    event: createMockGamificationEvent(),
    save: async () => {},
    ...overrides,
  }
}

function createMockGamificationEvent(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'event-123',
    name: 'Monster Buff',
    slug: 'monster_buff',
    actionType: 'monster_buff',
    triggerType: 'channel_point_reward',
    defaultCost: 500,
    ...overrides,
  }
}

function createMockStreamerConfigRepo(overrides: Record<string, unknown> = {}) {
  return {
    findPausedCombatRewardsByCampaign: async () => [],
    findActiveCombatRewardsByCampaign: async () => [],
    ...overrides,
  }
}

function createMockTwitchRewardService(overrides: Record<string, unknown> = {}) {
  return {
    enableReward: async () => true,
    disableReward: async () => true,
    ...overrides,
  }
}

function createService(deps: {
  streamerConfigRepo?: Record<string, unknown>
  twitchRewardService?: Record<string, unknown>
}) {
  const service = new CombatRewardToggleService(
    createMockStreamerConfigRepo(deps.streamerConfigRepo) as any,
    createMockTwitchRewardService(deps.twitchRewardService) as any
  )

  // Stub private methods that depend on app.container and Lucid statics
  ;(service as any).cancelActiveCombatInstances = async () => 0
  ;(service as any).broadcastChatMessage = async () => {}

  return service
}

// ========================================
// TESTS — COMBAT_REQUIRED_ACTION_TYPES
// ========================================

test.group('CombatRewardToggleService - COMBAT_REQUIRED_ACTION_TYPES', () => {
  test('should contain monster_buff and monster_debuff', ({ assert }) => {
    assert.include(COMBAT_REQUIRED_ACTION_TYPES, 'monster_buff')
    assert.include(COMBAT_REQUIRED_ACTION_TYPES, 'monster_debuff')
  })

  test('should not contain non-combat action types', ({ assert }) => {
    assert.notInclude(COMBAT_REQUIRED_ACTION_TYPES, 'dice_invert')
    assert.notInclude(COMBAT_REQUIRED_ACTION_TYPES, 'spell_disable')
    assert.notInclude(COMBAT_REQUIRED_ACTION_TYPES, 'spell_buff')
    assert.notInclude(COMBAT_REQUIRED_ACTION_TYPES, 'spell_debuff')
  })

  test('should only have exactly 2 entries', ({ assert }) => {
    assert.lengthOf(COMBAT_REQUIRED_ACTION_TYPES, 2)
  })
})

// ========================================
// TESTS — onCombatStart
// ========================================

test.group('CombatRewardToggleService - onCombatStart', () => {
  test('should unpause all paused monster rewards for the campaign', async ({ assert }) => {
    const enabledRewardIds: string[] = []
    let savedConfigs = 0

    const config1 = createMockStreamerConfig({
      id: 'config-1',
      twitchRewardId: 'reward-1',
      twitchRewardStatus: 'paused',
      streamer: createMockStreamer({ id: 'streamer-1' }),
      save: async () => {
        savedConfigs++
      },
    })
    const config2 = createMockStreamerConfig({
      id: 'config-2',
      twitchRewardId: 'reward-2',
      twitchRewardStatus: 'paused',
      streamer: createMockStreamer({ id: 'streamer-2' }),
      save: async () => {
        savedConfigs++
      },
    })

    const service = createService({
      streamerConfigRepo: {
        findPausedCombatRewardsByCampaign: async () => [config1, config2],
      },
      twitchRewardService: {
        enableReward: async (_streamer: unknown, rewardId: string) => {
          enabledRewardIds.push(rewardId)
          return true
        },
      },
    })

    await service.onCombatStart('campaign-123')

    assert.deepEqual(enabledRewardIds, ['reward-1', 'reward-2'])
    assert.equal(config1.twitchRewardStatus, 'active')
    assert.equal(config2.twitchRewardStatus, 'active')
    assert.equal(savedConfigs, 2)
  })

  test('should be idempotent — no API calls when no paused rewards exist', async ({ assert }) => {
    let enableRewardCalled = false

    const service = createService({
      streamerConfigRepo: {
        findPausedCombatRewardsByCampaign: async () => [],
      },
      twitchRewardService: {
        enableReward: async () => {
          enableRewardCalled = true
          return true
        },
      },
    })

    await service.onCombatStart('campaign-123')

    assert.isFalse(enableRewardCalled)
  })

  test('should isolate errors per streamer — one failure does not block others', async ({
    assert,
  }) => {
    const config1 = createMockStreamerConfig({
      id: 'config-fail',
      twitchRewardId: 'reward-fail',
      twitchRewardStatus: 'paused',
      streamer: createMockStreamer({ id: 'streamer-fail' }),
      save: async () => {},
    })
    const config2 = createMockStreamerConfig({
      id: 'config-ok',
      twitchRewardId: 'reward-ok',
      twitchRewardStatus: 'paused',
      streamer: createMockStreamer({ id: 'streamer-ok' }),
      save: async () => {},
    })

    let callCount = 0
    const service = createService({
      streamerConfigRepo: {
        findPausedCombatRewardsByCampaign: async () => [config1, config2],
      },
      twitchRewardService: {
        enableReward: async () => {
          callCount++
          if (callCount === 1) throw new Error('Twitch API rate limited')
          return true
        },
      },
    })

    // Should not throw
    await service.onCombatStart('campaign-123')

    // First config stays paused (error), second gets activated
    assert.equal(config1.twitchRewardStatus, 'paused')
    assert.equal(config2.twitchRewardStatus, 'active')
  })

  test('should not update status when enableReward returns false', async ({ assert }) => {
    const config = createMockStreamerConfig({
      twitchRewardId: 'reward-fail-api',
      twitchRewardStatus: 'paused',
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findPausedCombatRewardsByCampaign: async () => [config],
      },
      twitchRewardService: {
        enableReward: async () => false,
      },
    })

    await service.onCombatStart('campaign-123')

    assert.equal(config.twitchRewardStatus, 'paused')
  })

  test('should broadcast chat message after activation', async ({ assert }) => {
    let chatBroadcasted = false
    let capturedMessage = ''

    const service = createService({
      streamerConfigRepo: {
        findPausedCombatRewardsByCampaign: async () => [
          createMockStreamerConfig({ save: async () => {} }),
        ],
      },
    })

    ;(service as any).broadcastChatMessage = async (_campaignId: string, message: string) => {
      chatBroadcasted = true
      capturedMessage = message
    }

    await service.onCombatStart('campaign-123')

    assert.isTrue(chatBroadcasted)
    assert.include(capturedMessage, 'Combat')
    assert.include(capturedMessage, 'monstres')
  })
})

// ========================================
// TESTS — onCombatEnd
// ========================================

test.group('CombatRewardToggleService - onCombatEnd', () => {
  test('should pause all active monster rewards for the campaign', async ({ assert }) => {
    const disabledRewardIds: string[] = []
    let savedConfigs = 0

    const config1 = createMockStreamerConfig({
      id: 'config-1',
      twitchRewardId: 'reward-1',
      twitchRewardStatus: 'active',
      streamer: createMockStreamer({ id: 'streamer-1' }),
      save: async () => {
        savedConfigs++
      },
    })
    const config2 = createMockStreamerConfig({
      id: 'config-2',
      twitchRewardId: 'reward-2',
      twitchRewardStatus: 'active',
      streamer: createMockStreamer({ id: 'streamer-2' }),
      save: async () => {
        savedConfigs++
      },
    })

    const service = createService({
      streamerConfigRepo: {
        findActiveCombatRewardsByCampaign: async () => [config1, config2],
      },
      twitchRewardService: {
        disableReward: async (_streamer: unknown, rewardId: string) => {
          disabledRewardIds.push(rewardId)
          return true
        },
      },
    })

    await service.onCombatEnd('campaign-123')

    assert.deepEqual(disabledRewardIds, ['reward-1', 'reward-2'])
    assert.equal(config1.twitchRewardStatus, 'paused')
    assert.equal(config2.twitchRewardStatus, 'paused')
    assert.equal(savedConfigs, 2)
  })

  test('should still cancel instances even when no active rewards exist', async ({ assert }) => {
    let cancelCalled = false

    const service = createService({
      streamerConfigRepo: {
        findActiveCombatRewardsByCampaign: async () => [],
      },
    })

    ;(service as any).cancelActiveCombatInstances = async () => {
      cancelCalled = true
      return 0
    }

    await service.onCombatEnd('campaign-123')

    assert.isTrue(cancelCalled)
  })

  test('should isolate errors per streamer — one failure does not block others', async ({
    assert,
  }) => {
    const config1 = createMockStreamerConfig({
      id: 'config-fail',
      twitchRewardId: 'reward-fail',
      twitchRewardStatus: 'active',
      streamer: createMockStreamer({ id: 'streamer-fail' }),
      save: async () => {},
    })
    const config2 = createMockStreamerConfig({
      id: 'config-ok',
      twitchRewardId: 'reward-ok',
      twitchRewardStatus: 'active',
      streamer: createMockStreamer({ id: 'streamer-ok' }),
      save: async () => {},
    })

    let callCount = 0
    const service = createService({
      streamerConfigRepo: {
        findActiveCombatRewardsByCampaign: async () => [config1, config2],
      },
      twitchRewardService: {
        disableReward: async () => {
          callCount++
          if (callCount === 1) throw new Error('Twitch API error')
          return true
        },
      },
    })

    await service.onCombatEnd('campaign-123')

    // First config stays active (error), second gets paused
    assert.equal(config1.twitchRewardStatus, 'active')
    assert.equal(config2.twitchRewardStatus, 'paused')
  })

  test('should not update status when disableReward returns false', async ({ assert }) => {
    const config = createMockStreamerConfig({
      twitchRewardId: 'reward-stubborn',
      twitchRewardStatus: 'active',
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findActiveCombatRewardsByCampaign: async () => [config],
      },
      twitchRewardService: {
        disableReward: async () => false,
      },
    })

    await service.onCombatEnd('campaign-123')

    assert.equal(config.twitchRewardStatus, 'active')
  })

  test('should broadcast chat message after pausing', async ({ assert }) => {
    let capturedMessage = ''

    const service = createService({
      streamerConfigRepo: {
        findActiveCombatRewardsByCampaign: async () => [
          createMockStreamerConfig({
            twitchRewardStatus: 'active',
            save: async () => {},
          }),
        ],
      },
    })

    ;(service as any).broadcastChatMessage = async (_campaignId: string, message: string) => {
      capturedMessage = message
    }

    await service.onCombatEnd('campaign-123')

    assert.include(capturedMessage, 'terminé')
    assert.include(capturedMessage, 'monstres')
  })

  test('should cancel active combat instances on end', async ({ assert }) => {
    let cancelCalledWithCampaignId = ''

    const service = createService({
      streamerConfigRepo: {
        findActiveCombatRewardsByCampaign: async () => [
          createMockStreamerConfig({
            twitchRewardStatus: 'active',
            save: async () => {},
          }),
        ],
      },
    })

    ;(service as any).cancelActiveCombatInstances = async (campaignId: string) => {
      cancelCalledWithCampaignId = campaignId
      return 3
    }

    await service.onCombatEnd('campaign-456')

    assert.equal(cancelCalledWithCampaignId, 'campaign-456')
  })
})

// ========================================
// TESTS — Non-combat events should not be affected
// ========================================

test.group('CombatRewardToggleService - non-combat events isolation', () => {
  test('repository queries should use COMBAT_REQUIRED_ACTION_TYPES filter', async ({ assert }) => {
    let capturedActionTypes: string[] = []

    const service = createService({
      streamerConfigRepo: {
        findPausedCombatRewardsByCampaign: async (_campaignId: string, actionTypes: string[]) => {
          capturedActionTypes = actionTypes
          return []
        },
      },
    })

    await service.onCombatStart('campaign-123')

    assert.deepEqual(capturedActionTypes, ['monster_buff', 'monster_debuff'])
    assert.notInclude(capturedActionTypes, 'dice_invert')
    assert.notInclude(capturedActionTypes, 'spell_disable')
  })

  test('onCombatEnd should query only combat action types', async ({ assert }) => {
    let capturedActionTypes: string[] = []

    const service = createService({
      streamerConfigRepo: {
        findActiveCombatRewardsByCampaign: async (_campaignId: string, actionTypes: string[]) => {
          capturedActionTypes = actionTypes
          return []
        },
      },
    })

    await service.onCombatEnd('campaign-123')

    assert.deepEqual(capturedActionTypes, ['monster_buff', 'monster_debuff'])
  })
})
