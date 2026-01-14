import env from '#start/env'
import { twitchAuthService as TwitchAuthService } from '#services/auth/twitch_auth_service'
import { RetryUtility } from '#services/resilience/retry_utility'
import { RetryPolicies } from '#services/resilience/types'
import type { HttpCallResult, RetryResult, RetryContext } from '#services/resilience/types'

interface TwitchPollChoice {
  id: string
  title: string
  votes?: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  channel_points_votes?: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  bits_votes?: number
}

// Twitch API returns snake_case
interface TwitchPoll {
  id: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  broadcaster_id: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  broadcaster_name: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  broadcaster_login: string
  title: string
  choices: TwitchPollChoice[]
  // eslint-disable-next-line @typescript-eslint/naming-convention
  channel_points_voting_enabled: boolean
  // eslint-disable-next-line @typescript-eslint/naming-convention
  channel_points_per_vote: number
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'ARCHIVED' | 'MODERATED' | 'INVALID'
  duration: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  started_at: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ended_at?: string
}

interface TwitchPollResponse {
  data: TwitchPoll[]
}

class TwitchPollService {
  private readonly clientId: string
  private readonly authService: TwitchAuthService
  private readonly retryUtility: RetryUtility

  constructor() {
    this.clientId = env.get('TWITCH_CLIENT_ID') || ''
    this.authService = new TwitchAuthService()
    this.retryUtility = new RetryUtility()
  }

  /**
   * Crée un poll sur une chaîne Twitch
   */
  async createPoll(
    broadcasterUserId: string,
    accessToken: string,
    title: string,
    choices: string[],
    durationSeconds: number,
    _channelPointsEnabled: boolean = false,
    channelPointsPerVote: number | null = null
  ): Promise<{
    id: string
    status: string
  }> {
    // Valider et tronquer les paramètres selon les limites Twitch
    const sanitizedTitle = title.slice(0, 60)
    const sanitizedChoices = choices.map((choice) => ({
      title: choice.slice(0, 25),
    }))

    // Twitch API requires snake_case parameters
    const body: Record<string, unknown> = {
      broadcaster_id: broadcasterUserId,
      title: sanitizedTitle,
      choices: sanitizedChoices,
      duration: Math.min(Math.max(durationSeconds, 15), 1800),
    }

    // Ajouter les points de chaîne si un montant positif est spécifié
    // On se base uniquement sur channelPointsPerVote > 0 pour être robuste
    // (channelPointsEnabled est ignoré - le montant est la source de vérité)
    if (channelPointsPerVote && channelPointsPerVote > 0) {
      body.channel_points_voting_enabled = true
      body.channel_points_per_vote = Math.min(Math.max(channelPointsPerVote, 1), 1000000)
    }

    const response = await fetch('https://api.twitch.tv/helix/polls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()

      // Si le token est expiré (401), on ne throw pas immédiatement
      // Le service appelant devra gérer le refresh
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }

      throw new Error(`Failed to create poll: ${error}`)
    }

    const data = (await response.json()) as TwitchPollResponse

    if (!data.data || data.data.length === 0) {
      throw new Error('No poll data returned from Twitch')
    }

    const poll = data.data[0]

