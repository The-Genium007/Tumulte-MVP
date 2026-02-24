import { test } from '@japa/runner'
import { RewardManagerService } from '#services/gamification/reward_manager_service'
import type CampaignGamificationConfig from '#models/campaign_gamification_config'
import type GamificationEvent from '#models/gamification_event'
import type { streamer as Streamer } from '#models/streamer'

/**
 * Unit tests for RewardManagerService
 *
 * This service orchestrates Twitch Channel Point reward creation/management
 * for the gamification system. It handles:
 * - Cost calculation (campaign config > event default hierarchy)
 * - Difficulty explanation for the UI
 * - enable/disable flows (delete-before-recreate strategy)
 * - Cascade disable when GM disables an event
 * - Cost updates synced to Twitch API
 *
 * Note: Methods that invoke Lucid model statics (query(), findOrFail()) or
 * model instance methods (load(), save()) require mocking those on the instance
 * or stubbing the module directly. These unit tests focus on orchestration
 * logic through mocked dependencies.
 *
 * All mock objects are typed as `Record<string, unknown>` and cast via `as any`
 * to avoid Lucid relation/save() return type conflicts with plain object mocks.
 */

// ========================================
// MOCK FACTORIES
// ========================================

function createMockStreamerConfigRepo(overrides: Record<string, unknown> = {}) {
  return {
    findByStreamerCampaignAndEvent: async () => null,
    findEnabledByCampaignAndEvent: async () => [],
    create: async (data: Record<string, unknown>) =>
      createMockStreamerConfig({
        campaignId: data.campaignId as string,
        streamerId: data.streamerId as string,
        eventId: data.eventId as string,
        isEnabled: (data.isEnabled as boolean) ?? true,
        costOverride: (data.costOverride as number | null) ?? null,
      }),
    ...overrides,
  }
}

function createMockCampaignConfigRepo(overrides: Record<string, unknown> = {}) {
  return {
    findByCampaignAndEvent: async () => null,
    findEnabledByCampaign: async () => [],
    ...overrides,
  }
}

function createMockTwitchRewardService(overrides: Record<string, unknown> = {}) {
  return {
    createReward: async () => ({ id: 'reward-abc-123' }),
    deleteReward: async () => true,
    deleteRewardWithRetry: async () => ({ success: true, isAlreadyDeleted: false }),
    disableReward: async () => true,
    updateReward: async () => true,
    listRewards: async () => [],
    ...overrides,
  }
}

function createMockStreamer(overrides: Record<string, unknown> = {}): Streamer {
  return {
    id: 'streamer-123',
    twitchUserId: 'twitch-user-456',
    twitchDisplayName: 'TestStreamer',
    ...overrides,
  } as unknown as Streamer
}

function createMockGamificationEvent(overrides: Record<string, unknown> = {}): GamificationEvent {
  return {
    id: 'event-123',
    name: 'Dé Critique',
    slug: 'dice_critical',
    description: 'Inverser le dé critique',
    type: 'individual',
    triggerType: 'dice_critical',
    actionType: 'dice_invert',
    rewardColor: '#FF0000',
    defaultCost: 500,
    defaultObjectiveCoefficient: 0.3,
    defaultMinimumObjective: 10,
    defaultDuration: 300,
    isSystemEvent: true,
    triggerConfig: null,
    actionConfig: null,
    ...overrides,
  } as unknown as GamificationEvent
}

function createMockCampaignConfig(
  overrides: Record<string, unknown> = {}
): CampaignGamificationConfig {
  return {
    id: 'campaign-config-123',
    campaignId: 'campaign-123',
    eventId: 'event-123',
    isEnabled: true,
    cost: null,
    objectiveCoefficient: null,
    minimumObjective: null,
    duration: null,
    cooldown: null,
    maxClicksPerUserPerSession: 0,
    twitchRewardId: null,
    event: createMockGamificationEvent(),
    load: async () => {},
    save: async () => {},
    ...overrides,
  } as unknown as CampaignGamificationConfig
}

