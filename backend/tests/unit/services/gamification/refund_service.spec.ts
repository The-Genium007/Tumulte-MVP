import { test } from '@japa/runner'
import transmit from '@adonisjs/transmit/services/main'
import { DateTime } from 'luxon'
import { RefundService } from '#services/gamification/refund_service'
import { streamer as Streamer } from '#models/streamer'
import GamificationContribution from '#models/gamification_contribution'
import GamificationInstance from '#models/gamification_instance'
import type { GamificationInstanceStatus } from '#models/gamification_instance'

// ========================================
// MOCK FACTORIES
// ========================================

function createMockContribution(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contribution-1',
    instanceId: 'instance-1',
    streamerId: 'streamer-1',
    twitchUserId: 'twitch-user-1',
    twitchUsername: 'viewer_one',
    twitchRedemptionId: 'redemption-1',
    amount: 100,
    refunded: false,
    refundedAt: null as DateTime | null,
    save: async () => {},
    ...overrides,
  }
}

function createMockInstance(
  status: GamificationInstanceStatus = 'expired',
  overrides: Record<string, unknown> = {}
) {
  return {
    id: 'instance-1',
    campaignId: 'campaign-1',
    eventId: 'event-1',
    streamerId: 'streamer-1',
    status,
    objectiveTarget: 500,
    currentProgress: 200,
    duration: 300,
    startsAt: DateTime.now().minus({ minutes: 10 }),
    expiresAt: DateTime.now().minus({ minutes: 5 }),
    ...overrides,
  }
}

function createMockStreamer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'streamer-1',
    twitchUserId: 'twitch-streamer-1',
    twitchDisplayName: 'TestStreamer',
    ...overrides,
  }
}

function createMockTwitchRewardService(overrides: Record<string, unknown> = {}) {
  return {
    refundRedemption: async () => true,
    ...overrides,
  }
}

// ========================================
// refundInstance tests
// ========================================

test.group('RefundService - refundInstance - non-expired instances', (group) => {
  let origStreamerFind: typeof Streamer.find
  let origContributionQuery: typeof GamificationContribution.query
  let origTransmitBroadcast: typeof transmit.broadcast

  group.each.setup(() => {
    origStreamerFind = Streamer.find
    origContributionQuery = GamificationContribution.query
    origTransmitBroadcast = transmit.broadcast
    ;(transmit as any).broadcast = () => {}
  })

  group.each.teardown(() => {
    ;(Streamer as any).find = origStreamerFind
    ;(GamificationContribution as any).query = origContributionQuery
    ;(transmit as any).broadcast = origTransmitBroadcast
  })

  test('should return empty result without calling Twitch API for an active instance', async ({
    assert,
  }) => {
    const mockTwitchRewardService = createMockTwitchRewardService()
    let refundCalled = false
    mockTwitchRewardService.refundRedemption = async () => {
      refundCalled = true
      return true
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('active')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.instanceId, 'instance-1')
    assert.equal(result.totalContributions, 0)
    assert.equal(result.refundedCount, 0)
    assert.equal(result.failedCount, 0)
    assert.lengthOf(result.errors, 0)
    assert.isFalse(refundCalled)
  })

  test('should return empty result without calling Twitch API for a completed instance', async ({
    assert,
  }) => {
    const mockTwitchRewardService = createMockTwitchRewardService()
    let refundCalled = false
    mockTwitchRewardService.refundRedemption = async () => {
      refundCalled = true
      return true
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('completed')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.totalContributions, 0)
    assert.equal(result.refundedCount, 0)
    assert.isFalse(refundCalled)
  })

  test('should return empty result without calling Twitch API for a cancelled instance', async ({
    assert,
  }) => {
    const mockTwitchRewardService = createMockTwitchRewardService()
    let refundCalled = false
    mockTwitchRewardService.refundRedemption = async () => {
      refundCalled = true
      return true
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('cancelled')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.refundedCount, 0)
    assert.isFalse(refundCalled)
  })

  test('should return empty result without calling Twitch API for an armed instance', async ({
    assert,
  }) => {
    const mockTwitchRewardService = createMockTwitchRewardService()
    let refundCalled = false
    mockTwitchRewardService.refundRedemption = async () => {
      refundCalled = true
      return true
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('armed')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.refundedCount, 0)
    assert.isFalse(refundCalled)
  })
})

