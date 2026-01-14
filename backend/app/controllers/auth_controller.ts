import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { user as User } from '#models/user'
import { streamer as Streamer } from '#models/streamer'
import { overlayConfig as OverlayConfig } from '#models/overlay_config'
import { twitchAuthService as TwitchAuthService } from '#services/auth/twitch_auth_service'

// Regex pour valider le format du state OAuth (64 caractères hex)
const STATE_REGEX = /^[a-f0-9]{64}$/

/**
 * Extrait un message d'erreur sûr depuis une erreur inconnue
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}

/**
 * Compare deux chaînes de manière sécurisée contre les timing attacks
 * Retourne true si les chaînes sont identiques, false sinon
 */
function secureCompare(a: string, b: string): boolean {
  // Les chaînes doivent avoir la même longueur pour timingSafeEqual
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
}

@inject()
export default class AuthController {
  constructor(private readonly twitchAuthService: TwitchAuthService) {}

  /**
   * Formate la réponse utilisateur (évite la duplication)
   */
  private formatUserResponse(user: User) {
    return {
      id: user.id,
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

    // Log minimal en production pour éviter l'exposition de configuration
    if (env.get('NODE_ENV') === 'development') {
      logger.debug({
        message: 'Redirecting to Twitch OAuth (dev details)',
        redirectUri: env.get('TWITCH_REDIRECT_URI'),
        clientId: env.get('TWITCH_CLIENT_ID'),
      })
    }

    return response.redirect(authUrl)
  }

  /**
   * Gère le callback OAuth Twitch
   */
  async callback({ request, response, session, auth }: HttpContext) {
    const code = request.input('code')
    const state = request.input('state')
    const storedState = session.get('oauth_state')

    // Validation des paramètres OAuth
    if (!code || typeof code !== 'string' || code.length === 0) {
      logger.warn('OAuth callback: missing or invalid code parameter')
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=invalid_code`)
    }

    if (!state || typeof state !== 'string' || !STATE_REGEX.test(state)) {
      logger.warn('OAuth callback: missing or invalid state parameter')
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=invalid_state`)
    }

    logger.info({
      message: 'OAuth callback received',
      hasCode: Boolean(code),
      stateValid: STATE_REGEX.test(state),
      storedStateExists: Boolean(storedState),
      redirectUri: env.get('TWITCH_REDIRECT_URI'),
      clientId: env.get('TWITCH_CLIENT_ID'),
    })

    // Valider le state CSRF avec comparaison à temps constant (protection contre timing attacks)
    if (!storedState || !secureCompare(state, storedState)) {
      logger.warn('OAuth callback: state mismatch')
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

      // Vérifier si un streamer existe déjà avec ce twitchUserId
      let streamer = await Streamer.query().where('twitchUserId', userInfo.id).first()

      let user: User

      if (streamer) {
        // Mettre à jour les tokens et infos du streamer
        await streamer.load((loader) => loader.load('user'))
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

        // Créer la configuration overlay par défaut pour le nouveau streamer
        await OverlayConfig.create({
          streamerId: streamer.id,
          name: 'Configuration par défaut',
          config: OverlayConfig.getDefaultConfigWithPoll(),
          isActive: true,
        })

        logger.info(`Default overlay config created for streamer ${streamer.id}`)
      }

      // Authentifier l'utilisateur (créer la session avec Remember Me pour 7 jours)
      await auth.use('web').login(user, true)

      logger.info(`User ${user.id} logged in successfully`)

      // Rediriger vers le frontend avec une page intermédiaire qui gère la redirection
      // All users go to /streamer by default (role restrictions are disabled)
      const redirectPath = '/streamer'
      const redirectUrl = `${env.get('FRONTEND_URL')}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`

      logger.info({
        message: 'Redirecting user to frontend after auth',
        redirectPath: redirectPath,
        redirectUrl: redirectUrl,
        frontendUrl: env.get('FRONTEND_URL'),
      })

      return response.redirect(redirectUrl)
    } catch (error: unknown) {
      logger.error({
        message: 'OAuth callback failed',
        error: getErrorMessage(error),
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
    await user.load((loader) => loader.load('streamer'))

    return this.formatUserResponse(user)
  }
}
