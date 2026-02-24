import logger from '@adonisjs/core/services/logger'
import { redisService as RedisService } from '#services/cache/redis_service'
import type { PreFlightCheck, CheckContext, CheckResult, EventCategory } from '../types.js'

/**
 * RedisCheck - Validates Redis connectivity
 *
 * Priority 0 (infrastructure): If Redis is down, tokens can't be cached,
 * sessions don't work, and circuit breakers are blind.
 */
export class RedisCheck implements PreFlightCheck {
  name = 'redis'
  appliesTo: EventCategory[] = ['all']
  priority = 0

  private redisService = new RedisService()

  async execute(_ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now()

    try {
      await this.redisService.ping()

      logger.debug('[PreFlight] Redis check: OK')

      return {
        name: this.name,
        status: 'pass',
        message: 'Redis is connected',
        durationMs: Date.now() - start,
      }
    } catch (error) {
      logger.error({ error }, '[PreFlight] Redis check: FAILED')

      return {
        name: this.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Redis connection failed',
        remediation: 'Vérifiez que Redis est démarré et accessible',
        durationMs: Date.now() - start,
      }
    }
  }
}

export default RedisCheck
