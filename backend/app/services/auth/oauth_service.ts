import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import User from '#models/user'
import AuthProvider, { type AuthProviderType } from '#models/auth_provider'
import { streamer as Streamer } from '#models/streamer'
import { overlayConfig as OverlayConfig } from '#models/overlay_config'
import { TwitchAuthService } from './twitch_auth_service.js'
import welcomeEmailService from '#services/mail/welcome_email_service'

/**
 * Unified OAuth service for handling multiple providers
 *
 * Handles:
 * - Finding or creating users from OAuth data
 * - Linking OAuth providers to existing accounts
 * - Syncing user data from providers
 */
class OAuthService {
  private twitchAuthService = new TwitchAuthService()

  /**
   * Find or create a user from OAuth provider data
   *
   * Logic:
   * 1. Check if AuthProvider exists for this provider+providerId
   * 2. If yes, return the linked user
   * 3. If no, check if a user exists with this email
   * 4. If yes, link the provider to existing user
   * 5. If no, create a new user and link the provider
   */
  async findOrCreateUser(data: {
    provider: AuthProviderType
    providerId: string
    email: string | null
    displayName: string
    avatarUrl?: string | null
    accessToken?: string
    refreshToken?: string
    tokenExpiresAt?: DateTime
    providerData?: Record<string, unknown>
  }): Promise<{ user: User; isNew: boolean; authProvider: AuthProvider }> {
    // 1. Check if provider is already linked to a user
    let authProvider = await AuthProvider.query()
      .where('provider', data.provider)
      .where('provider_user_id', data.providerId)
      .preload('user')
      .first()

    if (authProvider) {
      // Update tokens if provided
      if (data.accessToken) {
        await authProvider.updateTokens(data.accessToken, data.refreshToken, data.tokenExpiresAt)
      }

      // Update user avatar if changed
      if (data.avatarUrl && authProvider.user.avatarUrl !== data.avatarUrl) {
        authProvider.user.avatarUrl = data.avatarUrl
        await authProvider.user.save()
      }

      logger.info(
        { userId: authProvider.userId, provider: data.provider },
        'Existing user logged in via OAuth'
      )
      return { user: authProvider.user, isNew: false, authProvider }
    }

    // 2. Check if a user exists with this email
    let user: User | null = null
    let isNew = false

    if (data.email) {
      user = await User.query().where('email', data.email.toLowerCase()).first()
    }

    if (user) {
      // 3. Link provider to existing user
      authProvider = await AuthProvider.createWithEncryptedTokens({
        userId: user.id,
        provider: data.provider,
        providerUserId: data.providerId,
        providerEmail: data.email,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        providerData: data.providerData,
      })

      // Update avatar if user doesn't have one
      if (data.avatarUrl && !user.avatarUrl) {
        user.avatarUrl = data.avatarUrl
        await user.save()
      }

      // Mark email as verified (OAuth = verified identity)
      if (!user.emailVerifiedAt) {
        await user.markEmailAsVerified()
      }

      logger.info(
        { userId: user.id, provider: data.provider },
        'OAuth provider linked to existing user'
      )
    } else {
      // 4. Create new user
      user = await User.create({
        email: data.email?.toLowerCase() ?? null,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl ?? null,
        tier: 'free',
        emailVerifiedAt: data.email ? DateTime.now() : null, // OAuth = verified
      })

      authProvider = await AuthProvider.createWithEncryptedTokens({
        userId: user.id,
        provider: data.provider,
        providerUserId: data.providerId,
        providerEmail: data.email,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        providerData: data.providerData,
      })

      isNew = true
      logger.info({ userId: user.id, provider: data.provider }, 'New user created via OAuth')

      // Send welcome email for new users (non-blocking)
      const newUser = user
      welcomeEmailService.sendWelcomeEmail(newUser).catch((error) => {
        logger.error(
          { userId: newUser.id, error },
          'Failed to send welcome email on OAuth registration'
        )
      })
    }

    return { user, isNew, authProvider }
  }

  /**
   * Link an OAuth provider to an existing authenticated user
   */
  async linkProvider(
    user: User,
    data: {
      provider: AuthProviderType
      providerId: string
      email?: string | null
      accessToken?: string
      refreshToken?: string
      tokenExpiresAt?: DateTime
      providerData?: Record<string, unknown>
    }
  ): Promise<{ success: boolean; error?: string; authProvider?: AuthProvider }> {
    // Check if this provider account is already linked to another user
    const existingProvider = await AuthProvider.query()
      .where('provider', data.provider)
      .where('provider_user_id', data.providerId)
      .first()

    if (existingProvider) {
      if (existingProvider.userId === user.id) {
        // Already linked to this user - just update tokens
        if (data.accessToken) {
          await existingProvider.updateTokens(
            data.accessToken,
            data.refreshToken,
            data.tokenExpiresAt
          )
        }
        return { success: true, authProvider: existingProvider }
      }
      return { success: false, error: 'Ce compte est déjà lié à un autre utilisateur.' }
    }

    // Check if user already has this provider type linked
    const userProvider = await user.getAuthProvider(data.provider)
    if (userProvider) {
      return { success: false, error: `Un compte ${data.provider} est déjà lié à votre compte.` }
    }

    // Create the link
    const authProvider = await AuthProvider.createWithEncryptedTokens({
      userId: user.id,
      provider: data.provider,
      providerUserId: data.providerId,
      providerEmail: data.email ?? null,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenExpiresAt: data.tokenExpiresAt,
      providerData: data.providerData,
    })

    logger.info({ userId: user.id, provider: data.provider }, 'OAuth provider linked to user')
    return { success: true, authProvider }
  }

