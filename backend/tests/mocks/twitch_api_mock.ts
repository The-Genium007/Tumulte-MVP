/**
 * Mock Twitch API for testing
 * Provides fake responses for all Twitch API endpoints
 *
 * Note: Twitch API uses snake_case for all response fields
 */

/* eslint-disable @typescript-eslint/naming-convention */

export interface TwitchOAuthTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string[]
  token_type: string
}

export interface TwitchUserInfo {
  id: string
  login: string
  display_name: string
  type: string
  broadcaster_type: string
  description: string
  profile_image_url: string
  offline_image_url: string
  view_count: number
  email?: string
  created_at: string
}

export interface TwitchPoll {
  id: string
  broadcaster_id: string
  broadcaster_name: string
  broadcaster_login: string
  title: string
  choices: Array<{
    id: string
    title: string
    votes: number
    channel_points_votes: number
    bits_votes: number
  }>
  bits_voting_enabled: boolean
  bits_per_vote: number
  channel_points_voting_enabled: boolean
  channel_points_per_vote: number
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'ARCHIVED' | 'MODERATED' | 'INVALID'
  duration: number
  started_at: string
  ended_at?: string
}

/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Mock Twitch OAuth token exchange
 */
export function mockOAuthTokenExchange(code: string): TwitchOAuthTokenResponse {
  return {
    access_token: `mock_access_token_${code}`,
    refresh_token: `mock_refresh_token_${code}`,
    expires_in: 14400, // 4 hours
    scope: ['channel:manage:polls', 'channel:read:polls', 'chat:read', 'chat:edit'],
    token_type: 'bearer',
  }
}

/**
 * Mock Twitch token refresh
 */
export function mockTokenRefresh(_refreshToken: string): TwitchOAuthTokenResponse {
  return {
    access_token: `mock_refreshed_access_token_${Date.now()}`,
    refresh_token: `mock_new_refresh_token_${Date.now()}`,
    expires_in: 14400,
    scope: ['channel:manage:polls', 'channel:read:polls', 'chat:read', 'chat:edit'],
    token_type: 'bearer',
  }
}

/**
 * Mock Twitch user info
 */
export function mockUserInfo(userId: string): TwitchUserInfo {
  return {
    id: userId,
    login: `testuser_${userId}`,
    display_name: `TestUser${userId}`,
    type: '',
    broadcaster_type: 'affiliate',
    description: 'Test user description',
    profile_image_url: `https://static-cdn.jtvnw.net/user-default-pictures/${userId}.png`,
    offline_image_url: '',
    view_count: 1000,
    email: `testuser${userId}@example.com`,
    created_at: '2020-01-01T00:00:00Z',
  }
}

/**
 * Mock Twitch poll creation
 */
export function mockCreatePoll(
  broadcasterId: string,
  title: string,
  choices: string[],
  duration: number,
  channelPointsEnabled: boolean = false,
  channelPointsPerVote: number = 0
): TwitchPoll {
  const pollId = `poll_${Date.now()}_${Math.random().toString(36).substring(7)}`

  return {
    id: pollId,
    broadcaster_id: broadcasterId,
    broadcaster_name: `TestBroadcaster${broadcasterId}`,
    broadcaster_login: `testbroadcaster${broadcasterId}`,
    title,
    choices: choices.map((choice, index) => ({
      id: `choice_${index}`,
      title: choice,
      votes: 0,
      channel_points_votes: 0,
      bits_votes: 0,
    })),
    bits_voting_enabled: false,
    bits_per_vote: 0,
    channel_points_voting_enabled: channelPointsEnabled,
    channel_points_per_vote: channelPointsPerVote,
    status: 'ACTIVE',
    duration,
    started_at: new Date().toISOString(),
  }
}

/**
 * Mock Twitch poll status with votes
 */