/**
 * Creates a mock StreamerGamificationConfig plain object.
 *
 * Using Record<string, unknown> for overrides avoids TypeScript conflicts between
 * plain function return types (Promise<void>) and Lucid's model method signatures
 * (Promise<this>), and between plain Streamer objects and BelongsTo<typeof Streamer>.
 */
function createMockStreamerConfig(overrides: Record<string, unknown> = {}): any {
  const base: Record<string, unknown> = {
    id: 'streamer-config-123',
    campaignId: 'campaign-123',
    streamerId: 'streamer-123',
    eventId: 'event-123',
    isEnabled: true,
    costOverride: null,
    twitchRewardId: null,
    twitchRewardStatus: 'not_created',
    deletionFailedAt: null,
    deletionRetryCount: 0,
    nextDeletionRetryAt: null,
    event: createMockGamificationEvent(),
    load: async () => {},
    save: async () => {},
  }

  // Apply overrides first so computed getters can read the final values
  const merged = { ...base, ...overrides }

  // Reattach computed getters that depend on the merged state
  Object.defineProperties(merged, {
    isTwitchRewardActive: {
      get() {
        return this.twitchRewardId !== null && this.twitchRewardStatus === 'active'
      },
      configurable: true,
    },
    canCreateTwitchReward: {
      get() {
        return (
          this.twitchRewardStatus === 'not_created' ||
          this.twitchRewardStatus === 'deleted' ||
          this.twitchRewardStatus === 'orphaned'
        )
      },
      configurable: true,
    },
  })

  // Attach getEffectiveCost as a method with proper this binding
  merged.getEffectiveCost = function (
    campaignConfig: CampaignGamificationConfig | null,
    event: GamificationEvent
  ) {
    const self = this as Record<string, unknown>
    if (self.costOverride !== null && self.costOverride !== undefined) {
      return self.costOverride as number
    }
    const cfg = campaignConfig as Record<string, unknown> | null
    if (cfg?.cost !== null && cfg?.cost !== undefined) {
      return cfg.cost as number
    }
    return (event as unknown as Record<string, unknown>).defaultCost as number
  }

  return merged
}

function createService(deps: {
  streamerConfigRepo?: Record<string, unknown>
  campaignConfigRepo?: Record<string, unknown>
  twitchRewardService?: Record<string, unknown>
}) {
  return new RewardManagerService(
    createMockStreamerConfigRepo(deps.streamerConfigRepo) as any,
    createMockCampaignConfigRepo(deps.campaignConfigRepo) as any,
    createMockTwitchRewardService(deps.twitchRewardService) as any
  )
}

// ========================================
// TESTS — getRecommendedCost
// ========================================

test.group('RewardManagerService - getRecommendedCost', () => {
  test('should return event defaultCost when no campaign config is provided', async ({
    assert,
  }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultCost: 500 })

    const cost = service.getRecommendedCost(null, event)

    assert.equal(cost, 500)
  })

  test('should return event defaultCost when campaign config has null cost', async ({ assert }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultCost: 750 })
    const campaignConfig = createMockCampaignConfig({ cost: null })

    const cost = service.getRecommendedCost(campaignConfig, event)

    assert.equal(cost, 750)
  })

  test('should return campaign config cost when it is explicitly set', async ({ assert }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultCost: 500 })
    const campaignConfig = createMockCampaignConfig({ cost: 1200 })

    const cost = service.getRecommendedCost(campaignConfig, event)

    assert.equal(cost, 1200)
  })

  test('should return campaign config cost of 0 when cost is explicitly zero', async ({
    assert,
  }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultCost: 500 })
    // cost: 0 passes `!== null && !== undefined`, so the service returns 0 (free reward)
    const campaignConfig = createMockCampaignConfig({ cost: 0 })

    const cost = service.getRecommendedCost(campaignConfig, event)

    assert.equal(cost, 0)
  })

  test('should prefer campaign config cost over event default', async ({ assert }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultCost: 500 })
    const campaignConfig = createMockCampaignConfig({ cost: 200 })

    const cost = service.getRecommendedCost(campaignConfig, event)

    assert.equal(cost, 200)
    assert.notEqual(cost, event.defaultCost)
  })
})

