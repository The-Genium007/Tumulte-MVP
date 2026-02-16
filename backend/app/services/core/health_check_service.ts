import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import type { PreFlightRunner } from '#services/preflight/preflight_runner'
import type { PreFlightReport, CheckResult } from '#services/preflight/types'

export interface HealthCheckResult {
  healthy: boolean
  services: {
    twitchApi: {
      available: boolean
      error?: string
    }
    redis: {
      connected: boolean
      error?: string
    }
    tokens: {
      valid: boolean
      invalidStreamers?: Array<{
        id: string
        displayName: string
        error: string
        issue?:
          | 'streamer_inactive'
          | 'authorization_missing'
          | 'authorization_expired'
          | 'token_invalid'
          | 'token_missing'
      }>
      error?: string
    }
    websocket: {
      ready: boolean
      error?: string
    }
  }
}

/**
 * HealthCheckService - Backward-compatible wrapper around PreFlightRunner
 *
 * Delegates to the new PreFlight system but converts the result
 * to the legacy HealthCheckResult format expected by PollsController.
 *
 * This wrapper will be removed once all callers migrate to PreFlightRunner directly.
 */
@inject()
export class HealthCheckService {
  /**
   * Effectue un health check complet avant le lancement d'un poll.
   * Delegates to PreFlightRunner internally.
   */
  async performHealthCheck(campaignId: string, userId: string): Promise<HealthCheckResult> {
    logger.info({ campaignId, userId }, 'Starting health check for campaign (via PreFlightRunner)')

    const runner: PreFlightRunner = await app.container.make('preFlightRunner')
    const report = await runner.run({
      campaignId,
      userId,
      eventType: 'poll',
      mode: 'full',
    })

    return this.convertToLegacyFormat(report)
  }

  /**
   * Convert a PreFlightReport to the legacy HealthCheckResult format.
   * Maps check names to the expected service keys.
   */
  private convertToLegacyFormat(report: PreFlightReport): HealthCheckResult {
    const result: HealthCheckResult = {
      healthy: report.healthy,
      services: {
        twitchApi: { available: false },
        redis: { connected: false },
        tokens: { valid: false },
        websocket: { ready: false },
      },
    }

    for (const check of report.checks) {
      switch (check.name) {
        case 'twitch_api':
          result.services.twitchApi.available = check.status === 'pass'
          if (check.status !== 'pass') {
            result.services.twitchApi.error = check.message
          }
          break

        case 'redis':
          result.services.redis.connected = check.status === 'pass'
          if (check.status !== 'pass') {
            result.services.redis.error = check.message
          }
          break

        case 'tokens':
          result.services.tokens.valid = check.status === 'pass'
          if (check.status !== 'pass') {
            this.mapTokenDetails(check, result)
          }
          break

        case 'websocket':
          result.services.websocket.ready = check.status === 'pass'
          if (check.status !== 'pass') {
            result.services.websocket.error = check.message
          }
          break
      }
    }

    return result
  }

  /**
   * Map token check details to the legacy invalidStreamers format.
   */
  private mapTokenDetails(check: CheckResult, result: HealthCheckResult): void {
    if (check.details && Array.isArray(check.details)) {
      result.services.tokens.invalidStreamers =
        check.details as HealthCheckResult['services']['tokens']['invalidStreamers']
    } else if (check.message) {
      result.services.tokens.error = check.message
    }
  }
}

export default HealthCheckService
export { HealthCheckService as healthCheckService }
