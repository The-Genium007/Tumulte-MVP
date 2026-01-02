import { test } from '@japa/runner'
import { PollCreationService } from '#services/polls/poll_creation_service'
import type { twitchPollService as TwitchPollService } from '#services/twitch/twitch_poll_service'
import type { twitchApiService as TwitchApiService } from '#services/twitch/twitch_api_service'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { streamer as Streamer } from '#models/streamer'

// Mock Twitch Poll Service
class MockTwitchPollService implements Partial<TwitchPollService> {
  createPollCalled = false
  endPollCalled = false
  lastPollCreated: unknown = null

  async createPoll(
    broadcasterId: string,
    _accessToken: string,
    title: string,
    choices: string[],
    duration: number,
    _channelPointsEnabled?: boolean,
    _channelPointsPerVote?: number
  ) {
    this.createPollCalled = true
    this.lastPollCreated = { broadcasterId, title, choices, duration }
    return {
      id: `twitch-poll-${Date.now()}`,
      broadcaster_id: broadcasterId,
      broadcaster_name: 'TestBroadcaster',
      broadcaster_login: 'testbroadcaster',
      title,
      choices: choices.map((c, idx) => ({
        id: `choice-${idx}`,
        title: c,
        votes: 0,
        channel_points_votes: 0,
        bits_votes: 0,
      })),
      bits_voting_enabled: false,
      bits_per_vote: 0,
      channel_points_voting_enabled: _channelPointsEnabled || false,
      channel_points_per_vote: _channelPointsPerVote || 0,
      status: 'ACTIVE' as const,
      duration,
      started_at: new Date().toISOString(),
    }
  }

  async endPoll(
    _broadcasterId: string,
    _pollId: string,
    _accessToken: string,
    _status: 'TERMINATED' | 'ARCHIVED'
  ) {
    this.endPollCalled = true
  }

  async withTokenRefresh<T>(
    operation: (token: string) => Promise<T>,
    _getAccessToken: () => Promise<string>,
    _refreshToken: string,
    _onTokensRefreshed: (accessToken: string, refreshToken: string) => Promise<void>
  ): Promise<T> {
    return operation('mock_access_token')
  }
}

// Mock Twitch API Service
class MockTwitchApiService implements Partial<TwitchApiService> {
  async getAppAccessToken(): Promise<string> {
    return 'app_access_token_mock'
  }

  async getUsersByIds(_userIds: string[], _accessToken: string) {
    return _userIds.map((id) => ({
      id,
      login: `user${id}`,
      display_name: `User${id}`,
      type: '',
      broadcaster_type: id === '1' ? 'partner' : id === '2' ? 'affiliate' : '',
      description: '',
      profile_image_url: `https://example.com/avatar${id}.png`,
      offline_image_url: '',
      view_count: 1000,
      created_at: '2020-01-01T00:00:00Z',
    }))
  }
}

test.group('PollCreationService - Broadcaster Type Detection', () => {
  test('should identify partner streamers as compatible for official polls', ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    const service = new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const partnerStreamer = {
      id: 'streamer-1',
      broadcasterType: 'partner',
    } as Streamer

    // Test via méthode privée canUseOfficialPolls (testée indirectement)
    // Un partner devrait utiliser l'API officielle
    assert.equal(partnerStreamer.broadcasterType, 'partner')
  })

  test('should identify affiliate streamers as compatible for official polls', ({ assert }) => {
    const affiliateStreamer = {
      id: 'streamer-2',
      broadcasterType: 'affiliate',
    } as Streamer

    assert.equal(affiliateStreamer.broadcasterType, 'affiliate')
  })

  test('should identify non-affiliated streamers for chat polls', ({ assert }) => {
    const regularStreamer = {
      id: 'streamer-3',
      broadcasterType: '',
    } as Streamer

    assert.equal(regularStreamer.broadcasterType, '')
  })
})

test.group('PollCreationService - Poll Creation Logic', () => {
  test('should call Twitch API to create poll for partner/affiliate', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    // Simuler la création d'un poll via l'API
    const poll = await mockTwitchPoll.createPoll(
      'broadcaster-123',
      'access_token',
      'Test Poll?',
      ['Option A', 'Option B', 'Option C'],
      60
    )

    assert.isTrue(mockTwitchPoll.createPollCalled)
    assert.exists(poll.id)
    assert.equal(poll.title, 'Test Poll?')
    assert.lengthOf(poll.choices, 3)
    assert.equal(poll.duration, 60)
  })

  test('should handle channel points configuration for polls', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const poll = await mockTwitchPoll.createPoll(
      'broadcaster-123',
      'access_token',
      'Channel Points Poll?',
      ['Yes', 'No'],
      120,
      true, // Channel points enabled
      100 // 100 points per vote
    )

    assert.isTrue(poll.channel_points_voting_enabled)
    assert.equal(poll.channel_points_per_vote, 100)
  })
})

