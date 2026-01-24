import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import passwordSecurityService from './password_security_service.js'

/**
 * Service for handling password reset
 *
 * Handles:
 * - Generating reset tokens
 * - Sending reset emails
 * - Validating tokens and updating passwords
 */
class PasswordResetService {
  private readonly tokenExpiryHours = 1
  private readonly frontendUrl: string

  constructor() {
    this.frontendUrl = env.get('FRONTEND_URL')
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Build the reset URL for the frontend
   */
  private buildResetUrl(token: string): string {
    return `${this.frontendUrl}/reset-password?token=${token}`
  }

  /**
   * Send a password reset email
   * Returns true even if user doesn't exist (to prevent email enumeration)
   */
  async sendResetEmail(email: string): Promise<void> {
    const user = await User.query().where('email', email.toLowerCase()).first()

    // Always return success to prevent email enumeration
    if (!user) {
      logger.info({ email }, 'Password reset requested for non-existent email')
      return
    }

    // User must have a password to reset (OAuth-only users can't reset)
    if (!user.password) {
      logger.info({ userId: user.id }, 'Password reset requested for OAuth-only user')
      return
    }

    // Rate limiting: 1 email per 5 minutes
    if (user.passwordResetSentAt) {
      const cooldownEndsAt = user.passwordResetSentAt.plus({ minutes: 5 })
      if (DateTime.now() < cooldownEndsAt) {
        logger.info({ userId: user.id }, 'Password reset rate limited')
        return
      }
    }

    // Generate new token
    const token = this.generateToken()

    // Save token to user
    user.passwordResetToken = token
    user.passwordResetSentAt = DateTime.now()
    await user.save()

    const resetUrl = this.buildResetUrl(token)

    // In development, log the reset URL to console instead of sending email
    if (env.get('NODE_ENV') === 'development') {
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      logger.info('🔑 [DEV] Password reset link:')
      logger.info(`   ${resetUrl}`)
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return
    }

    try {
      // Dynamic import to avoid loading mail service before app is booted
      const mail = await import('@adonisjs/mail/services/main')
      await mail.default.send((message) => {
        message
          .to(user.email!)
          .subject('Réinitialisation de mot de passe - Tumulte')
          .htmlView('emails/reset_password', {
            displayName: user.displayName,
            resetUrl,
          })
      })

      logger.info({ userId: user.id, email: user.email }, 'Password reset email sent')
    } catch (error) {
      logger.error(
        { userId: user.id, email: user.email, error },
        'Failed to send password reset email'
      )
      // Don't throw - we don't want to reveal if the email exists
    }
  }

  /**
   * Validate a reset token
   * Returns the user if valid, null otherwise
   */
  async validateToken(token: string): Promise<User | null> {
    const user = await User.query().where('password_reset_token', token).first()

    if (!user) {
      logger.warn({ token: token.substring(0, 8) + '...' }, 'Invalid password reset token')
      return null
    }

    // Check if token is expired
    if (user.passwordResetSentAt) {
      const expiresAt = user.passwordResetSentAt.plus({ hours: this.tokenExpiryHours })
      if (DateTime.now() > expiresAt) {
        logger.warn({ userId: user.id }, 'Password reset token expired')
        return null
      }
    }

    return user
  }

  /**
   * Reset the password using a valid token
   * Returns user on success, null if token invalid, or error string if password invalid
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ user: User; error?: never } | { user?: never; error: string } | null> {
    const user = await this.validateToken(token)

    if (!user) {
      return null
    }

    // Validate new password security
    const passwordValidation = await passwordSecurityService.validatePassword(newPassword, {
      checkPwned: true,
      userInputs: [user.email || '', user.displayName],
    })

    if (!passwordValidation.valid) {
      return { error: passwordValidation.error! }
    }

    // Save new password - will be hashed automatically by AuthFinder mixin
    user.password = newPassword
    await user.clearPasswordResetToken()

    logger.info({ userId: user.id }, 'Password reset successfully')
    return { user }
  }
}

export default new PasswordResetService()
