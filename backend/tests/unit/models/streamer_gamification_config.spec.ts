import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import StreamerGamificationConfig from '#models/streamer_gamification_config'
import type { TwitchRewardStatus } from '#models/streamer_gamification_config'
import testUtils from '#tests/helpers/database'
import { createTestStreamer, createTestCampaign } from '#tests/helpers/test_utils'
import GamificationEvent from '#models/gamification_event'
import CampaignGamificationConfig from '#models/campaign_gamification_config'

/**
 * Unit tests for StreamerGamificationConfig model
 *
 * Tests the model's computed properties and type definitions.
 */
test.group('StreamerGamificationConfig - Types', () => {
  test('TwitchRewardStatus should include all valid values', async ({ assert }) => {
    const validStatuses: TwitchRewardStatus[] = [
      'not_created',
      'active',
      'paused',
      'deleted',
      'orphaned',
    ]

    assert.lengthOf(validStatuses, 5)
  })
})

/**
 * Integration tests for StreamerGamificationConfig model
 */
test.group('StreamerGamificationConfig - Model', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // Helper to create a test gamification event
  async function createTestEvent(overrides: Partial<any> = {}): Promise<GamificationEvent> {
    return GamificationEvent.create({
      name: overrides.name || 'test-event-' + Math.random().toString(36).substring(7),
      slug: overrides.slug || 'test-event-' + Math.random().toString(36).substring(7),
      description: overrides.description || 'A test event',
      type: overrides.type || 'individual',
      triggerType: overrides.triggerType || 'manual',
      actionType: overrides.actionType || 'custom',
      defaultCost: overrides.defaultCost || 100,
      defaultObjectiveCoefficient: overrides.defaultObjectiveCoefficient || 0.1,
      defaultMinimumObjective: overrides.defaultMinimumObjective || 10,
      defaultDuration: overrides.defaultDuration || 300,
      cooldownType: overrides.cooldownType || 'time',
      rewardColor: overrides.rewardColor || '#9146FF',
      isSystemEvent: overrides.isSystemEvent ?? false,
    })
  }

  // Helper to create a test config
  async function createTestConfig(
    overrides: Partial<any> = {}
  ): Promise<StreamerGamificationConfig> {
    const streamer = overrides.streamer || (await createTestStreamer())
    const campaign = overrides.campaign || (await createTestCampaign())
    const event = overrides.event || (await createTestEvent())

    return StreamerGamificationConfig.create({
      streamerId: streamer.id,
      campaignId: campaign.id,
      eventId: event.id,
      isEnabled: overrides.isEnabled ?? false,
      costOverride: overrides.costOverride ?? null,
      twitchRewardId: overrides.twitchRewardId ?? null,
      twitchRewardStatus: overrides.twitchRewardStatus ?? 'not_created',
      deletionFailedAt: overrides.deletionFailedAt ?? null,
      deletionRetryCount: overrides.deletionRetryCount ?? 0,
      nextDeletionRetryAt: overrides.nextDeletionRetryAt ?? null,
    })
  }

  test('should create config with default values', async ({ assert }) => {
    const config = await createTestConfig()

    assert.exists(config.id)
    assert.isFalse(config.isEnabled)
    assert.isNull(config.costOverride)
    assert.isNull(config.twitchRewardId)
    assert.equal(config.twitchRewardStatus, 'not_created')
  })

  test('should save and retrieve config correctly', async ({ assert }) => {
    const config = await createTestConfig({
      isEnabled: true,
      costOverride: 500,
      twitchRewardId: 'reward-123',
      twitchRewardStatus: 'active',
    })

    const found = await StreamerGamificationConfig.find(config.id)

    assert.isNotNull(found)
    assert.isTrue(found!.isEnabled)
    assert.equal(found!.costOverride, 500)
    assert.equal(found!.twitchRewardId, 'reward-123')
    assert.equal(found!.twitchRewardStatus, 'active')
  })

  test('should track orphan deletion fields', async ({ assert }) => {
    const now = DateTime.now()
    const nextRetry = now.plus({ hours: 2 })

    const config = await createTestConfig({
      twitchRewardStatus: 'orphaned',
      twitchRewardId: 'orphan-reward',
      deletionFailedAt: now,
      deletionRetryCount: 3,
      nextDeletionRetryAt: nextRetry,
    })

    const found = await StreamerGamificationConfig.find(config.id)

    assert.isNotNull(found)
    assert.equal(found!.twitchRewardStatus, 'orphaned')
    assert.isNotNull(found!.deletionFailedAt)
    assert.equal(found!.deletionRetryCount, 3)
    assert.isNotNull(found!.nextDeletionRetryAt)
  })
})

/**
 * Tests for computed properties
 */
