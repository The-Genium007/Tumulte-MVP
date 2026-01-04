/**
 * Circuit Breaker Service
 * Redis-backed circuit breaker for distributed systems
 *
 * States:
 * - CLOSED: Normal operation, requests allowed
 * - OPEN: Circuit tripped after failures, requests blocked
 * - HALF_OPEN: Testing recovery, limited requests allowed
 *
 * Security: Uses Lua scripts for atomic state transitions to prevent race conditions
 */

import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'
import type { CircuitState, CircuitBreakerConfig } from './types.js'
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from './types.js'

/**
 * Lua script for atomic failure recording
 * Returns: [newFailureCount, shouldOpen, currentState]
 */
const RECORD_FAILURE_SCRIPT = `
local stateKey = KEYS[1]
local failuresKey = KEYS[2]
local successesKey = KEYS[3]
local openedAtKey = KEYS[4]
local failureThreshold = tonumber(ARGV[1])
local nowMs = ARGV[2]

local state = redis.call('GET', stateKey) or 'CLOSED'
local failures = redis.call('INCR', failuresKey)
redis.call('EXPIRE', failuresKey, 60)

local shouldOpen = 0

if state == 'HALF_OPEN' then
  -- In HALF_OPEN, any failure immediately re-opens
  redis.call('SET', stateKey, 'OPEN')
  redis.call('SET', openedAtKey, nowMs)
  redis.call('DEL', successesKey)
  shouldOpen = 1
elseif state == 'CLOSED' and failures >= failureThreshold then
  -- In CLOSED, open after threshold
  redis.call('SET', stateKey, 'OPEN')
  redis.call('SET', openedAtKey, nowMs)
  redis.call('DEL', successesKey)
  shouldOpen = 1
end

return {failures, shouldOpen, state}
`

/**
 * Lua script for atomic success recording in HALF_OPEN state
 * Returns: [newSuccessCount, shouldClose, currentState]
 */
const RECORD_SUCCESS_SCRIPT = `
local stateKey = KEYS[1]
local failuresKey = KEYS[2]
local successesKey = KEYS[3]
local openedAtKey = KEYS[4]
local successThreshold = tonumber(ARGV[1])

local state = redis.call('GET', stateKey) or 'CLOSED'
local shouldClose = 0
local successes = 0

if state == 'HALF_OPEN' then
  successes = redis.call('INCR', successesKey)
  if successes >= successThreshold then
    -- Transition to CLOSED - clean up all keys
    redis.call('DEL', stateKey, failuresKey, successesKey, openedAtKey)
    shouldClose = 1
  end
elseif state == 'CLOSED' then
  -- Reset failure counter on success in closed state
  redis.call('DEL', failuresKey)
end

return {successes, shouldClose, state}
`

/**
 * Lua script for atomic transition to HALF_OPEN
 * Only transitions if still OPEN
 * Returns: 1 if transitioned, 0 if not
 */
const TRY_HALF_OPEN_SCRIPT = `
local stateKey = KEYS[1]
local successesKey = KEYS[2]
local state = redis.call('GET', stateKey) or 'CLOSED'

if state == 'OPEN' then
  redis.call('SET', stateKey, 'HALF_OPEN')
  redis.call('DEL', successesKey)
  return 1
end
return 0
`