test.group('RefundService - refundInstance - missing streamer', (group) => {
  let origStreamerFind: typeof Streamer.find
  let origContributionQuery: typeof GamificationContribution.query
  let origTransmitBroadcast: typeof transmit.broadcast

  group.each.setup(() => {
    origStreamerFind = Streamer.find
    origContributionQuery = GamificationContribution.query
    origTransmitBroadcast = transmit.broadcast
    ;(transmit as any).broadcast = () => {}
  })

  group.each.teardown(() => {
    ;(Streamer as any).find = origStreamerFind
    ;(GamificationContribution as any).query = origContributionQuery
    ;(transmit as any).broadcast = origTransmitBroadcast
  })

  test('should return empty result when instance has no streamerId', async ({ assert }) => {
    const mockTwitchRewardService = createMockTwitchRewardService()
    let refundCalled = false
    mockTwitchRewardService.refundRedemption = async () => {
      refundCalled = true
      return true
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('expired', { streamerId: null })

    const result = await service.refundInstance(instance as any)

    assert.equal(result.totalContributions, 0)
    assert.equal(result.refundedCount, 0)
    assert.equal(result.failedCount, 0)
    assert.lengthOf(result.errors, 0)
    assert.isFalse(refundCalled)
  })

  test('should return empty result when streamer is not found in database', async ({ assert }) => {
    ;(Streamer as any).find = async () => null

    const mockTwitchRewardService = createMockTwitchRewardService()
    let refundCalled = false
    mockTwitchRewardService.refundRedemption = async () => {
      refundCalled = true
      return true
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('expired')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.totalContributions, 0)
    assert.equal(result.refundedCount, 0)
    assert.equal(result.failedCount, 0)
    assert.lengthOf(result.errors, 0)
    assert.isFalse(refundCalled)
  })
})

test.group('RefundService - refundInstance - empty contributions', (group) => {
  let origStreamerFind: typeof Streamer.find
  let origContributionQuery: typeof GamificationContribution.query
  let origTransmitBroadcast: typeof transmit.broadcast

  group.each.setup(() => {
    origStreamerFind = Streamer.find
    origContributionQuery = GamificationContribution.query
    origTransmitBroadcast = transmit.broadcast
    ;(transmit as any).broadcast = () => {}
  })

  group.each.teardown(() => {
    ;(Streamer as any).find = origStreamerFind
    ;(GamificationContribution as any).query = origContributionQuery
    ;(transmit as any).broadcast = origTransmitBroadcast
  })

  test('should return zero counts when there are no unrefunded contributions', async ({
    assert,
  }) => {
    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer
    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([]),
      }),
    })

    const mockTwitchRewardService = createMockTwitchRewardService()
    let refundCalled = false
    mockTwitchRewardService.refundRedemption = async () => {
      refundCalled = true
      return true
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('expired')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.totalContributions, 0)
    assert.equal(result.refundedCount, 0)
    assert.equal(result.failedCount, 0)
    assert.lengthOf(result.errors, 0)
    assert.isFalse(refundCalled)
  })
})

