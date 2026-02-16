import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import { streamer as Streamer } from '#models/streamer'
import { TokenRefreshService } from '#services/auth/token_refresh_service'
import { webSocketService as WebSocketService } from '#services/websocket/websocket_service'
import { GamificationAuthBridge } from '#services/gamification/gamification_auth_bridge'

@inject()
export class AuthorizationService {
  constructor(
    private membershipRepository: CampaignMembershipRepository,
    private gamificationBridge: GamificationAuthBridge
  ) {}

  /**
   * Grant 12-hour authorization for a streamer in a campaign
   * Also refreshes the Twitch token to ensure it's valid for the authorization period
   */
  async grantAuthorization(campaignId: string, streamerId: string): Promise<DateTime> {
    const membership = await this.membershipRepository.findByCampaignAndStreamer(
      campaignId,
      streamerId
    )

    if (!membership) {
      throw new Error('Campaign membership not found')
    }

    if (membership.status !== 'ACTIVE') {
      throw new Error('Membership must be ACTIVE to grant authorization')
    }

    // Refresh the token before granting authorization
    const streamer = await Streamer.find(streamerId)
    if (!streamer) {
      throw new Error('Streamer not found')
    }

    const tokenRefreshService = new TokenRefreshService()
    const refreshSuccess = await tokenRefreshService.refreshStreamerToken(streamer)

    if (!refreshSuccess) {
      logger.warn(
        { streamerId, campaignId },
        '[Authorization] Token refresh failed during grant - authorization denied'
      )
      throw new Error('TOKEN_REFRESH_FAILED')
    }

    logger.info(
      { streamerId, campaignId, displayName: streamer.twitchDisplayName },
      '[Authorization] Token refreshed, granting 12h authorization'
    )

    await this.membershipRepository.grantPollAuthorization(membership)

    // Sync gamification rewards (create Twitch Channel Points rewards)
    try {
      const gamificationResult = await this.gamificationBridge.onAuthorizationGranted(
        campaignId,
        streamer
      )
      logger.info(
        {
          streamerId,
          campaignId,
          rewardsCreated: gamificationResult.created,
          rewardsEnabled: gamificationResult.enabled,
          rewardsFailed: gamificationResult.failed,
        },
        '[Authorization] Gamification rewards synced on grant'
      )
    } catch (error) {
      // Log but don't fail the authorization - gamification is non-blocking
      logger.error(
        {
          streamerId,
          campaignId,
          error: error instanceof Error ? error.message : String(error),
        },
        '[Authorization] Failed to sync gamification rewards on grant'
      )
    }

    // Broadcast readiness change via WebSocket
    const wsService = new WebSocketService()
    wsService.emitStreamerReadinessChange(campaignId, streamerId, true, streamer.twitchDisplayName)

    return membership.pollAuthorizationExpiresAt!
  }

  /**
   * Revoke authorization immediately
   */
  async revokeAuthorization(campaignId: string, streamerId: string): Promise<void> {
    const membership = await this.membershipRepository.findByCampaignAndStreamer(
      campaignId,
      streamerId
    )

    if (!membership) {
      throw new Error('Campaign membership not found')
    }

    await this.membershipRepository.revokePollAuthorization(membership)

    // Delete gamification rewards (remove Twitch Channel Points rewards)
    const streamer = await Streamer.find(streamerId)
    try {
      if (streamer) {
        // Refresh token before attempting Twitch API cleanup
        const tokenRefreshService = new TokenRefreshService()
        const refreshSuccess = await tokenRefreshService.refreshStreamerToken(streamer)
        if (!refreshSuccess) {
          logger.warn(
            { streamerId, campaignId },
            '[Authorization] Token refresh failed before revoke cleanup, attempting anyway'
          )
        }

        const gamificationResult = await this.gamificationBridge.onAuthorizationRevoked(
          campaignId,
          streamer
        )
        logger.info(
          {
            streamerId,
            campaignId,
            rewardsDeleted: gamificationResult.deleted,
            rewardsFailed: gamificationResult.failed,
          },
          '[Authorization] Gamification rewards deleted on revoke'
        )
      }
    } catch (error) {
      // Log but don't fail the revocation - gamification is non-blocking
      logger.error(
        {
          streamerId,
          campaignId,
          error: error instanceof Error ? error.message : String(error),
        },
        '[Authorization] Failed to delete gamification rewards on revoke'
      )
    }

    // Broadcast readiness change via WebSocket (streamer is no longer ready)
    const wsService = new WebSocketService()
    wsService.emitStreamerReadinessChange(
      campaignId,
      streamerId,
      false,
      streamer?.twitchDisplayName ?? 'Unknown'
    )
  }

  /**
   * Get authorization status for a streamer in a campaign
   */
  async getAuthorizationStatus(
    campaignId: string,
    streamerId: string
  ): Promise<{
    isAuthorized: boolean
    expiresAt: DateTime | null
    remainingSeconds: number | null
  }> {
    const membership = await this.membershipRepository.findByCampaignAndStreamer(
      campaignId,
      streamerId
    )

    if (!membership) {
      throw new Error('Campaign membership not found')
    }

    return {
      isAuthorized: membership.isPollAuthorizationActive,
      expiresAt: membership.pollAuthorizationExpiresAt,
      remainingSeconds: membership.authorizationRemainingSeconds,
    }
  }
}