    return {
      id: poll.id,
      status: poll.status,
    }
  }

  /**
   * Récupère l'état d'un poll Twitch
   */
  async getPoll(
    broadcasterId: string,
    pollId: string,
    accessToken: string
  ): Promise<{
    id: string
    status: string
    choices: Array<{
      id: string
      title: string
      votes: number
    }>
  }> {
    const params = new URLSearchParams({
      broadcaster_id: broadcasterId,
      id: pollId,
    })

    const response = await fetch(`https://api.twitch.tv/helix/polls?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
      },
    })

    if (!response.ok) {
      const error = await response.text()

      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }

      throw new Error(`Failed to get poll: ${error}`)
    }

    const data = (await response.json()) as TwitchPollResponse

    if (!data.data || data.data.length === 0) {
      throw new Error('Poll not found')
    }

    const poll = data.data[0]

    return {
      id: poll.id,
      status: poll.status,
      choices: poll.choices.map((choice) => ({
        id: choice.id,
        title: choice.title,
        votes: (choice.votes || 0) + (choice.channel_points_votes || 0) + (choice.bits_votes || 0),
      })),
    }
  }

  /**
   * Termine un poll manuellement
   */
  async endPoll(
    broadcasterId: string,
    pollId: string,
    accessToken: string,
    status: 'TERMINATED' | 'ARCHIVED'
  ): Promise<void> {
    const response = await fetch('https://api.twitch.tv/helix/polls', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        id: pollId,
        status,
      }),
    })

    if (!response.ok) {
      const error = await response.text()

      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }

      throw new Error(`Failed to end poll: ${error}`)
    }
  }

  /**
   * Wrapper pour gérer automatiquement le refresh de token
   */
  async withTokenRefresh<T>(
    operation: (accessToken: string) => Promise<T>,
    getAccessToken: () => Promise<string>,
    refreshToken: string,
    onTokenRefreshed: (newAccessToken: string, newRefreshToken: string) => Promise<void>
  ): Promise<T> {
    try {
      const accessToken = await getAccessToken()
      return await operation(accessToken)
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        // Refresh le token et réessaye
        const tokens = await this.authService.refreshAccessToken(refreshToken)
        await onTokenRefreshed(tokens.access_token, tokens.refresh_token)
        return await operation(tokens.access_token)
      }
      throw error
    }
  }

  /**
   * Crée un poll avec retry automatique sur erreurs 429/5xx
   * Utilise le système de retry résilient
   */
  async createPollWithRetry(
    broadcasterUserId: string,
    accessToken: string,
    title: string,
    choices: string[],
    durationSeconds: number,
    _channelPointsEnabled: boolean = false,
    channelPointsPerVote: number | null = null,
    context?: Partial<RetryContext>
  ): Promise<RetryResult<{ id: string; status: string }>> {
    // Valider et tronquer les paramètres selon les limites Twitch
    const sanitizedTitle = title.slice(0, 60)
    const sanitizedChoices = choices.map((choice) => ({
      title: choice.slice(0, 25),
    }))
    const sanitizedDuration = Math.min(Math.max(durationSeconds, 15), 1800)

    const operation = async (): Promise<HttpCallResult<{ id: string; status: string }>> => {
      const body: Record<string, unknown> = {
        broadcaster_id: broadcasterUserId,
        title: sanitizedTitle,
        choices: sanitizedChoices,
        duration: sanitizedDuration,
      }

      // Ajouter les points de chaîne si un montant positif est spécifié
      // On se base uniquement sur channelPointsPerVote > 0 pour être robuste
      if (channelPointsPerVote && channelPointsPerVote > 0) {
        body.channel_points_voting_enabled = true
        body.channel_points_per_vote = Math.min(Math.max(channelPointsPerVote, 1), 1000000)
      }

      const response = await fetch('https://api.twitch.tv/helix/polls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      })

      // Extract Retry-After header for 429 responses
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

      const data = (await response.json()) as TwitchPollResponse

      if (!data.data || data.data.length === 0) {
        return {
          success: false,
          statusCode: response.status,
          error: new Error('No poll data returned from Twitch'),
        }
      }

      return {
        success: true,
        statusCode: response.status,
        data: { id: data.data[0].id, status: data.data[0].status },
      }
    }

    return this.retryUtility.execute(operation, {
      ...RetryPolicies.TWITCH_POLLS,
      context: {
        service: 'TwitchPollService',
        operation: 'createPoll',
        metadata: { broadcasterUserId, title },
        ...context,
      },
    })
  }

  /**
   * Récupère l'état d'un poll avec retry automatique
   */
  async getPollWithRetry(
    broadcasterId: string,
    pollId: string,
    accessToken: string,
    context?: Partial<RetryContext>
  ): Promise<
    RetryResult<{
      id: string
      status: string
      choices: Array<{ id: string; title: string; votes: number }>
    }>
  > {
    const operation = async (): Promise<
      HttpCallResult<{
        id: string
        status: string
        choices: Array<{ id: string; title: string; votes: number }>
      }>
    > => {
      const params = new URLSearchParams({
        broadcaster_id: broadcasterId,
        id: pollId,
      })

      const response = await fetch(`https://api.twitch.tv/helix/polls?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
        },
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

      const data = (await response.json()) as TwitchPollResponse

      if (!data.data || data.data.length === 0) {
        return {
          success: false,
          statusCode: 404,
          error: new Error('Poll not found'),
        }
      }

      const poll = data.data[0]
      return {
        success: true,
        statusCode: response.status,
        data: {
          id: poll.id,
          status: poll.status,
          choices: poll.choices.map((choice) => ({
            id: choice.id,
            title: choice.title,
            votes:
              (choice.votes || 0) + (choice.channel_points_votes || 0) + (choice.bits_votes || 0),
          })),
        },
      }
    }

    return this.retryUtility.execute(operation, {
      ...RetryPolicies.TWITCH_POLLS,
      context: {
        service: 'TwitchPollService',
        operation: 'getPoll',
        metadata: { broadcasterId, pollId },
        ...context,
      },
    })
  }

  /**
   * Termine un poll avec retry automatique
   */
  async endPollWithRetry(
    broadcasterId: string,
    pollId: string,
    accessToken: string,
    status: 'TERMINATED' | 'ARCHIVED',
    context?: Partial<RetryContext>
  ): Promise<RetryResult<void>> {
    const operation = async (): Promise<HttpCallResult<void>> => {
      const response = await fetch('https://api.twitch.tv/helix/polls', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broadcaster_id: broadcasterId,
          id: pollId,
          status,
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

      return {
        success: true,
        statusCode: response.status,
      }
    }

    return this.retryUtility.execute(operation, {
      ...RetryPolicies.TWITCH_POLLS,
      context: {
        service: 'TwitchPollService',
        operation: 'endPoll',
        metadata: { broadcasterId, pollId, status },
        ...context,
      },
    })
  }

  /**
   * Wrapper combinant token refresh et retry
   * Gère le 401 via refresh, puis les 429/5xx via retry
   */
  async withTokenRefreshAndRetry<T>(
    operation: (accessToken: string) => Promise<HttpCallResult<T>>,
    getAccessToken: () => Promise<string>,
    refreshToken: string,
    onTokenRefreshed: (newAccessToken: string, newRefreshToken: string) => Promise<void>,
    context?: Partial<RetryContext>
  ): Promise<RetryResult<T>> {
    let currentAccessToken = await getAccessToken()
    let tokenRefreshed = false

    const wrappedOperation = async (): Promise<HttpCallResult<T>> => {
      const result = await operation(currentAccessToken)

      // Handle 401 with token refresh (not counted as a retry)
      if (result.statusCode === 401 && !tokenRefreshed) {
        try {
          const tokens = await this.authService.refreshAccessToken(refreshToken)
          await onTokenRefreshed(tokens.access_token, tokens.refresh_token)
          currentAccessToken = tokens.access_token
          tokenRefreshed = true

          // Retry with new token
          return operation(currentAccessToken)
        } catch {
          // Token refresh failed, return the 401 error
          return result
        }
      }

      return result
    }

    return this.retryUtility.execute(wrappedOperation, {
      ...RetryPolicies.TWITCH_POLLS,
      context: {
        service: 'TwitchPollService',
        operation: 'withTokenRefreshAndRetry',
        ...context,
      },
    })
  }
}

export { TwitchPollService as twitchPollService }
