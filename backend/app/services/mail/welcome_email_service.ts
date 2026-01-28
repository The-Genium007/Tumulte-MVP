import { DateTime } from 'luxon'
import env from '#start/env'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import mailService from '#services/mail/mail_service'

/**
 * Service for sending welcome emails to new users
 *
 * Handles:
 * - Sending styled welcome emails on first account creation
 * - Prevents duplicate sends via welcomeEmailSentAt tracking
 * - Works for all registration methods (email, Google, Twitch)
 *
 * IMPORTANT: Welcome email should ONLY be sent when:
 * - New account created via OAuth (Google, Twitch) → immediately
 * - New account created via email/password → after email verification
 *
 * Welcome email should NOT be sent when:
 * - Linking a new OAuth provider to existing account
 * - User already received welcome email (tracked via welcomeEmailSentAt)
 */
class WelcomeEmailService {
  private readonly frontendUrl: string

  constructor() {
    this.frontendUrl = env.get('FRONTEND_URL')
  }

  /**
   * Build the dashboard URL for the CTA button
   */
  private buildDashboardUrl(): string {
    return `${this.frontendUrl}/dashboard`
  }

  /**
   * Send a welcome email to a newly registered user
   *
   * This method is idempotent - it will not send duplicate emails.
   * If the user has already received a welcome email (tracked via welcomeEmailSentAt),
   * it will return true without sending.
   *
   * @param user - The newly created user
   * @returns true if email was sent (or already sent), false on error
   */
  async sendWelcomeEmail(user: User): Promise<boolean> {
    // Skip if user has no email (rare edge case with some OAuth providers)
    if (!user.email) {
      logger.warn({ userId: user.id }, 'Cannot send welcome email: user has no email')
      return false
    }

    // Skip if welcome email was already sent (idempotency check)
    if (user.welcomeEmailSentAt) {
      logger.debug(
        { userId: user.id, sentAt: user.welcomeEmailSentAt.toISO() },
        'Welcome email already sent, skipping'
      )
      return true
    }

    const dashboardUrl = this.buildDashboardUrl()

    const sent = await mailService.send({
      to: user.email,
      subject: "Bienvenue dans l'Aventure - Tumulte",
      template: 'emails/welcome',
      data: {
        displayName: user.displayName,
        dashboardUrl,
      },
    })

    if (sent) {
      // Mark welcome email as sent to prevent duplicates
      user.welcomeEmailSentAt = DateTime.now()
      await user.save()
      logger.info({ userId: user.id, email: user.email }, 'Welcome email sent')
    } else {
      logger.error({ userId: user.id, email: user.email }, 'Failed to send welcome email')
    }

    return sent
  }
}

export default new WelcomeEmailService()
