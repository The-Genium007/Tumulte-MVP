import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { Sentry } from '#config/sentry'
import { RetryUtility } from '#services/resilience/retry_utility'
import { RetryPolicies } from '#services/resilience/types'
import type { HttpCallResult, RetryResult, RetryContext } from '#services/resilience/types'

interface TwitchChannel {
  id: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  broadcaster_login: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  display_name: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  thumbnail_url: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  broadcaster_type?: string
}

interface TwitchUserInfo {
  id: string
  login: string
  displayName: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  profile_image_url: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  broadcaster_type: string
}

interface TwitchStream {
  id: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  user_id: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  user_login: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  user_name: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  game_name: string
  title: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  viewer_count: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  started_at: string
}

class TwitchApiService {
  private appAccessToken: string | null = null
  private tokenExpiry: number = 0
  private readonly retryUtility: RetryUtility

  constructor() {
    this.retryUtility = new RetryUtility()
  }

  /**
   * Obtient un App Access Token de Twitch
   * @returns Token d'application valide
   */
  async getAppAccessToken(): Promise<string> {
    // Si on a déjà un token valide, le retourner (sans log pour éviter le spam)
    if (this.appAccessToken && Date.now() < this.tokenExpiry) {
      return this.appAccessToken
    }

    try {
      const clientId = env.get('TWITCH_CLIENT_ID')
      const clientSecret = env.get('TWITCH_CLIENT_SECRET')

      if (!clientId || !clientSecret) {
        throw new Error('Missing Twitch credentials in environment')
      }

      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,

          client_secret: clientSecret,

          grant_type: 'client_credentials',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get app access token: ${response.status}`)
      }

      const data = (await response.json()) as {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        access_token: string
        // eslint-disable-next-line @typescript-eslint/naming-convention
        expires_in: number
      }

      this.appAccessToken = data.access_token
      // Expire 5 minutes avant la vraie expiration pour être sûr
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000

      // Log uniquement lors d'un VRAI renouvellement de token
      logger.info({
        event: 'twitch_app_token_renewed',
        expiresIn: data.expires_in,
        expiresAt: new Date(this.tokenExpiry).toISOString(),
      })

      return this.appAccessToken
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: 'twitch_api',
          operation: 'getAppAccessToken',
        },
      })
      logger.error('Failed to get Twitch app access token:', error)
      throw error
    }
  }

  /**
   * Recherche des utilisateurs Twitch via l'API Helix
   * @param query - Nom ou login à rechercher
   * @param accessToken - Token OAuth du MJ ou app token
   * @returns Liste des chaînes trouvées
   */
  async searchUsers(
    query: string,
    accessToken: string
  ): Promise<
    Array<{
      id: string
      login: string
      // eslint-disable-next-line @typescript-eslint/naming-convention
      display_name: string
      // eslint-disable-next-line @typescript-eslint/naming-convention
      profile_image_url: string
      // eslint-disable-next-line @typescript-eslint/naming-convention
      broadcaster_type?: string
    }>
  > {
    try {
      const clientId = env.get('TWITCH_CLIENT_ID')

      if (!clientId) {
        throw new Error('Missing Twitch Client ID in environment')
      }

      const response = await fetch(
        `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=20`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': clientId,
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`Twitch API error: ${response.status} - ${errorText}`)
        throw new Error(`Twitch API error: ${response.status}`)
      }

      const data = (await response.json()) as { data: TwitchChannel[] }

      // Récupérer les vraies photos de profil via l'API Get Users
      const userIds = data.data.map((channel) => channel.id)
      const usersData = await this.getUsersByIds(userIds, accessToken)

      // Créer un map des photos de profil par user ID
      const profileImages = new Map(usersData.map((user) => [user.id, user.profile_image_url]))

      return data.data.map((channel: TwitchChannel) => ({
        id: channel.id,
        login: channel.broadcaster_login,
        display_name: channel.display_name,
        profile_image_url: profileImages.get(channel.id) || '',
        broadcaster_type: channel.broadcaster_type,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      Sentry.captureException(error, {
        tags: {
          service: 'twitch_api',
          operation: 'searchUsers',
        },
        extra: { query },
      })
      logger.error(`Failed to search Twitch users: ${errorMessage}`)
      throw error
    }
  }

  /**
   * Récupère des informations utilisateur pour une liste d'IDs
   */
  async getUsersByIds(ids: string[], accessToken: string): Promise<TwitchUserInfo[]> {
    if (ids.length === 0) {
      return []
    }

    const clientId = env.get('TWITCH_CLIENT_ID')

    if (!clientId) {
      throw new Error('Missing Twitch Client ID in environment')
    }

    const results: TwitchUserInfo[] = []
    const chunkSize = 100
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize)
      const params = chunk.map((id) => `id=${encodeURIComponent(id)}`).join('&')

      const response = await fetch(`https://api.twitch.tv/helix/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': clientId,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`Twitch API error (users): ${response.status} - ${errorText}`)
        throw new Error(`Twitch API error: ${response.status}`)
      }

      const data = (await response.json()) as { data: TwitchUserInfo[] }
      results.push(...data.data)
    }

