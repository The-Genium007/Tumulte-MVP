import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import type { PreFlightCheck, CheckContext, CheckResult, EventCategory } from '../types.js'

/**
 * WebSocketCheck - Validates Transmit WebSocket server is initialized
 *
 * Priority 0 (infrastructure): If WebSocket is down, real-time updates
 * won't reach overlays or dashboards.
 */
export class WebSocketCheck implements PreFlightCheck {
  name = 'websocket'
  appliesTo: EventCategory[] = ['all']
  priority = 0

  async execute(_ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now()

    try {
      if (!transmit) {
        throw new Error('Transmit WebSocket service not initialized')
      }

      logger.debug('[PreFlight] WebSocket check: OK')

      return {
        name: this.name,
        status: 'pass',
        message: 'WebSocket (Transmit) is ready',
        durationMs: Date.now() - start,
      }
    } catch (error) {
      logger.error({ error }, '[PreFlight] WebSocket check: FAILED')

      return {
        name: this.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'WebSocket server not ready',
        remediation: 'Vérifiez la configuration Transmit dans le backend',
        durationMs: Date.now() - start,
      }
    }
  }
}

export default WebSocketCheck