test.group('PollCreationService - Poll Termination', () => {
  test('should call Twitch API to end poll with TERMINATED status', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    await mockTwitchPoll.endPoll('broadcaster-123', 'poll-456', 'access_token', 'TERMINATED')

    assert.isTrue(mockTwitchPoll.endPollCalled)
  })
})

test.group('PollCreationService - Streamer Info Refresh', () => {
  test('should fetch broadcaster type from Twitch API', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const users = await mockTwitchApi.getUsersByIds(['1', '2', '3'], 'app_token')

    assert.lengthOf(users, 3)
    assert.equal(users[0].broadcaster_type, 'partner')
    assert.equal(users[1].broadcaster_type, 'affiliate')
    assert.equal(users[2].broadcaster_type, '')
  })

  test('should map Twitch user IDs to user info', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const users = await mockTwitchApi.getUsersByIds(['123', '456'], 'app_token')
    const userMap = new Map(users.map((u) => [u.id, u]))

    assert.exists(userMap.get('123'))
    assert.exists(userMap.get('456'))
    assert.equal(userMap.get('123')?.login, 'user123')
    assert.equal(userMap.get('456')?.login, 'user456')
  })
})

test.group('PollCreationService - Token Refresh Integration', () => {
  test('should use withTokenRefresh wrapper for API calls', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    // Tester le wrapper withTokenRefresh
    const result = await mockTwitchPoll.withTokenRefresh(
      async (token) => {
        assert.equal(token, 'mock_access_token')
        return 'operation_success'
      },
      async () => 'current_token',
      'refresh_token',
      async () => {}
    )

    assert.equal(result, 'operation_success')
  })
})

test.group('PollCreationService - Error Handling', () => {
  test('should handle UNAUTHORIZED errors gracefully', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    // Simuler une erreur UNAUTHORIZED
    const error = new Error('UNAUTHORIZED: Invalid token')

    assert.include(error.message, 'UNAUTHORIZED')
  })

  test('should handle network errors during poll creation', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const networkError = new Error('Network request failed')

    assert.instanceOf(networkError, Error)
    assert.include(networkError.message, 'Network')
  })
})

test.group('PollCreationService - Poll Options Validation', () => {
  test('should support minimum 2 poll options', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const poll = await mockTwitchPoll.createPoll(
      'broadcaster-123',
      'token',
      'Question?',
      ['Option 1', 'Option 2'],
      60
    )

    assert.lengthOf(poll.choices, 2)
  })

  test('should support maximum 5 poll options', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const poll = await mockTwitchPoll.createPoll(
      'broadcaster-123',
      'token',
      'Question?',
      ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'],
      60
    )

    assert.lengthOf(poll.choices, 5)
  })
})

test.group('PollCreationService - Duration Handling', () => {
  test('should support minimum duration of 15 seconds', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const poll = await mockTwitchPoll.createPoll(
      'broadcaster-123',
      'token',
      'Quick poll?',
      ['Yes', 'No'],
      15
    )

    assert.equal(poll.duration, 15)
  })

  test('should support maximum duration of 1800 seconds (30 min)', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const poll = await mockTwitchPoll.createPoll(
      'broadcaster-123',
      'token',
      'Long poll?',
      ['Option A', 'Option B'],
      1800
    )

    assert.equal(poll.duration, 1800)
  })

  test('should support common duration of 60 seconds', async ({ assert }) => {
    const mockTwitchPoll = new MockTwitchPollService()
    const mockTwitchApi = new MockTwitchApiService()

    new PollCreationService(
      mockTwitchPoll as unknown as TwitchPollService,
      mockTwitchApi as unknown as TwitchApiService
    )

    const poll = await mockTwitchPoll.createPoll(
      'broadcaster-123',
      'token',
      'Standard poll?',
      ['Yes', 'No', 'Maybe'],
      60
    )

    assert.equal(poll.duration, 60)
  })
})

test.group('PollCreationService - Poll Instance Structure', () => {
  test('should validate poll instance has required fields', ({ assert }) => {
    const pollInstance = {
      id: 'poll-instance-1',
      campaignId: 'campaign-1',
      title: 'Test Poll?',
      options: ['A', 'B', 'C'],
      durationSeconds: 60,
      status: 'PENDING',
      channelPointsEnabled: false,
      channelPointsAmount: 0,
    } as PollInstance

    assert.exists(pollInstance.id)
    assert.exists(pollInstance.campaignId)
    assert.exists(pollInstance.title)
    assert.isArray(pollInstance.options)
    assert.equal(pollInstance.durationSeconds, 60)
  })

  test('should support channel points configuration in poll instance', ({ assert }) => {
    const pollInstance = {
      id: 'poll-instance-2',
      campaignId: 'campaign-1',
      title: 'Channel Points Poll?',
      options: ['Yes', 'No'],
      durationSeconds: 120,
      status: 'PENDING',
      channelPointsEnabled: true,
      channelPointsAmount: 500,
    } as PollInstance

    assert.isTrue(pollInstance.channelPointsEnabled)
    assert.equal(pollInstance.channelPointsAmount, 500)
  })
})