// ========================================
// TESTS — getDifficultyExplanation
// ========================================

test.group('RewardManagerService - getDifficultyExplanation', () => {
  test('should use event defaultObjectiveCoefficient when no campaign config provided', async ({
    assert,
  }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultObjectiveCoefficient: 0.3 })

    const explanation = service.getDifficultyExplanation(null, event)

    assert.equal(explanation, '30% des viewers doivent cliquer')
  })

  test('should use campaign config objectiveCoefficient when provided', async ({ assert }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultObjectiveCoefficient: 0.3 })
    const campaignConfig = createMockCampaignConfig({ objectiveCoefficient: 0.5 })

    const explanation = service.getDifficultyExplanation(campaignConfig, event)

    assert.equal(explanation, '50% des viewers doivent cliquer')
  })

  test('should fall back to event coefficient when campaign config coefficient is null', async ({
    assert,
  }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultObjectiveCoefficient: 0.25 })
    const campaignConfig = createMockCampaignConfig({ objectiveCoefficient: null })

    const explanation = service.getDifficultyExplanation(campaignConfig, event)

    assert.equal(explanation, '25% des viewers doivent cliquer')
  })

  test('should round coefficient percentage correctly', async ({ assert }) => {
    const service = createService({})
    // 0.333... * 100 = 33.333... -> Math.round() -> 33
    const event = createMockGamificationEvent({ defaultObjectiveCoefficient: 1 / 3 })

    const explanation = service.getDifficultyExplanation(null, event)

    assert.equal(explanation, '33% des viewers doivent cliquer')
  })

  test('should handle 100% coefficient correctly', async ({ assert }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultObjectiveCoefficient: 1.0 })
    const campaignConfig = createMockCampaignConfig({ objectiveCoefficient: 1.0 })

    const explanation = service.getDifficultyExplanation(campaignConfig, event)

    assert.equal(explanation, '100% des viewers doivent cliquer')
  })

  test('should include percentage sign and viewers text in output', async ({ assert }) => {
    const service = createService({})
    const event = createMockGamificationEvent({ defaultObjectiveCoefficient: 0.4 })

    const explanation = service.getDifficultyExplanation(null, event)

    assert.include(explanation, '%')
    assert.include(explanation, 'des viewers doivent cliquer')
  })
})

// ========================================
// TESTS — enableForStreamer
// ========================================

