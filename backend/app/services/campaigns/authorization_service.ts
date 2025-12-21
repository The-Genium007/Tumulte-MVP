import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import CampaignMembershipRepository from '#repositories/campaign_membership_repository'

@inject()
export class AuthorizationService {
  constructor(private membershipRepository: CampaignMembershipRepository) {}

  /**
   * Grant 12-hour authorization for a streamer in a campaign
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

    await this.membershipRepository.grantPollAuthorization(membership)
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

export default AuthorizationService
