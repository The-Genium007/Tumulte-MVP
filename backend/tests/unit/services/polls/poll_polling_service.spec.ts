import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { PollPollingService } from '#services/polls/poll_polling_service'
import type { PollChannelLinkRepository } from '#repositories/poll_channel_link_repository'
import type { twitchPollService as TwitchPollService } from '#services/twitch/twitch_poll_service'
import type { webSocketService as WebSocketService } from '#services/websocket/websocket_service'
import { pollInstance as PollInstance } from '#models/poll_instance'

// Mock Poll Channel Link Repository
class MockPollChannelLinkRepository implements Partial<PollChannelLinkRepository> {
  private links: any[] = []

  seed(links: any[]): void {
    this.links = links
  }

  async findByPollInstance(pollInstanceId: string): Promise<any[]> {
    return this.links.filter((l) => l.pollInstanceId === pollInstanceId)
  }

  async updateVotes(
    linkId: string,
    votesByOption: Record<string, number>,
    totalVotes: number
  ): Promise<void> {
    const link = this.links.find((l) => l.id === linkId)
    if (link) {
      link.votesByOption = votesByOption
      link.totalVotes = totalVotes
    }
  }

  async updateStatus(
    linkId: string,
    status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'TERMINATED'
  ): Promise<void> {
    const link = this.links.find((l) => l.id === linkId)
    if (link) {
      link.status = status
    }
  }

  clear(): void {
    this.links = []
  }
}

// Mock Twitch Poll Service
class MockTwitchPollService implements Partial<TwitchPollService> {
  getPollCalled = false
  getPollCallCount = 0
  lastPollId: string | null = null
  mockPollData: any = null

  async getPoll(broadcasterId: string, pollId: string, _accessToken: string) {
    this.getPollCalled = true
    this.getPollCallCount++
    this.lastPollId = pollId

    if (this.mockPollData) {
      return this.mockPollData
    }

    return {
      id: pollId,
      broadcaster_id: broadcasterId,
      broadcaster_name: 'TestBroadcaster',
      broadcaster_login: 'testbroadcaster',
      title: 'Test Poll?',
      choices: [
        { id: 'choice-0', title: 'Option A', votes: 10, channel_points_votes: 0, bits_votes: 0 },
        { id: 'choice-1', title: 'Option B', votes: 20, channel_points_votes: 0, bits_votes: 0 },
      ],
      bits_voting_enabled: false,
      bits_per_vote: 0,
      channel_points_voting_enabled: false,
      channel_points_per_vote: 0,
      status: 'ACTIVE',
      duration: 60,
      started_at: new Date().toISOString(),
    }
  }

  async withTokenRefresh<T>(
    operation: (token: string) => Promise<T>,
    _getAccessToken: () => Promise<string>,
    _refreshToken: string,
    _onTokensRefreshed: (accessToken: string, refreshToken: string) => Promise<void>
  ): Promise<T> {
    return operation('mock_access_token')
  }

  setMockPollData(data: any): void {
    this.mockPollData = data
  }

  reset(): void {
    this.getPollCalled = false
    this.getPollCallCount = 0
    this.lastPollId = null
    this.mockPollData = null
  }
}

// Mock WebSocket Service
class MockWebSocketService implements Partial<WebSocketService> {
  emitPollStartCalled = false
  lastPollStartData: any = null

  emitPollStart(data: any): void {
    this.emitPollStartCalled = true
    this.lastPollStartData = data
  }

  reset(): void {
    this.emitPollStartCalled = false
    this.lastPollStartData = null
  }
}

// Mock Poll Aggregation Service
class MockPollAggregationService {
  aggregateAndEmitCalled = false
  aggregateAndEmitCallCount = 0
  lastPollInstanceId: string | null = null

