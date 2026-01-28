import { DateTime } from 'luxon'
import { BaseModel, column, hasOne, hasMany, computed } from '@adonisjs/lucid/orm'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose } from '@adonisjs/core/helpers'
import hash from '@adonisjs/core/services/hash'
import type { HasOne, HasMany } from '@adonisjs/lucid/types/relations'
import { streamer as Streamer } from './streamer.js'
import AuthProvider from './auth_provider.js'
import Subscription from './subscription.js'
import env from '#start/env'

export type UserTier = 'free' | 'premium'

/**
 * Auth finder mixin for email/password authentication
 * Provides verifyCredentials() method
 */
const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

/**
 * User model - central account for all authentication methods
 *
 * Users can authenticate via:
 * - Email/password (with email verification)
 * - OAuth providers (Google, Twitch, etc.) via AuthProvider relation
 *
 * Tier system:
 * - 'free' - default tier
 * - 'premium' - paid subscription or manually granted
 * - Admin status is determined by ADMIN_EMAILS env variable
 */
class User extends compose(BaseModel, AuthFinder) {
  // Note: Password hashing is handled automatically by the AuthFinder mixin
  // Do NOT add a @beforeSave hook for password hashing - it would cause double hashing

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare displayName: string

  @column()
  declare email: string | null

  @column({ serializeAs: null })
  declare password: string | null

  @column()
  declare avatarUrl: string | null

  @column()
  declare tier: UserTier

  // Email verification
  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column({ serializeAs: null })
  declare emailVerificationToken: string | null

  @column.dateTime({ serializeAs: null })
  declare emailVerificationSentAt: DateTime | null

  // Password reset
  @column({ serializeAs: null })
  declare passwordResetToken: string | null

  @column.dateTime({ serializeAs: null })
  declare passwordResetSentAt: DateTime | null

  // Welcome email tracking (to prevent duplicate sends)
  @column.dateTime({ serializeAs: null })
  declare welcomeEmailSentAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @hasOne(() => Streamer, {
    foreignKey: 'userId',
  })
  declare streamer: HasOne<typeof Streamer>

  @hasMany(() => AuthProvider, {
    foreignKey: 'userId',
  })
  declare authProviders: HasMany<typeof AuthProvider>

  @hasMany(() => Subscription, {
    foreignKey: 'userId',
  })
  declare subscriptions: HasMany<typeof Subscription>

  // Token providers for AdonisJS Auth
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)
  static accessTokens = DbAccessTokensProvider.forModel(User)

  /**
   * Check if the user's email is verified
   */
  @computed()
  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null
  }

  /**
   * Check if user has password set (can use email/password login)
   */
  @computed()
  get hasPassword(): boolean {
    return this.password !== null
  }

  /**
   * Check if user is an admin (based on ADMIN_EMAILS env variable)
   * Checks both user.email AND all authProvider emails
   */
  @computed()
  get isAdmin(): boolean {
    // Quick synchronous check for user.email
    const adminEmails = env.get('ADMIN_EMAILS', '')
    const emailList = adminEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (emailList.length === 0) return false

    // Check user's primary email
    if (this.email && emailList.includes(this.email.toLowerCase())) {
      return true
    }

    // Check preloaded authProviders' emails (if loaded)
    if (this.$preloaded.authProviders) {
      for (const provider of this.authProviders) {
        if (provider.providerEmail && emailList.includes(provider.providerEmail.toLowerCase())) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Async version that loads authProviders if needed
   * Use this in API responses where you can await
   */
  async checkIsAdmin(): Promise<boolean> {
    const adminEmails = env.get('ADMIN_EMAILS', '')
    const emailList = adminEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (emailList.length === 0) return false

    // Check user's primary email
    if (this.email && emailList.includes(this.email.toLowerCase())) {
      return true
    }

    // Query authProviders directly to check provider emails
    const providers = await AuthProvider.query().where('userId', this.id).select('providerEmail')

    for (const provider of providers) {
      if (provider.providerEmail && emailList.includes(provider.providerEmail.toLowerCase())) {
        return true
      }
    }

    return false
  }

  /**
   * Check if user has premium tier (via subscription or manual grant)
   */
  async isPremium(): Promise<boolean> {
    // Admin is always premium
    if (this.isAdmin) return true

    // Check for active premium subscription
    const activeSubscription = await Subscription.query()
      .where('user_id', this.id)
      .where('tier', 'premium')
      .whereIn('status', ['active', 'trialing'])
      .where((query) => {
        query.whereNull('ends_at').orWhere('ends_at', '>', DateTime.now().toSQL())
      })
      .first()

    return activeSubscription !== null
  }

  /**
   * Get the user's effective tier (checking subscriptions)
   */
  async getEffectiveTier(): Promise<'free' | 'premium' | 'admin'> {
    if (this.isAdmin) return 'admin'
    if (await this.isPremium()) return 'premium'
    return 'free'
  }

  /**
   * Get auth provider by type
   */
  async getAuthProvider(provider: 'google' | 'twitch' | 'microsoft' | 'apple') {
    return AuthProvider.query().where('user_id', this.id).where('provider', provider).first()
  }

  /**
   * Check if user has a specific auth provider linked
   */
  async hasAuthProvider(provider: 'google' | 'twitch' | 'microsoft' | 'apple'): Promise<boolean> {
    const authProvider = await this.getAuthProvider(provider)
    return authProvider !== null
  }

  /**
   * Mark email as verified
   */
  async markEmailAsVerified(): Promise<void> {
    this.emailVerifiedAt = DateTime.now()
    this.emailVerificationToken = null
    this.emailVerificationSentAt = null
    await this.save()
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(): Promise<void> {
    this.passwordResetToken = null
    this.passwordResetSentAt = null
    await this.save()
  }
}

export { User as user }
export default User
