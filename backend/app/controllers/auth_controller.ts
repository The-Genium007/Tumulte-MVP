import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import User from '#models/user'
import Streamer from '#models/streamer'
import TwitchAuthService from '#services/twitch_auth_service'

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
  async redirect({ response, session }: HttpContext) {
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
      redirect_uri: env.get('TWITCH_REDIRECT_URI'),
      client_id: env.get('TWITCH_CLIENT_ID'),
      client_secret_masked: this.maskSecret(env.get('TWITCH_CLIENT_SECRET')),
      frontend_url: env.get('FRONTEND_URL'),
      node_env: env.get('NODE_ENV'),
      log_level: env.get('LOG_LEVEL'),
      session_driver: env.get('SESSION_DRIVER'),
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
      has_code: Boolean(code),
      state,
      stored_state: storedState,
      redirect_uri: env.get('TWITCH_REDIRECT_URI'),
      client_id: env.get('TWITCH_CLIENT_ID'),
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
        required_scopes: requiredScopes,
        has_all_scopes: hasAllScopes,
        missing_scopes: missingScopes.length > 0 ? missingScopes : undefined,
        expires_in: tokens.expires_in,
        has_refresh: Boolean(tokens.refresh_token),
        has_access: Boolean(tokens.access_token),
      })

      // Si des scopes sont manquants, loguer un avertissement
      if (!hasAllScopes) {
        logger.warning({
          message: 'User authorized with missing scopes',
          missing_scopes: missingScopes,
          received_scopes: tokens.scope,
          required_scopes: requiredScopes,
        })
      }

      // Récupérer les informations de l'utilisateur
      const userInfo = await this.twitchAuthService.getUserInfo(tokens.access_token)

      logger.info({
        message: 'OAuth callback: user authenticated',
        user_login: userInfo.login,
        user_id: userInfo.id,
        display_name: userInfo.display_name,
        scopes: tokens.scope,
      })

      // Déterminer le rôle de l'utilisateur
      const isMJ = this.twitchAuthService.isMJ(userInfo.id)
      const role = isMJ ? 'MJ' : 'STREAMER'

      // Vérifier si un streamer existe déjà avec ce twitch_user_id
      let streamer = await Streamer.query().where('twitch_user_id', userInfo.id).first()

      let user: User

      if (streamer) {
        // Mettre à jour les tokens et infos du streamer
        await streamer.load('user')
        user = streamer.user

        // Mettre à jour le display_name si changé
        if (user) {
          if (user.displayName !== userInfo.display_name) {
            user.displayName = userInfo.display_name
            await user.save()
          }
        } else {
          // Corrige les anciens enregistrements sans user associé
          user = await User.create({
            role,
            displayName: userInfo.display_name,
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
        streamer.twitchDisplayName = userInfo.display_name
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
          displayName: userInfo.display_name,
          email: userInfo.email,
        })

        // Créer le streamer associé
        streamer = await Streamer.createWithEncryptedTokens({
          userId: user.id,
          twitchUserId: userInfo.id,
          twitchLogin: userInfo.login,
          twitchDisplayName: userInfo.display_name,
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
        redirect_path: redirectPath,
        redirect_url: redirectUrl,
        frontend_url: env.get('FRONTEND_URL'),
      })

      return response.redirect(redirectUrl)
    } catch (error) {
      logger.error({
        message: 'OAuth callback failed',
        error: error?.message,
        stack: error?.stack,
        redirect_uri: env.get('TWITCH_REDIRECT_URI'),
        client_id: env.get('TWITCH_CLIENT_ID'),
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

    // Charger le streamer si l'utilisateur en est un
    if (user.role === 'STREAMER') {
      await user.load('streamer')

      return {
        id: user.id,
        role: user.role,
        display_name: user.displayName,
        email: user.email,
        streamer: user.streamer
          ? {
              id: user.streamer.id,
              twitch_display_name: user.streamer.twitchDisplayName,
              twitch_login: user.streamer.twitchLogin,
              is_active: user.streamer.isActive,
              broadcaster_type: user.streamer.broadcasterType,
            }
          : null,
      }
    }

    return {
      id: user.id,
      role: user.role,
      display_name: user.displayName,
      email: user.email,
      streamer: null,
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

    // Retourner les nouvelles infos
    if (role === 'STREAMER') {
      await user.load('streamer')
      return {
        id: user.id,
        role: user.role,
        display_name: user.displayName,
        email: user.email,
        streamer: user.streamer
          ? {
              id: user.streamer.id,
              twitch_display_name: user.streamer.twitchDisplayName,
              twitch_login: user.streamer.twitchLogin,
              is_active: user.streamer.isActive,
            }
          : null,
      }
    }

    return {
      id: user.id,
      role: user.role,
      display_name: user.displayName,
      email: user.email,
      streamer: null,
    }
  }
}
