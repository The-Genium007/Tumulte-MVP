import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import mailService from '#services/mail/mail_service'
import welcomeEmailService from '#services/mail/welcome_email_service'

/**
 * Service for handling email verification
 *
 * Handles:
 * - Generating verification tokens
 * - Sending verification emails
 * - Verifying tokens and marking emails as verified
 */
class EmailVerificationService {
  private readonly tokenExpiryHours = 24
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
   * Build the verification URL for the frontend
   */
  private buildVerificationUrl(token: string): string {
    return `${this.frontendUrl}/verify-email-callback?token=${token}`
  }

  /**
   * Send a verification email to the user
   */
  async sendVerificationEmail(user: User): Promise<void> {
    // Generate new token
    const token = this.generateToken()

    // Save token to user
    user.emailVerificationToken = token
    user.emailVerificationSentAt = DateTime.now()
    await user.save()

    const verificationUrl = this.buildVerificationUrl(token)

    const sent = await mailService.send({
      to: user.email!,
      subject: 'Vérifiez votre email - Tumulte',
      template: 'emails/verify_email',
      data: {
        displayName: user.displayName,
        verificationUrl,
      },
    })

    if (!sent) {
      throw new Error('Failed to send verification email')
    }

    logger.info({ userId: user.id, email: user.email }, 'Verification email sent')
  }

  /**
   * Verify a token and mark the email as verified
   */
  async verifyToken(token: string): Promise<User | null> {
    // Find user with this token
    const user = await User.query().where('email_verification_token', token).first()

    if (!user) {
      logger.warn({ token: token.substring(0, 8) + '...' }, 'Invalid verification token')
      return null
    }

    // Check if token is expired
    if (user.emailVerificationSentAt) {
      const expiresAt = user.emailVerificationSentAt.plus({ hours: this.tokenExpiryHours })
      if (DateTime.now() > expiresAt) {
        logger.warn({ userId: user.id }, 'Verification token expired')
        return null
      }
    }

    // Mark email as verified
    await user.markEmailAsVerified()

    logger.info({ userId: user.id, email: user.email }, 'Email verified successfully')

    // Send welcome email now that email is verified (non-blocking)
    welcomeEmailService.sendWelcomeEmail(user).catch((error) => {
      logger.error({ userId: user.id, error }, 'Failed to send welcome email after verification')
    })

    return user
  }

  /**
   * Check if user can request a new verification email
   * (Rate limiting: 1 email per 5 minutes)
   */
  canResendVerification(user: User): { canResend: boolean; waitSeconds?: number } {
    if (!user.emailVerificationSentAt) {
      return { canResend: true }
    }

    const cooldownMinutes = 5
    const cooldownEndsAt = user.emailVerificationSentAt.plus({ minutes: cooldownMinutes })
    const now = DateTime.now()

    if (now < cooldownEndsAt) {
      const waitSeconds = Math.ceil(cooldownEndsAt.diff(now, 'seconds').seconds)
      return { canResend: false, waitSeconds }
    }

    return { canResend: true }
  }

  /**
   * Resend verification email if allowed
   */
  async resendVerificationEmail(user: User): Promise<{ success: boolean; waitSeconds?: number }> {
    const { canResend, waitSeconds } = this.canResendVerification(user)

    if (!canResend) {
      return { success: false, waitSeconds }
    }

    await this.sendVerificationEmail(user)
    return { success: true }
  }
}

export default new EmailVerificationService()
