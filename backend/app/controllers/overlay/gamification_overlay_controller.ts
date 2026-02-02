import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { GamificationService } from '#services/gamification/gamification_service'
import { StreamerRepository } from '#repositories/streamer_repository'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import { GamificationOverlayDto } from '#dtos/gamification/gamification_instance_dto'

/**
 * GamificationOverlayController - Données gamification pour l'overlay (public)
 */
@inject()
export default class GamificationOverlayController {
  constructor(
    private gamificationService: GamificationService,
    private streamerRepository: StreamerRepository,
    private membershipRepository: CampaignMembershipRepository
  ) {}

  /**
   * Récupère l'instance de gamification active pour un streamer (overlay)
   * GET /overlay/:streamerId/gamification/active
   */
  async getActive({ params, response }: HttpContext) {
    const streamerId = params.streamerId

    // Vérifier que le streamer existe
    const streamer = await this.streamerRepository.findById(streamerId)
    if (!streamer) {
      return response.notFound({ error: 'Streamer non trouvé' })
    }

    // Trouver la campagne active du streamer
    const activeMemberships = await this.membershipRepository.findActiveByStreamer(streamerId)

    if (activeMemberships.length === 0) {
      return response.ok({ data: null })
    }

    // Prendre la première campagne active
    const activeMembership = activeMemberships[0]

    // Récupérer l'instance active
    const instance = await this.gamificationService.getActiveInstanceForStreamer(
      activeMembership.campaignId,
      streamerId
    )

    if (!instance) {
      return response.ok({ data: null })
    }

    // Charger l'événement
    await instance.load('event')

    return response.ok({
      data: GamificationOverlayDto.fromModel(instance),
    })
  }

  /**
   * Récupère l'instance de gamification active pour une campagne spécifique
   * GET /overlay/:streamerId/campaigns/:campaignId/gamification/active
   */
  async getActiveForCampaign({ params, response }: HttpContext) {
    const { streamerId, campaignId } = params

    // Vérifier que le streamer est membre de la campagne
    const membership = await this.membershipRepository.findByCampaignAndStreamer(
      campaignId,
      streamerId
    )

    if (!membership || membership.status !== 'ACTIVE') {
      return response.forbidden({ error: "Le streamer n'est pas membre de cette campagne" })
    }

    // Récupérer l'instance active
    const instance = await this.gamificationService.getActiveInstanceForStreamer(
      campaignId,
      streamerId
    )

    if (!instance) {
      return response.ok({ data: null })
    }

    // Charger l'événement
    await instance.load('event')

    return response.ok({
      data: GamificationOverlayDto.fromModel(instance),
    })
  }
}