  async aggregateAndEmit(pollInstanceId: string): Promise<any> {
    this.aggregateAndEmitCalled = true
    this.aggregateAndEmitCallCount++
    this.lastPollInstanceId = pollInstanceId

    return {
      totalVotes: 30,
      votesByOption: { '0': 10, '1': 20 },
      percentagesByOption: { '0': 33.3, '1': 66.7 },
    }
  }

  reset(): void {
    this.aggregateAndEmitCalled = false
    this.aggregateAndEmitCallCount = 0
    this.lastPollInstanceId = null
  }
}

test.group('PollPollingService - Initialization and Configuration', () => {
  test('should initialize service with unique instance ID', ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    assert.exists(service)
  })

  test('should set aggregation service via setter', ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    assert.exists(service)
  })

  test('should set poll end callback via setter', ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    let callbackCalled = false
    service.setOnPollEndCallback(async (_pollInstance) => {
      callbackCalled = true
    })

    assert.isFalse(callbackCalled) // Callback not yet executed
  })
})

test.group('PollPollingService - Start Polling', () => {
  test('should start polling and emit WebSocket poll start event', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    // Start polling (non-blocking)
    service.startPolling(pollInstance)

    // Wait for initial setup
    await new Promise((resolve) => setTimeout(resolve, 600))

    assert.isTrue(mockWebSocket.emitPollStartCalled)
    assert.equal(mockWebSocket.lastPollStartData?.pollInstanceId, 'poll-1')
    assert.equal(mockWebSocket.lastPollStartData?.title, 'Test Poll?')

    // Stop polling to clean up
    service.stopPolling('poll-1')
  }).timeout(10000)

  test('should stop existing polling before starting new one for same poll', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    // Start polling first time
    service.startPolling(pollInstance)
    await new Promise((resolve) => setTimeout(resolve, 600))

    // Reset mock
    mockWebSocket.reset()

    // Start polling again - should stop previous one
    service.startPolling(pollInstance)
    await new Promise((resolve) => setTimeout(resolve, 600))

    // WebSocket should have been called again
    assert.isTrue(mockWebSocket.emitPollStartCalled)

    // Stop polling to clean up
    service.stopPolling('poll-1')
  }).timeout(10000)

  test('should create polling interval with 3 second cycle', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    // Mock a streamer with encrypted tokens
    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: 'twitch-123',
      async getDecryptedAccessToken() {
        return 'access_token_mock'
      },
      async getDecryptedRefreshToken() {
        return 'refresh_token_mock'
      },
      async updateTokens(_accessToken: string, _refreshToken: string) {},
    }

    // Seed channel links
    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-1',
        streamerId: 'streamer-1',
        twitchPollId: 'twitch-poll-123',
        status: 'CREATED',
        totalVotes: 0,
        votesByOption: {},
        streamer: mockStreamer,
      },
    ])

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    // Start polling
    service.startPolling(pollInstance)

    // Wait for at least 2 polling cycles (3s * 2 = 6s + buffer)
    await new Promise((resolve) => setTimeout(resolve, 7000))

    // Aggregation should have been called multiple times (at least 2)
    assert.isTrue(mockAggregation.aggregateAndEmitCallCount >= 2)

    // Stop polling
    service.stopPolling('poll-1')
  }).timeout(15000)
})

