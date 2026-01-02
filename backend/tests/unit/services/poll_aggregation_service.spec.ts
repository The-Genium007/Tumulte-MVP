import { test } from '@japa/runner'
import { PollAggregationService } from '#services/polls/poll_aggregation_service'
import type { PollChannelLinkRepository } from '#repositories/poll_channel_link_repository'
import type { redisService as RedisService } from '#services/cache/redis_service'
import type { webSocketService as WebSocketService } from '#services/websocket/websocket_service'
import { pollChannelLink as PollChannelLink } from '#models/poll_channel_link'

// Mock Repository
class MockPollChannelLinkRepository implements Partial<PollChannelLinkRepository> {
  private links: PollChannelLink[] = []

  seed(links: PollChannelLink[]): void {
    this.links = links
  }

  async findByPollInstance(_pollInstanceId: string): Promise<PollChannelLink[]> {
    return this.links
  }

  clear(): void {
    this.links = []
  }
}

// Mock Redis Service
class MockRedisService implements Partial<RedisService> {
  private cache: Map<string, any> = new Map()
  getCachedCalled = false
  cacheCalled = false
  deleteCalled = false

  async getCachedAggregatedVotes(pollInstanceId: string): Promise<any> {
    this.getCachedCalled = true
    return this.cache.get(pollInstanceId) || null
  }

  async cacheAggregatedVotes(pollInstanceId: string, data: any): Promise<void> {
    this.cacheCalled = true
    this.cache.set(pollInstanceId, data)
  }

  async deleteCachedAggregatedVotes(pollInstanceId: string): Promise<void> {
    this.deleteCalled = true
    this.cache.delete(pollInstanceId)
  }

  reset(): void {
    this.cache.clear()
    this.getCachedCalled = false
    this.cacheCalled = false
    this.deleteCalled = false
  }
}

// Mock WebSocket Service
class MockWebSocketService implements Partial<WebSocketService> {
  emitPollUpdateCalled = false
  lastEmittedPollId: string | null = null
  lastEmittedData: any = null

  emitPollUpdate(pollInstanceId: string, data: any): void {
    this.emitPollUpdateCalled = true
    this.lastEmittedPollId = pollInstanceId
    this.lastEmittedData = data
  }

  reset(): void {
    this.emitPollUpdateCalled = false
    this.lastEmittedPollId = null
    this.lastEmittedData = null
  }
}

test.group('PollAggregationService - Basic Aggregation', () => {
  test('should aggregate votes from all channel links', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 10, '1': 5 },
        totalVotes: 15,
      },
      {
        id: 'link-2',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-2',
        votesByOption: { '0': 8, '1': 12 },
        totalVotes: 20,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.pollInstanceId, 'poll-123')
    assert.equal(result.totalVotes, 35)
    assert.equal(result.votesByOption['0'], 18)
    assert.equal(result.votesByOption['1'], 17)
    assert.approximately(result.percentages['0'], 51.4, 0.1)
    assert.approximately(result.percentages['1'], 48.6, 0.1)
  })

  test('should handle empty channel links', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([])

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.pollInstanceId, 'poll-123')
    assert.equal(result.totalVotes, 0)
    assert.deepEqual(result.votesByOption, {})
    assert.deepEqual(result.percentages, {})
  })

  test('should handle zero votes correctly without NaN', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 0, '1': 0 },
        totalVotes: 0,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.totalVotes, 0)
    assert.equal(result.percentages['0'], 0)
    assert.equal(result.percentages['1'], 0)
    // Verify not NaN
    assert.isFalse(Number.isNaN(result.percentages['0']))
    assert.isFalse(Number.isNaN(result.percentages['1']))
  })

  test('should aggregate votes from multiple streamers with different options', async ({
    assert,
  }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 25, '1': 15, '2': 10 },
        totalVotes: 50,
      },
      {
        id: 'link-2',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-2',
        votesByOption: { '0': 30, '1': 10, '2': 10 },
        totalVotes: 50,
      },
      {
        id: 'link-3',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-3',
        votesByOption: { '0': 20, '1': 20, '2': 10 },
        totalVotes: 50,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.totalVotes, 150)
    assert.equal(result.votesByOption['0'], 75) // 25+30+20
    assert.equal(result.votesByOption['1'], 45) // 15+10+20
    assert.equal(result.votesByOption['2'], 30) // 10+10+10
    assert.equal(result.percentages['0'], 50.0) // 75/150
    assert.equal(result.percentages['1'], 30.0) // 45/150
    assert.equal(result.percentages['2'], 20.0) // 30/150
  })
})

test.group('PollAggregationService - Percentage Calculation', () => {
  test('should calculate percentages with one decimal precision', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 33, '1': 67 },
        totalVotes: 100,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.percentages['0'], 33.0)
    assert.equal(result.percentages['1'], 67.0)
  })

  test('should round percentages to one decimal place', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 1, '1': 2, '2': 3 },
        totalVotes: 6,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    // 1/6 = 16.666... -> 16.7
    // 2/6 = 33.333... -> 33.3
    // 3/6 = 50.000... -> 50.0
    assert.equal(result.percentages['0'], 16.7)
    assert.equal(result.percentages['1'], 33.3)
    assert.equal(result.percentages['2'], 50.0)
  })
})