export function mockPollStatus(
  pollId: string,
  broadcasterId: string,
  status: TwitchPoll['status'] = 'ACTIVE',
  votes: number[] = [10, 20, 30]
): TwitchPoll {
  return {
    id: pollId,
    broadcaster_id: broadcasterId,
    broadcaster_name: `TestBroadcaster${broadcasterId}`,
    broadcaster_login: `testbroadcaster${broadcasterId}`,
    title: 'Test Poll',
    choices: votes.map((voteCount, index) => ({
      id: `choice_${index}`,
      title: `Option ${index + 1}`,
      votes: voteCount,
      channel_points_votes: 0,
      bits_votes: 0,
    })),
    bits_voting_enabled: false,
    bits_per_vote: 0,
    channel_points_voting_enabled: false,
    channel_points_per_vote: 0,
    status,
    duration: 60,
    started_at: new Date(Date.now() - 30000).toISOString(), // Started 30s ago
    ended_at: status === 'COMPLETED' ? new Date().toISOString() : undefined,
  }
}

/**
 * Mock Twitch API error responses
 */
export class TwitchApiMockError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'TwitchApiMockError'
  }
}

/**
 * Mock 401 Unauthorized error (expired token)
 */
export function mockUnauthorizedError(): TwitchApiMockError {
  return new TwitchApiMockError(401, 'Invalid OAuth token')
}

/**
 * Mock 429 Rate Limit error
 */
export function mockRateLimitError(): TwitchApiMockError {
  return new TwitchApiMockError(429, 'Rate limit exceeded')
}

/**
 * Mock 400 Bad Request error
 */
export function mockBadRequestError(message: string = 'Bad Request'): TwitchApiMockError {
  return new TwitchApiMockError(400, message)
}

/**
 * Helper to simulate network delay
 */
export async function simulateNetworkDelay(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mock Twitch API client for tests
 */
export class MockTwitchApiClient {
  private users: Map<string, TwitchUserInfo> = new Map()
  private polls: Map<string, TwitchPoll> = new Map()
  private shouldFailNextRequest: boolean = false
  private nextError: TwitchApiMockError | null = null

  /**
   * Register a mock user
   */
  registerUser(userId: string, userData?: Partial<TwitchUserInfo>): void {
    const user = mockUserInfo(userId)
    if (userData) {
      Object.assign(user, userData)
    }
    this.users.set(userId, user)
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<TwitchUserInfo> {
    await simulateNetworkDelay()

    if (this.shouldFailNextRequest && this.nextError) {
      const error = this.nextError
      this.shouldFailNextRequest = false
      this.nextError = null
      throw error
    }

    const user = this.users.get(userId)
    if (!user) {
      throw new TwitchApiMockError(404, 'User not found')
    }
    return user
  }

  /**
   * Create a poll
   */
  async createPoll(
    broadcasterId: string,
    title: string,
    choices: string[],
    duration: number
  ): Promise<TwitchPoll> {
    await simulateNetworkDelay()

    if (this.shouldFailNextRequest && this.nextError) {
      const error = this.nextError
      this.shouldFailNextRequest = false
      this.nextError = null
      throw error
    }

    const poll = mockCreatePoll(broadcasterId, title, choices, duration)
    this.polls.set(poll.id, poll)
    return poll
  }

  /**
   * Get poll status
   */
  async getPollStatus(pollId: string): Promise<TwitchPoll> {
    await simulateNetworkDelay()

    const poll = this.polls.get(pollId)
    if (!poll) {
      throw new TwitchApiMockError(404, 'Poll not found')
    }
    return poll
  }

  /**
   * Simulate API failure on next request
   */
  failNextRequest(error: TwitchApiMockError): void {
    this.shouldFailNextRequest = true
    this.nextError = error
  }

  /**
   * Clear all mock data
   */
  clear(): void {
    this.users.clear()
    this.polls.clear()
    this.shouldFailNextRequest = false
    this.nextError = null
  }
}
