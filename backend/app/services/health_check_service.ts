import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import env from '#start/env'
import { redisService as RedisService } from './cache/redis_service.js'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import { UserRepository } from '#repositories/user_repository'
import { TokenRefreshService } from '#services/auth/token_refresh_service'

export interface HealthCheckResult {
  healthy: boolean
  services: {
    twitchApi: {
      available: boolean
      error?: string
    }
    redis: {
      connected: boolean
      error?: string
    }
    tokens: {
      valid: boolean
      invalidStreamers?: Array<{ id: string; displayName: string; error: string }>
      error?: string
    }
    websocket: {
      ready: boolean
      error?: string
    }
  }
}

/**
 * Service pour vérifier la santé du système avant de lancer un poll
 */
@inject()
export class HealthCheckService {
  constructor(
    private campaignMembershipRepository: CampaignMembershipRepository,
    private userRepository: UserRepository
  ) {}

  // Instancier les services
  private redisService = new RedisService()
  private tokenRefreshService = new TokenRefreshService()

  /**
   * Effectue un health check complet avant le lancement d'un poll
   */
  async performHealthCheck(campaignId: string, userId: string): Promise<HealthCheckResult> {
    logger.info({ campaignId, userId }, 'Starting health check for campaign')

    const result: HealthCheckResult = {
      healthy: true,
      services: {
        twitchApi: { available: false },
        redis: { connected: false },
        tokens: { valid: false },
        websocket: { ready: false },
      },
    }

    // 1. Vérifier l'API Twitch
    try {
      await this.checkTwitchApi()
      result.services.twitchApi.available = true
      logger.info('✅ Twitch API check: OK')
    } catch (error) {
      result.healthy = false
      result.services.twitchApi.error =
        error instanceof Error ? error.message : 'Twitch API unavailable'
      logger.error({ error }, '❌ Twitch API check: FAILED')
    }

    // 2. Vérifier Redis
    try {
      await this.checkRedis()
      result.services.redis.connected = true
      logger.info('✅ Redis check: OK')
    } catch (error) {
      result.healthy = false
      result.services.redis.error =
        error instanceof Error ? error.message : 'Redis connection failed'
      logger.error({ error }, '❌ Redis check: FAILED')
    }

    // 3. Vérifier les tokens des streamers de la campagne + token MJ
    try {
      const invalidStreamers = await this.checkTokens(campaignId, userId)
      if (invalidStreamers.length === 0) {
        result.services.tokens.valid = true
        logger.info('✅ Tokens check: OK - All tokens valid')
      } else {
        result.healthy = false
        result.services.tokens.valid = false
        result.services.tokens.invalidStreamers = invalidStreamers
        logger.error({ invalidStreamers }, '❌ Tokens check: FAILED')
      }
    } catch (error) {
      result.healthy = false
      result.services.tokens.error =
        error instanceof Error ? error.message : 'Token validation failed'
      logger.error({ error }, '❌ Tokens check: ERROR')
    }

    // 4. Vérifier que le serveur WebSocket (Transmit) est prêt
    try {
      this.checkWebSocket()
      result.services.websocket.ready = true
      logger.info('✅ WebSocket check: OK')
    } catch (error) {
      result.healthy = false
      result.services.websocket.error =
        error instanceof Error ? error.message : 'WebSocket server not ready'
      logger.error({ error }, '❌ WebSocket check: FAILED')
    }

    logger.info(
      {
        campaignId,
        healthy: result.healthy,
        twitchApi: result.services.twitchApi.available,
        redis: result.services.redis.connected,
        tokens: result.services.tokens.valid,
        websocket: result.services.websocket.ready,
      },
      'Health check completed'
    )

    return result
  }

