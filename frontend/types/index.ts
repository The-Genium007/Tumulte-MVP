// User types
export type UserTier = 'free' | 'premium' | 'admin'

export interface AuthProvider {
  id: string
  provider: 'twitch' | 'google'
  providerUserId: string
  providerEmail: string | null
  providerDisplayName: string | null
  createdAt: string
}

export interface User {
  id: string
  displayName: string
  email: string | null
  emailVerifiedAt: string | null
  tier: UserTier
  avatarUrl: string | null
  isAdmin: boolean
  isPremium: boolean
  hasPassword: boolean
  authProviders: AuthProvider[]
  streamer: {
    id: string
    userId: string
    twitchUserId: string
    twitchUsername: string
    twitchDisplayName: string
    twitchLogin: string
    profileImageUrl: string
    isActive: boolean
    broadcasterType: string
  } | null
  createdAt: string
}

// Auth-related types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  displayName: string
  email: string
  password: string
  passwordConfirmation: string
}

export interface AuthResponse {
  user: User
  message?: string
}

export interface AuthError {
  error: string
  errors?: Record<string, string[]>
}

// Campaign types
export interface Campaign {
  id: string
  name: string
  description: string | null
  memberCount?: number
  activeMemberCount?: number
  ownerName?: string
  joinedAt?: string
  createdAt: string
  isOwner?: boolean
  vttConnection?: VttConnectionStatus | null
}

// VTT Connection types
export interface VttConnectionStatus {
  id: string
  status: 'pending' | 'active' | 'expired' | 'revoked'
  tunnelStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  lastHeartbeatAt: string | null
  worldName: string | null
  moduleVersion: string | null
}

/**
 * Computed health status for VTT connection
 * Used by the frontend to determine what to display
 */
export type VttHealthStatus =
  | 'connected' // WebSocket actif, heartbeat récent
  | 'connecting' // En cours de connexion
  | 'disconnected' // Pas de WebSocket actif
  | 'server_unavailable' // Backend Tumulte non joignable
  | 'campaign_deleted' // La campagne a été supprimée sur Tumulte
  | 'revoked' // Connexion révoquée par l'utilisateur
  | 'error' // Erreur générique (token invalide, etc.)
  | 'not_paired' // Jamais appairé à Foundry

export interface CampaignMembership {
  id: string
  status: 'PENDING' | 'ACTIVE'
  isOwner: boolean
  invitedAt: string
  acceptedAt: string | null
  pollAuthorizationGrantedAt: string | null
  pollAuthorizationExpiresAt: string | null
  isPollAuthorized: boolean
  authorizationRemainingSeconds: number | null
  streamer: {
    id: string
    userId: string
    twitchUserId: string
    twitchUsername: string
    twitchDisplayName: string
    twitchLogin: string
    profileImageUrl: string | null
    isActive: boolean
    broadcasterType: string
  }
}

// Alias for backward compatibility
export type CampaignMember = CampaignMembership

export interface CampaignInvitation {
  id: string
  campaign: {
    id: string
    name: string
    description: string | null
    ownerName: string
  }
  invitedAt: string
}

// Poll types
export interface PollTemplate {
  id: string
  label: string
  title: string
  options: string[]
  durationSeconds: number
  isDefault: boolean
  createdAt: string
  campaignId?: string
}

