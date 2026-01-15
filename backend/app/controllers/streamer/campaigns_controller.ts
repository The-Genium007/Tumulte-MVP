import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { MembershipService } from '#services/campaigns/membership_service'
import { StreamerRepository } from '#repositories/streamer_repository'
import { CampaignDto } from '#dtos/campaigns/campaign_dto'
import { CampaignInvitationDto } from '#dtos/campaigns/campaign_invitation_dto'
import { CharacterDto } from '#dtos/characters/character_dto'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import CharacterAssignment from '#models/character_assignment'
import Character from '#models/character'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { acceptInvitationSchema } from '#validators/streamer/accept_invitation_validator'
import { updateCharacterSchema } from '#validators/streamer/update_character_validator'

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
   * Accepte une invitation avec choix de personnage
   * POST /api/v2/streamer/invitations/:id/accept
   * Body: { characterId: string }
   */
  async acceptInvitation({ auth, params, request, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    try {
      // Valider le body avec le characterId requis
      const { characterId } = acceptInvitationSchema.parse(request.body())

      await this.membershipService.acceptInvitationWithCharacter(
        params.id,
        streamer.id,
        characterId
      )

      return response.ok({ message: 'Invitation accepted and character assigned' })
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

  /**
   * Génère l'URL de l'overlay pour le streamer
   * GET /api/v2/streamer/overlay-url
   *
   * @returns L'URL complète de l'overlay à utiliser dans OBS
   */
  async getOverlayUrl({ auth, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    const overlayUrl = `${env.get('FRONTEND_URL')}/overlay/${streamer.id}`

    return response.ok({
      // eslint-disable-next-line camelcase -- API response format
      data: { overlay_url: overlayUrl },
    })
  }

  /**
   * Récupère les paramètres de campagne pour le streamer
   * GET /api/v2/streamer/campaigns/:campaignId/settings
   */
  async getSettings({ auth, params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    // Vérifier que le streamer est membre actif de la campagne
    const membership = await CampaignMembership.query()
      .where('campaignId', params.campaignId)
      .where('streamerId', streamer.id)
      .where('status', 'ACTIVE')
      .preload('campaign')
      .first()

    if (!membership) {
      return response.notFound({ error: 'Campaign not found or not a member' })
    }

    // Récupérer l'assignation de personnage actuelle
    const assignment = await CharacterAssignment.query()
      .where('campaignId', params.campaignId)
      .where('streamerId', streamer.id)
      .preload('character')
      .first()

    // Vérifier s'il y a un poll actif (bloque le changement de personnage)
    const activePoll = await PollInstance.query()
      .where('campaignId', params.campaignId)
      .where('status', 'RUNNING')
      .first()

    return response.ok({
      campaign: CampaignDto.fromModel(membership.campaign),
      assignedCharacter: assignment ? CharacterDto.fromModel(assignment.character) : null,
      canChangeCharacter: !activePoll,
    })
  }

  /**
   * Modifie le personnage assigné au streamer pour une campagne
   * PUT /api/v2/streamer/campaigns/:campaignId/character
   * Body: { characterId: string }
   */
  async updateCharacter({ auth, params, request, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    // Vérifier que le streamer est membre actif de la campagne
    const membership = await CampaignMembership.query()
      .where('campaignId', params.campaignId)
      .where('streamerId', streamer.id)
      .where('status', 'ACTIVE')
      .first()

    if (!membership) {
      return response.notFound({ error: 'Campaign not found or not a member' })
    }

    // Vérifier qu'aucun poll n'est actif
    const activePoll = await PollInstance.query()
      .where('campaignId', params.campaignId)
      .where('status', 'RUNNING')
      .first()

    if (activePoll) {
      return response.badRequest({
        error: 'Cannot change character while a poll is active',
        pollId: activePoll.id,
      })
    }

    try {
      // Valider le body
      const { characterId } = updateCharacterSchema.parse(request.body())

      // Vérifier que le personnage existe et est un PJ de cette campagne
      const character = await Character.query()
        .where('id', characterId)
        .where('campaignId', params.campaignId)
        .where('characterType', 'pc')
        .first()

      if (!character) {
        return response.notFound({ error: 'Character not found or not available' })
      }

      // Mettre à jour ou créer l'assignation
      const existingAssignment = await CharacterAssignment.query()
        .where('campaignId', params.campaignId)
        .where('streamerId', streamer.id)
        .first()

      if (existingAssignment) {
        existingAssignment.characterId = characterId
        await existingAssignment.save()
      } else {
        await CharacterAssignment.create({
          characterId,
          streamerId: streamer.id,
          campaignId: params.campaignId,
        })
      }

      return response.ok({ message: 'Character updated successfully' })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to update character',
      })
    }
  }
}