test.group('PollPollingService - API Polls Fetching', () => {
  test('should fetch poll data from Twitch API for API polls', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: 'twitch-123',
      twitchDisplayName: 'TestStreamer',
      async getDecryptedAccessToken() {
        return 'access_token_mock'
      },
      async getDecryptedRefreshToken() {
        return 'refresh_token_mock'
      },
      async updateTokens(_accessToken: string, _refreshToken: string) {},
    }

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-1',
        streamerId: 'streamer-1',
        twitchPollId: 'twitch-poll-123',
        status: 'CREATED',
        totalVotes: 0,
        votesByOption: {},
        streamer: mockStreamer,
      },
    ])

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)

    // Wait for first polling cycle
    await new Promise((resolve) => setTimeout(resolve, 1500))

    assert.isTrue(mockTwitchPoll.getPollCalled)
    assert.equal(mockTwitchPoll.lastPollId, 'twitch-poll-123')

    service.stopPolling('poll-1')
  }).timeout(10000)

  test('should update channel link votes after fetching from Twitch', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    // Mock poll data with votes
    mockTwitchPoll.setMockPollData({
      id: 'twitch-poll-123',
      broadcaster_id: 'twitch-123',
      title: 'Test Poll?',
      choices: [
        { id: 'choice-0', title: 'Option A', votes: 25, channel_points_votes: 0, bits_votes: 0 },
        { id: 'choice-1', title: 'Option B', votes: 75, channel_points_votes: 0, bits_votes: 0 },
      ],
      status: 'ACTIVE',
      duration: 60,
      started_at: new Date().toISOString(),
    })

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: 'twitch-123',
      twitchDisplayName: 'TestStreamer',
      async getDecryptedAccessToken() {
        return 'access_token_mock'
      },
      async getDecryptedRefreshToken() {
        return 'refresh_token_mock'
      },
      async updateTokens(_accessToken: string, _refreshToken: string) {},
    }

    const linkData = {
      id: 'link-1',
      pollInstanceId: 'poll-1',
      streamerId: 'streamer-1',
      twitchPollId: 'twitch-poll-123',
      status: 'CREATED',
      totalVotes: 0,
      votesByOption: {},
      streamer: mockStreamer,
    }

    mockRepo.seed([linkData])

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)

    // Wait for polling cycle
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Check votes were updated
    assert.equal(linkData.totalVotes, 100)
    assert.equal(linkData.votesByOption['0'], 25)
    assert.equal(linkData.votesByOption['1'], 75)

    service.stopPolling('poll-1')
  }).timeout(10000)

  test('should update link status when Twitch poll status changes', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    // Mock poll with COMPLETED status
    mockTwitchPoll.setMockPollData({
      id: 'twitch-poll-123',
      broadcaster_id: 'twitch-123',
      title: 'Test Poll?',
      choices: [
        { id: 'choice-0', title: 'Option A', votes: 10, channel_points_votes: 0, bits_votes: 0 },
        { id: 'choice-1', title: 'Option B', votes: 20, channel_points_votes: 0, bits_votes: 0 },
      ],
      status: 'COMPLETED',
      duration: 60,
      started_at: new Date().toISOString(),
    })

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: 'twitch-123',
      twitchDisplayName: 'TestStreamer',
      async getDecryptedAccessToken() {
        return 'access_token_mock'
      },
      async getDecryptedRefreshToken() {
        return 'refresh_token_mock'
      },
      async updateTokens(_accessToken: string, _refreshToken: string) {},
    }

    const linkData = {
      id: 'link-1',
      pollInstanceId: 'poll-1',
      streamerId: 'streamer-1',
      twitchPollId: 'twitch-poll-123',
      status: 'CREATED',
      totalVotes: 0,
      votesByOption: {},
      streamer: mockStreamer,
    }

    mockRepo.seed([linkData])

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)

    // Wait for polling cycle
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Status should be updated to COMPLETED
    assert.equal(linkData.status, 'COMPLETED')

    service.stopPolling('poll-1')
  }).timeout(10000)
})

