import { test } from '@japa/runner'
import { PollAggregationService } from '#services/polls/poll_aggregation_service'

/**
 * Tests unitaires pour PollAggregationService
 *
 * Le service agrège les votes de tous les channel links d'un poll:
 * - getAggregatedVotes: Calcule les totaux et pourcentages
 * - getAggregatedVotesWithCache: Utilise le cache Redis
 * - aggregateAndEmit: Agrège et émet via WebSocket
 * - invalidateCache: Invalide le cache Redis
 */

test.group('PollAggregationService - getAggregatedVotes', () => {
  test('should aggregate votes from multiple channel links', async ({ assert }) => {
    const channelLinks = [
      { votesByOption: { '0': 10, '1': 5 } },
      { votesByOption: { '0': 15, '1': 20 } },
      { votesByOption: { '0': 5, '1': 10 } },
    ]

    const mockRepository = {
      findByPollInstance: async () => channelLinks,
    }

    const mockRedisService = {
      getCachedAggregatedVotes: async () => null,
      cacheAggregatedVotes: async () => {},
      deleteCachedAggregatedVotes: async () => {},
    }

    const mockWebSocketService = {
      emitPollUpdate: async () => {},
    }

    const service = new PollAggregationService(
      mockRepository as any,
      mockRedisService as any,
      mockWebSocketService as any
    )

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.pollInstanceId, 'poll-123')
    assert.equal(result.votesByOption['0'], 30) // 10 + 15 + 5
    assert.equal(result.votesByOption['1'], 35) // 5 + 20 + 10
    assert.equal(result.totalVotes, 65)
    assert.closeTo(result.percentages['0'], 46.2, 0.1) // 30/65 * 100
    assert.closeTo(result.percentages['1'], 53.8, 0.1) // 35/65 * 100
  })

  test('should return empty results when no channel links', async ({ assert }) => {
    const mockRepository = {
      findByPollInstance: async () => [],
    }

    const mockRedisService = {
      getCachedAggregatedVotes: async () => null,
      cacheAggregatedVotes: async () => {},
      deleteCachedAggregatedVotes: async () => {},
    }

    const mockWebSocketService = {
      emitPollUpdate: async () => {},
    }

    const service = new PollAggregationService(
      mockRepository as any,
      mockRedisService as any,
      mockWebSocketService as any
    )

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.pollInstanceId, 'poll-123')
    assert.deepEqual(result.votesByOption, {})
    assert.equal(result.totalVotes, 0)
    assert.deepEqual(result.percentages, {})
  })

  test('should handle single channel link', async ({ assert }) => {
    const channelLinks = [{ votesByOption: { '0': 100, '1': 50, '2': 50 } }]

    const mockRepository = {
      findByPollInstance: async () => channelLinks,
    }

    const mockRedisService = {
      getCachedAggregatedVotes: async () => null,
      cacheAggregatedVotes: async () => {},
      deleteCachedAggregatedVotes: async () => {},
    }

    const mockWebSocketService = {
      emitPollUpdate: async () => {},
    }

    const service = new PollAggregationService(
      mockRepository as any,
      mockRedisService as any,
      mockWebSocketService as any
    )

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.totalVotes, 200)
    assert.equal(result.percentages['0'], 50) // 100/200 * 100
    assert.equal(result.percentages['1'], 25) // 50/200 * 100
    assert.equal(result.percentages['2'], 25) // 50/200 * 100
  })

  test('should handle channel link with zero votes', async ({ assert }) => {
    const channelLinks = [
      { votesByOption: { '0': 0, '1': 0 } },
      { votesByOption: { '0': 10, '1': 10 } },
    ]

    const mockRepository = {
      findByPollInstance: async () => channelLinks,
    }

    const mockRedisService = {
      getCachedAggregatedVotes: async () => null,
      cacheAggregatedVotes: async () => {},
      deleteCachedAggregatedVotes: async () => {},
    }

    const mockWebSocketService = {
      emitPollUpdate: async () => {},
    }

    const service = new PollAggregationService(
      mockRepository as any,
      mockRedisService as any,
      mockWebSocketService as any
    )

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.totalVotes, 20)
    assert.equal(result.votesByOption['0'], 10)
    assert.equal(result.votesByOption['1'], 10)
  })
})

