import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

interface TwitchChannel {
  id: string
  broadcasterLogin: string
  displayName: string
  thumbnailUrl: string
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

class TwitchApiService {
  private appAccessToken: string | null = null
  private tokenExpiry: number = 0

  /**
   * Obtient un App Access Token de Twitch
   * @returns Token d'application valide
   */
  async getAppAccessToken(): Promise<string> {
    // Si on a déjà un token valide, le retourner
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
          clientId: clientId,
          clientSecret: clientSecret,
          grantType: 'client_credentials',
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

      return this.appAccessToken
    } catch (error) {
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
      displayName: string
      // eslint-disable-next-line @typescript-eslint/naming-convention
      profile_image_url: string
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

      return data.data.map((channel: TwitchChannel) => ({
        id: channel.id,
        login: channel.broadcasterLogin,
        displayName: channel.displayName,

        profile_image_url: channel.thumbnailUrl,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
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
}

export { TwitchApiService as twitchApiService }