test.group('RefundService - refundInstance - happy path', (group) => {
  let origStreamerFind: typeof Streamer.find
  let origContributionQuery: typeof GamificationContribution.query
  let origTransmitBroadcast: typeof transmit.broadcast
  let broadcastCalls: Array<{ channel: string; data: unknown }>

  group.each.setup(() => {
    broadcastCalls = []
    origStreamerFind = Streamer.find
    origContributionQuery = GamificationContribution.query
    origTransmitBroadcast = transmit.broadcast
    ;(transmit as any).broadcast = (channel: string, data: unknown) => {
      broadcastCalls.push({ channel, data })
    }
  })

  group.each.teardown(() => {
    ;(Streamer as any).find = origStreamerFind
    ;(GamificationContribution as any).query = origContributionQuery
    ;(transmit as any).broadcast = origTransmitBroadcast
  })

  test('should refund all contributions and return correct counts', async ({ assert }) => {
    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer

    const contribution1 = createMockContribution({
      id: 'contribution-1',
      twitchRedemptionId: 'redemption-1',
      twitchUserId: 'user-1',
    })
    const contribution2 = createMockContribution({
      id: 'contribution-2',
      twitchRedemptionId: 'redemption-2',
      twitchUserId: 'user-2',
    })
    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([contribution1, contribution2]),
      }),
    })

    const service = new RefundService(createMockTwitchRewardService() as any)
    const instance = createMockInstance('expired')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.instanceId, 'instance-1')
    assert.equal(result.totalContributions, 2)
    assert.equal(result.refundedCount, 2)
    assert.equal(result.failedCount, 0)
    assert.lengthOf(result.errors, 0)
  })

  test('should mark each successfully refunded contribution with refunded=true and refundedAt', async ({
    assert,
  }) => {
    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer

    const contribution = createMockContribution()
    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([contribution]),
      }),
    })

    const service = new RefundService(createMockTwitchRewardService() as any)
    const instance = createMockInstance('expired')

    await service.refundInstance(instance as any)

    assert.isTrue(contribution.refunded)
    assert.isNotNull(contribution.refundedAt)
    assert.isTrue(DateTime.isDateTime(contribution.refundedAt))
  })

  test('should call refundRedemption with the correct streamer and redemption ID', async ({
    assert,
  }) => {
    const mockStreamer = createMockStreamer({ id: 'streamer-42' })
    ;(Streamer as any).find = async () => mockStreamer

    const contribution = createMockContribution({ twitchRedemptionId: 'redemption-abc123' })
    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([contribution]),
      }),
    })

    const refundCalls: Array<{ streamer: unknown; redemptionId: string }> = []
    const mockTwitchRewardService = {
      refundRedemption: async (streamer: unknown, redemptionId: string) => {
        refundCalls.push({ streamer, redemptionId })
        return true
      },
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('expired')

    await service.refundInstance(instance as any)

    assert.lengthOf(refundCalls, 1)
    assert.equal(refundCalls[0].streamer, mockStreamer)
    assert.equal(refundCalls[0].redemptionId, 'redemption-abc123')
  })

  test('should broadcast instance_refunded event to the campaign channel after processing', async ({
    assert,
  }) => {
    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer

    const contribution = createMockContribution()
    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([contribution]),
      }),
    })

    const service = new RefundService(createMockTwitchRewardService() as any)
    const instance = createMockInstance('expired', {
      campaignId: 'campaign-99',
      streamerId: 'streamer-1',
    })

    await service.refundInstance(instance as any)

    assert.lengthOf(broadcastCalls, 1)
    assert.equal(broadcastCalls[0].channel, 'gamification/campaign-99/instance')
    const broadcastData = broadcastCalls[0].data as Record<string, unknown>
    assert.equal(broadcastData.type, 'instance_refunded')
    const data = broadcastData.data as Record<string, unknown>
    assert.equal(data.instanceId, 'instance-1')
    assert.equal(data.refundedCount, 1)
    assert.equal(data.failedCount, 0)
    assert.equal(data.totalContributions, 1)
  })
})

