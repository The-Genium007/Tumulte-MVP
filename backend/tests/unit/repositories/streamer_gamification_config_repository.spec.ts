import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'
import StreamerGamificationConfig from '#models/streamer_gamification_config'
import testUtils from '#tests/helpers/database'
import { createTestStreamer, createTestCampaign } from '#tests/helpers/test_utils'
import GamificationEvent from '#models/gamification_event'

/**
 * Integration tests for StreamerGamificationConfigRepository
 *
 * Uses the real database with transactions for isolation.
 */
test.group('StreamerGamificationConfigRepository', (group) => {
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

  test('findById should return config by id', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const config = await createTestConfig()

    const found = await repository.findById(config.id)

    assert.isNotNull(found)
    assert.equal(found!.id, config.id)
  })

  test('findById should return null if not found', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()

    const found = await repository.findById('00000000-0000-4000-c000-000000000999')

    assert.isNull(found)
  })

  test('findByStreamerAndCampaign should return configs for streamer and campaign', async ({
    assert,
  }) => {
    const repository = new StreamerGamificationConfigRepository()
    const streamer = await createTestStreamer()
    const campaign = await createTestCampaign()
    const event1 = await createTestEvent({ name: 'event-1' })
    const event2 = await createTestEvent({ name: 'event-2' })

    await createTestConfig({ streamer, campaign, event: event1 })
    await createTestConfig({ streamer, campaign, event: event2 })

    const configs = await repository.findByStreamerAndCampaign(streamer.id, campaign.id)

    assert.lengthOf(configs, 2)
  })

  test('findByStreamerCampaignAndEvent should return specific config', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const streamer = await createTestStreamer()
    const campaign = await createTestCampaign()
    const event = await createTestEvent()

    await createTestConfig({ streamer, campaign, event })

    const found = await repository.findByStreamerCampaignAndEvent(
      streamer.id,
      campaign.id,
      event.id
    )

    assert.isNotNull(found)
    assert.equal(found!.eventId, event.id)
  })

  test('findByTwitchRewardId should return config by Twitch reward ID', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()

    await createTestConfig({
      twitchRewardId: 'twitch-reward-123',
      twitchRewardStatus: 'active',
    })

    const found = await repository.findByTwitchRewardId('twitch-reward-123')

    assert.isNotNull(found)
    assert.equal(found!.twitchRewardId, 'twitch-reward-123')
  })

  test('findEnabledByCampaignAndEvent should return enabled configs', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const campaign = await createTestCampaign()
    const event = await createTestEvent()

    await createTestConfig({ campaign, event, isEnabled: true })
    await createTestConfig({ campaign, event, isEnabled: false })

    const configs = await repository.findEnabledByCampaignAndEvent(campaign.id, event.id)

    assert.lengthOf(configs, 1)
    assert.isTrue(configs[0].isEnabled)
  })

  test('findWithActiveRewardsByCampaign should return configs with active rewards', async ({
    assert,
  }) => {
    const repository = new StreamerGamificationConfigRepository()
    const campaign = await createTestCampaign()

    await createTestConfig({
      campaign,
      twitchRewardId: 'reward-1',
      twitchRewardStatus: 'active',
    })
    await createTestConfig({
      campaign,
      twitchRewardId: 'reward-2',
      twitchRewardStatus: 'paused',
    })
    await createTestConfig({
      campaign,
      twitchRewardId: null,
      twitchRewardStatus: 'not_created',
    })

    const configs = await repository.findWithActiveRewardsByCampaign(campaign.id)

    assert.lengthOf(configs, 1)
    assert.equal(configs[0].twitchRewardStatus, 'active')
  })

  test('create should create new config with defaults', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const streamer = await createTestStreamer()
    const campaign = await createTestCampaign()
    const event = await createTestEvent()

    const config = await repository.create({
      streamerId: streamer.id,
      campaignId: campaign.id,
      eventId: event.id,
    })

    assert.exists(config.id)
    assert.equal(config.isEnabled, false)
    assert.isNull(config.costOverride)
    assert.isNull(config.twitchRewardId)
    assert.equal(config.twitchRewardStatus, 'not_created')
  })

  test('updateTwitchReward should update reward fields', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const config = await createTestConfig()

    const updated = await repository.updateTwitchReward(config.id, 'new-reward-id', 'active')

    assert.isNotNull(updated)
    assert.equal(updated!.twitchRewardId, 'new-reward-id')
    assert.equal(updated!.twitchRewardStatus, 'active')
  })

  test('updateTwitchReward should return null if config not found', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()

    const updated = await repository.updateTwitchReward(
      '00000000-0000-4000-c000-000000000999',
      'reward-id',
      'active'
    )

    assert.isNull(updated)
  })

  test('setEnabled should toggle enabled state', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const config = await createTestConfig({ isEnabled: false })

    const updated = await repository.setEnabled(config.id, true)

    assert.isNotNull(updated)
    assert.isTrue(updated!.isEnabled)
  })

  test('updateCostOverride should update cost', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const config = await createTestConfig({ costOverride: null })

    const updated = await repository.updateCostOverride(config.id, 500)

    assert.isNotNull(updated)
    assert.equal(updated!.costOverride, 500)
  })

  test('delete should remove config', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const config = await createTestConfig()

    const deleted = await repository.delete(config.id)

    assert.isTrue(deleted)

    const found = await repository.findById(config.id)
    assert.isNull(found)
  })

  test('delete should return false if config not found', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()

    const deleted = await repository.delete('00000000-0000-4000-c000-000000000999')

    assert.isFalse(deleted)
  })

  test('findActiveByStreamerAndCampaign should return active configs', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const streamer = await createTestStreamer()
    const campaign = await createTestCampaign()

    const activeConfig = await createTestConfig({
      streamer,
      campaign,
      twitchRewardId: 'reward-1',
      twitchRewardStatus: 'active',
    })
    await createTestConfig({
      streamer,
      campaign,
      twitchRewardId: 'reward-2',
      twitchRewardStatus: 'deleted',
    })

    const configs = await repository.findActiveByStreamerAndCampaign(streamer.id, campaign.id)

    // Should find exactly our active config for this streamer/campaign pair
    assert.isAtLeast(configs.length, 1)
    assert.isTrue(configs.some((c) => c.id === activeConfig.id))
    assert.isTrue(configs.every((c) => c.twitchRewardStatus === 'active'))
  })

  // ========================================
  // CLEANUP & ORPHAN DETECTION TESTS
  // ========================================

  test('findOrphanedConfigs should return orphaned configs', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()

    const orphanConfig = await createTestConfig({
      twitchRewardId: 'orphan-reward-unique-' + Math.random().toString(36).substring(7),
      twitchRewardStatus: 'orphaned',
    })
    await createTestConfig({
      twitchRewardId: 'active-reward-unique-' + Math.random().toString(36).substring(7),
      twitchRewardStatus: 'active',
    })

    const orphans = await repository.findOrphanedConfigs()

    // Should find at least our orphan and all should have orphaned status
    assert.isAtLeast(orphans.length, 1)
    assert.isTrue(orphans.some((o) => o.id === orphanConfig.id))
    assert.isTrue(orphans.every((o) => o.twitchRewardStatus === 'orphaned'))
  })

  test('findOrphanedConfigsDueForRetry should return orphans with past retry time', async ({
    assert,
  }) => {
    const repository = new StreamerGamificationConfigRepository()

    // Orphan due for retry (past time)
    const dueOrphan1 = await createTestConfig({
      twitchRewardId: 'orphan-due-1-' + Math.random().toString(36).substring(7),
      twitchRewardStatus: 'orphaned',
      nextDeletionRetryAt: DateTime.now().minus({ hours: 1 }),
    })

    // Orphan not due yet (future time) - should NOT be included
    const futureOrphan = await createTestConfig({
      twitchRewardId: 'orphan-future-' + Math.random().toString(36).substring(7),
      twitchRewardStatus: 'orphaned',
      nextDeletionRetryAt: DateTime.now().plus({ hours: 1 }),
    })

    // Orphan with null retry time (should be included)
    const dueOrphan2 = await createTestConfig({
      twitchRewardId: 'orphan-null-' + Math.random().toString(36).substring(7),
      twitchRewardStatus: 'orphaned',
      nextDeletionRetryAt: null,
    })

    const dueOrphans = await repository.findOrphanedConfigsDueForRetry()

    // Should include our due orphans but not the future one
    assert.isAtLeast(dueOrphans.length, 2)
    assert.isTrue(dueOrphans.some((o) => o.id === dueOrphan1.id))
    assert.isTrue(dueOrphans.some((o) => o.id === dueOrphan2.id))
    assert.isFalse(dueOrphans.some((o) => o.id === futureOrphan.id))
  })

  test('findByStreamerWithAnyReward should return configs with rewardId', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const streamer = await createTestStreamer()

    await createTestConfig({ streamer, twitchRewardId: 'reward-1' })
    await createTestConfig({ streamer, twitchRewardId: 'reward-2' })
    await createTestConfig({ streamer, twitchRewardId: null })

    const configs = await repository.findByStreamerWithAnyReward(streamer.id)

    assert.lengthOf(configs, 2)
  })

  test('findStreamersWithActiveConfigs should return unique streamer IDs', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const streamer1 = await createTestStreamer()
    const streamer2 = await createTestStreamer()

    await createTestConfig({
      streamer: streamer1,
      twitchRewardId: 'reward-unique-1-' + Math.random().toString(36).substring(7),
      twitchRewardStatus: 'active',
    })
    await createTestConfig({
      streamer: streamer1,
      twitchRewardId: 'reward-unique-2-' + Math.random().toString(36).substring(7),
      twitchRewardStatus: 'active',
    })
    await createTestConfig({
      streamer: streamer2,
      twitchRewardId: 'reward-unique-3-' + Math.random().toString(36).substring(7),
      twitchRewardStatus: 'active',
    })

    const streamerIds = await repository.findStreamersWithActiveConfigs()

    // Should include our test streamers
    assert.isAtLeast(streamerIds.length, 2)
    assert.include(streamerIds, streamer1.id)
    assert.include(streamerIds, streamer2.id)
  })

  test('markAsDeleted should clear reward fields and set status', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const config = await createTestConfig({
      twitchRewardId: 'orphan-reward',
      twitchRewardStatus: 'orphaned',
      deletionFailedAt: DateTime.now(),
      deletionRetryCount: 3,
      nextDeletionRetryAt: DateTime.now().plus({ hours: 1 }),
    })

    await repository.markAsDeleted(config.id)

    const updated = await repository.findById(config.id)

    assert.isNotNull(updated)
    assert.isNull(updated!.twitchRewardId)
    assert.equal(updated!.twitchRewardStatus, 'deleted')
    assert.isNull(updated!.deletionFailedAt)
    assert.equal(updated!.deletionRetryCount, 0)
    assert.isNull(updated!.nextDeletionRetryAt)
  })

  test('updateOrphanRetry should increment count and set next retry', async ({ assert }) => {
    const repository = new StreamerGamificationConfigRepository()
    const config = await createTestConfig({
      twitchRewardId: 'orphan-reward',
      twitchRewardStatus: 'orphaned',
      deletionRetryCount: 1,
    })

    const nextRetry = DateTime.now().plus({ hours: 2 })
    await repository.updateOrphanRetry(config.id, nextRetry)

    const updated = await repository.findById(config.id)

    assert.isNotNull(updated)
    assert.equal(updated!.deletionRetryCount, 2)
    assert.isNotNull(updated!.nextDeletionRetryAt)
  })
})
