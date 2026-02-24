import { test } from '@japa/runner'
import { EventSubReconciler } from '#services/cleanup/eventsub_reconciler'
import type { EventSubSubscription } from '#services/twitch/twitch_eventsub_service'

// ========================================
// HELPERS
// ========================================

function createMockStreamerConfigRepo(overrides: Record<string, any> = {}) {
  return {
    findStreamersWithActiveConfigs: overrides.findStreamersWithActiveConfigs || (async () => []),
    findByStreamerWithAnyReward: overrides.findByStreamerWithAnyReward || (async () => []),
    ...overrides,
  } as any
}

function createMockEventSubService(overrides: Record<string, any> = {}) {
  return {
    listSubscriptions: overrides.listSubscriptions || (async () => []),
    createSubscription: overrides.createSubscription || (async () => ({ id: 'sub-new' })),
    deleteSubscription: overrides.deleteSubscription || (async () => true),
    ...overrides,
  } as any
}

function createSubscription(overrides: Record<string, any> = {}): EventSubSubscription {
  return {
    id: `sub-${Math.random().toString(36).slice(2, 8)}`,
    status: 'enabled',
    type: 'channel.channel_points_custom_reward_redemption.add',
    version: '1',
    transport: { method: 'webhook' },
    created_at: new Date().toISOString(),
    cost: 0,
    condition: {
      broadcaster_user_id: 'broadcaster-1',
      reward_id: 'reward-1', // eslint-disable-line camelcase
    },
    ...overrides,
  }
}

function createStreamerConfig(overrides: Record<string, any> = {}) {
  return {
    id: `config-${Math.random().toString(36).slice(2, 8)}`,
    streamerId: 'streamer-1',
    eventId: 'event-1',
    twitchRewardId: 'reward-1',
    twitchRewardStatus: 'active',
    isEnabled: true,
    load: async (relation: string) => {
      if (relation === 'streamer' && !('_streamer' in overrides)) {
        overrides._streamer = {
          twitchUserId: 'broadcaster-1',
          id: 'streamer-1',
        }
      }
    },
    ...overrides,
    get streamer() {
      return overrides._streamer ?? null
    },
  }
}

// ========================================
// TESTS — reconcile
// ========================================

test.group('EventSubReconciler — reconcile', () => {
  test('should return clean result when no active configs exist', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo({
      findStreamersWithActiveConfigs: async () => [],
    })
    const eventSubService = createMockEventSubService()

    const reconciler = new EventSubReconciler(configRepo, eventSubService)
    const result = await reconciler.reconcile()

    assert.equal(result.subscriptionsChecked, 0)
    assert.equal(result.missingRecreated, 0)
    assert.equal(result.failedRecreated, 0)
    assert.equal(result.orphanedDeleted, 0)
    assert.lengthOf(result.errors, 0)
  })

  test('should delete orphaned subscriptions when no active configs exist', async ({ assert }) => {
    let deletedSubId: string | undefined
    const configRepo = createMockStreamerConfigRepo({
      findStreamersWithActiveConfigs: async () => [],
    })
    const eventSubService = createMockEventSubService({
      listSubscriptions: async () => [createSubscription({ id: 'orphan-sub' })],
      deleteSubscription: async (subId: string) => {
        deletedSubId = subId
        return true
      },
    })

    const reconciler = new EventSubReconciler(configRepo, eventSubService)
    const result = await reconciler.reconcile()

    assert.equal(result.orphanedDeleted, 1)
    assert.equal(deletedSubId, 'orphan-sub')
  })

  test('should not recreate subscription that already exists', async ({ assert }) => {
    let createCalled = false

    const configRepo = createMockStreamerConfigRepo({
      findStreamersWithActiveConfigs: async () => ['streamer-1'],
      findByStreamerWithAnyReward: async () => [
        createStreamerConfig({
          twitchRewardId: 'reward-1',
          twitchRewardStatus: 'active',
          _streamer: { twitchUserId: 'broadcaster-1', id: 'streamer-1' },
        }),
      ],
    })

    const eventSubService = createMockEventSubService({
      listSubscriptions: async () => [
        createSubscription({
          condition: {
            broadcaster_user_id: 'broadcaster-1',
            reward_id: 'reward-1', // eslint-disable-line camelcase
          },
          status: 'enabled',
        }),
      ],
      createSubscription: async () => {
        createCalled = true
        return { id: 'sub-new' }
      },
    })

    const reconciler = new EventSubReconciler(configRepo, eventSubService)
    const result = await reconciler.reconcile()

    assert.equal(result.subscriptionsChecked, 1)
    assert.equal(result.missingRecreated, 0)
    assert.isFalse(createCalled)
  })

  test('should recreate missing subscription', async ({ assert }) => {
    let createdCondition: any

    const configRepo = createMockStreamerConfigRepo({
      findStreamersWithActiveConfigs: async () => ['streamer-1'],
      findByStreamerWithAnyReward: async () => [
        createStreamerConfig({
          twitchRewardId: 'reward-missing',
          twitchRewardStatus: 'active',
          _streamer: { twitchUserId: 'broadcaster-1', id: 'streamer-1' },
        }),
      ],
    })

    const eventSubService = createMockEventSubService({
      listSubscriptions: async () => [], // No existing subscriptions
      createSubscription: async (opts: any) => {
        createdCondition = opts.condition
        return { id: 'sub-recreated' }
      },
    })

    const reconciler = new EventSubReconciler(configRepo, eventSubService)
    const result = await reconciler.reconcile()

    assert.equal(result.subscriptionsChecked, 1)
    assert.equal(result.missingRecreated, 1)
    assert.equal(createdCondition.broadcaster_user_id, 'broadcaster-1')
    assert.equal(createdCondition.reward_id, 'reward-missing')
  })

  test('should count failed recreations', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo({
      findStreamersWithActiveConfigs: async () => ['streamer-1'],
      findByStreamerWithAnyReward: async () => [
        createStreamerConfig({
          twitchRewardId: 'reward-1',
          twitchRewardStatus: 'active',
          _streamer: { twitchUserId: 'broadcaster-1', id: 'streamer-1' },
        }),
      ],
    })

    const eventSubService = createMockEventSubService({
      listSubscriptions: async () => [],
      createSubscription: async () => null, // Simulates creation failure
    })

    const reconciler = new EventSubReconciler(configRepo, eventSubService)
    const result = await reconciler.reconcile()

    assert.equal(result.failedRecreated, 1)
    assert.isTrue(result.errors.length > 0)
  })

  test('should handle per-streamer errors gracefully', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo({
      findStreamersWithActiveConfigs: async () => ['streamer-bad'],
      findByStreamerWithAnyReward: async () => {
        throw new Error('DB connection failed')
      },
    })

    const eventSubService = createMockEventSubService()

    const reconciler = new EventSubReconciler(configRepo, eventSubService)
    const result = await reconciler.reconcile()

    assert.isTrue(result.errors.length > 0)
    assert.equal(result.errors[0].streamerId, 'streamer-bad')
    assert.include(result.errors[0].error, 'DB connection failed')
  })

  test('should handle fatal reconciliation errors', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo()
    const eventSubService = createMockEventSubService({
      listSubscriptions: async () => {
        throw new Error('Twitch API unavailable')
      },
    })

    const reconciler = new EventSubReconciler(configRepo, eventSubService)
    const result = await reconciler.reconcile()

    assert.isTrue(result.errors.length > 0)
    assert.equal(result.errors[0].streamerId, 'global')
    assert.include(result.errors[0].error, 'Twitch API unavailable')
  })

  test('should skip configs without active reward status', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo({
      findStreamersWithActiveConfigs: async () => ['streamer-1'],
      findByStreamerWithAnyReward: async () => [
        createStreamerConfig({
          twitchRewardId: 'reward-1',
          twitchRewardStatus: 'paused', // Not active
          _streamer: { twitchUserId: 'broadcaster-1', id: 'streamer-1' },
        }),
      ],
    })

    const eventSubService = createMockEventSubService()

    const reconciler = new EventSubReconciler(configRepo, eventSubService)
    const result = await reconciler.reconcile()

    assert.equal(result.subscriptionsChecked, 0)
  })

  test('should skip configs without streamer', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo({
      findStreamersWithActiveConfigs: async () => ['streamer-1'],
      findByStreamerWithAnyReward: async () => [
        createStreamerConfig({
          twitchRewardId: 'reward-1',
          twitchRewardStatus: 'active',
          _streamer: null,
        }),
      ],
    })

    const eventSubService = createMockEventSubService()

    const reconciler = new EventSubReconciler(configRepo, eventSubService)
    const result = await reconciler.reconcile()

    assert.equal(result.subscriptionsChecked, 0)
  })
})