  /**
   * Unlink an OAuth provider from a user
   */
  async unlinkProvider(
    user: User,
    provider: AuthProviderType
  ): Promise<{ success: boolean; error?: string }> {
    // User must have another way to login (password or another provider)
    const providers = await AuthProvider.query().where('user_id', user.id)
    const hasPassword = user.password !== null

    if (providers.length <= 1 && !hasPassword) {
      return {
        success: false,
        error:
          'Vous devez avoir au moins un moyen de connexion. Ajoutez un mot de passe avant de dissocier ce provider.',
      }
    }

    const authProvider = providers.find((p) => p.provider === provider)
    if (!authProvider) {
      return { success: false, error: "Ce provider n'est pas lié à votre compte." }
    }

    await authProvider.delete()
    logger.info({ userId: user.id, provider }, 'OAuth provider unlinked from user')
    return { success: true }
  }

  /**
   * Handle Twitch OAuth specifically (creates Streamer record for poll features)
   */
  async handleTwitchAuth(
    code: string,
    existingUser?: User
  ): Promise<{ user: User; isNew: boolean; streamer: Streamer }> {
    // Exchange code for tokens
    const tokens = await this.twitchAuthService.exchangeCodeForTokens(code)

    // Get user info from Twitch
    const twitchUser = await this.twitchAuthService.getUserInfo(tokens.access_token)

    const tokenExpiresAt = DateTime.now().plus({ seconds: tokens.expires_in })

    // Find or create user via OAuth service
    const { user, isNew } = existingUser
      ? { user: existingUser, isNew: false }
      : await this.findOrCreateUser({
          provider: 'twitch',
          providerId: twitchUser.id,
          email: twitchUser.email ?? null,
          displayName: twitchUser.displayName,
          avatarUrl: twitchUser.profile_image_url,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt,
          providerData: {
            login: twitchUser.login,
            broadcasterType: twitchUser.broadcaster_type,
          },
        })

    // If linking to existing user, create/update AuthProvider
    if (existingUser) {
      await this.linkProvider(existingUser, {
        provider: 'twitch',
        providerId: twitchUser.id,
        email: twitchUser.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt,
        providerData: {
          login: twitchUser.login,
          broadcasterType: twitchUser.broadcaster_type,
        },
      })
    }

    // Create or update Streamer record (for Twitch-specific features)
    let streamer = await Streamer.query().where('twitch_user_id', twitchUser.id).first()

    if (streamer) {
      // Update existing streamer
      streamer.userId = user.id
      streamer.twitchLogin = twitchUser.login
      streamer.twitchDisplayName = twitchUser.displayName
      streamer.profileImageUrl = twitchUser.profile_image_url
      streamer.broadcasterType = twitchUser.broadcaster_type
      streamer.scopes = tokens.scope
      streamer.isActive = true
      streamer.tokenExpiresAt = tokenExpiresAt
      streamer.lastTokenRefreshAt = DateTime.now()
      streamer.tokenRefreshFailedAt = null
      await streamer.updateTokens(tokens.access_token, tokens.refresh_token)
    } else {
      // Create new streamer
      streamer = await Streamer.createWithEncryptedTokens({
        userId: user.id,
        twitchUserId: twitchUser.id,
        twitchLogin: twitchUser.login,
        twitchDisplayName: twitchUser.displayName,
        profileImageUrl: twitchUser.profile_image_url,
        broadcasterType: twitchUser.broadcaster_type,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scopes: tokens.scope,
        isActive: true,
      })
      streamer.tokenExpiresAt = tokenExpiresAt
      streamer.lastTokenRefreshAt = DateTime.now()
      await streamer.save()

      // Créer la configuration overlay par défaut "Tumulte Défaut" pour le nouveau streamer
      await OverlayConfig.create({
        streamerId: streamer.id,
        name: 'Tumulte Défaut',
        config: OverlayConfig.getDefaultConfigWithPoll(),
        isActive: true,
      })
      logger.info({ streamerId: streamer.id }, 'Default overlay config created for new streamer')
    }

    return { user, isNew, streamer }
  }
}

export default new OAuthService()
