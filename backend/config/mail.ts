import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

/**
 * Mail configuration for Resend
 *
 * Resend is used for:
 * - Email verification
 * - Password reset
 * - Transactional emails
 */
const mailConfig = defineConfig({
  default: 'resend',

  /**
   * Email sender defaults
   */
  from: {
    address: env.get('MAIL_FROM_ADDRESS', 'noreply@tumulte.app'),
    name: env.get('MAIL_FROM_NAME', 'Tumulte'),
  },

  /**
   * Mailers configuration
   */
  mailers: {
    /**
     * Resend mailer
     * https://resend.com
     */
    resend: transports.resend({
      key: env.get('RESEND_API_KEY', ''),
      baseUrl: 'https://api.resend.com',
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
