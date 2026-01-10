/**
 * Types et DTOs pour la gestion de la readiness des streamers
 * Utilisé pour la waiting list avant le lancement de session
 */

/**
 * Types de problèmes empêchant un streamer d'être prêt
 */
export type ReadinessIssue =
  | 'token_expired'
  | 'token_refresh_failed'
  | 'authorization_missing'
  | 'authorization_expired'
  | 'streamer_inactive'

/**
 * DTO représentant l'état de readiness d'un streamer individuel
 */
export interface StreamerReadinessDto {
  streamerId: string
  streamerName: string
  streamerAvatar: string | null
  twitchUserId: string
  userId: string | null // User ID pour envoyer des notifications
  isReady: boolean
  issues: ReadinessIssue[]
  tokenValid: boolean
  authorizationActive: boolean
  authorizationExpiresAt: string | null
}

/**
 * DTO représentant l'état de readiness de tous les streamers d'une campagne
 */
export interface CampaignReadinessDto {
  campaignId: string
  allReady: boolean
  readyCount: number
  totalCount: number
  streamers: StreamerReadinessDto[]
}