test.group('RewardManagerService - enableForStreamer', () => {
  test('should throw when campaign config does not exist', async ({ assert }) => {
    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => null,
      },
    })

    const streamer = createMockStreamer()

    await assert.rejects(
      () => service.enableForStreamer(streamer, 'campaign-123', 'event-123'),
      "Cet événement n'est pas activé pour cette campagne"
    )
  })

  test('should throw when campaign config is disabled', async ({ assert }) => {
    const disabledConfig = createMockCampaignConfig({ isEnabled: false })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => disabledConfig,
      },
    })

    const streamer = createMockStreamer()

    await assert.rejects(
      () => service.enableForStreamer(streamer, 'campaign-123', 'event-123'),
      "Cet événement n'est pas activé pour cette campagne"
    )
  })

  test('should create a new streamer config when none exists', async ({ assert }) => {
    let createCalled = false
    const mockStreamerConfig = createMockStreamerConfig({ twitchRewardId: null })
    const campaignConfig = createMockCampaignConfig({ isEnabled: true })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => campaignConfig,
      },
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => null,
        create: async () => {
          createCalled = true
          return mockStreamerConfig
        },
      },
      twitchRewardService: {
        createReward: async () => ({ id: 'new-reward-id' }),
        deleteRewardWithRetry: async () => ({ success: true, isAlreadyDeleted: false }),
      },
    })

    const streamer = createMockStreamer()
    await service.enableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.isTrue(createCalled)
  })

  test('should update existing streamer config instead of creating a new one', async ({
    assert,
  }) => {
    let saveCalled = false
    const existingConfig = createMockStreamerConfig({
      isEnabled: false,
      twitchRewardId: null,
      save: async () => {
        saveCalled = true
      },
    })

    const campaignConfig = createMockCampaignConfig({ isEnabled: true })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => campaignConfig,
      },
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => existingConfig,
      },
      twitchRewardService: {
        createReward: async () => ({ id: 'new-reward-id' }),
        deleteRewardWithRetry: async () => ({ success: true, isAlreadyDeleted: false }),
      },
    })

    const streamer = createMockStreamer()
    await service.enableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.isTrue(saveCalled)
    assert.isTrue(existingConfig.isEnabled)
  })

  test('should delete existing Twitch reward before creating a new one (delete-before-recreate)', async ({
    assert,
  }) => {
    let deleteWithRetryCalled = false
    let createRewardCalled = false

    const existingConfig = createMockStreamerConfig({
      twitchRewardId: 'old-reward-id',
      twitchRewardStatus: 'active',
      save: async () => {},
    })

    const campaignConfig = createMockCampaignConfig({ isEnabled: true })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => campaignConfig,
      },
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => existingConfig,
      },
      twitchRewardService: {
        deleteRewardWithRetry: async () => {
          deleteWithRetryCalled = true
          return { success: true, isAlreadyDeleted: false }
        },
        createReward: async () => {
          createRewardCalled = true
          return { id: 'fresh-reward-id' }
        },
        listRewards: async () => [],
      },
    })

    const streamer = createMockStreamer()
    await service.enableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.isTrue(deleteWithRetryCalled, 'Should have tried to delete the old reward')
    assert.isTrue(createRewardCalled, 'Should have created a fresh reward')
  })

  test('should apply costOverride when provided to repo.create', async ({ assert }) => {
    let capturedCostOverride: unknown
    const mockStreamerConfig = createMockStreamerConfig({ twitchRewardId: null })
    const campaignConfig = createMockCampaignConfig({ isEnabled: true })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => campaignConfig,
      },
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => null,
        create: async (data: Record<string, unknown>) => {
          capturedCostOverride = data.costOverride
          return mockStreamerConfig
        },
      },
      twitchRewardService: {
        createReward: async () => ({ id: 'reward-id' }),
      },
    })

    const streamer = createMockStreamer()
    await service.enableForStreamer(streamer, 'campaign-123', 'event-123', 999)

    assert.equal(capturedCostOverride, 999)
  })

  test('should set twitchRewardId and status on config after reward creation', async ({
    assert,
  }) => {
    const streamerConfig = createMockStreamerConfig({
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
      save: async () => {},
    })

    const campaignConfig = createMockCampaignConfig({ isEnabled: true })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => campaignConfig,
      },
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => null,
        create: async () => streamerConfig,
      },
      twitchRewardService: {
        createReward: async () => ({ id: 'brand-new-reward-id' }),
      },
    })

    const streamer = createMockStreamer()
    await service.enableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.equal(streamerConfig.twitchRewardId, 'brand-new-reward-id')
    assert.equal(streamerConfig.twitchRewardStatus, 'active')
  })

  test('should set up EventSub subscription when service is injected and reward is created', async ({
    assert,
  }) => {
    let subscriptionCreated = false

    const streamerConfig = createMockStreamerConfig({
      twitchRewardId: null,
      save: async () => {},
    })

    const campaignConfig = createMockCampaignConfig({ isEnabled: true })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => campaignConfig,
      },
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => null,
        create: async () => streamerConfig,
      },
      twitchRewardService: {
        createReward: async () => ({ id: 'reward-with-eventsub' }),
      },
    })

    service.setEventSubService({
      createSubscription: async () => {
        subscriptionCreated = true
        return { id: 'sub-123', status: 'enabled' }
      },
    } as any)

    const streamer = createMockStreamer()
    await service.enableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.isTrue(subscriptionCreated)
  })

  test('should not fail when EventSub subscription creation throws', async ({ assert }) => {
    const streamerConfig = createMockStreamerConfig({
      twitchRewardId: null,
      save: async () => {},
    })

    const campaignConfig = createMockCampaignConfig({ isEnabled: true })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => campaignConfig,
      },
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => null,
        create: async () => streamerConfig,
      },
      twitchRewardService: {
        createReward: async () => ({ id: 'reward-id' }),
      },
    })

    service.setEventSubService({
      createSubscription: async () => {
        throw new Error('EventSub API unreachable')
      },
    } as any)

    const streamer = createMockStreamer()

    // Should not throw — EventSub failure is intentionally resilient
    const result = await service.enableForStreamer(streamer, 'campaign-123', 'event-123')
    assert.isNotNull(result)
  })
})

