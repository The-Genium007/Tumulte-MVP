import { CampaignRepository } from '#repositories/campaign_repository'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import type { campaign as Campaign } from '#models/campaign'
import { user as User } from '#models/user'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

/**
 * Service pour gérer la logique métier des campagnes
 */
@inject()
export class CampaignService {
  constructor(
    private campaignRepository: CampaignRepository,
    private membershipRepository: CampaignMembershipRepository
  ) {}

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

      // Charger le user avec sa relation streamer
      const owner = await User.query().where('id', ownerId).preload('streamer').firstOrFail()

      // Si le MJ a un profil streamer, l'ajouter automatiquement comme membre ACTIVE
      if (owner.streamer) {
        const membership = await this.membershipRepository.create({
          campaignId: campaign.id,
          streamerId: owner.streamer.id,
          status: 'ACTIVE',
          invitedAt: DateTime.now(),
        })

        // Mettre à jour acceptedAt puisque c'est automatique
        membership.acceptedAt = DateTime.now()

        // Accorder automatiquement l'autorisation de sondages pour le MJ (pas besoin de s'autoriser lui-même)
        const now = DateTime.now()
        membership.pollAuthorizationGrantedAt = now
        // Autorisation permanente pour le MJ propriétaire (100 ans)
        membership.pollAuthorizationExpiresAt = now.plus({ years: 100 })

        await this.membershipRepository.update(membership)

        // Charger la relation streamer pour le membership
        await membership.load('streamer')

        logger.info(
          { campaignId: campaign.id, ownerId, streamerId: owner.streamer.id },
          'Campaign created with owner as default streamer member with permanent poll authorization'
        )
      } else {
        logger.info({ campaignId: campaign.id, ownerId }, 'Campaign created')
      }

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
   */
  async deleteCampaign(campaignId: string, ownerId: string): Promise<void> {
    const campaign = await this.campaignRepository.findById(campaignId)

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.ownerId !== ownerId) {
      throw new Error('Not authorized to delete this campaign')
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
