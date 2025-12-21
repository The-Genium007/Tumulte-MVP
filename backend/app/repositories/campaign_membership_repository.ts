import CampaignMembership from '#models/campaign_membership'
import { DateTime } from 'luxon'

export class CampaignMembershipRepository {
  async findById(id: string): Promise<CampaignMembership | null> {
    return await CampaignMembership.find(id)
  }

  async findByCampaignAndStreamer(
    campaignId: string,
    streamerId: string
  ): Promise<CampaignMembership | null> {
    return await CampaignMembership.query()
      .where('campaignId', campaignId)
      .where('streamerId', streamerId)
      .first()
  }

  async findActiveByCampaign(campaignId: string): Promise<CampaignMembership[]> {
    return await CampaignMembership.query()
      .where('campaignId', campaignId)
      .where('status', 'ACTIVE')
      .preload('streamer')
  }

  async findPendingByStreamer(streamerId: string): Promise<CampaignMembership[]> {
    return await CampaignMembership.query()
      .where('streamerId', streamerId)
      .where('status', 'PENDING')
      .preload('campaign')
      .orderBy('invitedAt', 'desc')
  }

  async findActiveByStreamer(streamerId: string): Promise<CampaignMembership[]> {
    return await CampaignMembership.query()
      .where('streamerId', streamerId)
      .where('status', 'ACTIVE')
      .preload('campaign')
      .orderBy('acceptedAt', 'desc')
  }

  async create(data: {
    campaignId: string
    streamerId: string
    status: 'PENDING' | 'ACTIVE'
    invitedAt?: DateTime
  }): Promise<CampaignMembership> {
    return await CampaignMembership.create(data)
  }

  async update(membership: CampaignMembership): Promise<CampaignMembership> {
    await membership.save()
    return membership
  }

  async delete(membership: CampaignMembership): Promise<void> {
    await membership.delete()
  }

  async countByCampaign(campaignId: string): Promise<number> {
    const result = await CampaignMembership.query()
      .where('campaignId', campaignId)
      .count('* as total')
    return Number(result[0]?.$extras?.total || 0)
  }

  async countActiveByCampaign(campaignId: string): Promise<number> {
    const result = await CampaignMembership.query()
      .where('campaignId', campaignId)
      .where('status', 'ACTIVE')
      .count('* as total')
    return Number(result[0]?.$extras?.total || 0)
  }

  /**
   * Find all ACTIVE memberships with valid poll authorization for a campaign
   */
  async findAuthorizedByCampaign(campaignId: string): Promise<CampaignMembership[]> {
    return await CampaignMembership.query()
      .where('campaignId', campaignId)
      .where('status', 'ACTIVE')
      .whereNotNull('pollAuthorizationExpiresAt')
      .where('pollAuthorizationExpiresAt', '>', DateTime.now().toSQL())
      .preload('streamer')
  }

  /**
   * Grant poll authorization for 12 hours
   */
  async grantPollAuthorization(membership: CampaignMembership): Promise<CampaignMembership> {
    const now = DateTime.now()
    membership.pollAuthorizationGrantedAt = now
    membership.pollAuthorizationExpiresAt = now.plus({ hours: 12 })
    await membership.save()
    return membership
  }

  /**
   * Revoke poll authorization
   */
  async revokePollAuthorization(membership: CampaignMembership): Promise<CampaignMembership> {
    membership.pollAuthorizationGrantedAt = null
    membership.pollAuthorizationExpiresAt = null
    await membership.save()
    return membership
  }
}

export default CampaignMembershipRepository
