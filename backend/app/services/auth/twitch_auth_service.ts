import env from '#start/env'

interface TwitchTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string | string[] // Twitch peut renvoyer une chaîne ou un tableau
  token_type: string
}

interface TwitchUserResponse {
  data: Array<{
    id: string
    login: string
    display_name: string
    email?: string
    profile_image_url: string
    broadcaster_type: string
  }>
}

export default class TwitchAuthService {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string
  private readonly scopes = [
    'channel:manage:polls',
    'channel:read:polls',
    'user:read:email',
    'chat:read',
    'chat:edit',
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
   * Échange le code d'autorisation contre des tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string
    refresh_token: string
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
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to exchange code for tokens: ${error}`)
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
    display_name: string
    email?: string
    profile_image_url: string
    broadcaster_type: string
  }> {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get user info: ${error}`)
    }

    const data = (await response.json()) as TwitchUserResponse

    if (!data.data || data.data.length === 0) {
      throw new Error('No user data returned from Twitch')
    }

    const user = data.data[0]

    return {
      id: user.id,
      login: user.login,
      display_name: user.display_name,
      email: user.email,
      profile_image_url: user.profile_image_url,
      broadcaster_type: user.broadcaster_type || '',
    }
  }

  /**
   * Refresh un access token expiré
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    refresh_token: string
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
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh token: ${error}`)
    }

    const data = (await response.json()) as TwitchTokenResponse

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
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
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to revoke token: ${error}`)
    }
  }

  /**
   * Vérifie si un ID Twitch est un MJ
   */
  isMJ(twitchUserId: string): boolean {
    const mjIds = env.get('MJ_TWITCH_IDS', '').split(',').filter(Boolean)
    return mjIds.includes(twitchUserId)
  }
}
