// User types
export interface User {
  id: string;
  role: "MJ" | "STREAMER";
  display_name: string;
  email: string | null;
  streamer: {
    id: string;
    twitch_display_name: string;
    twitch_login: string;
    profile_image_url: string;
    is_active: boolean;
    broadcaster_type: string;
  } | null;
}

// Campaign types
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  member_count?: number;
  active_member_count?: number;
  owner_name?: string;
  joined_at?: string;
  created_at: string;
}

export interface CampaignMembership {
  id: string;
  campaign_id: string;
  streamer_id: string;
  status: "PENDING" | "ACTIVE";
  invited_at: string;
  accepted_at: string | null;
  joined_at: string;
  streamer: {
    id: string;
    twitch_display_name: string;
    twitch_login: string;
    is_active: boolean;
    profile_image_url: string;
    broadcaster_type: string;
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
    owner_name: string;
  };
  invited_at: string;
}

// Poll types
export interface PollTemplate {
  id: string;
  label: string;
  title: string;
  options: string[];
  duration_seconds: number;
  is_default: boolean;
  created_at: string;
}

export interface PollInstance {
  id: string;
  template_id: string | null;
  campaign_id: string | null;
  title: string;
  options: string[];
  duration_seconds: number;
  status: "PENDING" | "RUNNING" | "ENDED";
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface PollVotes {
  [optionIndex: string]: number;
}

export interface PollAggregatedVotes {
  total_votes: number;
  votes_by_option: PollVotes;
  percentages: { [optionIndex: string]: number };
  winning_option_index: number | null;
}

// Streamer types
export interface StreamerSearchResult {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

// WebSocket types
export interface PollUpdateEvent {
  poll_instance_id: string;
  votes_by_option: PollVotes;
  total_votes: number;
  percentages: { [optionIndex: string]: number };
  winning_option_index: number | null;
}

export interface PollStartEvent {
  poll_instance_id: string;
  title: string;
  options: string[];
  duration_seconds: number;
  started_at: string;
  ends_at: string;
}

export interface PollEndEvent {
  poll_instance_id: string;
  votes_by_option: PollVotes;
  total_votes: number;
  percentages: { [optionIndex: string]: number };
  winning_option_index: number | null;
  ended_at: string;
}
