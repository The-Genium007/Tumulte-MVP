import env from '#start/env'
import { defineConfig, services } from '@adonisjs/ally'

/**
 * Ally configuration for OAuth providers
 *
 * Supported providers:
 * - Google: Standard OAuth for account creation/login
 * - Twitch: OAuth with extended scopes for poll management
 */
const allyConfig = defineConfig({
  /**
   * Google OAuth
   * Used for: Account creation, login
   * Scopes: email, profile (basic info only)
   */
  google: services.google({
    clientId: env.get('GOOGLE_CLIENT_ID', ''),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET', ''),
    callbackUrl: env.get('GOOGLE_REDIRECT_URI', ''),
    scopes: ['email', 'profile'],
    prompt: 'select_account', // Always show account picker
  }),

  /**
   * Twitch OAuth
   * Used for: Account creation, login, AND poll management features
   * Scopes: Extended for channel poll access
   *
   * Note: We use a custom driver since Twitch isn't built-in to Ally
   */
  // Twitch will use our existing TwitchAuthService for now
  // We'll integrate it with Ally's interface in the OAuth controller
})

export default allyConfig

declare module '@adonisjs/ally/types' {
  interface SocialProviders extends InferSocialProviders<typeof allyConfig> {}
}