    return results
  }

  /**
   * Récupère les streams en cours pour une liste d'IDs utilisateur
   * @param userIds - Liste des IDs utilisateur Twitch
   * @param accessToken - Token d'accès (app ou user)
   * @returns Map des user_id -> stream info (seulement ceux qui sont live)
   */
  async getStreamsByUserIds(
    userIds: string[],
    accessToken: string
  ): Promise<Map<string, TwitchStream>> {
    if (userIds.length === 0) {
      return new Map()
    }

    const clientId = env.get('TWITCH_CLIENT_ID')

    if (!clientId) {
      throw new Error('Missing Twitch Client ID in environment')
    }

    const results = new Map<string, TwitchStream>()
    const chunkSize = 100 // Twitch API limite à 100 IDs par requête

    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize)
      const params = chunk.map((id) => `user_id=${encodeURIComponent(id)}`).join('&')

      try {
        const url = `https://api.twitch.tv/helix/streams?${params}`

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': clientId,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          logger.error(`Twitch API error (streams): ${response.status} - ${errorText}`)
          throw new Error(`Twitch API error: ${response.status}`)
        }

        const data = (await response.json()) as { data: TwitchStream[] }

        // Log uniquement en debug pour éviter le spam
        logger.debug({
          event: 'twitch_streams_fetched',
          requestedCount: chunk.length,
          liveCount: data.data.length,
        })

        // Ajouter les streams actifs à la map
        for (const stream of data.data) {
          results.set(stream.user_id, stream)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        Sentry.captureException(error, {
          tags: {
            service: 'twitch_api',
            operation: 'getStreamsByUserIds',
          },
          extra: { userCount: userIds.length },
        })
        logger.error(`Failed to get Twitch streams: ${errorMessage}`)
        throw error
      }
    }

    return results
  }

  /**
   * Get streams with retry support
   * Returns a RetryResult containing the streams map
   */
  async getStreamsByUserIdsWithRetry(
    userIds: string[],
    accessToken: string,
    context?: Partial<RetryContext>
  ): Promise<RetryResult<Map<string, TwitchStream>>> {
    if (userIds.length === 0) {
      return {
        success: true,
        data: new Map(),
        attempts: 0,
        totalDurationMs: 0,
        circuitBreakerOpen: false,
        attemptDetails: [],
      }
    }

    const clientId = env.get('TWITCH_CLIENT_ID')
    if (!clientId) {
      return {
        success: false,
        error: new Error('Missing Twitch Client ID in environment'),
        attempts: 0,
        totalDurationMs: 0,
        circuitBreakerOpen: false,
        attemptDetails: [],
      }
    }

    const operation = async (): Promise<HttpCallResult<Map<string, TwitchStream>>> => {
      const results = new Map<string, TwitchStream>()
      const chunkSize = 100

      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize)
        const params = chunk.map((id) => `user_id=${encodeURIComponent(id)}`).join('&')
        const url = `https://api.twitch.tv/helix/streams?${params}`

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': clientId,
          },
          signal: AbortSignal.timeout(10000),
        })

        const retryAfterHeader = response.headers.get('Retry-After')
        const retryAfterSeconds = retryAfterHeader
          ? Number.parseInt(retryAfterHeader, 10)
          : undefined

        if (!response.ok) {
          const errorText = await response.text()
          return {
            success: false,
            statusCode: response.status,
            retryAfterSeconds,
            error: new Error(errorText || `HTTP ${response.status}`),
          }
        }

        const data = (await response.json()) as { data: TwitchStream[] }
        for (const stream of data.data) {
          results.set(stream.user_id, stream)
        }
      }

      return {
        success: true,
        statusCode: 200,
        data: results,
      }
    }

    return this.retryUtility.execute(operation, {
      ...RetryPolicies.TWITCH_API,
      context: {
        service: 'TwitchApiService',
        operation: 'getStreamsByUserIds',
        metadata: { userCount: userIds.length },
        ...context,
      },
    })
  }

  /**
   * Get users by IDs with retry support
   */
  async getUsersByIdsWithRetry(
    ids: string[],
    accessToken: string,
    context?: Partial<RetryContext>
  ): Promise<RetryResult<TwitchUserInfo[]>> {
    if (ids.length === 0) {
      return {
        success: true,
        data: [],
        attempts: 0,
        totalDurationMs: 0,
        circuitBreakerOpen: false,
        attemptDetails: [],
      }
    }

    const clientId = env.get('TWITCH_CLIENT_ID')
    if (!clientId) {
      return {
        success: false,
        error: new Error('Missing Twitch Client ID in environment'),
        attempts: 0,
        totalDurationMs: 0,
        circuitBreakerOpen: false,
        attemptDetails: [],
      }
    }

    const operation = async (): Promise<HttpCallResult<TwitchUserInfo[]>> => {
      const results: TwitchUserInfo[] = []
      const chunkSize = 100

      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        const params = chunk.map((id) => `id=${encodeURIComponent(id)}`).join('&')

        const response = await fetch(`https://api.twitch.tv/helix/users?${params}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': clientId,
          },
          signal: AbortSignal.timeout(10000),
        })

        const retryAfterHeader = response.headers.get('Retry-After')
        const retryAfterSeconds = retryAfterHeader
          ? Number.parseInt(retryAfterHeader, 10)
          : undefined

        if (!response.ok) {
          const errorText = await response.text()
          return {
            success: false,
            statusCode: response.status,
            retryAfterSeconds,
            error: new Error(errorText || `HTTP ${response.status}`),
          }
        }

        const data = (await response.json()) as { data: TwitchUserInfo[] }
        results.push(...data.data)
      }

      return {
        success: true,
        statusCode: 200,
        data: results,
      }
    }

    return this.retryUtility.execute(operation, {
      ...RetryPolicies.TWITCH_API,
      context: {
        service: 'TwitchApiService',
        operation: 'getUsersByIds',
        metadata: { userCount: ids.length },
        ...context,
      },
    })
  }

  /**
   * Get app access token with retry support
   */
  async getAppAccessTokenWithRetry(context?: Partial<RetryContext>): Promise<RetryResult<string>> {
    // Return cached token if still valid
    if (this.appAccessToken && Date.now() < this.tokenExpiry) {
      return {
        success: true,
        data: this.appAccessToken,
        attempts: 0,
        totalDurationMs: 0,
        circuitBreakerOpen: false,
        attemptDetails: [],
      }
    }

    const clientId = env.get('TWITCH_CLIENT_ID')
    const clientSecret = env.get('TWITCH_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: new Error('Missing Twitch credentials in environment'),
        attempts: 0,
        totalDurationMs: 0,
        circuitBreakerOpen: false,
        attemptDetails: [],
      }
    }

    const operation = async (): Promise<HttpCallResult<string>> => {
      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }),
        signal: AbortSignal.timeout(10000),
      })

      const retryAfterHeader = response.headers.get('Retry-After')
      const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          statusCode: response.status,
          retryAfterSeconds,
          error: new Error(errorText || `HTTP ${response.status}`),
        }
      }

      const data = (await response.json()) as {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        access_token: string
        // eslint-disable-next-line @typescript-eslint/naming-convention
        expires_in: number
      }

      // Cache the token
      this.appAccessToken = data.access_token
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000

      return {
        success: true,
        statusCode: response.status,
        data: data.access_token,
      }
    }

    return this.retryUtility.execute(operation, {
      ...RetryPolicies.TWITCH_API,
      context: {
        service: 'TwitchApiService',
        operation: 'getAppAccessToken',
        ...context,
      },
    })
  }
}

export default TwitchApiService
export { TwitchApiService, TwitchApiService as twitchApiService }