export interface Poll {
  id: string
  campaignId: string
  question: string
  options: string[]
  type: 'STANDARD' | 'UNIQUE'
  durationSeconds: number
  orderIndex: number
  channelPointsPerVote: number | null
  channelPointsEnabled: boolean
  lastLaunchedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PollInstance {
  id: string
  pollId: string | null
  templateId: string | null
  campaignId: string | null
  title: string
  options: string[]
  durationSeconds: number
  status: 'PENDING' | 'RUNNING' | 'ENDED' | 'CANCELLED'
  startedAt: string | null
  endedAt: string | null
  finalTotalVotes?: number | null
  finalVotesByOption?: Record<string, number> | null
  createdAt: string
}

export interface PollVotes {
  [optionIndex: string]: number
}

export interface PollAggregatedVotes {
  totalVotes: number
  votesByOption: PollVotes
  percentages: { [optionIndex: string]: number }
  winningOptionIndex: number | null
}

// Streamer types
export interface StreamerSearchResult {
  id: string
  login: string
  displayName: string
  profileImageUrl: string
}

export interface AuthorizationStatus {
  campaignId: string
  campaignName: string
  isOwner?: boolean
  isAuthorized: boolean
  expiresAt: string | null
  remainingSeconds: number | null
}

// WebSocket types
export interface PollUpdateEvent {
  pollInstanceId: string
  votesByOption: PollVotes
  totalVotes: number
  percentages: { [optionIndex: string]: number }
  winningOptionIndex: number | null
}

export interface PollStartEvent {
  pollInstanceId: string
  title: string
  options: string[]
  durationSeconds: number
  startedAt: string
  endsAt: string
  campaign_id?: string
}

export interface PollEndEvent {
  pollInstanceId: string
  votesByOption: PollVotes
  totalVotes: number
  percentages: { [optionIndex: string]: number }
  winningOptionIndex: number | null
  endedAt: string
}

// Live status types (snake_case from Twitch API response)
export interface LiveStatus {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  is_live: boolean
  // eslint-disable-next-line @typescript-eslint/naming-convention
  game_name?: string
  title?: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  viewer_count?: number