test.group('PollAggregationService - Redis Cache', () => {
  test('should return cached result when available (cache hit)', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    // Seed cache with existing data
    const cachedData = {
      pollInstanceId: 'poll-123',
      totalVotes: 999,
      votesByOption: { '0': 500, '1': 499 },
      percentages: { '0': 50.1, '1': 49.9 },
    }
    await mockRedis.cacheAggregatedVotes('poll-123', cachedData)

    // Seed repo with different data (should be ignored if cache hit)
    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 10, '1': 10 },
        totalVotes: 20,
      },
    ] as PollChannelLink[])

    mockRedis.reset()
    const result = await service.getAggregatedVotesWithCache('poll-123')

    assert.isTrue(mockRedis.getCachedCalled)
    assert.equal(result.totalVotes, 999) // Cached value
    assert.equal(result.votesByOption['0'], 500)
  })

  test('should compute and cache result when cache is empty (cache miss)', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-456',
        streamerId: 'streamer-1',
        votesByOption: { '0': 100, '1': 50 },
        totalVotes: 150,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotesWithCache('poll-456')

    assert.isTrue(mockRedis.getCachedCalled)
    assert.isTrue(mockRedis.cacheCalled)
    assert.equal(result.totalVotes, 150)
    assert.equal(result.votesByOption['0'], 100)
  })

  test('should cache aggregated votes when calling aggregateAndEmit', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-789',
        streamerId: 'streamer-1',
        votesByOption: { '0': 25, '1': 75 },
        totalVotes: 100,
      },
    ] as PollChannelLink[])

    await service.aggregateAndEmit('poll-789')

    assert.isTrue(mockRedis.cacheCalled)
  })

  test('should invalidate cache when requested', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    // Cache some data
    await mockRedis.cacheAggregatedVotes('poll-123', { totalVotes: 100 })

    mockRedis.reset()

    // Invalidate
    await service.invalidateCache('poll-123')

    assert.isTrue(mockRedis.deleteCalled)

    // Verify cache is empty
    const cached = await mockRedis.getCachedAggregatedVotes('poll-123')
    assert.isNull(cached)
  })
})

test.group('PollAggregationService - WebSocket Integration', () => {
  test('should emit poll update via WebSocket when calling aggregateAndEmit', async ({
    assert,
  }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 10, '1': 5 },
        totalVotes: 15,
      },
    ] as PollChannelLink[])

    const result = await service.aggregateAndEmit('poll-123')

    assert.isTrue(mockWebSocket.emitPollUpdateCalled)
    assert.equal(mockWebSocket.lastEmittedPollId, 'poll-123')
    assert.equal(mockWebSocket.lastEmittedData.totalVotes, 15)
    assert.equal(result.totalVotes, 15)
  })

  test('should emit correct aggregated data structure via WebSocket', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-ws-test',
        streamerId: 'streamer-1',
        votesByOption: { '0': 40, '1': 30, '2': 30 },
        totalVotes: 100,
      },
    ] as PollChannelLink[])

    await service.aggregateAndEmit('poll-ws-test')

    assert.equal(mockWebSocket.lastEmittedData.pollInstanceId, 'poll-ws-test')
    assert.equal(mockWebSocket.lastEmittedData.totalVotes, 100)
    assert.deepEqual(mockWebSocket.lastEmittedData.votesByOption, { '0': 40, '1': 30, '2': 30 })
    assert.deepEqual(mockWebSocket.lastEmittedData.percentages, { '0': 40.0, '1': 30.0, '2': 30.0 })
  })
})

test.group('PollAggregationService - Winner Determination', () => {
  test('should identify winner with most votes', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 10, '1': 50, '2': 5 },
        totalVotes: 65,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    // Option 1 has most votes (50)
    const winner = Object.entries(result.votesByOption).reduce((max, [key, votes]) =>
      votes > result.votesByOption[max] ? key : max
    )

    assert.equal(winner, '1')
    assert.equal(result.votesByOption['1'], 50)
  })

  test('should handle tie in votes', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 50, '1': 50, '2': 10 },
        totalVotes: 110,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    // Both option 0 and 1 have 50 votes
    assert.equal(result.votesByOption['0'], 50)
    assert.equal(result.votesByOption['1'], 50)
    assert.equal(result.percentages['0'], 45.5)
    assert.equal(result.percentages['1'], 45.5)
  })
})

test.group('PollAggregationService - Edge Cases', () => {
  test('should handle single vote on single option', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 1 },
        totalVotes: 1,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.totalVotes, 1)
    assert.equal(result.votesByOption['0'], 1)
    assert.equal(result.percentages['0'], 100.0)
  })

  test('should handle missing votesByOption gracefully', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: {},
        totalVotes: 0,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.totalVotes, 0)
    assert.deepEqual(result.votesByOption, {})
    assert.deepEqual(result.percentages, {})
  })

  test('should aggregate with large vote numbers', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockRedis = new MockRedisService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollAggregationService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockRedis as unknown as RedisService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 1000000, '1': 999999 },
        totalVotes: 1999999,
      },
    ] as PollChannelLink[])

    const result = await service.getAggregatedVotes('poll-123')

    assert.equal(result.totalVotes, 1999999)
    assert.equal(result.votesByOption['0'], 1000000)
    assert.approximately(result.percentages['0'], 50.0, 0.1)
  })
})
