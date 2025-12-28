// User types
export interface User {
  id: string;
  role: "MJ" | "STREAMER";
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
}

export interface PollInstance {
  id: string;
  templateId: string | null;
  campaignId: string | null;
  title: string;
  options: string[];
  durationSeconds: number;
  status: "PENDING" | "RUNNING" | "ENDED";
  startedAt: string | null;
  endedAt: string | null;
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
