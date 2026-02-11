import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import type { AuthorizationService } from '#services/campaigns/authorization_service'
import { StreamerRepository } from '#repositories/streamer_repository'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import { twitchAuthService as TwitchAuthService } from '#services/auth/twitch_auth_service'

// Regex pour valider un UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Valide qu'une chaîne est un UUID v4 valide
 */
function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

/**
 * Contrôleur pour la gestion des autorisations de sondages (Streamer)
 */
@inject()
export default class AuthorizationController {
  private _authorizationService!: AuthorizationService

  constructor(
    private streamerRepository: StreamerRepository,
    private membershipRepository: CampaignMembershipRepository,
    private twitchAuthService: TwitchAuthService
  ) {}

  /**
   * Résout AuthorizationService depuis le container IoC
   * pour garantir l'injection du TwitchEventSubService dans toute la chaîne
   */
  private async getAuthorizationService(): Promise<AuthorizationService> {
    if (!this._authorizationService) {
      this._authorizationService = await app.container.make('authorizationService')
    }
    return this._authorizationService
  }

  /**
   * Accorde l'autorisation pour 12 heures
   * POST /api/v2/streamer/campaigns/:campaignId/authorize
   */
  async grant({ auth, params, response }: HttpContext) {
    // Valider le format UUID du campaignId
    if (!isValidUuid(params.campaignId)) {
      return response.badRequest({ error: 'Invalid campaign ID format' })
    }

    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    try {
      const authService = await this.getAuthorizationService()
      const expiresAt = await authService.grantAuthorization(params.campaignId, streamer.id)

      return response.ok({
        message: 'Authorization granted for 12 hours',
        data: {
          expires_at: expiresAt.toISO(),
          remainingSeconds: Math.floor(expiresAt.diff(DateTime.now(), 'seconds').seconds),
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
    // Valider le format UUID du campaignId
    if (!isValidUuid(params.campaignId)) {
      return response.badRequest({ error: 'Invalid campaign ID format' })
    }

    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    try {
      const authService = await this.getAuthorizationService()
      await authService.revokeAuthorization(params.campaignId, streamer.id)

      return response.ok({ message: 'Authorization revoked' })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to revoke authorization',
      })
    }
  }

  /**
   * Récupère le statut d'autorisation pour toutes les campagnes
   * GET /streamer/campaigns/authorization-status
   */
  async status({ auth, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer profile not found' })
    }

    const memberships = await this.membershipRepository.findActiveByStreamer(streamer.id)

    /* eslint-disable camelcase -- API response uses snake_case for frontend compatibility */
    const statuses = memberships.map((membership) => ({
      campaign_id: membership.campaignId,
      campaign_name: membership.campaign.name,
      is_owner: membership.campaign.ownerId === streamer.userId,
      is_authorized: membership.isPollAuthorizationActive,
      expires_at: membership.pollAuthorizationExpiresAt?.toISO() || null,
      remaining_seconds: membership.authorizationRemainingSeconds,
    }))
    /* eslint-enable camelcase */

    return response.ok({ data: statuses })
  }

  /**
   * Révoque l'accès Twitch du streamer et désactive son compte
   * POST /streamer/revoke
   */
  async revokeAccess({ auth, response }: HttpContext) {
    const streamer = await this.streamerRepository.findByUserId(auth.user!.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer not found' })
    }

    try {
      // Récupérer le token non chiffré
      const accessToken = await streamer.getDecryptedAccessToken()

      // Révoquer le token côté Twitch (utiliser le service injecté)
      await this.twitchAuthService.revokeToken(accessToken)

      // Désactiver le streamer
      streamer.isActive = false
      await streamer.save()

      logger.info(`Access revoked for streamer ${streamer.id}`)

      return response.ok({
        message: 'Access revoked successfully',
      })
    } catch (error) {
      logger.error(
        `Failed to revoke access for streamer ${streamer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return response.internalServerError({
        error: 'Failed to revoke access',
      })
    }
  }
}
