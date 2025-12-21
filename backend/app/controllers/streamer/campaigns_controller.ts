import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { MembershipService } from '#services/campaigns/membership_service'
import { StreamerRepository } from '#repositories/streamer_repository'
import { CampaignDto } from '#dtos/campaigns/campaign_dto'
import { CampaignInvitationDto } from '#dtos/campaigns/campaign_invitation_dto'

/**
 * Contrôleur pour la gestion des campagnes (Streamer)
 */
@inject()
export default class CampaignsController {
  constructor(
    private membershipService: MembershipService,
    private streamerRepository: StreamerRepository
  ) {}

  /**
   * Liste les invitations en attente du streamer
   * GET /api/v2/streamer/invitations
   */
  async invitations({ auth, response }: HttpContext) {
    // Récupérer le streamer associé à l'utilisateur
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    const invitations = await this.membershipService.listInvitations(streamer.id)

    return response.ok({
      data: invitations.map((inv) => CampaignInvitationDto.fromModel(inv)),
    })
  }

  /**
   * Accepte une invitation
   * POST /api/v2/streamer/invitations/:id/accept
   */
  async acceptInvitation({ auth, params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    try {
      await this.membershipService.acceptInvitation(params.id, streamer.id)

      return response.ok({ message: 'Invitation accepted' })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to accept invitation',
      })
    }
  }

  /**
   * Refuse une invitation
   * POST /api/v2/streamer/invitations/:id/decline
   */
  async declineInvitation({ auth, params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    try {
      await this.membershipService.declineInvitation(params.id, streamer.id)

      return response.ok({ message: 'Invitation declined' })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to decline invitation',
      })
    }
  }

  /**
   * Liste les campagnes actives du streamer
   * GET /api/v2/streamer/campaigns
   */
  async index({ auth, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    const memberships = await this.membershipService.listActiveCampaigns(streamer.id)

    return response.ok({
      data: memberships.map((m) => CampaignDto.fromModel(m.campaign)),
    })
  }

  /**
   * Quitte une campagne
   * POST /api/v2/streamer/campaigns/:id/leave
   */
  async leave({ auth, params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    try {
      await this.membershipService.leaveCampaign(params.id, streamer.id)

      return response.ok({ message: 'Left campaign successfully' })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to leave campaign',
      })
    }
  }
}
