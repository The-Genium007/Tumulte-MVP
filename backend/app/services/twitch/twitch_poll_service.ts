import env from '#start/env'
import { twitchAuthService as TwitchAuthService } from '#services/auth/twitch_auth_service'

interface TwitchPollChoice {
  id: string
  title: string
  votes?: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  channel_points_votes?: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  bits_votes?: number
}

interface TwitchPoll {
  id: string
  broadcasterId: string
  broadcasterName: string
  broadcasterLogin: string
  title: string
  choices: TwitchPollChoice[]
  channelPointsVotingEnabled: boolean
  channelPointsPerVote: number
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

  constructor() {
    this.clientId = env.get('TWITCH_CLIENT_ID') || ''
    this.authService = new TwitchAuthService()
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
    channelPointsEnabled: boolean = false,
    channelPointsPerVote: number | null = null
  ): Promise<{
    id: string
    status: string
  }> {
    const body: any = {
      broadcasterId: broadcasterUserId,
      title,
      choices: choices.map((choice) => ({ title: choice })),
      duration: durationSeconds,
    }

    // Ajouter les points de chaîne si activés
    if (channelPointsEnabled && channelPointsPerVote && channelPointsPerVote > 0) {
      body.channelPointsVotingEnabled = true
      body.channelPointsPerVote = channelPointsPerVote
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
      broadcasterId: broadcasterId,
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
        broadcasterId: broadcasterId,
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
}

export { TwitchPollService as twitchPollService }
