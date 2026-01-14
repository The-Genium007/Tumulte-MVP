import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import { streamer as Streamer } from '#models/streamer'
import { TokenRefreshService } from '#services/auth/token_refresh_service'
import { webSocketService as WebSocketService } from '#services/websocket/websocket_service'

@inject()
export class AuthorizationService {
  constructor(private membershipRepository: CampaignMembershipRepository) {}

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
