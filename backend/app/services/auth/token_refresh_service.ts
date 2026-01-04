import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import { streamer as Streamer } from '#models/streamer'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { campaign as Campaign } from '#models/campaign'
import { twitchAuthService as TwitchAuthService } from './twitch_auth_service.js'
import { PushNotificationService } from '../notifications/push_notification_service.js'

// Retry delay in minutes
const RETRY_DELAY_MINUTES = 15

export interface RefreshReport {
  total: number
  success: number
  failed: number
  skipped: number
  details: Array<{
    streamerId: string
    displayName: string
    status: 'success' | 'failed' | 'skipped'
    reason?: string
  }>
}

/**
 * Service for managing Twitch token refresh
 */
export class TokenRefreshService {
  private twitchAuthService: TwitchAuthService
  private pushNotificationService: PushNotificationService

  constructor() {
    this.twitchAuthService = new TwitchAuthService()
    this.pushNotificationService = new PushNotificationService()
  }

  /**
   * Refresh the token for a specific streamer
   * @returns true if successful, false if failed
   */
  async refreshStreamerToken(streamer: Streamer): Promise<boolean> {
    try {
      const refreshToken = await streamer.getDecryptedRefreshToken()

      if (!refreshToken) {
        logger.warn({ streamerId: streamer.id }, '[TokenRefresh] No refresh token available')
        // Mark the failure timestamp for retry policy
        streamer.tokenRefreshFailedAt = DateTime.now()
        await streamer.save()
        return false
      }

      // Call Twitch API to refresh token
      const tokens = await this.twitchAuthService.refreshAccessToken(refreshToken)

      // Update streamer with new tokens and expiry
      await streamer.updateTokens(tokens.access_token, tokens.refresh_token)

      // Update token expiry tracking
      streamer.tokenExpiresAt = DateTime.now().plus({ seconds: tokens.expires_in })
      streamer.lastTokenRefreshAt = DateTime.now()
      streamer.tokenRefreshFailedAt = null // Clear any previous failure
      await streamer.save()

      logger.info(
        { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
        '[TokenRefresh] Token refreshed successfully'
      )

      return true
    } catch (error) {
      logger.error({ streamerId: streamer.id, error }, '[TokenRefresh] Failed to refresh token')

      // Mark the failure timestamp for retry policy
      streamer.tokenRefreshFailedAt = DateTime.now()
      await streamer.save()

      return false
    }
  }

  /**
   * Handle refresh failure with retry policy
   * - First failure: schedule retry in 15 min
   * - Second failure (within 30 min): deactivate and notify
   */
  async handleRefreshFailure(streamer: Streamer): Promise<void> {
    const now = DateTime.now()
    const failedAt = streamer.tokenRefreshFailedAt

    // Check if this is a second consecutive failure (within 30 min of first failure)
    if (failedAt && failedAt > now.minus({ minutes: 30 })) {
      // Second failure - deactivate and notify
      logger.warn(
        { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
        '[TokenRefresh] Second consecutive failure - deactivating streamer'
      )

      streamer.isActive = false
      streamer.tokenRefreshFailedAt = null // Clear after handling
      await streamer.save()

      // Send notifications
      await this.notifyTokenRefreshFailed(streamer)
    } else {
      // First failure - just log, retry will happen in 15 min
      logger.info(
        { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
        `[TokenRefresh] First failure - will retry in ${RETRY_DELAY_MINUTES} minutes`
      )
    }
  }

  /**
   * Notify the streamer and campaign MJs about token refresh failure
   */
  async notifyTokenRefreshFailed(streamer: Streamer): Promise<void> {
    // Get all campaigns where this streamer is a member
    const memberships = await CampaignMembership.query()
      .where('streamerId', streamer.id)
      .where('status', 'ACTIVE')
      .preload('campaign')

    const campaignIds = memberships.map((m) => m.campaignId)
    const campaignNames = memberships.map((m) => m.campaign.name)

    // Notify the streamer
    if (streamer.userId) {
      await this.pushNotificationService.sendToUser(streamer.userId, 'token:refresh_failed', {
        title: 'Reconnexion Twitch requise',
        body: 'Votre connexion Twitch a expiré. Reconnectez-vous pour continuer à participer aux sondages.',
        data: {
          url: '/auth/twitch/redirect',
          streamerId: streamer.id,
        },
        actions: [
          { action: 'reconnect', title: 'Se reconnecter' },
          { action: 'dismiss', title: 'Plus tard' },
        ],
      })
    }

    // Notify all MJs of campaigns this streamer is in
    for (const membership of memberships) {
      const campaign = await Campaign.query()
        .where('id', membership.campaignId)
        .preload('owner')
        .first()

      if (campaign?.ownerId) {
        await this.pushNotificationService.sendToUser(campaign.ownerId, 'token:refresh_failed', {
          title: 'Token expiré - Streamer désactivé',
          body: `Le token Twitch de ${streamer.twitchDisplayName} a expiré. Il doit se reconnecter pour participer aux sondages.`,
          data: {
            url: `/mj/campaigns/${campaign.id}`,
            campaignId: campaign.id,
            streamerId: streamer.id,
          },
        })
      }
    }

    logger.info(
      {
        streamerId: streamer.id,
        displayName: streamer.twitchDisplayName,
        campaignIds,
        campaignNames,
      },
      '[TokenRefresh] Sent failure notifications to streamer and MJs'
    )
  }

  /**
   * Find all streamers with active poll authorization
   */
  async findStreamersWithActiveAuthorization(): Promise<Streamer[]> {
    const now = DateTime.now()

    // Find all active memberships with valid poll authorization
    const memberships = await CampaignMembership.query()
      .where('status', 'ACTIVE')
      .whereNotNull('pollAuthorizationExpiresAt')
      .where('pollAuthorizationExpiresAt', '>', now.toSQL())
      .preload('streamer')

    // Extract unique streamers
    const streamerMap = new Map<string, Streamer>()
    for (const membership of memberships) {
      if (membership.streamer && membership.streamer.isActive) {
        streamerMap.set(membership.streamer.id, membership.streamer)
      }
    }

    return Array.from(streamerMap.values())
  }

  /**
   * Find streamers that need retry (failed within last 30 min but not recently)
   */
  async findStreamersNeedingRetry(): Promise<Streamer[]> {
    const now = DateTime.now()
    const retryThreshold = now.minus({ minutes: RETRY_DELAY_MINUTES })
    const maxAge = now.minus({ minutes: 30 })

    // Find streamers with failed refresh that are due for retry
    const streamers = await Streamer.query()
      .where('isActive', true)
      .whereNotNull('tokenRefreshFailedAt')
      .where('tokenRefreshFailedAt', '>', maxAge.toSQL()) // Not too old
      .where('tokenRefreshFailedAt', '<', retryThreshold.toSQL()) // Past retry delay

    return streamers
  }

  /**
   * Refresh all tokens for streamers with active authorization
   * Called by the scheduler every 3h30
   */
  async refreshAllActiveTokens(): Promise<RefreshReport> {
    const report: RefreshReport = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      details: [],
    }

    // Get streamers with active authorization
    const streamers = await this.findStreamersWithActiveAuthorization()
    report.total = streamers.length

    logger.info(
      { count: streamers.length },
      '[TokenRefresh] Starting refresh for streamers with active authorization'
    )

    for (const streamer of streamers) {
      // Skip if token is not expiring soon (< 1h)
      if (!streamer.isTokenExpiringSoon) {
        report.skipped++
        report.details.push({
          streamerId: streamer.id,
          displayName: streamer.twitchDisplayName,
          status: 'skipped',
          reason: 'Token not expiring soon',
        })
        continue
      }

      const success = await this.refreshStreamerToken(streamer)

      if (success) {
        report.success++
        report.details.push({
          streamerId: streamer.id,
          displayName: streamer.twitchDisplayName,
          status: 'success',
        })
      } else {
        report.failed++
        report.details.push({
          streamerId: streamer.id,
          displayName: streamer.twitchDisplayName,
          status: 'failed',
          reason: 'Twitch API error',
        })

        // Handle failure with retry policy
        await this.handleRefreshFailure(streamer)
      }
    }

    // Also process retries for previously failed streamers
    const retryStreamers = await this.findStreamersNeedingRetry()

    for (const streamer of retryStreamers) {
      logger.info(
        { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
        '[TokenRefresh] Retrying failed refresh'
      )

      const success = await this.refreshStreamerToken(streamer)

      if (!success) {
        // Second failure - handle deactivation
        await this.handleRefreshFailure(streamer)
      }
    }

    logger.info(
      {
        total: report.total,
        success: report.success,
        failed: report.failed,
        skipped: report.skipped,
        retries: retryStreamers.length,
      },
      '[TokenRefresh] Completed refresh cycle'
    )

    return report
  }
}

export default TokenRefreshService