test.group('RefundService - refundInstance - partial failures', (group) => {
  let origStreamerFind: typeof Streamer.find
  let origContributionQuery: typeof GamificationContribution.query
  let origTransmitBroadcast: typeof transmit.broadcast

  group.each.setup(() => {
    origStreamerFind = Streamer.find
    origContributionQuery = GamificationContribution.query
    origTransmitBroadcast = transmit.broadcast
    ;(transmit as any).broadcast = () => {}
  })

  group.each.teardown(() => {
    ;(Streamer as any).find = origStreamerFind
    ;(GamificationContribution as any).query = origContributionQuery
    ;(transmit as any).broadcast = origTransmitBroadcast
  })

  test('should continue processing remaining contributions when one Twitch API call fails', async ({
    assert,
  }) => {
    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer

    const contribution1 = createMockContribution({
      id: 'contribution-1',
      twitchRedemptionId: 'redemption-1',
      twitchUserId: 'user-1',
    })
    const contribution2 = createMockContribution({
      id: 'contribution-2',
      twitchRedemptionId: 'redemption-2',
      twitchUserId: 'user-2',
    })
    const contribution3 = createMockContribution({
      id: 'contribution-3',
      twitchRedemptionId: 'redemption-3',
      twitchUserId: 'user-3',
    })

    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([contribution1, contribution2, contribution3]),
      }),
    })

    // Only the second call fails
    let callCount = 0
    const mockTwitchRewardService = {
      refundRedemption: async (_streamer: unknown, redemptionId: string) => {
        callCount++
        if (redemptionId === 'redemption-2') {
          throw new Error('Twitch API timeout')
        }
        return true
      },
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('expired')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.totalContributions, 3)
    assert.equal(result.refundedCount, 2)
    assert.equal(result.failedCount, 1)
    assert.lengthOf(result.errors, 1)
    assert.equal(callCount, 3)
  })

  test('should populate error details for failed contributions', async ({ assert }) => {
    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer

    const failingContribution = createMockContribution({
      id: 'contribution-fail',
      twitchRedemptionId: 'redemption-fail',
      twitchUserId: 'user-fail',
    })

    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([failingContribution]),
      }),
    })

    const mockTwitchRewardService = {
      refundRedemption: async () => {
        throw new Error('Rate limit exceeded')
      },
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('expired')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.failedCount, 1)
    assert.lengthOf(result.errors, 1)
    assert.equal(result.errors[0].contributionId, 'contribution-fail')
    assert.equal(result.errors[0].twitchUserId, 'user-fail')
    assert.include(result.errors[0].error, 'Rate limit exceeded')
  })

  test('should not mark failed contributions as refunded', async ({ assert }) => {
    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer

    const contribution = createMockContribution({ refunded: false, refundedAt: null })

    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([contribution]),
      }),
    })

    const mockTwitchRewardService = {
      refundRedemption: async () => {
        throw new Error('API Error')
      },
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('expired')

    await service.refundInstance(instance as any)

    assert.isFalse(contribution.refunded)
    assert.isNull(contribution.refundedAt)
  })

  test('should handle non-Error thrown values gracefully', async ({ assert }) => {
    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer

    const contribution = createMockContribution()

    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([contribution]),
      }),
    })

    const mockTwitchRewardService = {
      // Throws a plain string instead of an Error object
      refundRedemption: async () => {
        throw 'connection refused'
      },
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('expired')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.failedCount, 1)
    assert.lengthOf(result.errors, 1)
    assert.include(result.errors[0].error, 'connection refused')
  })

  test('should correctly count all refunded vs failed when all fail', async ({ assert }) => {
    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer

    const contributions = [
      createMockContribution({ id: 'c-1', twitchRedemptionId: 'r-1', twitchUserId: 'u-1' }),
      createMockContribution({ id: 'c-2', twitchRedemptionId: 'r-2', twitchUserId: 'u-2' }),
    ]

    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve(contributions),
      }),
    })

    const mockTwitchRewardService = {
      refundRedemption: async () => {
        throw new Error('Service unavailable')
      },
    }

    const service = new RefundService(mockTwitchRewardService as any)
    const instance = createMockInstance('expired')

    const result = await service.refundInstance(instance as any)

    assert.equal(result.totalContributions, 2)
    assert.equal(result.refundedCount, 0)
    assert.equal(result.failedCount, 2)
    assert.lengthOf(result.errors, 2)
  })
})

// ========================================
// processExpiredInstances tests
// ========================================