test.group('StreamerGamificationConfig - Computed Properties', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function createTestEvent(overrides: Partial<any> = {}): Promise<GamificationEvent> {
    return GamificationEvent.create({
      name: overrides.name || 'test-event-' + Math.random().toString(36).substring(7),
      slug: overrides.slug || 'test-event-' + Math.random().toString(36).substring(7),
      description: overrides.description || 'A test event',
      type: overrides.type || 'individual',
      triggerType: overrides.triggerType || 'manual',
      actionType: overrides.actionType || 'custom',
      defaultCost: overrides.defaultCost || 100,
      defaultObjectiveCoefficient: overrides.defaultObjectiveCoefficient || 0.1,
      defaultMinimumObjective: overrides.defaultMinimumObjective || 10,
      defaultDuration: overrides.defaultDuration || 300,
      cooldownType: overrides.cooldownType || 'time',
      rewardColor: overrides.rewardColor || '#9146FF',
      isSystemEvent: overrides.isSystemEvent ?? false,
    })
  }

  async function createTestConfig(
    overrides: Partial<any> = {}
  ): Promise<StreamerGamificationConfig> {
    const streamer = overrides.streamer || (await createTestStreamer())
    const campaign = overrides.campaign || (await createTestCampaign())
    const event = overrides.event || (await createTestEvent())

    return StreamerGamificationConfig.create({
      streamerId: streamer.id,
      campaignId: campaign.id,
      eventId: event.id,
      isEnabled: overrides.isEnabled ?? false,
      costOverride: overrides.costOverride ?? null,
      twitchRewardId: overrides.twitchRewardId ?? null,
      twitchRewardStatus: overrides.twitchRewardStatus ?? 'not_created',
      deletionFailedAt: overrides.deletionFailedAt ?? null,
      deletionRetryCount: overrides.deletionRetryCount ?? 0,
      nextDeletionRetryAt: overrides.nextDeletionRetryAt ?? null,
    })
  }

  // ========================================
  // getEffectiveCost tests
  // ========================================

  test('getEffectiveCost should return streamer override when set', async ({ assert }) => {
    const event = await createTestEvent({ defaultCost: 100 })
    const config = await createTestConfig({ event, costOverride: 500 })

    const campaignConfig = {
      cost: 300,
    } as CampaignGamificationConfig

    const effectiveCost = config.getEffectiveCost(campaignConfig, event)

    assert.equal(effectiveCost, 500)
  })

  test('getEffectiveCost should return campaign config cost when no override', async ({
    assert,
  }) => {
    const event = await createTestEvent({ defaultCost: 100 })
    const config = await createTestConfig({ event, costOverride: null })

    const campaignConfig = {
      cost: 300,
    } as CampaignGamificationConfig

    const effectiveCost = config.getEffectiveCost(campaignConfig, event)

    assert.equal(effectiveCost, 300)
  })

  test('getEffectiveCost should return event default when no overrides', async ({ assert }) => {
    const event = await createTestEvent({ defaultCost: 100 })
    const config = await createTestConfig({ event, costOverride: null })

    const campaignConfig = {
      cost: null,
    } as CampaignGamificationConfig

    const effectiveCost = config.getEffectiveCost(campaignConfig, event)

    assert.equal(effectiveCost, 100)
  })

  test('getEffectiveCost should return event default when campaign config is null', async ({
    assert,
  }) => {
    const event = await createTestEvent({ defaultCost: 100 })
    const config = await createTestConfig({ event, costOverride: null })

    const effectiveCost = config.getEffectiveCost(null, event)

    assert.equal(effectiveCost, 100)
  })

  // ========================================
  // isTwitchRewardActive tests
  // ========================================

  test('isTwitchRewardActive should return true when active with rewardId', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardId: 'reward-123',
      twitchRewardStatus: 'active',
    })

    assert.isTrue(config.isTwitchRewardActive)
  })

  test('isTwitchRewardActive should return false when status is not active', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardId: 'reward-123',
      twitchRewardStatus: 'paused',
    })

    assert.isFalse(config.isTwitchRewardActive)
  })

  test('isTwitchRewardActive should return false when rewardId is null', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardId: null,
      twitchRewardStatus: 'active',
    })

    assert.isFalse(config.isTwitchRewardActive)
  })

  // ========================================
  // canCreateTwitchReward tests
  // ========================================

  test('canCreateTwitchReward should return true for not_created status', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'not_created',
    })

    assert.isTrue(config.canCreateTwitchReward)
  })

  test('canCreateTwitchReward should return true for deleted status', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'deleted',
    })

    assert.isTrue(config.canCreateTwitchReward)
  })

  test('canCreateTwitchReward should return true for orphaned status', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'orphaned',
    })

    assert.isTrue(config.canCreateTwitchReward)
  })

  test('canCreateTwitchReward should return false for active status', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'active',
    })

    assert.isFalse(config.canCreateTwitchReward)
  })

  test('canCreateTwitchReward should return false for paused status', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'paused',
    })

    assert.isFalse(config.canCreateTwitchReward)
  })

  // ========================================
  // isOrphaned tests
  // ========================================

  test('isOrphaned should return true when orphaned with rewardId', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'orphaned',
      twitchRewardId: 'reward-123',
    })

    assert.isTrue(config.isOrphaned)
  })

  test('isOrphaned should return false when orphaned without rewardId', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'orphaned',
      twitchRewardId: null,
    })

    assert.isFalse(config.isOrphaned)
  })

  test('isOrphaned should return false when not orphaned', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'active',
      twitchRewardId: 'reward-123',
    })

    assert.isFalse(config.isOrphaned)
  })

  // ========================================
  // isCleanupDue tests
  // ========================================

  test('isCleanupDue should return false when not orphaned', async ({ assert }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'active',
      twitchRewardId: 'reward-123',
    })

    assert.isFalse(config.isCleanupDue)
  })

  test('isCleanupDue should return true when orphaned with null nextRetryAt', async ({
    assert,
  }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'orphaned',
      twitchRewardId: 'reward-123',
      nextDeletionRetryAt: null,
    })

    assert.isTrue(config.isCleanupDue)
  })

  test('isCleanupDue should return true when orphaned with past nextRetryAt', async ({
    assert,
  }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'orphaned',
      twitchRewardId: 'reward-123',
      nextDeletionRetryAt: DateTime.now().minus({ hours: 1 }),
    })

    assert.isTrue(config.isCleanupDue)
  })

  test('isCleanupDue should return false when orphaned with future nextRetryAt', async ({
    assert,
  }) => {
    const config = await createTestConfig({
      twitchRewardStatus: 'orphaned',
      twitchRewardId: 'reward-123',
      nextDeletionRetryAt: DateTime.now().plus({ hours: 1 }),
    })

    assert.isFalse(config.isCleanupDue)
  })
})
