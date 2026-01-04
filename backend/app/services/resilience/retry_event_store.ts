/**
 * Retry Event Store Service
 * Persists retry events to database for analytics and debugging
 */

import logger from '@adonisjs/core/services/logger'
import RetryEvent from '#models/retry_event'
import type { RetryEventData, RetryResult } from './types.js'

export class RetryEventStore {
  /**
   * Store a retry event in the database
   */
  async store(data: RetryEventData): Promise<RetryEvent | null> {
    try {
      const event = await RetryEvent.create({
        service: data.service,
        operation: data.operation,
        attempts: data.attempts,
        success: data.success,
        totalDurationMs: data.totalDurationMs,
        finalStatusCode: data.finalStatusCode ?? null,
        errorMessage: data.errorMessage ?? null,
        circuitBreakerTriggered: data.circuitBreakerTriggered,
        circuitBreakerKey: data.circuitBreakerKey ?? null,
        metadata: data.metadata ?? null,
        streamerId: data.streamerId ?? null,
        campaignId: data.campaignId ?? null,
        pollInstanceId: data.pollInstanceId ?? null,
      })

      logger.debug(
        {
          event: 'retry_event_stored',
          id: event.id,
          service: data.service,
          operation: data.operation,
          success: data.success,
          attempts: data.attempts,
        },
        'Retry event stored'
      )

      return event
    } catch (error) {
      // Don't fail the main operation if we can't store the event
      logger.error(
        {
          event: 'retry_event_store_error',
          service: data.service,
          operation: data.operation,
          error,
        },
        'Failed to store retry event'
      )
      return null
    }
  }

  /**
   * Store a retry result with context
   */
  async storeFromResult<T>(
    result: RetryResult<T>,
    service: string,
    operation: string,
    context?: {
      circuitBreakerKey?: string
      metadata?: Record<string, unknown>
      streamerId?: string
      campaignId?: string
      pollInstanceId?: string
    }
  ): Promise<RetryEvent | null> {
    // Get the final status code from the last attempt
    const lastAttempt = result.attemptDetails[result.attemptDetails.length - 1]
    const finalStatusCode = lastAttempt?.statusCode

    return this.store({
      service,
      operation,
      attempts: result.attempts,
      success: result.success,
      totalDurationMs: result.totalDurationMs,
      finalStatusCode,
      errorMessage: result.error?.message,
      circuitBreakerTriggered: result.circuitBreakerOpen,
      circuitBreakerKey: context?.circuitBreakerKey,
      metadata: {
        ...context?.metadata,
        attemptDetails: result.attemptDetails,
      },
      streamerId: context?.streamerId,
      campaignId: context?.campaignId,
      pollInstanceId: context?.pollInstanceId,
    })
  }

  /**
   * Get recent retry events for a service
   */
  async getRecentByService(service: string, limit: number = 100): Promise<RetryEvent[]> {
    return RetryEvent.query().where('service', service).orderBy('created_at', 'desc').limit(limit)
  }

  /**
   * Get failure rate for a service in the last N minutes
   */
  async getFailureRate(
    service: string,
    minutes: number = 60
  ): Promise<{ total: number; failures: number; rate: number }> {
    const since = new Date(Date.now() - minutes * 60 * 1000)

    const events = await RetryEvent.query()
      .where('service', service)
      .where('created_at', '>=', since.toISOString())
      .select('success')

    const total = events.length
    const failures = events.filter((e) => !e.success).length
    const rate = total > 0 ? failures / total : 0

    return { total, failures, rate }
  }

  /**
   * Get events where circuit breaker was triggered
   */
  async getCircuitBreakerEvents(
    circuitBreakerKey: string,
    limit: number = 50
  ): Promise<RetryEvent[]> {
    return RetryEvent.query()
      .where('circuit_breaker_key', circuitBreakerKey)
      .where('circuit_breaker_triggered', true)
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  /**
   * Get aggregated stats for a time period
   */
  async getStats(minutes: number = 60): Promise<{
    byService: Record<string, { total: number; failures: number; avgAttempts: number }>
    totalEvents: number
    overallFailureRate: number
  }> {
    const since = new Date(Date.now() - minutes * 60 * 1000)

    const events = await RetryEvent.query()
      .where('created_at', '>=', since.toISOString())
      .select('service', 'success', 'attempts')

    const byService: Record<string, { total: number; failures: number; totalAttempts: number }> = {}

    for (const event of events) {
      if (!byService[event.service]) {
        byService[event.service] = { total: 0, failures: 0, totalAttempts: 0 }
      }
      byService[event.service].total++
      byService[event.service].totalAttempts += event.attempts
      if (!event.success) {
        byService[event.service].failures++
      }
    }

    // Calculate averages
    const result: Record<string, { total: number; failures: number; avgAttempts: number }> = {}
    for (const [service, stats] of Object.entries(byService)) {
      result[service] = {
        total: stats.total,
        failures: stats.failures,
        avgAttempts: stats.total > 0 ? stats.totalAttempts / stats.total : 0,
      }
    }

    const totalEvents = events.length
    const totalFailures = events.filter((e) => !e.success).length
    const overallFailureRate = totalEvents > 0 ? totalFailures / totalEvents : 0

    return {
      byService: result,
      totalEvents,
      overallFailureRate,
    }
  }

  /**
   * Clean up old events (retention policy)
   */
  async cleanup(retentionDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

    const result = await RetryEvent.query().where('created_at', '<', cutoff.toISOString()).delete()

    const deletedCount = Array.isArray(result) ? result.length : result

    logger.info(
      {
        event: 'retry_events_cleanup',
        deletedCount,
        retentionDays,
      },
      'Retry events cleanup completed'
    )

    return deletedCount
  }
}

export default RetryEventStore
