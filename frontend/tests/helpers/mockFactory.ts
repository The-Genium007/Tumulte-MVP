import type {
  User,
  Campaign,
  CampaignMembership,
  PollTemplate,
  PollInstance,
  StreamerSearchResult,
} from "~/types";

/**
 * Create mock user for tests
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    role: "MJ",
    displayName: "Test User",
    email: "test@example.com",
    streamer: {
      id: "streamer-123",
      userId: "user-123",
      twitchUserId: "twitch-123",
      twitchUsername: "testuser",
      twitchDisplayName: "Test User",
      twitchLogin: "testuser",
      profileImageUrl: "https://example.com/avatar.png",
      isActive: true,
      broadcasterType: "affiliate",
    },
    ...overrides,
  };
}

/**
 * Create mock campaign for tests
 */
export function createMockCampaign(
  overrides: Partial<Campaign> = {},
): Campaign {
  return {
    id: "campaign-123",
    name: "Test Campaign",
    description: "A test campaign",
    memberCount: 1,
    activeMemberCount: 1,
    ownerName: "Test Owner",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock campaign membership for tests
 */
export function createMockCampaignMembership(
  overrides: Partial<CampaignMembership> = {},
): CampaignMembership {
  return {
    id: "membership-123",
    status: "ACTIVE",
    isOwner: false,
    invitedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
    pollAuthorizationGrantedAt: new Date().toISOString(),
    pollAuthorizationExpiresAt: new Date(
      Date.now() + 12 * 60 * 60 * 1000,
    ).toISOString(),
    isPollAuthorized: true,
    authorizationRemainingSeconds: 43200,
    streamer: {
      id: "streamer-456",
      userId: "user-456",
      twitchUserId: "twitch-456",
      twitchUsername: "teststreamer",
      twitchDisplayName: "Test Streamer",
      twitchLogin: "teststreamer",
      profileImageUrl: "https://example.com/streamer.png",
      isActive: true,
      broadcasterType: "affiliate",
    },
    ...overrides,
  };
}

/**
 * Create mock poll template for tests
 */
export function createMockPollTemplate(
  overrides: Partial<PollTemplate> = {},
): PollTemplate {
  return {
    id: "poll-template-123",
    label: "Test Poll Template",
    title: "Test Poll Question?",
    options: ["Option 1", "Option 2", "Option 3"],
    durationSeconds: 60,
    isDefault: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock poll instance for tests
 */
export function createMockPollInstance(
  overrides: Partial<PollInstance> = {},
): PollInstance {
  return {
    id: "poll-instance-123",
    templateId: "poll-template-123",
    campaignId: "campaign-123",
    title: "Test Poll Question?",
    options: ["Option 1", "Option 2", "Option 3"],
    durationSeconds: 60,
    status: "PENDING",
    startedAt: null,
    endedAt: null,
    finalTotalVotes: null,
    finalVotesByOption: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock streamer search result for tests
 */
export function createMockStreamerSearchResult(
  overrides: Partial<StreamerSearchResult> = {},
): StreamerSearchResult {
  return {
    id: "twitch-789",
    login: "searchedstreamer",
    displayName: "Searched Streamer",
    profileImageUrl: "https://example.com/searched.png",
    ...overrides,
  };
}