  started_at?: string
}

export type LiveStatusMap = Record<string, LiveStatus>

// Push Notification types
export interface PushSubscription {
  id: string
  endpoint: string
  deviceName: string | null
  userAgent: string | null
  createdAt: string
  lastUsedAt: string | null
}

export interface NotificationPreferences {
  pushEnabled: boolean
  campaignInvitations: boolean
  criticalAlerts: boolean
  pollStarted: boolean
  pollEnded: boolean
  campaignMemberJoined: boolean
  sessionReminder: boolean
}

export type NotificationType =
  | 'campaign:invitation'
  | 'critical:alert'
  | 'poll:started'
  | 'poll:ended'
  | 'campaign:member_joined'
  | 'session:reminder'

export interface PushNotificationPayload {
  type: NotificationType
  title: string
  body: string
  data?: {
    url?: string
    campaignId?: string
    pollInstanceId?: string
    sessionId?: string
  }
  timestamp: string
}

// Streamer Readiness types (for waiting list)
export type ReadinessIssue =
  | 'token_expired'
  | 'token_refresh_failed'
  | 'authorization_missing'
  | 'authorization_expired'
  | 'streamer_inactive'

export interface StreamerReadiness {
  streamerId: string
  streamerName: string
  streamerAvatar: string | null
  twitchUserId: string
  isReady: boolean
  issues: ReadinessIssue[]
  tokenValid: boolean
  authorizationActive: boolean
  authorizationExpiresAt: string | null
}

export interface CampaignReadiness {
  campaignId: string
  allReady: boolean
  readyCount: number
  totalCount: number
  streamers: StreamerReadiness[]
}

export interface ReadinessChangeEvent {
  streamerId: string
  streamerName: string
  isReady: boolean
  timestamp: string
}

// Preview command types (for overlay studio sync)
export type PreviewCommand =
  | 'playEntry'
  | 'playLoop'
  | 'stopLoop'
  | 'playResult'
  | 'playExit'
  | 'playFullSequence'
  | 'reset'

export interface PreviewMockData {
  question: string
  options: string[]
  percentages: number[]
  timeRemaining: number
  totalDuration: number
}

export interface PreviewCommandEvent {
  elementId: string
  command: PreviewCommand
  duration?: number
  mockData?: PreviewMockData
}

// Character types (VTT Integration)
export interface Character {
  id: string
  name: string
  avatarUrl: string | null
  characterType: 'pc' | 'npc'
  vttCharacterId: string
}

export interface OverlayOption {
  id: string | null
  name: string
  isDefault: boolean
  isActive: boolean
}

export interface CampaignOverlay {
  current: {
    id: string | null
    name: string
  }
  available: OverlayOption[]
}

export interface CampaignSettings {
  campaign: Campaign
  assignedCharacter: Character | null
  canChangeCharacter: boolean
  isOwner?: boolean
  overlay?: CampaignOverlay
}

// Dice Roll types (VTT Integration)
// Import universal dice types
import type { TermData, SystemData, SymbolResult as _SymbolResult } from './dice'

export interface DiceRollEvent {
  id: string
  campaignId?: string
  characterId: string
  characterName: string
  characterAvatar: string | null
  rollFormula: string
  result: number
  diceResults: number[]
  isCritical: boolean
  criticalType: 'success' | 'failure' | null
  isHidden: boolean
  rollType: string | null
  rolledAt: string
  isOwnCharacter?: boolean
  // Enriched flavor data from FlavorParser
  skill: string | null // Normalized skill key (e.g., "perception")
  skillRaw: string | null // Raw skill name for display (e.g., "Perception")
  ability: string | null // Normalized ability key (e.g., "dexterity")
  abilityRaw: string | null // Raw ability name for display (e.g., "Dextérité")
  modifiers: string[] | null // Detected modifiers (e.g., ["+2", "-1"])
  // NEW: Universal dice system data
  /** Extracted term data from Foundry Roll (for advanced rendering) */
  terms?: TermData[]
  /** System-specific metadata (pools, narrative dice, etc.) */
  systemData?: SystemData
  /** Game system ID (dnd5e, wod5e, blades-in-the-dark, etc.) */
  systemId?: string
}

// Re-export dice types for convenience
export type { TermData, SystemData, SymbolResult } from './dice'

// Gamification types (Overlay Events)
export interface GamificationInstanceEvent {
  id: string
  campaignId: string
  eventId: string
  event?: {
    id: string
    slug: string
    name: string
    type: 'individual' | 'group'
    actionType: string
    rewardColor: string
  }
  type: 'individual' | 'group'
  status: 'active' | 'armed' | 'completed' | 'expired' | 'cancelled'
  objectiveTarget: number
  currentProgress: number
  progressPercentage: number
  isObjectiveReached: boolean
  duration: number
  startsAt: string
  expiresAt: string
  completedAt: string | null
  armedAt?: string | null
  streamerId: string | null
  viewerCountAtStart: number | null
  triggerData: {
    diceRoll?: {
      messageId?: string
      characterId?: string
      characterName?: string
      formula: string
      result: number
      diceResults: number[]
      criticalType: 'success' | 'failure'
    }
    activation?: {
      triggeredBy: string
      twitchUserId: string
      redemptionId: string
    }
    manual?: {
      triggeredBy: string
      reason?: string
    }
  } | null
}

export interface GamificationProgressEvent {
  instanceId: string
  currentProgress: number
  objectiveTarget: number
  progressPercentage: number
  isObjectiveReached: boolean
  contributorUsername: string
}

export interface GamificationCompleteEvent {
  instanceId: string
  success: boolean
  message?: string
}

/**
 * Event emitted when an instance becomes "armed" (gauge filled, waiting for critical)
 */
export interface GamificationArmedEvent {
  instanceId: string
  armedAt: string
  streamerId: string | null
  eventId: string
}

/**
 * Event emitted when an armed instance is consumed by a critical dice roll
 */
export interface GamificationConsumedEvent {
  instanceId: string
  streamerId: string | null
  eventId: string
  completedAt: string | null
  cooldownEndsAt: string | null
  resultData: {
    success: boolean
    message?: string
  } | null
  diceRoll: {
    characterName: string
    formula: string
    result: number
    criticalType: 'success' | 'failure'
  }
}

/**
 * Event emitted when an expired instance is refunded
 */
export interface GamificationRefundedEvent {
  instanceId: string
  streamerId: string | null
  totalContributions: number
  refundedCount: number
  failedCount: number
}

/**
 * Event emitted when a gamification action is executed (e.g., dice inversion by Foundry VTT)
 * This can happen minutes/hours after the gauge was completed
 */
export interface GamificationActionExecutedEvent {
  instanceId: string
  eventName: string
  actionType: 'dice_invert' | 'chat_message' | 'stat_modify'
  success: boolean
  message?: string
  // For dice_invert specifically
  originalValue?: number
  invertedValue?: number
}

// Cookie Consent types (RGPD)
export type ConsentCategory = 'required' | 'analytics' | 'marketing'

export interface CookieConsentPreferences {
  /** Cookies essentiels - toujours actifs */
  required: true
  /** Cookies analytiques (PostHog) */
  analytics: boolean
  /** Cookies marketing (GTM, pixels publicitaires) */
  marketing: boolean
  /** Version du consentement pour re-prompter si politique change */
  consentVersion: string
  /** Timestamp ISO du consentement */
  consentTimestamp: string
}
