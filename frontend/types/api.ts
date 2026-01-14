/**
 * Types API pour le frontend
 * Correspond aux DTOs du backend
 */

// ==========================================
// User & Auth
// ==========================================

export interface User {
  id: string;
  displayName: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Streamer {
  id: string;
  userId: string;
  twitchUserId: string;
  twitchUsername: string;
  twitchDisplayName: string;
  profileImageUrl: string | null;
  broadcasterType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Campaigns
// ==========================================

export interface Campaign {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  memberCount: number;
  activeMemberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDetail extends Campaign {
  members: CampaignMember[];
}

export interface CampaignMember {
  id: string;
  campaignId: string;
  streamerId: string;
  status: "PENDING" | "ACTIVE";
  invitedAt: string | null;
  acceptedAt: string | null;
  pollAuthorizationGrantedAt?: string | null;
  pollAuthorizationExpiresAt?: string | null;
  isPollAuthorized?: boolean;
  authorizationRemainingSeconds?: number | null;
  streamer?: Streamer;
}

export interface AuthorizationStatus {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  campaign_id: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  campaign_name: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  is_owner: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  is_authorized: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  expires_at: string | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  remaining_seconds: number | null;
}

export interface CampaignInvitation {
  id: string;
  campaignId: string;
  streamerId: string;
  status: "PENDING" | "ACTIVE";
  invitedAt: string | null;
  campaign?: Campaign;
}

// ==========================================
// Polls
// ==========================================

export interface PollTemplate {
  id: string;
  ownerId: string;
  campaignId: string;
  name: string;
  title: string;
  options: string[];
  durationSeconds: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
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
  campaignId: string;
  createdBy: string;
  title: string;
  options: string[];
  durationSeconds: number;
  status:
    | "PENDING"
    | "RUNNING"
    | "COMPLETED"
    | "CANCELLED"
    | "FAILED"
    | "ENDED";
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  channelLinks?: PollChannelLink[];
}

export interface PollChannelLink {
  id: string;
  pollInstanceId: string;
  streamerId: string;
  twitchPollId: string;
  status: string;
  votesByOption: Record<string, number>;
  totalVotes: number;
  streamer?: Streamer;
}

export interface AggregatedVotes {
  pollInstanceId: string;
  votesByOption: Record<string, number>;
  totalVotes: number;
  percentages: Record<string, number>;
}

export interface PollResults {
  pollInstanceId: string;
  campaignId: string;
  title: string;
  options: string[];
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  totalVotes: number;
  votesByOption: Record<string, number>;
  percentages: Record<string, number>;
  channels: ChannelResult[];
  createdAt: string;
}

export interface ChannelResult {
  streamerId: string;
  streamerName: string;
  votesByOption: Record<string, number>;
  totalVotes: number;
  twitchPollId: string;
}

// ==========================================
// API Responses
// ==========================================

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: string;
}

// ==========================================
// Request Payloads
// ==========================================

export interface CreateCampaignRequest {
  name: string;
  description?: string | null;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string | null;
}

export interface InviteStreamerRequest {
  streamerId: string;
}

export interface CreatePollRequest {
  question: string;
  options: string[];
  type?: "STANDARD" | "UNIQUE";
  durationSeconds?: number;
  channelPointsAmount?: number | null;
}

export interface UpdatePollRequest {
  question?: string;
  options?: string[];
  type?: "STANDARD" | "UNIQUE";
  durationSeconds?: number;
  channelPointsAmount?: number | null;
}

export interface LaunchPollRequest {
  title: string;
  options: string[];
  durationSeconds?: number;
  templateId?: string | null;
}