test.group('PollAggregationService - getAggregatedVotesWithCache', () => {
  test('should return cached votes if available', async ({ assert }) => {
    const cachedVotes = {
      pollInstanceId: 'poll-123',
      votesByOption: { '0': 100, '1': 200 },
      totalVotes: 300,
      percentages: { '0': 33.3, '1': 66.7 },
    }

    let repositoryCalled = false
    const mockRepository = {
      findByPollInstance: async () => {
        repositoryCalled = true
        return []
      },
    }

    const mockRedisService = {
      getCachedAggregatedVotes: async () => cachedVotes,
      cacheAggregatedVotes: async () => {},
      deleteCachedAggregatedVotes: async () => {},
    }

    const mockWebSocketService = {
      emitPollUpdate: async () => {},
    }

    const service = new PollAggregationService(
      mockRepository as any,
      mockRedisService as any,
      mockWebSocketService as any
    )

    const result = await service.getAggregatedVotesWithCache('poll-123')

    assert.deepEqual(result, cachedVotes)
    assert.isFalse(repositoryCalled) // Should not hit the database
  })

  test('should calculate and cache if not in cache', async ({ assert }) => {
    const channelLinks = [{ votesByOption: { '0': 50, '1': 50 } }]

    let cacheCalled = false
    let cachedData: any = null

    const mockRepository = {
      findByPollInstance: async () => channelLinks,
    }

    const mockRedisService = {
      getCachedAggregatedVotes: async () => null,
      cacheAggregatedVotes: async (_id: string, data: any) => {
        cacheCalled = true
        cachedData = data
      },
      deleteCachedAggregatedVotes: async () => {},
    }

    const mockWebSocketService = {
      emitPollUpdate: async () => {},
    }

    const service = new PollAggregationService(
      mockRepository as any,
      mockRedisService as any,
      mockWebSocketService as any
    )

    const result = await service.getAggregatedVotesWithCache('poll-123')

    assert.isTrue(cacheCalled)
    assert.equal(result.totalVotes, 100)
    assert.deepEqual(cachedData, result)
  })
})

test.group('PollAggregationService - aggregateAndEmit', () => {
  test('should aggregate votes and emit via WebSocket', async ({ assert }) => {
    const channelLinks = [{ votesByOption: { '0': 25, '1': 75 } }]

    let emitCalled = false
    let emittedData: any = null
    let emittedPollId = ''

    const mockRepository = {
      findByPollInstance: async () => channelLinks,
    }

    const mockRedisService = {
      getCachedAggregatedVotes: async () => null,
      cacheAggregatedVotes: async () => {},
      deleteCachedAggregatedVotes: async () => {},
    }

    const mockWebSocketService = {
      emitPollUpdate: async (pollId: string, data: any) => {
        emitCalled = true
        emittedPollId = pollId
        emittedData = data
      },
    }

    const service = new PollAggregationService(
      mockRepository as any,
      mockRedisService as any,
      mockWebSocketService as any
    )

    const result = await service.aggregateAndEmit('poll-123')

    assert.isTrue(emitCalled)
    assert.equal(emittedPollId, 'poll-123')
    assert.equal(emittedData.totalVotes, 100)
    assert.deepEqual(result, emittedData)
  })

  test('should cache aggregated votes after emitting', async ({ assert }) => {
    const channelLinks = [{ votesByOption: { '0': 10 } }]

    let cacheCalled = false

    const mockRepository = {
      findByPollInstance: async () => channelLinks,
    }

    const mockRedisService = {
      getCachedAggregatedVotes: async () => null,
      cacheAggregatedVotes: async () => {
        cacheCalled = true
      },
      deleteCachedAggregatedVotes: async () => {},
    }

    const mockWebSocketService = {
      emitPollUpdate: async () => {},
    }

    const service = new PollAggregationService(
      mockRepository as any,
      mockRedisService as any,
      mockWebSocketService as any
    )

    await service.aggregateAndEmit('poll-123')

    assert.isTrue(cacheCalled)
  })
})

test.group('PollAggregationService - invalidateCache', () => {
  test('should delete cached votes from Redis', async ({ assert }) => {
    let deleteCalled = false
    let deletedPollId = ''

    const mockRepository = {
      findByPollInstance: async () => [],
    }

    const mockRedisService = {
      getCachedAggregatedVotes: async () => null,
      cacheAggregatedVotes: async () => {},
      deleteCachedAggregatedVotes: async (pollId: string) => {
        deleteCalled = true
        deletedPollId = pollId
      },
    }

    const mockWebSocketService = {
      emitPollUpdate: async () => {},
    }

    const service = new PollAggregationService(
      mockRepository as any,
      mockRedisService as any,
      mockWebSocketService as any
    )

    await service.invalidateCache('poll-123')

    assert.isTrue(deleteCalled)
    assert.equal(deletedPollId, 'poll-123')
  })
})
