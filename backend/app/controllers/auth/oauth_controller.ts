import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import oauthService from '#services/auth/oauth_service'
import { TwitchAuthService } from '#services/auth/twitch_auth_service'

const STATE_REGEX = /^[a-f0-9]{64}$/

/**
 * Secure string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
}

/**
 * Controller for OAuth authentication (Google, Twitch)
 */
export default class OAuthController {
  private twitchAuthService = new TwitchAuthService()

  /**
   * Redirect to Google OAuth
   */
  async googleRedirect({ ally, response, session }: HttpContext) {
    const state = randomBytes(32).toString('hex')
    session.put('oauth_state', state)
    session.put('oauth_provider', 'google')

    const google = ally.use('google')
    const url = await google.stateless().redirectUrl((redirectRequest) => {
      redirectRequest.param('state', state)
    })

    return response.redirect(url)
  }

  /**
   * Handle Google OAuth callback
   */
  async googleCallback({ ally, request, response, session, auth }: HttpContext) {
    const state = request.input('state')
    const storedState = session.get('oauth_state')

    // Validate state
    if (!state || !storedState || !secureCompare(state, storedState)) {
      logger.warn('Google OAuth: state mismatch')
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=invalid_state`)
    }

    session.forget('oauth_state')
    session.forget('oauth_provider')

    try {
      const google = ally.use('google')
      const googleUser = await google.stateless().user()

      const { user } = await oauthService.findOrCreateUser({
        provider: 'google',
        providerId: googleUser.id,
        email: googleUser.email,
        displayName: googleUser.name || googleUser.email?.split('@')[0] || 'Utilisateur',
        avatarUrl: googleUser.avatarUrl,
        accessToken: googleUser.token.token,
        refreshToken: googleUser.token.refreshToken ?? undefined,
      })

      await auth.use('web').login(user, true)

      logger.info({ userId: user.id, provider: 'google' }, 'User logged in via Google')

      // Redirect to appropriate page
      await user.load('streamer')
      const redirectPath = '/dashboard'
      return response.redirect(
        `${env.get('FRONTEND_URL')}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`
      )
    } catch (error) {
      logger.error({ error }, 'Google OAuth callback failed')
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=oauth_failed`)
    }
  }

  /**
   * Redirect to Twitch OAuth
   */
  async twitchRedirect({ response, session }: HttpContext) {
    const state = randomBytes(32).toString('hex')
    session.put('oauth_state', state)
    session.put('oauth_provider', 'twitch')

    const authUrl = this.twitchAuthService.getAuthorizationUrl(state)
    return response.redirect(authUrl)
  }

  /**
   * Handle Twitch OAuth callback
   * This handles both login/register AND linking flows
   * (Twitch uses the same redirect_uri for both)
   */
  async twitchCallback({ request, response, session, auth }: HttpContext) {
    const code = request.input('code')
    const state = request.input('state')
    const storedState = session.get('oauth_state')
    const linkUserId = session.get('oauth_link_user_id')

    // Validate parameters
    if (!code || typeof code !== 'string') {
      logger.warn('Twitch OAuth: missing code')
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=invalid_code`)
    }

    if (!state || !STATE_REGEX.test(state)) {
      logger.warn('Twitch OAuth: invalid state format')
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=invalid_state`)
    }

    if (!storedState || !secureCompare(state, storedState)) {
      logger.warn('Twitch OAuth: state mismatch')
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=invalid_state`)
    }

    session.forget('oauth_state')
    session.forget('oauth_provider')

    // Check if this is a LINK flow (user was already authenticated)
    if (linkUserId) {
      session.forget('oauth_link_user_id')

      // Find the existing user to link to
      const userModule = await import('#models/user')
      const User = userModule.default
      const existingUser = await User.find(linkUserId)

      if (!existingUser) {
        logger.warn({ linkUserId }, 'Twitch link: user not found')
        return response.redirect(`${env.get('FRONTEND_URL')}/dashboard?error=user_not_found`)
      }

      try {
        await oauthService.handleTwitchAuth(code, existingUser)

        logger.info({ userId: existingUser.id }, 'Twitch account linked successfully')

        return response.redirect(`${env.get('FRONTEND_URL')}/dashboard?linked=twitch`)
      } catch (error) {
        logger.error({ error }, 'Twitch link callback failed')
        return response.redirect(`${env.get('FRONTEND_URL')}/dashboard?error=link_failed`)
      }
    }

    // Regular login/register flow
    try {
      const { user } = await oauthService.handleTwitchAuth(code)

      await auth.use('web').login(user, true)

      logger.info({ userId: user.id, provider: 'twitch' }, 'User logged in via Twitch')

      return response.redirect(
        `${env.get('FRONTEND_URL')}/auth/callback?redirect=${encodeURIComponent('/dashboard')}`
      )
    } catch (error) {
      logger.error({ error }, 'Twitch OAuth callback failed')
      return response.redirect(`${env.get('FRONTEND_URL')}/login?error=oauth_failed`)
    }
  }

  /**
   * Link Google account to authenticated user
   */
  async linkGoogle({ ally, response, session, auth }: HttpContext) {
    const user = auth.user!
    const state = randomBytes(32).toString('hex')

    session.put('oauth_state', state)
    session.put('oauth_link_user_id', user.id)

    const google = ally.use('google')
    const url = await google.stateless().redirectUrl((redirectRequest) => {
      redirectRequest.param('state', state)
    })

    return response.redirect(url)
  }

  /**
   * Handle Google link callback
   */
  async linkGoogleCallback({ ally, request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const state = request.input('state')
    const storedState = session.get('oauth_state')
    const linkUserId = session.get('oauth_link_user_id')

    if (!state || !storedState || !secureCompare(state, storedState) || linkUserId !== user.id) {
      return response.redirect(`${env.get('FRONTEND_URL')}/account/security?error=invalid_state`)
    }

    session.forget('oauth_state')
    session.forget('oauth_link_user_id')

    try {
      const google = ally.use('google')
      const googleUser = await google.stateless().user()

      const result = await oauthService.linkProvider(user, {
        provider: 'google',
        providerId: googleUser.id,
        email: googleUser.email,
        accessToken: googleUser.token.token,
        refreshToken: googleUser.token.refreshToken ?? undefined,
      })

      if (!result.success) {
        return response.redirect(
          `${env.get('FRONTEND_URL')}/account/security?error=${encodeURIComponent(result.error!)}`
        )
      }

      return response.redirect(`${env.get('FRONTEND_URL')}/account/security?linked=google`)
    } catch (error) {
      logger.error({ error }, 'Google link callback failed')
      return response.redirect(`${env.get('FRONTEND_URL')}/account/security?error=link_failed`)
    }
  }

  /**
   * Link Twitch account to authenticated user
   */
  async linkTwitch({ response, session, auth }: HttpContext) {
    const user = auth.user!
    const state = randomBytes(32).toString('hex')

    session.put('oauth_state', state)
    session.put('oauth_link_user_id', user.id)

    const authUrl = this.twitchAuthService.getAuthorizationUrl(state)
    return response.redirect(authUrl)
  }

  /**
   * Handle Twitch link callback
   */
  async linkTwitchCallback({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const code = request.input('code')
    const state = request.input('state')
    const storedState = session.get('oauth_state')
    const linkUserId = session.get('oauth_link_user_id')

    if (
      !code ||
      !state ||
      !storedState ||
      !secureCompare(state, storedState) ||
      linkUserId !== user.id
    ) {
      return response.redirect(`${env.get('FRONTEND_URL')}/account/security?error=invalid_state`)
    }

    session.forget('oauth_state')
    session.forget('oauth_link_user_id')

    try {
      await oauthService.handleTwitchAuth(code, user)

      logger.info({ userId: user.id }, 'Twitch account linked successfully')

      // Redirect to dashboard after linking (for onboarding flow)
      // The frontend will show a success message
      return response.redirect(`${env.get('FRONTEND_URL')}/dashboard?linked=twitch`)
    } catch (error) {
      logger.error({ error }, 'Twitch link callback failed')
      return response.redirect(`${env.get('FRONTEND_URL')}/dashboard?error=link_failed`)
    }
  }

  /**
   * Unlink an OAuth provider from authenticated user
   */
  async unlinkProvider({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const provider = request.input('provider')

    if (!['google', 'twitch'].includes(provider)) {
      return response.badRequest({ error: 'Provider invalide.' })
    }

    const result = await oauthService.unlinkProvider(user, provider)

    if (!result.success) {
      return response.badRequest({ error: result.error })
    }

    return response.ok({ message: `Compte ${provider} dissocié avec succès.` })
  }
}