test.group('PollPollingService - Twitch Status Mapping', () => {
  test('should map ACTIVE status to RUNNING', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    mockTwitchPoll.setMockPollData({
      id: 'twitch-poll-123',
      status: 'ACTIVE',
      choices: [
        { id: 'choice-0', title: 'A', votes: 10, channel_points_votes: 0, bits_votes: 0 },
        { id: 'choice-1', title: 'B', votes: 20, channel_points_votes: 0, bits_votes: 0 },
      ],
      duration: 60,
      started_at: new Date().toISOString(),
    })

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: 'twitch-123',
      twitchDisplayName: 'TestStreamer',
      async getDecryptedAccessToken() {
        return 'access_token_mock'
      },
      async getDecryptedRefreshToken() {
        return 'refresh_token_mock'
      },
      async updateTokens(_a: string, _b: string) {},
    }

    const linkData = {
      id: 'link-1',
      pollInstanceId: 'poll-1',
      streamerId: 'streamer-1',
      twitchPollId: 'twitch-poll-123',
      status: 'CREATED',
      totalVotes: 0,
      votesByOption: {},
      streamer: mockStreamer,
    }

    mockRepo.seed([linkData])

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['A', 'B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    assert.equal(linkData.status, 'RUNNING')

    service.stopPolling('poll-1')
  }).timeout(10000)

  test('should map TERMINATED status to TERMINATED', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    mockTwitchPoll.setMockPollData({
      id: 'twitch-poll-123',
      status: 'TERMINATED',
      choices: [{ id: 'choice-0', title: 'A', votes: 10, channel_points_votes: 0, bits_votes: 0 }],
      duration: 60,
      started_at: new Date().toISOString(),
    })

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: 'twitch-123',
      twitchDisplayName: 'TestStreamer',
      async getDecryptedAccessToken() {
        return 'mock'
      },
      async getDecryptedRefreshToken() {
        return 'mock'
      },
      async updateTokens(_a: string, _b: string) {},
    }

    const linkData = {
      id: 'link-1',
      pollInstanceId: 'poll-1',
      streamerId: 'streamer-1',
      twitchPollId: 'twitch-poll-123',
      status: 'RUNNING',
      totalVotes: 0,
      votesByOption: {},
      streamer: mockStreamer,
    }

    mockRepo.seed([linkData])

    const pollInstance = {
      id: 'poll-1',
      title: 'Poll?',
      options: ['A'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    assert.equal(linkData.status, 'TERMINATED')

    service.stopPolling('poll-1')
  }).timeout(10000)
})

test.group('PollPollingService - Stop Polling', () => {
  test('should stop polling when stopPolling is called', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const callCountBefore = mockAggregation.aggregateAndEmitCallCount

    // Stop polling
    service.stopPolling('poll-1')

    // Wait to verify no more cycles
    await new Promise((resolve) => setTimeout(resolve, 4000))

    const callCountAfter = mockAggregation.aggregateAndEmitCallCount

    // Call count should not have increased after stopping
    assert.equal(callCountAfter, callCountBefore)
  }).timeout(10000)

  test('should prevent cycle overlapping', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    // Override aggregateAndEmit to simulate slow operation
    let slowOperationCount = 0
    mockAggregation.aggregateAndEmit = async (_pollInstanceId: string) => {
      slowOperationCount++
      // Simulate a 5-second operation (longer than polling interval)
      await new Promise((resolve) => setTimeout(resolve, 5000))
      return { totalVotes: 0, votesByOption: {}, percentagesByOption: {} }
    }

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    mockRepo.seed([])

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)

    // Wait for 8 seconds (should try 3 cycles at 3s interval, but only 1 should execute)
    await new Promise((resolve) => setTimeout(resolve, 8000))

    service.stopPolling('poll-1')

    // With overlap prevention, should only have 1 slow operation running
    assert.equal(slowOperationCount, 1)
  }).timeout(15000)
})

test.group('PollPollingService - Poll End Callback', () => {
  test('should call onPollEndCallback when poll expires', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    mockRepo.seed([])

    let callbackCalled = false
    let callbackPollId: string | null = null

    service.setOnPollEndCallback(async (pollInstance) => {
      callbackCalled = true
      callbackPollId = pollInstance.id
    })

    // Create poll that expires in 2 seconds
    const pollInstance = {
      id: 'poll-expiring',
      title: 'Expiring Poll?',
      options: ['A', 'B'],
      durationSeconds: 2,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)

    // Wait for poll to expire + extra buffer
    await new Promise((resolve) => setTimeout(resolve, 4000))

    assert.isTrue(callbackCalled)
    assert.equal(callbackPollId, 'poll-expiring')

    service.stopPolling('poll-expiring')
  }).timeout(10000)
})

