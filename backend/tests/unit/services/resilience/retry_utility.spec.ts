import { test } from '@japa/runner'
import { RetryUtility } from '#services/resilience/retry_utility'
import { RetryPolicies } from '#services/resilience/types'
import type { HttpCallResult, RetryOptions } from '#services/resilience/types'
import redis from '@adonisjs/redis/services/main'

test.group('RetryUtility', (group) => {
  const testKeyPrefix = 'test-retry-'
  let testKeyCounter = 0

  const getUniqueCircuitKey = () => `${testKeyPrefix}${Date.now()}-${testKeyCounter++}`

  group.each.setup(async () => {
    // Clean up test circuit breaker keys
    const keys = await redis.keys('circuit:test-retry-*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  group.teardown(async () => {
    const keys = await redis.keys('circuit:test-retry-*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('succeeds on first attempt without retry', async ({ assert }) => {
    const utility = new RetryUtility()
    let attempts = 0

    const result = await utility.execute(
      async (): Promise<HttpCallResult<{ value: string }>> => {
        attempts++
        return { success: true, statusCode: 200, data: { value: 'test' } }
      },
      {
        ...RetryPolicies.SERVER_ERROR,
        context: { service: 'test', operation: 'first-attempt' },
      }
    )

    assert.isTrue(result.success)
    assert.equal(result.attempts, 1)
    assert.equal(attempts, 1)
    assert.deepEqual(result.data, { value: 'test' })
    assert.isFalse(result.circuitBreakerOpen)
  })

  test('retries on retryable error and succeeds', async ({ assert }) => {
    const utility = new RetryUtility()
    let attempts = 0

    const result = await utility.execute(
      async (): Promise<HttpCallResult<{ value: string }>> => {
        attempts++
        if (attempts < 3) {
          return { success: false, statusCode: 503, error: new Error('Service unavailable') }
        }
        return { success: true, statusCode: 200, data: { value: 'success' } }
      },
      {
        ...RetryPolicies.SERVER_ERROR,
        context: { service: 'test', operation: 'retry-success' },
      }
    )

    assert.isTrue(result.success)
    assert.equal(result.attempts, 3)
    assert.equal(attempts, 3)
    assert.deepEqual(result.data, { value: 'success' })
  })

  test('stops retrying on non-retryable error', async ({ assert }) => {
    const utility = new RetryUtility()
    let attempts = 0

    const result = await utility.execute(
      async (): Promise<HttpCallResult<{ value: string }>> => {
        attempts++
        return { success: false, statusCode: 400, error: new Error('Bad request') }
      },
      {
        ...RetryPolicies.SERVER_ERROR,
        context: { service: 'test', operation: 'non-retryable' },
      }
    )

    assert.isFalse(result.success)
    assert.equal(result.attempts, 1) // No retries for 400
    assert.equal(attempts, 1)
    assert.include(result.error?.message, 'Bad request')
  })

  test('exhausts all retries on persistent failure', async ({ assert }) => {
    const utility = new RetryUtility()
    let attempts = 0

    const options: RetryOptions = {
      maxRetries: 2,
      baseDelayMs: 10, // Short delay for tests
      maxDelayMs: 100,
      useExponentialBackoff: false,
      retryableErrors: [500],
      context: { service: 'test', operation: 'exhaust-retries' },
    }

    const result = await utility.execute(async (): Promise<HttpCallResult<void>> => {
      attempts++
      return { success: false, statusCode: 500, error: new Error('Server error') }
    }, options)

    assert.isFalse(result.success)
    assert.equal(result.attempts, 3) // Initial + 2 retries
    assert.equal(attempts, 3)
  })

  test('tracks attempt details correctly', async ({ assert }) => {
    const utility = new RetryUtility()

    const options: RetryOptions = {
      maxRetries: 2,
      baseDelayMs: 10,
      maxDelayMs: 100,
      useExponentialBackoff: false,
      retryableErrors: [429],
      context: { service: 'test', operation: 'track-details' },
    }

    const result = await utility.execute(async (): Promise<HttpCallResult<void>> => {
      return { success: false, statusCode: 429, error: new Error('Rate limited') }
    }, options)

    assert.isFalse(result.success)
    assert.lengthOf(result.attemptDetails, 3)

    // First attempt has no delay
    assert.equal(result.attemptDetails[0].delayMs, 0)
    assert.equal(result.attemptDetails[0].attempt, 1)
    assert.equal(result.attemptDetails[0].statusCode, 429)

    // Subsequent attempts have delays
    assert.isAbove(result.attemptDetails[1].delayMs, 0)
    assert.equal(result.attemptDetails[1].attempt, 2)

    assert.isAbove(result.attemptDetails[2].delayMs, 0)
    assert.equal(result.attemptDetails[2].attempt, 3)
  })

  test('respects timeout per attempt', async ({ assert }) => {
    const utility = new RetryUtility()

    const options: RetryOptions = {
      maxRetries: 1,
      baseDelayMs: 10,
      maxDelayMs: 100,
      useExponentialBackoff: false,
      retryableErrors: [500],
      attemptTimeoutMs: 50,
      context: { service: 'test', operation: 'timeout' },
    }

    const result = await utility.execute(async (): Promise<HttpCallResult<void>> => {
      // This will timeout
      await new Promise((resolve) => setTimeout(resolve, 200))
      return { success: true, statusCode: 200 }
    }, options)

    assert.isFalse(result.success)
    assert.include(result.error?.message, 'timed out')
  })

  test('circuit breaker blocks requests when open', async ({ assert }) => {
    const circuitKey = getUniqueCircuitKey()
    const utility = new RetryUtility({
      failureThreshold: 1,
      resetTimeoutMs: 30000,
      successThreshold: 2,
    })

    // First, trip the circuit by failing
    const options: RetryOptions = {
      maxRetries: 0,
      baseDelayMs: 10,
      maxDelayMs: 100,
      useExponentialBackoff: false,
      retryableErrors: [500],
      circuitBreakerKey: circuitKey,
      context: { service: 'test', operation: 'trip-circuit' },
    }

    await utility.execute(async (): Promise<HttpCallResult<void>> => {
      return { success: false, statusCode: 500, error: new Error('Server error') }
    }, options)

    // Now circuit should be open, next request should be blocked
    let operationCalled = false
    const result = await utility.execute(async (): Promise<HttpCallResult<void>> => {
      operationCalled = true
      return { success: true, statusCode: 200 }
    }, options)

    assert.isFalse(result.success)
    assert.isTrue(result.circuitBreakerOpen)
    assert.isFalse(operationCalled) // Operation should not have been called
    assert.equal(result.attempts, 0)
  })

  test('handles thrown exceptions in operation', async ({ assert }) => {
    const utility = new RetryUtility()

    const options: RetryOptions = {
      maxRetries: 1,
      baseDelayMs: 10,
      maxDelayMs: 100,
      useExponentialBackoff: false,
      retryableErrors: [500],
      context: { service: 'test', operation: 'exception' },
    }

    const result = await utility.execute(async (): Promise<HttpCallResult<void>> => {
      throw new Error('Unexpected exception')
    }, options)

    assert.isFalse(result.success)
    assert.include(result.error?.message, 'Unexpected exception')
  })

  test('uses exponential backoff when configured', async ({ assert }) => {
    const utility = new RetryUtility()
    const delays: number[] = []

    const options: RetryOptions = {
      maxRetries: 2,
      baseDelayMs: 100,
      maxDelayMs: 10000,
      useExponentialBackoff: true,
      retryableErrors: [500],
      context: { service: 'test', operation: 'exponential' },
    }

    const result = await utility.execute(async (): Promise<HttpCallResult<void>> => {
      return { success: false, statusCode: 500, error: new Error('Server error') }
    }, options)

    // Collect delays from attempt details
    result.attemptDetails.forEach((detail) => {
      if (detail.delayMs > 0) {
        delays.push(detail.delayMs)
      }
    })

    // With exponential backoff:
    // Attempt 1 (retry 0): 100 × 2^0 + jitter = 100-1100ms
    // Attempt 2 (retry 1): 100 × 2^1 + jitter = 200-1200ms
    assert.lengthOf(delays, 2)
    assert.isAtLeast(delays[0], 100)
    assert.isAtLeast(delays[1], 200)
  })

  test('totalDurationMs includes all attempts and delays', async ({ assert }) => {
    const utility = new RetryUtility()

    const options: RetryOptions = {
      maxRetries: 1,
      baseDelayMs: 50,
      maxDelayMs: 100,
      useExponentialBackoff: false,
      retryableErrors: [500],
      context: { service: 'test', operation: 'duration' },
    }

    const startTime = Date.now()
    const result = await utility.execute(async (): Promise<HttpCallResult<void>> => {
      return { success: false, statusCode: 500, error: new Error('Server error') }
    }, options)
    const actualDuration = Date.now() - startTime

    // Total duration should be close to what we measured
    // Using a larger tolerance (100ms) to account for timing variability in CI
    assert.isAtLeast(result.totalDurationMs, 50) // At least one delay
    assert.approximately(result.totalDurationMs, actualDuration, 100)
  })

  test('respects Retry-After header for 429 responses', async ({ assert }) => {
    const utility = new RetryUtility()
    let attemptCount = 0

    const options: RetryOptions = {
      maxRetries: 1,
      baseDelayMs: 10,
      maxDelayMs: 5000,
      useExponentialBackoff: true,
      retryableErrors: [429],
      context: { service: 'test', operation: 'retry-after' },
    }

    const result = await utility.execute(async (): Promise<HttpCallResult<void>> => {
      attemptCount++
      if (attemptCount === 1) {
        // First attempt returns 429 with Retry-After
        return {
          success: false,
          statusCode: 429,
          retryAfterSeconds: 1, // 1 second
          error: new Error('Rate limited'),
        }
      }
      return { success: true, statusCode: 200 }
    }, options)

    assert.isTrue(result.success)
    assert.equal(result.attempts, 2)

    // The second attempt's delay should reflect the Retry-After (1000ms)
    // It might be capped or have jitter, but should be around 1000ms
    const secondAttemptDelay = result.attemptDetails[1].delayMs
    assert.isAtLeast(secondAttemptDelay, 1000)
  })
})