// ========================================
// TESTS — findMatchingSubscription
// ========================================

test.group('EventSubReconciler — findMatchingSubscription', () => {
  test('should match subscription by broadcaster + reward', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo()
    const eventSubService = createMockEventSubService()
    const reconciler = new EventSubReconciler(configRepo, eventSubService)

    const subs = [
      createSubscription({
        condition: {
          broadcaster_user_id: 'bc-1',
          reward_id: 'rw-1', // eslint-disable-line camelcase
        },
        status: 'enabled',
      }),
    ]

    const result = (reconciler as any).findMatchingSubscription(subs, 'bc-1', 'rw-1')
    assert.isTrue(result)
  })

  test('should match subscription in pending verification state', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo()
    const eventSubService = createMockEventSubService()
    const reconciler = new EventSubReconciler(configRepo, eventSubService)

    const subs = [
      createSubscription({
        condition: {
          broadcaster_user_id: 'bc-1',
          reward_id: 'rw-1', // eslint-disable-line camelcase
        },
        status: 'webhook_callback_verification_pending',
      }),
    ]

    const result = (reconciler as any).findMatchingSubscription(subs, 'bc-1', 'rw-1')
    assert.isTrue(result)
  })

  test('should not match subscription with different broadcaster', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo()
    const eventSubService = createMockEventSubService()
    const reconciler = new EventSubReconciler(configRepo, eventSubService)

    const subs = [
      createSubscription({
        condition: {
          broadcaster_user_id: 'bc-other',
          reward_id: 'rw-1', // eslint-disable-line camelcase
        },
      }),
    ]

    const result = (reconciler as any).findMatchingSubscription(subs, 'bc-1', 'rw-1')
    assert.isFalse(result)
  })

  test('should not match disabled subscription', async ({ assert }) => {
    const configRepo = createMockStreamerConfigRepo()
    const eventSubService = createMockEventSubService()
    const reconciler = new EventSubReconciler(configRepo, eventSubService)

    const subs = [
      createSubscription({
        condition: {
          broadcaster_user_id: 'bc-1',
          reward_id: 'rw-1', // eslint-disable-line camelcase
        },
        status: 'authorization_revoked',
      }),
    ]

    const result = (reconciler as any).findMatchingSubscription(subs, 'bc-1', 'rw-1')
    assert.isFalse(result)
  })
})
