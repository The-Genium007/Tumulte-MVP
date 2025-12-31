import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { user as User } from '#models/user'
import { streamer as Streamer } from '#models/streamer'
import { twitchAuthService as TwitchAuthService } from '#services/twitch_auth_service'

export default class AuthController {
  private readonly twitchAuthService: TwitchAuthService

  constructor() {
    this.twitchAuthService = new TwitchAuthService()
  }

  /**
   * Masque une valeur sensible en logs
   */
  private maskSecret(value?: string | null): string {
    if (!value) return 'undefined'
    if (value.length <= 6) return `${value.slice(0, 2)}***`
    return `${value.slice(0, 2)}***${value.slice(-4)}`
  }

  /**
   * Redirige vers l'URL d'autorisation OAuth Twitch
   */
  async redirect({ response, session, request }: HttpContext) {
    logger.info('🚀 [AUTH] /auth/twitch/redirect route called')
    logger.info({
      message: '[AUTH] Request details',
      method: request.method(),
      url: request.url(),
      ip: request.ip(),
      headers: {
        'host': request.header('host'),
        'user-agent': request.header('user-agent'),
        'referer': request.header('referer'),
      },
    })

    // Générer un état CSRF aléatoire
    const state = randomBytes(32).toString('hex')

    // Stocker l'état en session pour validation
    session.put('oauth_state', state)

    // Forcer la revalidation des permissions (prompt=consent)
    // Cela force Twitch à demander à nouveau l'autorisation, même si l'utilisateur
    // a déjà autorisé l'application. Utile quand les scopes changent.
    session.put('force_verify', true)

    // Générer l'URL d'autorisation Twitch
    const authUrl = this.twitchAuthService.getAuthorizationUrl(state)

    logger.info({
      message: 'Redirecting to Twitch OAuth',
      redirectUri: env.get('TWITCH_REDIRECT_URI'),
      clientId: env.get('TWITCH_CLIENT_ID'),
      clientSecretMasked: this.maskSecret(env.get('TWITCH_CLIENT_SECRET')),
      frontendUrl: env.get('FRONTEND_URL'),
      nodeEnv: env.get('NODE_ENV'),
      logLevel: env.get('LOG_LEVEL'),
      sessionDriver: env.get('SESSION_DRIVER'),
    })

    return response.redirect(authUrl)
  }