// ========================================
// TESTS — disableForStreamer
// ========================================

test.group('RewardManagerService - disableForStreamer', () => {
  test('should return silently when no streamer config is found', async ({ assert }) => {
    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => null,
      },
    })

    const streamer = createMockStreamer()

    // Should not throw
    await service.disableForStreamer(streamer, 'campaign-123', 'event-123')
    assert.isTrue(true)
  })

  test('should set isEnabled to false and persist the change', async ({ assert }) => {
    let saveCalled = false
    const streamerConfig = createMockStreamerConfig({
      isEnabled: true,
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
      save: async () => {
        saveCalled = true
      },
    })

    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => streamerConfig,
      },
    })

    const streamer = createMockStreamer()
    await service.disableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.isTrue(saveCalled)
    assert.isFalse(streamerConfig.isEnabled)
  })

  test('should pause an active Twitch reward and update its status', async ({ assert }) => {
    let disableRewardCalled = false
    let saveCount = 0

    const streamerConfig = createMockStreamerConfig({
      isEnabled: true,
      twitchRewardId: 'active-reward-id',
      twitchRewardStatus: 'active',
      save: async () => {
        saveCount++
      },
    })

    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => streamerConfig,
      },
      twitchRewardService: {
        disableReward: async () => {
          disableRewardCalled = true
          return true
        },
      },
    })

    const streamer = createMockStreamer()
    await service.disableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.isTrue(disableRewardCalled)
    assert.equal(streamerConfig.twitchRewardStatus, 'paused')
    assert.isTrue(saveCount >= 2, 'Should save at least twice (disable + status update)')
  })

  test('should not call disableReward when reward is already paused', async ({ assert }) => {
    let disableRewardCalled = false

    const streamerConfig = createMockStreamerConfig({
      isEnabled: true,
      twitchRewardId: 'some-reward-id',
      twitchRewardStatus: 'paused',
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => streamerConfig,
      },
      twitchRewardService: {
        disableReward: async () => {
          disableRewardCalled = true
          return true
        },
      },
    })

    const streamer = createMockStreamer()
    await service.disableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.isFalse(disableRewardCalled)
  })

  test('should not update twitchRewardStatus when disableReward returns false', async ({
    assert,
  }) => {
    const streamerConfig = createMockStreamerConfig({
      isEnabled: true,
      twitchRewardId: 'active-reward-id',
      twitchRewardStatus: 'active',
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => streamerConfig,
      },
      twitchRewardService: {
        disableReward: async () => false, // Twitch API failure
      },
    })

    const streamer = createMockStreamer()
    await service.disableForStreamer(streamer, 'campaign-123', 'event-123')

    // Status must remain 'active' because the API call did not succeed
    assert.equal(streamerConfig.twitchRewardStatus, 'active')
  })
})

// ========================================
// TESTS — disableForCampaign
// ========================================

