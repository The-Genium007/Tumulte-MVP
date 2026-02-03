import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import env from '#start/env'
import { MembershipService } from '#services/campaigns/membership_service'
import { StreamerRepository } from '#repositories/streamer_repository'
import { OverlayStudioRepository } from '#repositories/overlay_studio_repository'
import { CampaignDto, CampaignInvitationDto } from '#dtos/campaigns/campaign_dto'
import { CharacterDto } from '#dtos/characters/character_dto'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { campaign as Campaign } from '#models/campaign'
import { overlayConfig as OverlayConfig } from '#models/overlay_config'
import CharacterAssignment from '#models/character_assignment'
import Character from '#models/character'
import { pollInstance as PollInstance } from '#models/poll_instance'
import {
  acceptInvitationSchema,
  updateCharacterSchema,
  updateOverlaySchema,
} from '#validators/streamer/streamer_validators'

/**
 * Contrôleur pour la gestion des campagnes (Streamer)
 */
@inject()
export default class CampaignsController {
  constructor(
    private membershipService: MembershipService,
    private streamerRepository: StreamerRepository,
    private overlayStudioRepository: OverlayStudioRepository
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
   * Accepte une invitation avec choix optionnel de personnage
   * POST /api/v2/streamer/invitations/:id/accept
   * Body: { characterId?: string }
   */
  async acceptInvitation({ auth, params, request, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    try {
      // Valider le body avec le characterId optionnel
      const { characterId } = acceptInvitationSchema.parse(request.body())

      if (characterId) {
        // Accepter avec assignation de personnage
        await this.membershipService.acceptInvitationWithCharacter(
          params.id,
          streamer.id,
          characterId
        )
        return response.ok({ message: 'Invitation accepted and character assigned' })
      } else {
        // Accepter sans personnage (sélection ultérieure)
        await this.membershipService.acceptInvitation(params.id, streamer.id)
        return response.ok({ message: 'Invitation accepted' })
      }
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
   * Liste les campagnes actives du streamer (membre OU propriétaire)
   * GET /api/v2/streamer/campaigns
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    const streamer = await this.streamerRepository.findByUserId(user.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    // Récupérer les campagnes où l'utilisateur est membre actif
    const memberships = await this.membershipService.listActiveCampaigns(streamer.id)
    const memberCampaigns = memberships.map((m) => ({
      ...CampaignDto.fromModel(m.campaign),
      isOwner: false,
    }))

    // Récupérer les campagnes où l'utilisateur est propriétaire
    const ownedCampaigns = await Campaign.query()
      .where('ownerId', user.id)
      .orderBy('created_at', 'desc')

    const ownerCampaigns = ownedCampaigns.map((c) => ({
      ...CampaignDto.fromModel(c),
      isOwner: true,
    }))

    // Fusionner et dédupliquer (un MJ pourrait théoriquement être aussi membre)
    const allCampaignIds = new Set<string>()
    const allCampaigns = []

    // Ajouter d'abord les campagnes possédées (priorité)
    for (const campaign of ownerCampaigns) {
      if (!allCampaignIds.has(campaign.id)) {
        allCampaignIds.add(campaign.id)
        allCampaigns.push(campaign)
      }
    }

    // Ajouter les campagnes où on est membre
    for (const campaign of memberCampaigns) {
      if (!allCampaignIds.has(campaign.id)) {
        allCampaignIds.add(campaign.id)
        allCampaigns.push(campaign)
      }
    }

    return response.ok({
      data: allCampaigns,
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
   * Récupère les paramètres de campagne pour le streamer ou le MJ (propriétaire)
   * GET /api/v2/streamer/campaigns/:campaignId/settings
   */
  async getSettings({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const streamer = await this.streamerRepository.findByUserId(user.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    // Vérifier que le streamer est membre actif OU propriétaire de la campagne
    const membership = await CampaignMembership.query()
      .where('campaignId', params.campaignId)
      .where('streamerId', streamer.id)
      .where('status', 'ACTIVE')
      .preload('campaign')
      .preload('overlayConfig')
      .first()

    const ownedCampaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('ownerId', user.id)
      .first()

    if (!membership && !ownedCampaign) {
      return response.notFound({ error: 'Campaign not found or not a member' })
    }

    // Utiliser la campagne du membership ou celle possédée
    const campaign = membership?.campaign || ownedCampaign!

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

    // Récupérer les overlays disponibles pour le dropdown
    const personalOverlays = await this.overlayStudioRepository.findByStreamerId(streamer.id)
    const availableOverlays = [
      {
        id: null,
        name: 'Tumulte Default',
        isDefault: true,
        isActive: false,
      },
      ...personalOverlays.map((overlay) => ({
        id: overlay.id,
        name: overlay.name,
        isDefault: false,
        isActive: overlay.isActive,
      })),
    ]

    // Overlay actuellement sélectionné
    const currentOverlay = membership?.overlayConfig
      ? { id: membership.overlayConfig.id, name: membership.overlayConfig.name }
      : { id: null, name: 'Tumulte Default' }

    return response.ok({
      campaign: CampaignDto.fromModel(campaign),
      assignedCharacter: assignment ? CharacterDto.fromModel(assignment.character) : null,
      canChangeCharacter: !activePoll,
      isOwner: !!ownedCampaign,
      overlay: {
        current: currentOverlay,
        available: availableOverlays,
      },
    })
  }

  /**
   * Modifie le personnage assigné au streamer ou MJ pour une campagne
   * PUT /api/v2/streamer/campaigns/:campaignId/character
   * Body: { characterId: string }
   */
  async updateCharacter({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const streamer = await this.streamerRepository.findByUserId(user.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    // Vérifier que le streamer est membre actif OU propriétaire de la campagne
    const membership = await CampaignMembership.query()
      .where('campaignId', params.campaignId)
      .where('streamerId', streamer.id)
      .where('status', 'ACTIVE')
      .first()

    const ownedCampaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('ownerId', user.id)
      .first()

    if (!membership && !ownedCampaign) {
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

  /**
   * Récupère les overlays disponibles pour une campagne
   * GET /api/v2/streamer/campaigns/:campaignId/available-overlays
   * Retourne l'overlay système par défaut + les overlays personnels du streamer
   */
  async getAvailableOverlays({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const streamer = await this.streamerRepository.findByUserId(user.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    // Vérifier que le streamer est membre actif OU propriétaire de la campagne
    const membership = await CampaignMembership.query()
      .where('campaignId', params.campaignId)
      .where('streamerId', streamer.id)
      .where('status', 'ACTIVE')
      .first()

    const ownedCampaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('ownerId', user.id)
      .first()

    if (!membership && !ownedCampaign) {
      return response.notFound({ error: 'Campaign not found or not a member' })
    }

    // Récupérer les overlays personnels du streamer
    const personalOverlays = await this.overlayStudioRepository.findByStreamerId(streamer.id)

    // Construire la liste avec l'option "default" en premier
    const availableOverlays = [
      {
        id: null,
        name: 'Tumulte Default',
        isDefault: true,
        isActive: false,
      },
      ...personalOverlays.map((overlay) => ({
        id: overlay.id,
        name: overlay.name,
        isDefault: false,
        isActive: overlay.isActive,
      })),
    ]

    // Récupérer l'overlay actuellement sélectionné pour cette campagne
    const currentOverlayId = membership?.overlayConfigId ?? null

    return response.ok({
      data: {
        availableOverlays,
        currentOverlayId,
      },
    })
  }

  /**
   * Met à jour l'overlay sélectionné pour une campagne
   * PUT /api/v2/streamer/campaigns/:campaignId/overlay
   * Body: { overlayConfigId: string | null }
   */
  async updateOverlay({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const streamer = await this.streamerRepository.findByUserId(user.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    // Vérifier que le streamer est membre actif OU propriétaire de la campagne
    const membership = await CampaignMembership.query()
      .where('campaignId', params.campaignId)
      .where('streamerId', streamer.id)
      .where('status', 'ACTIVE')
      .first()

    const ownedCampaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('ownerId', user.id)
      .first()

    if (!membership && !ownedCampaign) {
      return response.notFound({ error: 'Campaign not found or not a member' })
    }

    try {
      const { overlayConfigId } = updateOverlaySchema.parse(request.body())

      // Si un overlay est spécifié, vérifier qu'il appartient au streamer
      if (overlayConfigId) {
        const overlayConfig = await OverlayConfig.query()
          .where('id', overlayConfigId)
          .where('streamerId', streamer.id)
          .first()

        if (!overlayConfig) {
          return response.notFound({ error: 'Overlay configuration not found' })
        }
      }

      // Mettre à jour le membership ou en créer un si c'est le propriétaire sans membership
      if (membership) {
        membership.overlayConfigId = overlayConfigId
        await membership.save()
      } else if (ownedCampaign) {
        // Le propriétaire n'a pas de membership, on en crée un avec status ACTIVE
        await CampaignMembership.create({
          campaignId: params.campaignId,
          streamerId: streamer.id,
          status: 'ACTIVE',
          invitedAt: DateTime.now(),
          acceptedAt: DateTime.now(),
          overlayConfigId,
        })
      }

      return response.ok({ message: 'Overlay updated successfully' })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to update overlay',
      })
    }
  }
}
