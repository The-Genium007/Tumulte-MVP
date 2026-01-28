import env from '#start/env'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import mailService from '#services/mail/mail_service'

/**
 * Service for sending welcome emails to new users
 *
 * Handles:
 * - Sending styled welcome emails on first account creation
 * - Works for all registration methods (email, Google, Twitch)
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
   * @param user - The newly created user
   * @returns true if email was sent successfully, false otherwise
   */
  async sendWelcomeEmail(user: User): Promise<boolean> {
    // Skip if user has no email (rare edge case with some OAuth providers)
    if (!user.email) {
      logger.warn({ userId: user.id }, 'Cannot send welcome email: user has no email')
      return false
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
      logger.info({ userId: user.id, email: user.email }, 'Welcome email sent')
    } else {
      logger.error({ userId: user.id, email: user.email }, 'Failed to send welcome email')
    }

    return sent
  }
}

export default new WelcomeEmailService()