test.group('RewardManagerService - disableForCampaign', () => {
  test('should do nothing when no streamer configs exist for campaign and event', async ({
    assert,
  }) => {
    let disableRewardCalled = false

    const service = createService({
      streamerConfigRepo: {
        findEnabledByCampaignAndEvent: async () => [],
      },
      twitchRewardService: {
        disableReward: async () => {
          disableRewardCalled = true
          return true
        },
      },
    })

    await service.disableForCampaign('campaign-123', 'event-123')

    assert.isFalse(disableRewardCalled)
  })

  test('should disable all streamer configs in cascade', async ({ assert }) => {
    let savedCount = 0
    const mockStreamer = createMockStreamer()

    const config1 = createMockStreamerConfig({
      id: 'config-1',
      isEnabled: true,
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
      streamer: mockStreamer,
      load: async () => {},
      save: async () => {
        savedCount++
      },
    })

    const config2 = createMockStreamerConfig({
      id: 'config-2',
      isEnabled: true,
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
      streamer: mockStreamer,
      load: async () => {},
      save: async () => {
        savedCount++
      },
    })

    const service = createService({
      streamerConfigRepo: {
        findEnabledByCampaignAndEvent: async () => [config1, config2],
      },
    })

    await service.disableForCampaign('campaign-123', 'event-123')

    assert.isFalse(config1.isEnabled)
    assert.isFalse(config2.isEnabled)
    assert.isTrue(savedCount >= 2)
  })

  test('should pause active Twitch rewards for all streamers in cascade', async ({ assert }) => {
    const pausedRewardIds: string[] = []
    const mockStreamer = createMockStreamer()

    const configWithReward = createMockStreamerConfig({
      id: 'config-with-reward',
      isEnabled: true,
      twitchRewardId: 'reward-streamer-1',
      twitchRewardStatus: 'active',
      streamer: mockStreamer,
      load: async () => {},
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findEnabledByCampaignAndEvent: async () => [configWithReward],
      },
      twitchRewardService: {
        disableReward: async (_s: unknown, rewardId: string) => {
          pausedRewardIds.push(rewardId)
          return true
        },
      },
    })

    await service.disableForCampaign('campaign-123', 'event-123')

    assert.include(pausedRewardIds, 'reward-streamer-1')
    assert.equal(configWithReward.twitchRewardStatus, 'paused')
  })

  test('should continue processing other configs even if one throws during load', async ({
    assert,
  }) => {
    const mockStreamer = createMockStreamer()

    const failingConfig = createMockStreamerConfig({
      id: 'failing-config',
      isEnabled: true,
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
      // streamer is not pre-loaded; load() will throw to simulate a DB error
      load: async () => {
        throw new Error('DB error during load')
      },
      save: async () => {},
    })

    const successConfig = createMockStreamerConfig({
      id: 'success-config',
      isEnabled: true,
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
      streamer: mockStreamer,
      load: async () => {},
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findEnabledByCampaignAndEvent: async () => [failingConfig, successConfig],
      },
    })

    // Should not propagate the error thrown in failingConfig.load()
    await service.disableForCampaign('campaign-123', 'event-123')

    // The second config should still have been processed
    assert.isFalse(successConfig.isEnabled)
  })
})

// ========================================
// TESTS — updateCost
// ========================================

