import { test } from '@japa/runner'
import { PollAggregationService } from '#services/polls/poll_aggregation_service'
import { PollChannelLinkRepository } from '#repositories/poll_channel_link_repository'
import { redisService as RedisService } from '#services/cache/redis_service'
import { webSocketService as WebSocketService } from '#services/websocket/websocket_service'
import { pollChannelLink as PollChannelLink } from '#models/poll_channel_link'

test.group('PollAggregationService', () => {
  let pollAggregationService: PollAggregationService
  let pollChannelLinkRepository: PollChannelLinkRepository
  let redisService: RedisService
  let webSocketService: WebSocketService

  test('getAggregatedVotes should aggregate votes from all channel links', async ({ assert }) => {
    pollChannelLinkRepository = new PollChannelLinkRepository()
    redisService = new RedisService()
    webSocketService = new WebSocketService()
    pollAggregationService = new PollAggregationService(
      pollChannelLinkRepository,
      redisService,
      webSocketService
    )

    const mockChannelLinks = [
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
    ] as PollChannelLink[]

    pollChannelLinkRepository.findByPollInstance = async () => mockChannelLinks

    const result = await pollAggregationService.getAggregatedVotes('poll-123')

    assert.equal(result.pollInstanceId, 'poll-123')
    assert.equal(result.totalVotes, 35)
    assert.equal(result.votesByOption['0'], 18)
    assert.equal(result.votesByOption['1'], 17)
    assert.approximately(result.percentages['0'], 51.4, 0.1)
    assert.approximately(result.percentages['1'], 48.6, 0.1)
  })

  test('getAggregatedVotes should handle empty channel links', async ({ assert }) => {
    pollChannelLinkRepository = new PollChannelLinkRepository()
    redisService = new RedisService()
    webSocketService = new WebSocketService()
    pollAggregationService = new PollAggregationService(
      pollChannelLinkRepository,
      redisService,
      webSocketService
    )

    pollChannelLinkRepository.findByPollInstance = async () => []

    const result = await pollAggregationService.getAggregatedVotes('poll-123')

    assert.equal(result.pollInstanceId, 'poll-123')
    assert.equal(result.totalVotes, 0)
    assert.deepEqual(result.votesByOption, {})
    assert.deepEqual(result.percentages, {})
  })

  test('getAggregatedVotes should handle zero votes correctly', async ({ assert }) => {
    pollChannelLinkRepository = new PollChannelLinkRepository()
    redisService = new RedisService()
    webSocketService = new WebSocketService()
    pollAggregationService = new PollAggregationService(
      pollChannelLinkRepository,
      redisService,
      webSocketService
    )

    const mockChannelLinks = [
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 0, '1': 0 },
        totalVotes: 0,
      },
    ] as PollChannelLink[]

    pollChannelLinkRepository.findByPollInstance = async () => mockChannelLinks

    const result = await pollAggregationService.getAggregatedVotes('poll-123')

    assert.equal(result.totalVotes, 0)
    assert.equal(result.percentages['0'], 0)
    assert.equal(result.percentages['1'], 0)
  })

  test('aggregateAndEmit should aggregate and emit via WebSocket', async ({ assert }) => {
    pollChannelLinkRepository = new PollChannelLinkRepository()
    redisService = new RedisService()
    webSocketService = new WebSocketService()
    pollAggregationService = new PollAggregationService(
      pollChannelLinkRepository,
      redisService,
      webSocketService
    )

    const mockChannelLinks = [
      {
        id: 'link-1',
        pollInstanceId: 'poll-123',
        streamerId: 'streamer-1',
        votesByOption: { '0': 10, '1': 5 },
        totalVotes: 15,
      },
    ] as PollChannelLink[]

    pollChannelLinkRepository.findByPollInstance = async () => mockChannelLinks

    let emitted = false
    webSocketService.emitPollUpdate = () => {
      emitted = true
    }

    redisService.cacheAggregatedVotes = async () => {}

    const result = await pollAggregationService.aggregateAndEmit('poll-123')

    assert.isTrue(emitted)
    assert.equal(result.totalVotes, 15)
  })
})