test.group('RefundService - processExpiredInstances', (group) => {
  let origInstanceQuery: typeof GamificationInstance.query
  let origStreamerFind: typeof Streamer.find
  let origContributionQuery: typeof GamificationContribution.query
  let origTransmitBroadcast: typeof transmit.broadcast

  group.each.setup(() => {
    origInstanceQuery = GamificationInstance.query
    origStreamerFind = Streamer.find
    origContributionQuery = GamificationContribution.query
    origTransmitBroadcast = transmit.broadcast
    ;(transmit as any).broadcast = () => {}
  })

  group.each.teardown(() => {
    ;(GamificationInstance as any).query = origInstanceQuery
    ;(Streamer as any).find = origStreamerFind
    ;(GamificationContribution as any).query = origContributionQuery
    ;(transmit as any).broadcast = origTransmitBroadcast
  })

  test('should return 0 when there are no expired instances with unrefunded contributions', async ({
    assert,
  }) => {
    ;(GamificationInstance as any).query = () => ({
      where: () => ({
        whereHas: () => ({
          preload: () => Promise.resolve([]),
        }),
      }),
    })

    const service = new RefundService(createMockTwitchRewardService() as any)

    const count = await service.processExpiredInstances()

    assert.equal(count, 0)
  })

  test('should process each expired instance and return the total count', async ({ assert }) => {
    const instance1 = createMockInstance('expired', { id: 'instance-1', streamerId: 'streamer-1' })
    const instance2 = createMockInstance('expired', { id: 'instance-2', streamerId: 'streamer-1' })

    ;(GamificationInstance as any).query = () => ({
      where: () => ({
        whereHas: () => ({
          preload: () => Promise.resolve([instance1, instance2]),
        }),
      }),
    })

    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer
    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([]),
      }),
    })

    const service = new RefundService(createMockTwitchRewardService() as any)

    const count = await service.processExpiredInstances()

    assert.equal(count, 2)
  })

  test('should call refundInstance for each expired instance found', async ({ assert }) => {
    const instance1 = createMockInstance('expired', { id: 'instance-1' })
    const instance2 = createMockInstance('expired', { id: 'instance-2' })
    const instance3 = createMockInstance('expired', { id: 'instance-3' })

    ;(GamificationInstance as any).query = () => ({
      where: () => ({
        whereHas: () => ({
          preload: () => Promise.resolve([instance1, instance2, instance3]),
        }),
      }),
    })

    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer
    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([]),
      }),
    })

    const service = new RefundService(createMockTwitchRewardService() as any)

    const count = await service.processExpiredInstances()

    // All three instances were processed
    assert.equal(count, 3)
  })

  test('should continue processing remaining instances when one refundInstance call fails', async ({
    assert,
  }) => {
    const instance1 = createMockInstance('expired', { id: 'instance-1' })
    const instance2 = createMockInstance('expired', { id: 'instance-2' })

    ;(GamificationInstance as any).query = () => ({
      where: () => ({
        whereHas: () => ({
          preload: () => Promise.resolve([instance1, instance2]),
        }),
      }),
    })

    const mockStreamer = createMockStreamer()
    ;(Streamer as any).find = async () => mockStreamer

    // First instance has one failing contribution, second has a successful one
    let queryCallCount = 0
    ;(GamificationContribution as any).query = () => ({
      where: () => ({
        where: () => {
          queryCallCount++
          if (queryCallCount === 1) {
            const failingContribution = createMockContribution({ twitchRedemptionId: 'r-fail' })
            return Promise.resolve([failingContribution])
          }
          return Promise.resolve([createMockContribution({ twitchRedemptionId: 'r-ok' })])
        },
      }),
    })

    let refundCallCount = 0
    const mockTwitchRewardService = {
      refundRedemption: async (_streamer: unknown, redemptionId: string) => {
        refundCallCount++
        if (redemptionId === 'r-fail') {
          throw new Error('Twitch timeout')
        }
        return true
      },
    }

    const service = new RefundService(mockTwitchRewardService as any)

    const count = await service.processExpiredInstances()

    // Both instances were still counted as processed even if one had a failed contribution
    assert.equal(count, 2)
    assert.equal(refundCallCount, 2)
  })
})
