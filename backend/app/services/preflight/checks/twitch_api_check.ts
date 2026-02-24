import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import type { PreFlightCheck, CheckContext, CheckResult, EventCategory } from '../types.js'

/**
 * TwitchApiCheck - Validates Twitch API availability
 *
 * Priority 5 (external API): Gets an app access token via client credentials
 * and makes a test request to the Twitch Helix API.
 */
export class TwitchApiCheck implements PreFlightCheck {
  name = 'twitch_api'
  appliesTo: EventCategory[] = ['all']
  priority = 5

  async execute(_ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now()

    try {
      const testUserId = env.get('TWITCH_TEST_USER_ID', '141981764')
      const clientId = env.get('TWITCH_CLIENT_ID')
      const clientSecret = env.get('TWITCH_CLIENT_SECRET')

      if (!clientId || !clientSecret) {
        return {
          name: this.name,
          status: 'fail',
          message: 'Twitch credentials not configured',
          remediation: 'Configurez TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET dans le .env',
          durationMs: Date.now() - start,
        }
      }

      // Get app access token
      const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get Twitch app token: ${tokenResponse.status}`)
      }

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const tokenData = (await tokenResponse.json()) as { access_token: string }
      const appAccessToken = tokenData['access_token']

      // Test the Twitch API
      const apiResponse = await fetch(`https://api.twitch.tv/helix/users?id=${testUserId}`, {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${appAccessToken}`,
        },
      })

      if (!apiResponse.ok) {
        throw new Error(`Twitch API returned status ${apiResponse.status}`)
      }

      logger.debug('[PreFlight] Twitch API check: OK')

      return {
        name: this.name,
        status: 'pass',
        message: 'Twitch API is available',
        durationMs: Date.now() - start,
      }
    } catch (error) {
      logger.error({ error }, '[PreFlight] Twitch API check: FAILED')

      return {
        name: this.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Twitch API unavailable',
        remediation: 'Vérifiez la connectivité réseau et les credentials Twitch',
        durationMs: Date.now() - start,
      }
    }
  }
}

export default TwitchApiCheck