export class CircuitBreaker {
  private readonly prefix = 'circuit:'
  private config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config }
  }

  /**
   * Get Redis key for a circuit breaker property
   */
  private getKey(circuitKey: string, property: string): string {
    return `${this.prefix}${circuitKey}:${property}`
  }

  /**
   * Get current state for a circuit breaker key
   * Returns CLOSED if no state is stored (default)
   */
  async getState(key: string): Promise<CircuitState> {
    try {
      const stateKey = this.getKey(key, 'state')
      const state = await redis.get(stateKey)
      return (state as CircuitState) || 'CLOSED'
    } catch (error) {
      // Fail open on Redis errors - allow requests
      logger.warn({ event: 'circuit_breaker_redis_error', key, error }, 'Redis error, failing open')
      return 'CLOSED'
    }
  }

  /**
   * Check if a request is allowed through the circuit breaker
   *
   * @param key - Circuit breaker identifier
   * @returns true if request should proceed, false if blocked
   */
  async canRequest(key: string): Promise<boolean> {
    try {
      const state = await this.getState(key)

      if (state === 'CLOSED') {
        return true
      }

      if (state === 'OPEN') {
        // Check if reset timeout has passed
        const openedAtStr = await redis.get(this.getKey(key, 'openedAt'))
        if (openedAtStr) {
          const openedAt = Number.parseInt(openedAtStr, 10)
          const elapsed = Date.now() - openedAt

          if (elapsed >= this.config.resetTimeoutMs) {
            // Atomically transition to half-open (only if still OPEN)
            const transitioned = await this.tryTransitionToHalfOpen(key)
            if (transitioned) {
              logger.info(
                {
                  event: 'circuit_breaker_half_open',
                  key,
                  successThreshold: this.config.successThreshold,
                },
                'Circuit breaker HALF_OPEN - testing recovery'
              )
            }
            return true
          }
        }
        return false
      }

      // HALF_OPEN: allow limited requests to test recovery
      return true
    } catch (error) {
      // Fail open on errors
      logger.warn(
        { event: 'circuit_breaker_can_request_error', key, error },
        'Error checking circuit, failing open'
      )
      return true
    }
  }

  /**
   * Record a failure for a circuit breaker key
   * Opens the circuit after reaching failure threshold
   * Uses atomic Lua script to prevent race conditions
   */
  async recordFailure(key: string): Promise<void> {
    try {
      const keys = [
        this.getKey(key, 'state'),
        this.getKey(key, 'failures'),
        this.getKey(key, 'successes'),
        this.getKey(key, 'openedAt'),
      ]

      const result = (await redis.eval(
        RECORD_FAILURE_SCRIPT,
        4,
        ...keys,
        this.config.failureThreshold.toString(),
        Date.now().toString()
      )) as [number, number, string]

      const [failures, shouldOpen, previousState] = result

      logger.warn(
        {
          event: 'circuit_breaker_failure_recorded',
          key,
          failures,
          threshold: this.config.failureThreshold,
          state: previousState,
          opened: shouldOpen === 1,
        },
        'Circuit breaker failure recorded'
      )

      if (shouldOpen === 1) {
        logger.error(
          {
            event: 'circuit_breaker_opened',
            key,
            resetTimeoutMs: this.config.resetTimeoutMs,
            previousState,
          },
          'Circuit breaker OPENED - requests will be blocked'
        )
      }
    } catch (error) {
      logger.error(
        { event: 'circuit_breaker_record_failure_error', key, error },
        'Error recording failure'
      )
    }
  }

  /**
   * Record a success for a circuit breaker key
   * Closes the circuit after enough successes in HALF_OPEN state
   * Uses atomic Lua script to prevent race conditions
   */
  async recordSuccess(key: string): Promise<void> {
    try {
      const keys = [
        this.getKey(key, 'state'),
        this.getKey(key, 'failures'),
        this.getKey(key, 'successes'),
        this.getKey(key, 'openedAt'),
      ]

      const result = (await redis.eval(
        RECORD_SUCCESS_SCRIPT,
        4,
        ...keys,
        this.config.successThreshold.toString()
      )) as [number, number, string]

      const [successes, shouldClose, previousState] = result

      if (previousState === 'HALF_OPEN') {
        logger.info(
          {
            event: 'circuit_breaker_success_in_half_open',
            key,
            successes,
            threshold: this.config.successThreshold,
          },
          'Success recorded in half-open state'
        )

        if (shouldClose === 1) {
          logger.info(
            {
              event: 'circuit_breaker_closed',
              key,
            },
            'Circuit breaker CLOSED - normal operation resumed'
          )
        }
      }
    } catch (error) {
      logger.error(
        { event: 'circuit_breaker_record_success_error', key, error },
        'Error recording success'
      )
    }
  }

  /**
   * Atomically try to transition circuit to HALF_OPEN state
   * Only transitions if circuit is still OPEN (prevents race conditions)
   * @returns true if transitioned, false if already transitioned by another process
   */
  private async tryTransitionToHalfOpen(key: string): Promise<boolean> {
    try {
      const result = await redis.eval(
        TRY_HALF_OPEN_SCRIPT,
        2,
        this.getKey(key, 'state'),
        this.getKey(key, 'successes')
      )
      return result === 1
    } catch (error) {
      logger.error(
        { event: 'circuit_breaker_transition_error', key, error },
        'Error transitioning to half-open'
      )
      return false
    }
  }

  /**
   * Transition circuit to CLOSED state (for manual reset)
   */
  private async transitionToClosed(key: string): Promise<void> {
    // Clean up all Redis keys for this circuit
    const keys = [
      this.getKey(key, 'state'),
      this.getKey(key, 'failures'),
      this.getKey(key, 'successes'),
      this.getKey(key, 'openedAt'),
    ]
    await redis.del(...keys)

    logger.info(
      {
        event: 'circuit_breaker_closed',
        key,
      },
      'Circuit breaker CLOSED - normal operation resumed'
    )
  }

  /**
   * Manually reset a circuit breaker to CLOSED state
   * Useful for administrative purposes
   */
  async reset(key: string): Promise<void> {
    await this.transitionToClosed(key)
    logger.info({ event: 'circuit_breaker_manual_reset', key }, 'Circuit breaker manually reset')
  }

  /**
   * Get circuit breaker statistics for a key
   */
  async getStats(key: string): Promise<{
    state: CircuitState
    failures: number
    successes: number
    openedAt: number | null
  }> {
    const [state, failuresStr, successesStr, openedAtStr] = await Promise.all([
      this.getState(key),
      redis.get(this.getKey(key, 'failures')),
      redis.get(this.getKey(key, 'successes')),
      redis.get(this.getKey(key, 'openedAt')),
    ])

    return {
      state,
      failures: failuresStr ? Number.parseInt(failuresStr, 10) : 0,
      successes: successesStr ? Number.parseInt(successesStr, 10) : 0,
      openedAt: openedAtStr ? Number.parseInt(openedAtStr, 10) : null,
    }
  }
}

export default CircuitBreaker
