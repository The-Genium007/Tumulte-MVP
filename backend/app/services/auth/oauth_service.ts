import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { Sentry } from '#config/sentry'
import User from '#models/user'
import AuthProvider, { type AuthProviderType } from '#models/auth_provider'
import { streamer as Streamer } from '#models/streamer'
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
   *
   * IMPORTANT: Uses database transaction to prevent race conditions
   * that could create duplicate users on concurrent OAuth requests
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
    // Breadcrumb pour tracer le début du flow OAuth
    Sentry.addBreadcrumb({
      category: 'auth',
      message: `findOrCreateUser started for ${data.provider}:${data.providerId}`,
      level: 'info',
      data: { email: data.email, provider: data.provider },
    })

    // Utiliser une transaction pour éviter les race conditions
    return await db.transaction(async (trx) => {
      // 1. Check if provider is already linked to a user
      let authProvider = await AuthProvider.query({ client: trx })
        .where('provider', data.provider)
        .where('provider_user_id', data.providerId)
        .preload('user')
        .first()

      if (authProvider) {
        // Handle orphan auth provider (user was deleted but provider record remains)
        if (!authProvider.user) {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: `Orphan AuthProvider detected for ${data.provider}`,
            level: 'warning',
            data: { authProviderId: authProvider.id, userId: authProvider.userId },
          })
          logger.warn(
            {
              authProviderId: authProvider.id,
              userId: authProvider.userId,
              provider: data.provider,
            },
            'Orphan AuthProvider found - attempting recovery'
          )

          // Try to find existing user by email before creating a new one
          let existingUser: User | null = null
          if (data.email) {
            existingUser = await User.query({ client: trx })
              .where('email', data.email.toLowerCase())
              .first()
          }

          if (existingUser) {
            // Reassociate the AuthProvider with the existing user
            logger.info(
              {
                authProviderId: authProvider.id,
                oldUserId: authProvider.userId,
                newUserId: existingUser.id,
                email: data.email,
                provider: data.provider,
              },
              'Orphan AuthProvider recovered - reassociating with existing user by email'
            )

            authProvider.userId = existingUser.id
            if (data.accessToken) {
              await authProvider.updateTokens(
                data.accessToken,
                data.refreshToken,
                data.tokenExpiresAt
              )
            }
            await authProvider.save()

            // Update user avatar if changed
            if (data.avatarUrl && existingUser.avatarUrl !== data.avatarUrl) {
              existingUser.avatarUrl = data.avatarUrl
              await existingUser.save()
            }

            return { user: existingUser, isNew: false, authProvider }
          } else {
            // No existing user found, delete orphan and create new
            logger.info(
              { authProviderId: authProvider.id, provider: data.provider },
              'No existing user found for orphan AuthProvider - creating fresh user'
            )
            await authProvider.delete()
            // Fall through to create new user
          }
        } else {
          // Update tokens if provided
          if (data.accessToken) {
            await authProvider.updateTokens(
              data.accessToken,
              data.refreshToken,
              data.tokenExpiresAt
            )
          }

          // Update user avatar if changed
          if (data.avatarUrl && authProvider.user.avatarUrl !== data.avatarUrl) {
            authProvider.user.avatarUrl = data.avatarUrl
            await authProvider.user.save()
          }

          Sentry.addBreadcrumb({
            category: 'auth',
            message: `Existing user logged in via OAuth ${data.provider}`,
            level: 'info',
            data: { userId: authProvider.userId },
          })
          logger.info(
            { userId: authProvider.userId, provider: data.provider },
            'Existing user logged in via OAuth'
          )
          return { user: authProvider.user, isNew: false, authProvider }
        }
      }

      // 2. Check if a user exists with this email
      let user: User | null = null
      let isNew = false

      if (data.email) {
        user = await User.query({ client: trx }).where('email', data.email.toLowerCase()).first()
      }

      if (user) {
        // 3. Link provider to existing user
        Sentry.addBreadcrumb({
          category: 'auth',
          message: `Linking ${data.provider} to existing user by email match`,
          level: 'info',
          data: { userId: user.id, email: data.email },
        })

        try {
          authProvider = await AuthProvider.createWithEncryptedTokens(
            {
              userId: user.id,
              provider: data.provider,
              providerUserId: data.providerId,
              providerEmail: data.email,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              tokenExpiresAt: data.tokenExpiresAt,
              providerData: data.providerData,
            },
            { client: trx }
          )
        } catch (error: unknown) {
          // Handle unique constraint violation (race condition)
          if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            Sentry.captureException(error, {
              tags: { type: 'duplicate_provider_race_condition', provider: data.provider },
              extra: { providerId: data.providerId, email: data.email },
            })
            logger.error(
              {
                event: 'oauth_duplicate_provider',
                provider: data.provider,
                providerId: data.providerId,
              },
              'Race condition: duplicate provider detected, fetching existing'
            )

            // Fetch the existing provider that was created by concurrent request
            const existing = await AuthProvider.query({ client: trx })
              .where('provider', data.provider)
              .where('provider_user_id', data.providerId)
              .preload('user')
              .firstOrFail()
            return { user: existing.user, isNew: false, authProvider: existing }
          }
          throw error
        }

        // Update avatar if user doesn't have one
        if (data.avatarUrl && !user.avatarUrl) {
          user.avatarUrl = data.avatarUrl
          user.useTransaction(trx)
          await user.save()
        }

        // Mark email as verified (OAuth = verified identity)
        if (!user.emailVerifiedAt) {
          user.useTransaction(trx)
          await user.markEmailAsVerified()
        }

        logger.info(
          { userId: user.id, provider: data.provider },
          'OAuth provider linked to existing user'
        )
      } else {
        // 4. Create new user
        Sentry.addBreadcrumb({
          category: 'auth',
          message: `Creating new user via ${data.provider}`,
          level: 'info',
          data: { email: data.email, displayName: data.displayName },
        })

        user = await User.create(
          {
            email: data.email?.toLowerCase() ?? null,
            displayName: data.displayName,
            avatarUrl: data.avatarUrl ?? null,
            tier: 'free',
            emailVerifiedAt: data.email ? DateTime.now() : null, // OAuth = verified
          },
          { client: trx }
        )

        try {
          authProvider = await AuthProvider.createWithEncryptedTokens(
            {
              userId: user.id,
              provider: data.provider,
              providerUserId: data.providerId,
              providerEmail: data.email,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              tokenExpiresAt: data.tokenExpiresAt,
              providerData: data.providerData,
            },
            { client: trx }
          )
        } catch (error: unknown) {
          // Handle unique constraint violation (race condition)
          if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            Sentry.captureException(error, {
              tags: { type: 'duplicate_provider_race_condition', provider: data.provider },
              extra: { providerId: data.providerId, email: data.email, newUserId: user.id },
            })
            logger.error(
              {
                event: 'oauth_duplicate_provider_new_user',
                provider: data.provider,
                providerId: data.providerId,
              },
              'Race condition: duplicate provider on new user creation'
            )

            // Rollback will happen automatically, fetch the winner
            const existing = await AuthProvider.query({ client: trx })
              .where('provider', data.provider)
              .where('provider_user_id', data.providerId)
              .preload('user')
              .firstOrFail()
            return { user: existing.user, isNew: false, authProvider: existing }
          }
          throw error
        }

        isNew = true
        logger.info({ userId: user.id, provider: data.provider }, 'New user created via OAuth')

        // Send welcome email for new users (non-blocking, outside transaction)
        const newUser = user
        welcomeEmailService.sendWelcomeEmail(newUser).catch((error) => {
          logger.error(
            { userId: newUser.id, error },
            'Failed to send welcome email on OAuth registration'
          )
        })
      }

      return { user, isNew, authProvider }
    }) // End of transaction
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
      // SECURITY: Prevent ownership change of existing Streamer
      // This could happen if race condition created duplicate users
      if (streamer.userId !== user.id) {
        const error = new Error(
          `Streamer ownership conflict: Twitch account ${twitchUser.id} already owned by user ${streamer.userId}, attempted by user ${user.id}`
        )
        Sentry.captureException(error, {
          tags: { type: 'streamer_ownership_conflict' },
          extra: {
            streamerId: streamer.id,
            currentOwnerId: streamer.userId,
            attemptedOwnerId: user.id,
            twitchUserId: twitchUser.id,
            twitchLogin: twitchUser.login,
          },
        })
        logger.error(
          {
            event: 'streamer_ownership_conflict',
            streamerId: streamer.id,
            currentOwnerId: streamer.userId,
            attemptedOwnerId: user.id,
            twitchUserId: twitchUser.id,
          },
          'Attempted to change Streamer ownership - blocked for security'
        )
        throw error
      }

      // Update existing streamer (same owner)
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

      // Note: Pas de création de config overlay ici.
      // Le système utilise OverlayConfig.getDefaultConfigWithPoll() comme fallback
      // quand le streamer n'a pas de config personnalisée en base.
    }

    return { user, isNew, streamer }
  }
}

export default new OAuthService()
