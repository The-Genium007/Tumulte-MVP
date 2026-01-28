import { Resend } from 'resend'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Edge } from 'edge.js'
import { migrate } from 'edge.js/plugins/migrate'

// Calculate views path relative to this file
const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)
const viewsPath = join(currentDirPath, '..', '..', '..', 'resources', 'views')

/**
 * Simple mail service using Resend directly
 *
 * This bypasses the AdonisJS mail provider to avoid container timing issues
 * while still using Edge templates for email rendering.
 *
 * STAGING/PRODUCTION NOTES:
 * - Requires valid RESEND_API_KEY environment variable
 * - If API key is missing or fake, emails will fail with clear error logging
 * - All email failures are logged but don't throw exceptions (non-blocking)
 */
class MailService {
  private resend: Resend
  private fromAddress: string
  private fromName: string
  private frontendUrl: string
  private edge: Edge
  private isConfigured: boolean

  constructor() {
    const apiKey = env.get('RESEND_API_KEY', '')

    // Check if API key appears valid (not empty or fake)
    this.isConfigured = Boolean(apiKey) && !apiKey.startsWith('re_fake')

    // Resend constructor throws if API key is empty string
    // Use a dummy value when not configured to allow initialization in test/CI
    const dummyKey = 're_' + 'disabled_in_test_environment'
    this.resend = new Resend(this.isConfigured ? apiKey : dummyKey)

    this.fromAddress = env.get('MAIL_FROM_ADDRESS', 'noreply@tumulte.app')
    this.fromName = env.get('MAIL_FROM_NAME', 'Tumulte')
    this.frontendUrl = env.get('FRONTEND_URL', 'http://localhost:3000')

    if (!this.isConfigured) {
      logger.warn(
        { hasKey: Boolean(apiKey), isFake: apiKey.startsWith('re_fake') },
        'MailService: RESEND_API_KEY is missing or invalid - emails will NOT be sent'
      )
    }

    // Initialize Edge with views directory
    this.edge = new Edge()
    this.edge.mount(viewsPath)

    // Enable legacy @layout/@section syntax support (required for Edge.js v6)
    this.edge.use(migrate)
  }

  /**
   * Check if the mail service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured
  }

  /**
   * Send an email using a template
   *
   * @returns true if email was sent successfully, false otherwise
   * @note This method is non-blocking - it logs errors but doesn't throw
   */
  async send(options: {
    to: string
    subject: string
    template: string
    data: Record<string, unknown>
  }): Promise<boolean> {
    // Early return if not configured (staging without valid API key)
    if (!this.isConfigured) {
      logger.error(
        {
          to: options.to,
          subject: options.subject,
          template: options.template,
        },
        'EMAIL NOT SENT: MailService is not configured (missing or invalid RESEND_API_KEY)'
      )
      return false
    }

    try {
      // Render template with Edge - inject frontendUrl for all templates
      const html = await this.edge.render(options.template, {
        ...options.data,
        frontendUrl: this.frontendUrl,
      })

      // Send via Resend
      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html,
      })

      if (result.error) {
        logger.error(
          {
            error: result.error,
            to: options.to,
            subject: options.subject,
          },
          'Resend API error - email not sent'
        )
        return false
      }

      logger.info(
        {
          to: options.to,
          subject: options.subject,
          emailId: result.data?.id,
        },
        'Email sent successfully'
      )
      return true
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : error,
          to: options.to,
          subject: options.subject,
          template: options.template,
        },
        'Failed to send email - exception thrown'
      )
      return false
    }
  }
}

export default new MailService()
