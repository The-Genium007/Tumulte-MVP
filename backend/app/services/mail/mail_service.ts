import { Resend } from 'resend'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Edge } from 'edge.js'

// Calculate views path relative to this file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const viewsPath = join(__dirname, '..', '..', '..', 'resources', 'views')

/**
 * Simple mail service using Resend directly
 *
 * This bypasses the AdonisJS mail provider to avoid container timing issues
 * while still using Edge templates for email rendering.
 */
class MailService {
  private resend: Resend
  private fromAddress: string
  private fromName: string
  private frontendUrl: string
  private edge: Edge

  constructor() {
    this.resend = new Resend(env.get('RESEND_API_KEY'))
    this.fromAddress = env.get('MAIL_FROM_ADDRESS', 'noreply@tumulte.app')
    this.fromName = env.get('MAIL_FROM_NAME', 'Tumulte')
    this.frontendUrl = env.get('FRONTEND_URL', 'http://localhost:3000')

    // Initialize Edge with views directory
    this.edge = new Edge()
    this.edge.mount(viewsPath)
  }

  /**
   * Send an email using a template
   */
  async send(options: {
    to: string
    subject: string
    template: string
    data: Record<string, unknown>
  }): Promise<boolean> {
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
        logger.error({ error: result.error, to: options.to }, 'Resend API error')
        return false
      }

      logger.info({ to: options.to, emailId: result.data?.id }, 'Email sent successfully')
      return true
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : error,
          to: options.to,
        },
        'Failed to send email'
      )
      return false
    }
  }
}

export default new MailService()
