import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { DateTime } from 'luxon'

/**
 * Service pour gérer les membres des campagnes
 */
@inject()
export class MembershipService {
  /**
   * Inviter un streamer à une campagne
   */
  async inviteStreamer(campaignId: string, streamerId: string): Promise<CampaignMembership> {
    // Vérifier si le streamer est déjà membre
    const existing = await CampaignMembership.query()
      .where('campaignId', campaignId)
      .where('streamerId', streamerId)
      .first()

    if (existing) {
      throw new Error('Streamer already invited to this campaign')
    }

    const membership = await CampaignMembership.create({
      campaignId,
      streamerId,
      status: 'PENDING',
      invitedAt: DateTime.now(),
    })

    // Précharger la relation campaign pour le DTO
    await membership.load('campaign')

    logger.info({ campaignId, streamerId }, 'Streamer invited to campaign')

    return membership
  }

  /**
   * Accepter une invitation
   */
  async acceptInvitation(membershipId: string, streamerId: string): Promise<void> {
    const membership = await CampaignMembership.find(membershipId)

    if (!membership) {
      throw new Error('Invitation not found')
    }

    if (membership.streamerId !== streamerId) {
      throw new Error('Not authorized to accept this invitation')
    }

    if (membership.status !== 'PENDING') {
      throw new Error('Invitation already processed')
    }

    membership.status = 'ACTIVE'
    membership.acceptedAt = DateTime.now()
    await membership.save()

    logger.info(
      { membershipId, streamerId, campaignId: membership.campaignId },
      'Invitation accepted'
    )
  }

  /**
   * Refuser une invitation
   */
  async declineInvitation(membershipId: string, streamerId: string): Promise<void> {
    const membership = await CampaignMembership.find(membershipId)

    if (!membership) {
      throw new Error('Invitation not found')
    }

    if (membership.streamerId !== streamerId) {
      throw new Error('Not authorized to decline this invitation')
    }

    await membership.delete()

    logger.info({ membershipId, streamerId }, 'Invitation declined')
  }

  /**
   * Retirer un membre d'une campagne
   */
  async removeMember(campaignId: string, memberId: string, ownerId: string): Promise<void> {
    const membership = await CampaignMembership.query()
      .where('id', memberId)
      .where('campaignId', campaignId)
      .preload('campaign')
      .first()

    if (!membership) {
      throw new Error('Member not found')
    }

    if (membership.campaign.ownerId !== ownerId) {
      throw new Error('Not authorized to remove this member')
    }

    await membership.delete()

    logger.info({ campaignId, memberId, ownerId }, 'Member removed from campaign')
  }

  /**
   * Quitter une campagne
   */
  async leaveCampaign(campaignId: string, streamerId: string): Promise<void> {
    const membership = await CampaignMembership.query()
      .where('campaignId', campaignId)
      .where('streamerId', streamerId)
      .first()

    if (!membership) {
      throw new Error('Not a member of this campaign')
    }

    await membership.delete()

    logger.info({ campaignId, streamerId }, 'Streamer left campaign')
  }

  /**
   * Lister les invitations en attente d'un streamer
   */
  async listInvitations(streamerId: string): Promise<CampaignMembership[]> {
    return await CampaignMembership.query()
      .where('streamerId', streamerId)
      .where('status', 'PENDING')
      .preload('campaign')
      .orderBy('invitedAt', 'desc')
  }

  /**
   * Lister les campagnes actives d'un streamer
   */
  async listActiveCampaigns(streamerId: string): Promise<CampaignMembership[]> {
    return await CampaignMembership.query()
      .where('streamerId', streamerId)
      .where('status', 'ACTIVE')
      .preload('campaign')
      .orderBy('acceptedAt', 'desc')
  }

  /**
   * Récupérer les membres actifs d'une campagne
   */
  async getActiveMembers(campaignId: string): Promise<CampaignMembership[]> {
    return await CampaignMembership.query()
      .where('campaignId', campaignId)
      .where('status', 'ACTIVE')
      .preload('streamer')
  }
}

export { MembershipService as membershipService }