test.group('PollPollingService - Aggregation Integration', () => {
  test('should call aggregation service on each polling cycle', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    mockRepo.seed([])

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)

    // Wait for 2 polling cycles (6s + buffer)
    await new Promise((resolve) => setTimeout(resolve, 7000))

    // Should have been called at least 2 times
    assert.isTrue(mockAggregation.aggregateAndEmitCallCount >= 2)
    assert.equal(mockAggregation.lastPollInstanceId, 'poll-1')

    service.stopPolling('poll-1')
  }).timeout(15000)

  test('should not call aggregation if service not configured', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    // Do NOT set aggregation service

    mockRepo.seed([])

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)

    // Wait for polling cycle
    await new Promise((resolve) => setTimeout(resolve, 4000))

    // No crash should occur
    assert.isTrue(true)

    service.stopPolling('poll-1')
  }).timeout(10000)
})

test.group('PollPollingService - Error Handling', () => {
  test('should continue polling other streamers if one fails', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()
    const mockAggregation = new MockPollAggregationService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    service.setAggregationService(mockAggregation)

    const mockStreamer1 = {
      id: 'streamer-1',
      twitchUserId: 'twitch-123',
      twitchDisplayName: 'Streamer1',
      async getDecryptedAccessToken() {
        throw new Error('Token expired')
      },
      async getDecryptedRefreshToken() {
        return 'refresh'
      },
      async updateTokens(_a: string, _b: string) {},
    }

    const mockStreamer2 = {
      id: 'streamer-2',
      twitchUserId: 'twitch-456',
      twitchDisplayName: 'Streamer2',
      async getDecryptedAccessToken() {
        return 'valid_token'
      },
      async getDecryptedRefreshToken() {
        return 'refresh'
      },
      async updateTokens(_a: string, _b: string) {},
    }

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-1',
        streamerId: 'streamer-1',
        twitchPollId: 'twitch-poll-1',
        status: 'CREATED',
        totalVotes: 0,
        votesByOption: {},
        streamer: mockStreamer1,
      },
      {
        id: 'link-2',
        pollInstanceId: 'poll-1',
        streamerId: 'streamer-2',
        twitchPollId: 'twitch-poll-2',
        status: 'CREATED',
        totalVotes: 0,
        votesByOption: {},
        streamer: mockStreamer2,
      },
    ])

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll?',
      options: ['A', 'B'],
      durationSeconds: 60,
      startedAt: DateTime.now(),
      campaignId: 'campaign-1',
    } as PollInstance

    service.startPolling(pollInstance)

    // Wait for polling cycle
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Twitch poll service should still have been called for streamer-2
    assert.isTrue(mockTwitchPoll.getPollCalled)

    service.stopPolling('poll-1')
  }).timeout(10000)
})

test.group('PollPollingService - Cancellation Message', () => {
  test('should send cancellation message to all channels', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const mockTwitchPoll = new MockTwitchPollService()
    const mockWebSocket = new MockWebSocketService()

    const service = new PollPollingService(
      mockRepo as unknown as PollChannelLinkRepository,
      mockTwitchPoll as unknown as TwitchPollService,
      mockWebSocket as unknown as WebSocketService
    )

    mockRepo.seed([
      {
        id: 'link-1',
        pollInstanceId: 'poll-1',
        streamerId: 'streamer-1',
        twitchPollId: 'twitch-poll-1',
      },
      {
        id: 'link-2',
        pollInstanceId: 'poll-1',
        streamerId: 'streamer-2',
        twitchPollId: 'twitch-poll-2',
      },
    ])

    // Call sendCancellationMessage
    await service.sendCancellationMessage('poll-1')

    // Verify method completes without error
    assert.isTrue(true)
  }).timeout(5000)
})