  /**
   * Gère le callback OAuth Twitch
   */
  async callback({ request, response, session, auth }: HttpContext) {
    const code = request.input('code')
    const state = request.input('state')
    const storedState = session.get('oauth_state')

    logger.info({
      message: 'OAuth callback received',
      hasCode: Boolean(code),
      state,
      storedState: storedState,
      redirectUri: env.get('TWITCH_REDIRECT_URI'),
      clientId: env.get('TWITCH_CLIENT_ID'),
    })

    // Valider le state CSRF
    if (!state || !storedState || state !== storedState) {
      logger.warn('OAuth callback: invalid state')
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=invalid_state`)
    }

    // Supprimer le state de la session
    session.forget('oauth_state')

    try {
      // Échanger le code contre des tokens
      const tokens = await this.twitchAuthService.exchangeCodeForTokens(code)

      // Vérifier que tous les scopes requis sont présents
      const hasAllScopes = this.twitchAuthService.hasAllRequiredScopes(tokens.scope)
      const requiredScopes = this.twitchAuthService.getRequiredScopes()
      const missingScopes = requiredScopes.filter((scope) => !tokens.scope.includes(scope))

      logger.info({
        message: 'OAuth tokens exchanged successfully',
        scopes: tokens.scope,
        requiredScopes: requiredScopes,
        hasAllScopes: hasAllScopes,
        missingScopes: missingScopes.length > 0 ? missingScopes : undefined,
        expires_in: tokens.expires_in,
        hasRefresh: Boolean(tokens.refresh_token),
        hasAccess: Boolean(tokens.access_token),
      })

      // Si des scopes sont manquants, loguer un avertissement
      if (!hasAllScopes) {
        logger.warn({
          message: 'User authorized with missing scopes',
          missingScopes: missingScopes,
          receivedScopes: tokens.scope,
          requiredScopes: requiredScopes,
        })
      }

      // Récupérer les informations de l'utilisateur
      const userInfo = await this.twitchAuthService.getUserInfo(tokens.access_token)

      logger.info({
        message: 'OAuth callback: user authenticated',
        userLogin: userInfo.login,
        user_id: userInfo.id,
        displayName: userInfo.displayName,
        scopes: tokens.scope,
      })

      // Déterminer le rôle de l'utilisateur
      const isMJ = this.twitchAuthService.isMJ(userInfo.id)
      const role = isMJ ? 'MJ' : 'STREAMER'

      // Vérifier si un streamer existe déjà avec ce twitchUserId
      let streamer = await Streamer.query().where('twitchUserId', userInfo.id).first()

      let user: User

      if (streamer) {
        // Mettre à jour les tokens et infos du streamer
        await streamer.load('user')
        user = streamer.user

        // Mettre à jour le display_name si changé
        if (user) {
          if (user.displayName !== userInfo.displayName) {
            user.displayName = userInfo.displayName
            await user.save()
          }
        } else {
          // Corrige les anciens enregistrements sans user associé
          user = await User.create({
            role,
            displayName: userInfo.displayName,
            email: userInfo.email,
          })
          streamer.userId = user.id
          await streamer.save()
        }

        if (!user) {
          throw new Error('Unable to resolve user for streamer')
        }

        // Mettre à jour les infos Twitch du streamer
        streamer.twitchLogin = userInfo.login
        streamer.twitchDisplayName = userInfo.displayName
        streamer.profileImageUrl = userInfo.profile_image_url
        streamer.broadcasterType = userInfo.broadcaster_type
        await streamer.updateTokens(tokens.access_token, tokens.refresh_token)
        streamer.scopes = tokens.scope
        streamer.isActive = true
        await streamer.save()
      } else {
        // Créer un nouvel utilisateur
        user = await User.create({
          role,
          displayName: userInfo.displayName,
          email: userInfo.email,
        })

        // Créer le streamer associé
        streamer = await Streamer.createWithEncryptedTokens({
          userId: user.id,
          twitchUserId: userInfo.id,
          twitchLogin: userInfo.login,
          twitchDisplayName: userInfo.displayName,
          profileImageUrl: userInfo.profile_image_url,
          broadcasterType: userInfo.broadcaster_type,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          scopes: tokens.scope,
          isActive: true,
        })
      }

      // Authentifier l'utilisateur (créer la session avec Remember Me pour 7 jours)
      await auth.use('web').login(user, true)

      logger.info(`User ${user.id} (${role}) logged in successfully`)

      // Rediriger vers le frontend avec une page intermédiaire qui gère la redirection
      const redirectPath = role === 'MJ' ? '/mj' : '/streamer'
      const redirectUrl = `${env.get('FRONTEND_URL')}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`

      logger.info({
        message: 'Redirecting user to frontend after auth',
        redirectPath: redirectPath,
        redirectUrl: redirectUrl,
        frontendUrl: env.get('FRONTEND_URL'),
      })

      return response.redirect(redirectUrl)
    } catch (error) {
      logger.error({
        message: 'OAuth callback failed',
        error: error?.message,
        stack: error?.stack,
        redirectUri: env.get('TWITCH_REDIRECT_URI'),
        clientId: env.get('TWITCH_CLIENT_ID'),
      })
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=oauth_failed`)
    }
  }

  /**
   * Déconnecte l'utilisateur
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()

    logger.info('User logged out')

    return response.ok({ message: 'Logged out successfully' })
  }

  /**
   * Retourne les informations de l'utilisateur connecté
   */
  async me({ auth }: HttpContext) {
    const user = auth.user!

    // Charger le streamer pour tous les utilisateurs (MJ et STREAMER)
    await user.load('streamer')

    return {
      id: user.id,
      role: user.role,
      displayName: user.displayName,
      email: user.email,
      streamer: user.streamer
        ? {
            id: user.streamer.id,
            userId: user.streamer.userId,
            twitchUserId: user.streamer.twitchUserId,
            twitchDisplayName: user.streamer.twitchDisplayName,
            twitchLogin: user.streamer.twitchLogin,
            profileImageUrl: user.streamer.profileImageUrl,
            isActive: user.streamer.isActive,
            broadcasterType: user.streamer.broadcasterType,
          }
        : null,
    }
  }

  /**
   * Change le rôle de l'utilisateur connecté (uniquement en dev)
   */
  async switchRole({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { role } = request.only(['role'])

    // Valider le rôle
    if (!['MJ', 'STREAMER'].includes(role)) {
      return response.badRequest({ message: 'Rôle invalide. Doit être MJ ou STREAMER' })
    }

    // Si on passe à STREAMER, vérifier qu'un streamer existe
    if (role === 'STREAMER') {
      await user.load('streamer')
      if (!user.streamer) {
        return response.badRequest({ message: 'Aucun profil streamer associé à cet utilisateur' })
      }
    }

    // Mettre à jour le rôle
    user.role = role
    await user.save()

    logger.info(`User ${user.id} switched role to ${role}`)

    // Charger le streamer pour tous les utilisateurs (MJ et STREAMER)
    await user.load('streamer')

    return {
      id: user.id,
      role: user.role,
      displayName: user.displayName,
      email: user.email,
      streamer: user.streamer
        ? {
            id: user.streamer.id,
            userId: user.streamer.userId,
            twitchUserId: user.streamer.twitchUserId,
            twitchDisplayName: user.streamer.twitchDisplayName,
            twitchLogin: user.streamer.twitchLogin,
            profileImageUrl: user.streamer.profileImageUrl,
            isActive: user.streamer.isActive,
            broadcasterType: user.streamer.broadcasterType,
          }
        : null,
    }
  }
}
