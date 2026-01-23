import type {
  User,
  Campaign,
  CampaignMembership,
  PollTemplate,
  PollInstance,
  StreamerSearchResult,
} from '~/types'
import type { Campaign as ApiCampaign, Poll } from '~/types/api'

/**
 * Create mock user for tests
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com',
    emailVerifiedAt: new Date().toISOString(),
    tier: 'free',
    avatarUrl: null,
    isAdmin: false,
    isPremium: false,
    hasPassword: false,
    authProviders: [],
    streamer: {
      id: 'streamer-123',
      userId: 'user-123',
      twitchUserId: 'twitch-123',
      twitchUsername: 'testuser',
      twitchDisplayName: 'Test User',
      twitchLogin: 'testuser',
      profileImageUrl: 'https://example.com/avatar.png',
      isActive: true,
      broadcasterType: 'affiliate',
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock campaign for tests (UI type)
 */
export function createMockCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-123',
    name: 'Test Campaign',
    description: 'A test campaign',
    memberCount: 1,
    activeMemberCount: 1,
    ownerName: 'Test Owner',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock campaign for tests (API type - for store tests)
 */
export function createMockApiCampaign(overrides: Partial<ApiCampaign> = {}): ApiCampaign {
  return {
    id: 'campaign-123',
    ownerId: 'user-123',
    name: 'Test Campaign',
    description: 'A test campaign',
    memberCount: 1,
    activeMemberCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock campaign membership for tests
 */
export function createMockCampaignMembership(
  overrides: Partial<CampaignMembership> = {}
): CampaignMembership {
  return {
    id: 'membership-123',
    status: 'ACTIVE',
    isOwner: false,
    invitedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
    pollAuthorizationGrantedAt: new Date().toISOString(),
    pollAuthorizationExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    isPollAuthorized: true,
    authorizationRemainingSeconds: 43200,
    streamer: {
      id: 'streamer-456',
      userId: 'user-456',
      twitchUserId: 'twitch-456',
      twitchUsername: 'teststreamer',
      twitchDisplayName: 'Test Streamer',
      twitchLogin: 'teststreamer',
      profileImageUrl: 'https://example.com/dashboard.png',
      isActive: true,
      broadcasterType: 'affiliate',
    },
    ...overrides,
  }
}

/**
 * Create mock poll template for tests
 */
export function createMockPollTemplate(overrides: Partial<PollTemplate> = {}): PollTemplate {
  return {
    id: 'poll-template-123',
    label: 'Test Poll Template',
    title: 'Test Poll Question?',
    options: ['Option 1', 'Option 2', 'Option 3'],
    durationSeconds: 60,
    isDefault: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock poll instance for tests
 */
export function createMockPollInstance(overrides: Partial<PollInstance> = {}): PollInstance {
  const base: PollInstance = {
    id: 'poll-instance-123',
    pollId: null,
    templateId: 'poll-template-123',
    campaignId: 'campaign-123',
    title: 'Test Poll Question?',
    options: ['Option 1', 'Option 2', 'Option 3'],
    durationSeconds: 60,
    status: 'PENDING',
    startedAt: null,
    endedAt: null,
    finalTotalVotes: null,
    finalVotesByOption: null,
    createdAt: new Date().toISOString(),
  }

  // Merge overrides, filtering out undefined values to preserve null defaults
  return Object.entries(overrides).reduce(
    (acc, [key, value]) => {
      if (value !== undefined) {
        ;(acc as Record<string, unknown>)[key] = value
      }
      return acc
    },
    { ...base }
  )
}

/**
 * Create mock streamer search result for tests
 */
export function createMockStreamerSearchResult(
  overrides: Partial<StreamerSearchResult> = {}
): StreamerSearchResult {
  return {
    id: 'twitch-789',
    login: 'searchedstreamer',
    displayName: 'Searched Streamer',
    profileImageUrl: 'https://example.com/searched.png',
    ...overrides,
  }
}

/**
 * Create mock poll for tests (new Poll → Campaign direct link)
 */
export function createMockPoll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: 'poll-123',
    campaignId: 'campaign-123',
    question: 'Quelle direction prendre ?',
    options: ['Nord', 'Sud', 'Est'],
    type: 'STANDARD',
    durationSeconds: 60,
    orderIndex: 0,
    channelPointsPerVote: null,
    channelPointsEnabled: false,
    lastLaunchedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}
