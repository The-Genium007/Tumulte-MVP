// User types
export interface User {
  id: string;
  displayName: string;
  email: string | null;
  streamer: {
    id: string;
    userId: string;
    twitchUserId: string;
    twitchUsername: string;
    twitchDisplayName: string;
    twitchLogin: string;
    profileImageUrl: string;
    isActive: boolean;
    broadcasterType: string;
  } | null;
}

// Campaign types
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  memberCount?: number;
  activeMemberCount?: number;
  ownerName?: string;
  joinedAt?: string;
  createdAt: string;
}

export interface CampaignMembership {
  id: string;
  status: "PENDING" | "ACTIVE";
  isOwner: boolean;
  invitedAt: string;
  acceptedAt: string | null;
  pollAuthorizationGrantedAt: string | null;
  pollAuthorizationExpiresAt: string | null;
  isPollAuthorized: boolean;
  authorizationRemainingSeconds: number | null;
  streamer: {
    id: string;
    userId: string;
    twitchUserId: string;
    twitchUsername: string;
    twitchDisplayName: string;
    twitchLogin: string;
    profileImageUrl: string | null;
    isActive: boolean;
    broadcasterType: string;
  };
}

// Alias for backward compatibility
export type CampaignMember = CampaignMembership;

export interface CampaignInvitation {
  id: string;
  campaign: {
    id: string;
    name: string;
    description: string | null;
    ownerName: string;
  };
  invitedAt: string;
}

// Poll types
export interface PollTemplate {
  id: string;
  label: string;
  title: string;
  options: string[];
  durationSeconds: number;
  isDefault: boolean;
  createdAt: string;
  campaignId?: string;
}

export interface Poll {
  id: string;
  campaignId: string;
  question: string;
  options: string[];
  type: "STANDARD" | "UNIQUE";
  durationSeconds: number;
  orderIndex: number;
  channelPointsPerVote: number | null;
  channelPointsEnabled: boolean;
  lastLaunchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PollInstance {
  id: string;
  pollId: string | null;
  templateId: string | null;
  campaignId: string | null;
  title: string;
  options: string[];
  durationSeconds: number;
  status: "PENDING" | "RUNNING" | "ENDED" | "CANCELLED";
  startedAt: string | null;
  endedAt: string | null;
  finalTotalVotes?: number | null;
  finalVotesByOption?: Record<string, number> | null;
  createdAt: string;
}

export interface PollVotes {
  [optionIndex: string]: number;
}

export interface PollAggregatedVotes {
  totalVotes: number;
  votesByOption: PollVotes;
  percentages: { [optionIndex: string]: number };
  winningOptionIndex: number | null;
}

// Streamer types
export interface StreamerSearchResult {
  id: string;
  login: string;
  displayName: string;
  profileImageUrl: string;
}

export interface AuthorizationStatus {
  campaignId: string;
  campaignName: string;
  isOwner?: boolean;
  isAuthorized: boolean;
  expiresAt: string | null;
  remainingSeconds: number | null;
}

// WebSocket types
export interface PollUpdateEvent {
  pollInstanceId: string;
  votesByOption: PollVotes;
  totalVotes: number;
  percentages: { [optionIndex: string]: number };
  winningOptionIndex: number | null;
}

export interface PollStartEvent {
  pollInstanceId: string;
  title: string;
  options: string[];
  durationSeconds: number;
  startedAt: string;
  endsAt: string;
}

export interface PollEndEvent {
  pollInstanceId: string;
  votesByOption: PollVotes;
  totalVotes: number;
  percentages: { [optionIndex: string]: number };
  winningOptionIndex: number | null;
  endedAt: string;
}

// Live status types (snake_case from Twitch API response)
export interface LiveStatus {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  is_live: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  game_name?: string;
  title?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  viewer_count?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  started_at?: string;
}

export type LiveStatusMap = Record<string, LiveStatus>;

// Push Notification types
export interface PushSubscription {
  id: string;
  endpoint: string;
  deviceName: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  campaignInvitations: boolean;
  criticalAlerts: boolean;
  pollStarted: boolean;
  pollEnded: boolean;
  campaignMemberJoined: boolean;
  sessionReminder: boolean;
}

export type NotificationType =
  | "campaign:invitation"
  | "critical:alert"
  | "poll:started"
  | "poll:ended"
  | "campaign:member_joined"
  | "session:reminder";

export interface PushNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    url?: string;
    campaignId?: string;
    pollInstanceId?: string;
    sessionId?: string;
  };
  timestamp: string;
}

// Streamer Readiness types (for waiting list)
export type ReadinessIssue =
  | "token_expired"
  | "token_refresh_failed"
  | "authorization_missing"
  | "authorization_expired"
  | "streamer_inactive";

export interface StreamerReadiness {
  streamerId: string;
  streamerName: string;
  streamerAvatar: string | null;
  twitchUserId: string;
  isReady: boolean;
  issues: ReadinessIssue[];
  tokenValid: boolean;
  authorizationActive: boolean;
  authorizationExpiresAt: string | null;
}

export interface CampaignReadiness {
  campaignId: string;
  allReady: boolean;
  readyCount: number;
  totalCount: number;
  streamers: StreamerReadiness[];
}

export interface ReadinessChangeEvent {
  streamerId: string;
  streamerName: string;
  isReady: boolean;
  timestamp: string;
}

// Preview command types (for overlay studio sync)
export type PreviewCommand =
  | "playEntry"
  | "playLoop"
  | "stopLoop"
  | "playResult"
  | "playExit"
  | "playFullSequence"
  | "reset";

export interface PreviewMockData {
  question: string;
  options: string[];
  percentages: number[];
  timeRemaining: number;
  totalDuration: number;
}

export interface PreviewCommandEvent {
  elementId: string;
  command: PreviewCommand;
  duration?: number;
  mockData?: PreviewMockData;
}
