import { CampaignRepository } from '#repositories/campaign_repository'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import type { campaign as Campaign } from '#models/campaign'
import { user as User } from '#models/user'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import VttWebSocketService from '#services/vtt/vtt_websocket_service'

/**
 * Service pour gérer la logique métier des campagnes
 */
@inject()
export class CampaignService {
  constructor(
    private campaignRepository: CampaignRepository,
    private membershipRepository: CampaignMembershipRepository,
    private vttWebSocketService: VttWebSocketService
  ) {}

  /**
   * Ajoute le propriétaire d'une campagne comme membre ACTIVE avec autorisation permanente
   * Utilisable après la création d'une campagne (peu importe le chemin de création)
   */
  async addOwnerAsMember(campaignId: string, ownerId: string): Promise<void> {
    // Charger le user avec sa relation streamer
    const owner = await User.query().where('id', ownerId).preload('streamer').firstOrFail()

    if (!owner.streamer) {
      logger.info(
        { campaignId, ownerId },
        'Owner has no streamer profile, skipping membership creation'
      )
      return
    }

    // Vérifier si le membership existe déjà
    const existingMembership = await this.membershipRepository.findByCampaignAndStreamer(
      campaignId,
      owner.streamer.id
    )

    if (existingMembership) {
      logger.info(
        { campaignId, ownerId, streamerId: owner.streamer.id },
        'Owner membership already exists'
      )
      return
    }

    // Créer le membership ACTIVE avec autorisation permanente
    const membership = await this.membershipRepository.create({
      campaignId,
      streamerId: owner.streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
    })

    membership.acceptedAt = DateTime.now()
    const now = DateTime.now()
    membership.pollAuthorizationGrantedAt = now
    membership.pollAuthorizationExpiresAt = now.plus({ years: 100 })

    await this.membershipRepository.update(membership)

    logger.info(
      { campaignId, ownerId, streamerId: owner.streamer.id },
      'Owner added as campaign member with permanent poll authorization'
    )
  }

  /**
   * Créer une nouvelle campagne
   */
  async createCampaign(
    ownerId: string,
    data: { name: string; description?: string | null }
  ): Promise<Campaign> {
    try {
      const campaign = await this.campaignRepository.create({
        ownerId,
        name: data.name,
        description: data.description,
      })

      // Ajouter automatiquement le propriétaire comme membre
      await this.addOwnerAsMember(campaign.id, ownerId)

      logger.info({ campaignId: campaign.id, ownerId }, 'Campaign created')

      return campaign
    } catch (error) {
      logger.error({ error, ownerId, data }, 'Failed to create campaign')
      throw error
    }
  }

  /**
   * Mettre à jour une campagne
   */
  async updateCampaign(
    campaignId: string,
    ownerId: string,
    data: { name?: string; description?: string | null }
  ): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaignId)

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.ownerId !== ownerId) {
      throw new Error('Not authorized to update this campaign')
    }

    if (data.name) campaign.name = data.name
    if (data.description !== undefined) campaign.description = data.description

    await this.campaignRepository.update(campaign)

    logger.info({ campaignId, ownerId }, 'Campaign updated')

    return campaign
  }

  /**
   * Supprimer une campagne
   * Révoque également la connexion VTT si elle existe
   */
  async deleteCampaign(campaignId: string, ownerId: string): Promise<void> {
    const campaign = await this.campaignRepository.findById(campaignId)

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.ownerId !== ownerId) {
      throw new Error('Not authorized to delete this campaign')
    }

    logger.info(
      { campaignId, vttConnectionId: campaign.vttConnectionId },
      'Deleting campaign, checking for VTT connection'
    )

    // Notify VTT and revoke connection if exists
    if (campaign.vttConnectionId) {
      try {
        // First, notify the module that the campaign is being deleted
        // This allows the module to show a specific message to the user
        logger.info(
          { campaignId, vttConnectionId: campaign.vttConnectionId },
          'Notifying VTT of campaign deletion'
        )
        await this.vttWebSocketService.notifyCampaignDeleted(
          campaign.vttConnectionId,
          campaignId,
          campaign.name
        )

        // Then revoke the connection
        logger.info(
          { campaignId, vttConnectionId: campaign.vttConnectionId },
          'Revoking VTT connection before campaign deletion'
        )
        await this.vttWebSocketService.revokeConnection(
          campaign.vttConnectionId,
          'Campaign deleted by owner'
        )
        logger.info(
          { campaignId, vttConnectionId: campaign.vttConnectionId },
          'VTT connection revoked due to campaign deletion'
        )
      } catch (error) {
        // Log but don't fail deletion if notification/revocation fails
        logger.warn(
          { campaignId, vttConnectionId: campaign.vttConnectionId, error },
          'Failed to notify/revoke VTT connection during campaign deletion'
        )
      }
    } else {
      logger.info({ campaignId }, 'No VTT connection to revoke for this campaign')
    }

    await this.campaignRepository.delete(campaign)

    logger.info({ campaignId, ownerId }, 'Campaign deleted')
  }

  /**
   * Récupérer une campagne avec ses membres
   */
  async getCampaignWithMembers(campaignId: string, userId: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findByIdWithMembers(campaignId)

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Vérifier que l'utilisateur est le propriétaire ou membre
    const isOwner = campaign.ownerId === userId
    const isMember = campaign.memberships?.some((m) => m.streamer?.userId === userId)

    if (!isOwner && !isMember) {
      throw new Error('Not authorized to view this campaign')
    }

    return campaign
  }

  /**
   * Lister les campagnes d'un utilisateur
   */
  async listUserCampaigns(ownerId: string): Promise<Campaign[]> {
    return await this.campaignRepository.findByOwnerIdWithMembers(ownerId)
  }
}
