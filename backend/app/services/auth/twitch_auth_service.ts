import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

// Timeout pour les appels API Twitch (10 secondes)
const FETCH_TIMEOUT_MS = 10000

/**
 * Crée un signal d'abort avec timeout pour les appels fetch
 */
function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

interface TwitchTokenResponse {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  access_token: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  refresh_token: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  expires_in: number
  scope: string | string[] // Twitch peut renvoyer une chaîne ou un tableau
  // eslint-disable-next-line @typescript-eslint/naming-convention
  token_type: string
}

interface TwitchUserResponse {
  data: Array<{
    id: string
    login: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    display_name: string
    email?: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    profile_image_url: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    broadcaster_type: string
  }>
}

class TwitchAuthService {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string
  private readonly scopes = [
    // Core - Sondages
    'channel:manage:polls',
    'channel:read:polls',
    // Core - Utilisateur
    'user:read:email',
    // Core - Chat IRC
    'chat:read',
    'chat:edit',
    // Channel Points (récompenses personnalisées)
    'channel:read:redemptions',
    'channel:manage:redemptions',
    // Monétisation
    'bits:read',
    'channel:read:subscriptions',
    // Événements & Engagement
    'channel:read:hype_train',
    'channel:read:goals',
    // Statistiques viewers
    'moderator:read:chatters',
    'moderator:read:followers',
  ]

  constructor() {
    this.clientId = env.get('TWITCH_CLIENT_ID') || ''
    this.clientSecret = env.get('TWITCH_CLIENT_SECRET') || ''
    this.redirectUri = env.get('TWITCH_REDIRECT_URI') || ''
  }

  /**
   * Génère l'URL de redirection OAuth Twitch
   */
  getAuthorizationUrl(state: string, forceVerify: boolean = true): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
    })

    // Force la revalidation des permissions pour s'assurer que l'utilisateur
    // voit tous les scopes requis, même s'il a déjà autorisé l'app
    if (forceVerify) {
      params.append('force_verify', 'true')
    }

    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`
  }

  /**
   * Retourne les scopes requis par l'application
   */
  getRequiredScopes(): string[] {
    return [...this.scopes]
  }

  /**
   * Vérifie si les scopes donnés contiennent tous les scopes requis
   */
  hasAllRequiredScopes(userScopes: string[]): boolean {
    return this.scopes.every((scope) => userScopes.includes(scope))
  }

  /**
   * Retourne la liste des scopes manquants pour un utilisateur
   */
  getMissingScopes(userScopes: string[]): string[] {
    return this.scopes.filter((scope) => !userScopes.includes(scope))
  }

  /**
   * Échange le code d'autorisation contre des tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    // eslint-disable-next-line @typescript-eslint/naming-convention
    access_token: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    refresh_token: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    expires_in: number
    scope: string[]
  }> {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
      signal: createTimeoutSignal(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ status: response.status, error: errorText }, 'Twitch token exchange failed')
      throw new Error('Failed to exchange authorization code')
    }

    const data = (await response.json()) as TwitchTokenResponse

    return {
      access_token: data.access_token,

      refresh_token: data.refresh_token,

      expires_in: data.expires_in,
      scope: Array.isArray(data.scope) ? data.scope : data.scope.split(' '),
    }
  }

  /**
   * Récupère les informations de l'utilisateur Twitch
   */
  async getUserInfo(accessToken: string): Promise<{
    id: string
    login: string
    displayName: string
    email?: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    profile_image_url: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    broadcaster_type: string
  }> {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
      },
      signal: createTimeoutSignal(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ status: response.status, error: errorText }, 'Twitch get user info failed')
      throw new Error('Failed to get user info from Twitch')
    }

    const data = (await response.json()) as TwitchUserResponse

    if (!data.data || data.data.length === 0) {
      throw new Error('No user data returned from Twitch')
    }

    const user = data.data[0]

    return {
      id: user.id,
      login: user.login,
      displayName: user.display_name || user.login, // Fallback sur login si display_name est vide
      email: user.email,

      profile_image_url: user.profile_image_url,

      broadcaster_type: user.broadcaster_type || '',
    }
  }

  /**
   * Refresh un access token expiré
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    // eslint-disable-next-line @typescript-eslint/naming-convention
    access_token: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    refresh_token: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    expires_in: number
  }> {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      signal: createTimeoutSignal(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ status: response.status, error: errorText }, 'Twitch token refresh failed')
      throw new Error('Failed to refresh access token')
    }

    const data = (await response.json()) as TwitchTokenResponse

    return {
      access_token: data.access_token,

      refresh_token: data.refresh_token,

      expires_in: data.expires_in,
    }
  }

  /**
   * Valide un access token auprès de Twitch
   * @returns true si le token est valide, false sinon
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        method: 'GET',
        headers: {
          Authorization: `OAuth ${accessToken}`,
        },
      })

      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Révoque un token côté Twitch
   */
  async revokeToken(token: string): Promise<void> {
    const response = await fetch('https://id.twitch.tv/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        token,
      }),
      signal: createTimeoutSignal(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ status: response.status, error: errorText }, 'Twitch token revoke failed')
      throw new Error('Failed to revoke token')
    }
  }
}

export { TwitchAuthService, TwitchAuthService as twitchAuthService }
