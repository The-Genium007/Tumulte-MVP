/**
 * Retry Utility Service
 * Generic retry wrapper that can be used with any async operation
 */

import logger from '@adonisjs/core/services/logger'
import { BackoffStrategy } from './backoff_strategy.js'
import { CircuitBreaker } from './circuit_breaker.js'
import { RetryEventStore } from './retry_event_store.js'
import { CircuitOpenError } from '#exceptions/circuit_open_error'
import type {
  RetryOptions,
  RetryResult,
  AttemptDetail,
  HttpCallResult,
  CircuitBreakerConfig,
} from './types.js'

// Maximum safe values for validation
const MAX_RETRIES = 10
const MAX_TIMEOUT_MS = 120000 // 2 minutes

export class RetryUtility {
  private backoffStrategy: BackoffStrategy
  private circuitBreaker: CircuitBreaker
  private eventStore: RetryEventStore

  constructor(circuitBreakerConfig?: Partial<CircuitBreakerConfig>) {
    this.backoffStrategy = new BackoffStrategy()
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig)
    this.eventStore = new RetryEventStore()
  }

  /**
   * Validate retry options to prevent misuse
   * @throws Error if options are invalid
   */
  private validateOptions(options: RetryOptions): void {
    if (!options || typeof options !== 'object') {
      throw new Error('Invalid retry options: options must be an object')
    }

    if (
      typeof options.maxRetries !== 'number' ||
      options.maxRetries < 0 ||
      options.maxRetries > MAX_RETRIES
    ) {
      throw new Error(`Invalid retry options: maxRetries must be between 0 and ${MAX_RETRIES}`)
    }

    if (typeof options.baseDelayMs !== 'number' || options.baseDelayMs < 0) {
      throw new Error('Invalid retry options: baseDelayMs must be a non-negative number')
    }

    if (typeof options.maxDelayMs !== 'number' || options.maxDelayMs < 0) {
      throw new Error('Invalid retry options: maxDelayMs must be a non-negative number')
    }

    if (!Array.isArray(options.retryableErrors)) {
      throw new Error('Invalid retry options: retryableErrors must be an array')
    }

    if (
      options.attemptTimeoutMs !== undefined &&
      (options.attemptTimeoutMs < 0 || options.attemptTimeoutMs > MAX_TIMEOUT_MS)
    ) {
      throw new Error(
        `Invalid retry options: attemptTimeoutMs must be between 0 and ${MAX_TIMEOUT_MS}`
      )
    }
  }

  /**
   * Execute an operation with retry logic
   *
   * @param operation - Async function that returns HttpCallResult
   * @param options - Retry configuration
   * @returns RetryResult with success/failure details
   */
  async execute<T>(
    operation: () => Promise<HttpCallResult<T>>,
    options: RetryOptions
  ): Promise<RetryResult<T>> {
    // Validate options to prevent DoS or misconfiguration
    this.validateOptions(options)

    const startTime = Date.now()
    const attemptDetails: AttemptDetail[] = []
    let lastError: Error | undefined
    let lastStatusCode: number | undefined
    let lastRetryAfterSeconds: number | undefined

    // Check circuit breaker first
    if (options.circuitBreakerKey) {
      const canProceed = await this.circuitBreaker.canRequest(options.circuitBreakerKey)
      if (!canProceed) {
        logger.warn(
          {
            event: 'retry_circuit_open',
            circuitKey: options.circuitBreakerKey,
            context: options.context,
          },
          'Circuit breaker is open, request blocked'
        )

        const result: RetryResult<T> = {
          success: false,
          error: new CircuitOpenError(options.circuitBreakerKey),
          attempts: 0,
          totalDurationMs: Date.now() - startTime,
          circuitBreakerOpen: true,
          attemptDetails: [],
        }

        // Store the event
        await this.storeEvent(result, options)

        return result
      }
    }

    // Main retry loop
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      const attemptStartTime = Date.now()
      let delayMs = 0
      let usedRetryAfter = false

      // Calculate delay for retry attempts (not first attempt)
      if (attempt > 0) {
        // Check if we should use Retry-After from previous response
        if (lastStatusCode === 429 && lastRetryAfterSeconds !== undefined) {
          delayMs = this.backoffStrategy.calculate(
            attempt - 1,
            options.baseDelayMs,
            options.maxDelayMs,
            options.useExponentialBackoff,
            lastRetryAfterSeconds
          )
          usedRetryAfter = lastRetryAfterSeconds > 0
        } else {
          delayMs = this.backoffStrategy.calculate(
            attempt - 1,
            options.baseDelayMs,
            options.maxDelayMs,
            options.useExponentialBackoff
          )
        }

        logger.info(
          {
            event: 'retry_waiting',
            attempt: attempt + 1,
            maxAttempts: options.maxRetries + 1,
            delayMs,
            usedRetryAfter,
            context: options.context,
          },
          `Waiting ${delayMs}ms before retry attempt ${attempt + 1}`
        )

        await this.sleep(delayMs)
      }

      try {
        // Execute with optional timeout
        const result = options.attemptTimeoutMs
          ? await this.withTimeout(operation(), options.attemptTimeoutMs)
          : await operation()

        const attemptDuration = Date.now() - attemptStartTime

        // Store attempt detail
        attemptDetails.push({
          attempt: attempt + 1,
          statusCode: result.statusCode,
          errorMessage: result.error?.message,
          delayMs,
          durationMs: attemptDuration,
          timestamp: new Date(),
          usedRetryAfter,
        })

        // Update last values for next iteration
        lastStatusCode = result.statusCode
        lastRetryAfterSeconds = result.retryAfterSeconds

        if (result.success) {
          // Record success for circuit breaker
          if (options.circuitBreakerKey) {
            await this.circuitBreaker.recordSuccess(options.circuitBreakerKey)
          }

          logger.info(
            {
              event: 'retry_success',
              attempt: attempt + 1,
              totalAttempts: attempt + 1,
              totalDurationMs: Date.now() - startTime,
              context: options.context,
            },
            `Operation succeeded on attempt ${attempt + 1}`
          )

          const successResult: RetryResult<T> = {
            success: true,
            data: result.data,
            attempts: attempt + 1,
            totalDurationMs: Date.now() - startTime,
            circuitBreakerOpen: false,
            attemptDetails,
          }

          // Store event for successful operations that required retries
          if (attempt > 0) {
            await this.storeEvent(successResult, options)
          }

          return successResult
        }

        // Check if error is retryable
        if (!options.retryableErrors.includes(result.statusCode)) {
          // Non-retryable error - fail immediately
          logger.warn(
            {
              event: 'retry_non_retryable_error',
              attempt: attempt + 1,
              statusCode: result.statusCode,
              context: options.context,
            },
            `Non-retryable error ${result.statusCode}, stopping retries`
          )

          lastError = result.error || new Error(`HTTP ${result.statusCode}`)
          break
        }

        // Record failure for circuit breaker
        if (options.circuitBreakerKey) {
          await this.circuitBreaker.recordFailure(options.circuitBreakerKey)
        }

        lastError = result.error || new Error(`HTTP ${result.statusCode}`)

        logger.warn(
          {
            event: 'retry_attempt_failed',
            attempt: attempt + 1,
            statusCode: result.statusCode,
            willRetry: attempt < options.maxRetries,
            context: options.context,
          },
          `Attempt ${attempt + 1} failed with status ${result.statusCode}`
        )
      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime
        lastError = error instanceof Error ? error : new Error(String(error))

        attemptDetails.push({
          attempt: attempt + 1,
          errorMessage: lastError.message,
          delayMs,
          durationMs: attemptDuration,
          timestamp: new Date(),
          usedRetryAfter,
        })

        // Record failure for circuit breaker
        if (options.circuitBreakerKey) {
          await this.circuitBreaker.recordFailure(options.circuitBreakerKey)
        }

        logger.error(
          {
            event: 'retry_attempt_error',
            attempt: attempt + 1,
            error: lastError.message,
            willRetry: attempt < options.maxRetries,
            context: options.context,
          },
          `Attempt ${attempt + 1} threw error: ${lastError.message}`
        )
      }
    }

    // All retries exhausted
    logger.error(
      {
        event: 'retry_exhausted',
        totalAttempts: attemptDetails.length,
        totalDurationMs: Date.now() - startTime,
        error: lastError?.message,
        context: options.context,
      },
      'All retry attempts exhausted'
    )

    const failureResult: RetryResult<T> = {
      success: false,
      error: lastError,
      attempts: attemptDetails.length,
      totalDurationMs: Date.now() - startTime,
      circuitBreakerOpen: false,
      attemptDetails,
    }

    // Store the event
    await this.storeEvent(failureResult, options)

    return failureResult
  }

  /**
   * Store retry event in database
   */
  private async storeEvent<T>(result: RetryResult<T>, options: RetryOptions): Promise<void> {
    try {
      await this.eventStore.storeFromResult(
        result,
        options.context?.service || 'unknown',
        options.context?.operation || 'unknown',
        {
          circuitBreakerKey: options.circuitBreakerKey,
          metadata: options.context?.metadata,
          streamerId: options.context?.streamerId,
          campaignId: options.context?.campaignId,
          pollInstanceId: options.context?.pollInstanceId,
        }
      )
    } catch (error) {
      // Don't fail if event storage fails
      logger.error({ event: 'retry_event_store_error', error }, 'Failed to store retry event')
    }
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Wrap a promise with a timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      promise
        .then((result) => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  /**
   * Get the circuit breaker instance for advanced usage
   */
  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker
  }

  /**
   * Get the event store instance for analytics
   */
  getEventStore(): RetryEventStore {
    return this.eventStore
  }
}

export default RetryUtility
