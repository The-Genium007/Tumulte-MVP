import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { AuthorizationService } from '#services/campaigns/authorization_service'
import { StreamerRepository } from '#repositories/streamer_repository'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'

/**
 * Contrôleur pour la gestion des autorisations de sondages (Streamer)
 */
@inject()
export default class AuthorizationController {
  constructor(
    private authorizationService: AuthorizationService,
    private streamerRepository: StreamerRepository,
    private membershipRepository: CampaignMembershipRepository
  ) {}

  /**
   * Accorde l'autorisation pour 12 heures
   * POST /api/v2/streamer/campaigns/:campaignId/authorize
   */
  async grant({ auth, params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    try {
      const expiresAt = await this.authorizationService.grantAuthorization(
        params.campaignId,
        streamer.id
      )

      return response.ok({
        message: 'Authorization granted for 12 hours',
        data: {
          expires_at: expiresAt.toISO(),
          remaining_seconds: Math.floor(expiresAt.diff(DateTime.now(), 'seconds').seconds),
        },
      })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to grant authorization',
      })
    }
  }

  /**
   * Révoque l'autorisation
   * DELETE /api/v2/streamer/campaigns/:campaignId/authorize
   */
  async revoke({ auth, params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    try {
      await this.authorizationService.revokeAuthorization(params.campaignId, streamer.id)

      return response.ok({ message: 'Authorization revoked' })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to revoke authorization',
      })
    }
  }

  /**
   * Récupère le statut d'autorisation pour toutes les campagnes
   * GET /api/v2/streamer/campaigns/authorization-status
   */
  async status({ auth, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    const memberships = await this.membershipRepository.findActiveByStreamer(streamer.id)

    const statuses = memberships.map((membership) => ({
      campaign_id: membership.campaignId,
      campaign_name: membership.campaign.name,
      is_authorized: membership.isPollAuthorizationActive,
      expires_at: membership.pollAuthorizationExpiresAt?.toISO() || null,
      remaining_seconds: membership.authorizationRemainingSeconds,
    }))

    return response.ok({ data: statuses })
  }
}