test.group('RewardManagerService - updateCost', () => {
  test('should return null when no streamer config is found', async ({ assert }) => {
    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => null,
      },
    })

    const streamer = createMockStreamer()
    const result = await service.updateCost(streamer, 'campaign-123', 'event-123', 300)

    assert.isNull(result)
  })

  test('should update costOverride on the config and persist it', async ({ assert }) => {
    let saveCalled = false

    const streamerConfig = createMockStreamerConfig({
      costOverride: 100,
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
      save: async () => {
        saveCalled = true
      },
    })

    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => streamerConfig,
      },
    })

    const streamer = createMockStreamer()
    await service.updateCost(streamer, 'campaign-123', 'event-123', 450)

    assert.isTrue(saveCalled)
    assert.equal(streamerConfig.costOverride, 450)
  })

  test('should call twitchRewardService.updateReward when reward is active', async ({ assert }) => {
    let updateRewardCalled = false
    let capturedCost = 0

    const streamerConfig = createMockStreamerConfig({
      twitchRewardId: 'active-reward-id',
      twitchRewardStatus: 'active',
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => streamerConfig,
      },
      twitchRewardService: {
        updateReward: async (_s: unknown, _id: string, data: Record<string, unknown>) => {
          updateRewardCalled = true
          capturedCost = data.cost as number
          return true
        },
      },
    })

    const streamer = createMockStreamer()
    await service.updateCost(streamer, 'campaign-123', 'event-123', 600)

    assert.isTrue(updateRewardCalled)
    assert.equal(capturedCost, 600)
  })

  test('should not call twitchRewardService.updateReward when reward is paused', async ({
    assert,
  }) => {
    let updateRewardCalled = false

    const streamerConfig = createMockStreamerConfig({
      twitchRewardId: 'paused-reward-id',
      twitchRewardStatus: 'paused',
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => streamerConfig,
      },
      twitchRewardService: {
        updateReward: async () => {
          updateRewardCalled = true
          return true
        },
      },
    })

    const streamer = createMockStreamer()
    await service.updateCost(streamer, 'campaign-123', 'event-123', 600)

    assert.isFalse(updateRewardCalled)
  })

  test('should not call twitchRewardService.updateReward when no reward has been created', async ({
    assert,
  }) => {
    let updateRewardCalled = false

    const streamerConfig = createMockStreamerConfig({
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => streamerConfig,
      },
      twitchRewardService: {
        updateReward: async () => {
          updateRewardCalled = true
          return true
        },
      },
    })

    const streamer = createMockStreamer()
    await service.updateCost(streamer, 'campaign-123', 'event-123', 600)

    assert.isFalse(updateRewardCalled)
  })

  test('should return the updated config with the new costOverride', async ({ assert }) => {
    const streamerConfig = createMockStreamerConfig({
      id: 'config-to-update',
      costOverride: null,
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
      save: async () => {},
    })

    const service = createService({
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => streamerConfig,
      },
    })

    const streamer = createMockStreamer()
    const result = await service.updateCost(streamer, 'campaign-123', 'event-123', 800)

    assert.isNotNull(result)
    assert.equal(result!.costOverride, 800)
  })
})

// ========================================
// TESTS — setEventSubService
// ========================================

test.group('RewardManagerService - setEventSubService', () => {
  test('should use the injected EventSub service to create subscriptions on enable', async ({
    assert,
  }) => {
    let subscriptionCreated = false

    const streamerConfig = createMockStreamerConfig({
      twitchRewardId: null,
      save: async () => {},
    })

    const campaignConfig = createMockCampaignConfig({ isEnabled: true })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => campaignConfig,
      },
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => null,
        create: async () => streamerConfig,
      },
      twitchRewardService: {
        createReward: async () => ({ id: 'reward-eventsub-test' }),
      },
    })

    service.setEventSubService({
      createSubscription: async () => {
        subscriptionCreated = true
        return { id: 'eventsub-sub-1', status: 'enabled' }
      },
    } as any)

    const streamer = createMockStreamer()
    await service.enableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.isTrue(subscriptionCreated)
  })

  test('should skip EventSub subscription creation when service is not set', async ({ assert }) => {
    const streamerConfig = createMockStreamerConfig({
      twitchRewardId: null,
      save: async () => {},
    })

    const campaignConfig = createMockCampaignConfig({ isEnabled: true })

    const service = createService({
      campaignConfigRepo: {
        findByCampaignAndEvent: async () => campaignConfig,
      },
      streamerConfigRepo: {
        findByStreamerCampaignAndEvent: async () => null,
        create: async () => streamerConfig,
      },
      twitchRewardService: {
        createReward: async () => ({ id: 'reward-no-eventsub' }),
      },
    })

    // Do NOT call setEventSubService — it should be gracefully absent

    const streamer = createMockStreamer()
    const result = await service.enableForStreamer(streamer, 'campaign-123', 'event-123')

    assert.isNotNull(result)
  })
})