  /**
   * Ping l'API Twitch pour vérifier sa disponibilité
   */
  private async checkTwitchApi(): Promise<void> {
    // Utiliser une route simple de l'API Twitch pour tester la connectivité
    // On peut utiliser GET /users avec un ID Twitch connu
    const testUserId = env.get('TWITCH_TEST_USER_ID', '141981764') // Twitch's own user ID as default
    const clientId = env.get('TWITCH_CLIENT_ID')
    const clientSecret = env.get('TWITCH_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('Twitch credentials not configured')
    }

    // Obtenir un token App Access (pas besoin de token utilisateur pour ce test)
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get Twitch app token: ${tokenResponse.status}`)
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const tokenData = (await tokenResponse.json()) as { access_token: string }
    const appAccessToken = tokenData['access_token']

    // Tester l'API Twitch
    const apiResponse = await fetch(`https://api.twitch.tv/helix/users?id=${testUserId}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${appAccessToken}`,
      },
    })

    if (!apiResponse.ok) {
      throw new Error(`Twitch API returned status ${apiResponse.status}`)
    }
  }

  /**
   * Vérifie que Redis répond
   */
  private async checkRedis(): Promise<void> {
    await this.redisService.ping()
  }

  /**
   * Vérifie que tous les tokens des streamers de la campagne sont valides + token du MJ
   */
  private async checkTokens(
    campaignId: string,
    userId: string
  ): Promise<Array<{ id: string; displayName: string; error: string }>> {
    const invalidStreamers: Array<{ id: string; displayName: string; error: string }> = []
    const checkedStreamerIds = new Set<string>() // Pour éviter les doublons

    // 1. Vérifier d'abord le token du MJ (s'il a un profil streamer)
    try {
      const mjUser = await this.userRepository.findByIdWithStreamer(userId)
      if (mjUser?.streamer) {
        const streamer = mjUser.streamer
        checkedStreamerIds.add(streamer.id) // Marquer comme vérifié

        try {
          const accessToken = await streamer.getDecryptedAccessToken()
          const refreshToken = await streamer.getDecryptedRefreshToken()

          if (!accessToken || !refreshToken) {
            invalidStreamers.push({
              id: streamer.id,
              displayName: streamer.twitchDisplayName,
              error: 'Missing access or refresh token',
            })
          } else {
            // Tester le token avec l'API Twitch
            const response = await fetch('https://id.twitch.tv/oauth2/validate', {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            })

            if (!response.ok) {
              // Token invalid - attempt auto-refresh
              logger.info(
                { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
                '[HealthCheck] MJ token invalid, attempting refresh...'
              )
              const refreshSuccess = await this.tokenRefreshService.refreshStreamerToken(streamer)
              if (!refreshSuccess) {
                invalidStreamers.push({
                  id: streamer.id,
                  displayName: streamer.twitchDisplayName,
                  error: 'Token expired or invalid (refresh failed)',
                })
              } else {
                logger.info(
                  { streamerId: streamer.id },
                  '[HealthCheck] MJ token refreshed successfully'
                )
              }
            }
          }
        } catch (error) {
          invalidStreamers.push({
            id: streamer.id,
            displayName: streamer.twitchDisplayName,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    } catch (error) {
      logger.warn({ userId, error }, 'Failed to check MJ token')
    }

    // 2. Récupérer tous les membres actifs de la campagne (avec streamers préchargés)
    const memberships = await this.campaignMembershipRepository.findActiveByCampaign(campaignId)

    // Vérifier chaque token de streamer (sauf ceux déjà vérifiés)
    for (const membership of memberships) {
      const streamer = membership.streamer
      if (!streamer) continue

      // Éviter de vérifier deux fois le même streamer
      if (checkedStreamerIds.has(streamer.id)) {
        logger.debug(
          { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
          'Skipping already checked streamer'
        )
        continue
      }

      checkedStreamerIds.add(streamer.id)

      try {
        const accessToken = await streamer.getDecryptedAccessToken()
        const refreshToken = await streamer.getDecryptedRefreshToken()

        if (!accessToken || !refreshToken) {
          invalidStreamers.push({
            id: streamer.id,
            displayName: streamer.twitchDisplayName,
            error: 'Missing access or refresh token',
          })
          continue
        }

        // Tester le token avec l'API Twitch
        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          // Token invalid - attempt auto-refresh
          logger.info(
            { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
            '[HealthCheck] Streamer token invalid, attempting refresh...'
          )
          const refreshSuccess = await this.tokenRefreshService.refreshStreamerToken(streamer)
          if (!refreshSuccess) {
            invalidStreamers.push({
              id: streamer.id,
              displayName: streamer.twitchDisplayName,
              error: 'Token expired or invalid (refresh failed)',
            })
          } else {
            logger.info(
              { streamerId: streamer.id },
              '[HealthCheck] Streamer token refreshed successfully'
            )
          }
        }
      } catch (error) {
        invalidStreamers.push({
          id: streamer.id,
          displayName: streamer.twitchDisplayName,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return invalidStreamers
  }

  /**
   * Vérifie que le serveur WebSocket (Transmit) est prêt
   */
  private checkWebSocket(): void {
    // Transmit est importé et disponible s'il est configuré
    // On vérifie simplement qu'il est bien chargé
    if (!transmit) {
      throw new Error('Transmit WebSocket service not initialized')
    }

    // On pourrait aussi vérifier que le serveur HTTP est démarré
    // mais Transmit le gère automatiquement avec AdonisJS
  }
}

export default HealthCheckService
export { HealthCheckService as healthCheckService }
