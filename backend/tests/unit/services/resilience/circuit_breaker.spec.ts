import { test } from '@japa/runner'
import { CircuitBreaker } from '#services/resilience/circuit_breaker'
import redis from '@adonisjs/redis/services/main'

test.group('CircuitBreaker', (group) => {
  const testKeyPrefix = 'test-cb-'
  let testKeyCounter = 0

  // Generate unique key for each test to avoid conflicts
  const getUniqueKey = () => `${testKeyPrefix}${Date.now()}-${testKeyCounter++}`

  group.each.setup(async () => {
    // Clean up any test keys before each test
    const keys = await redis.keys('circuit:test-cb-*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  group.teardown(async () => {
    // Final cleanup
    const keys = await redis.keys('circuit:test-cb-*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('circuit starts in CLOSED state by default', async ({ assert }) => {
    const cb = new CircuitBreaker()
    const key = getUniqueKey()

    const state = await cb.getState(key)
    assert.equal(state, 'CLOSED')
  })

  test('circuit allows requests in CLOSED state', async ({ assert }) => {
    const cb = new CircuitBreaker()
    const key = getUniqueKey()

    const canRequest = await cb.canRequest(key)
    assert.isTrue(canRequest)
  })

  test('circuit opens after reaching failure threshold', async ({ assert }) => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      successThreshold: 2,
    })
    const key = getUniqueKey()

    // Record failures up to threshold
    await cb.recordFailure(key)
    assert.equal(await cb.getState(key), 'CLOSED')

    await cb.recordFailure(key)
    assert.equal(await cb.getState(key), 'CLOSED')

    await cb.recordFailure(key)
    assert.equal(await cb.getState(key), 'OPEN')
  })

  test('open circuit blocks requests', async ({ assert }) => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 30000,
      successThreshold: 2,
    })
    const key = getUniqueKey()

    // Trip the circuit
    await cb.recordFailure(key)

    const canRequest = await cb.canRequest(key)
    assert.isFalse(canRequest)
  })

  test('circuit transitions to half-open after reset timeout', async ({ assert }) => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 100, // 100ms for fast test
      successThreshold: 2,
    })
    const key = getUniqueKey()

    // Trip the circuit
    await cb.recordFailure(key)
    assert.equal(await cb.getState(key), 'OPEN')

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 150))

    // canRequest should transition to half-open and allow request
    const canRequest = await cb.canRequest(key)
    assert.isTrue(canRequest)

    const state = await cb.getState(key)
    assert.equal(state, 'HALF_OPEN')
  })

  test('circuit closes after success threshold in half-open state', async ({ assert }) => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 50,
      successThreshold: 2,
    })
    const key = getUniqueKey()

    // Trip the circuit
    await cb.recordFailure(key)

    // Wait for half-open
    await new Promise((resolve) => setTimeout(resolve, 100))
    await cb.canRequest(key) // Triggers transition to half-open

    assert.equal(await cb.getState(key), 'HALF_OPEN')

    // Record successes
    await cb.recordSuccess(key)
    assert.equal(await cb.getState(key), 'HALF_OPEN') // Not yet closed

    await cb.recordSuccess(key)
    assert.equal(await cb.getState(key), 'CLOSED') // Now closed
  })

  test('circuit re-opens on failure in half-open state', async ({ assert }) => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 50,
      successThreshold: 2,
    })
    const key = getUniqueKey()

    // Trip the circuit
    await cb.recordFailure(key)

    // Wait for half-open
    await new Promise((resolve) => setTimeout(resolve, 100))
    await cb.canRequest(key)

    assert.equal(await cb.getState(key), 'HALF_OPEN')

    // Record a failure in half-open - should immediately re-open
    await cb.recordFailure(key)
    assert.equal(await cb.getState(key), 'OPEN')
  })

  test('success in closed state resets failure counter', async ({ assert }) => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      successThreshold: 2,
    })
    const key = getUniqueKey()

    // Record some failures (but not enough to trip)
    await cb.recordFailure(key)
    await cb.recordFailure(key)

    // Check failures count
    let stats = await cb.getStats(key)
    assert.equal(stats.failures, 2)

    // Record success - should reset failures
    await cb.recordSuccess(key)

    stats = await cb.getStats(key)
    assert.equal(stats.failures, 0)

    // Circuit should still be closed
    assert.equal(await cb.getState(key), 'CLOSED')
  })

  test('manual reset closes the circuit', async ({ assert }) => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 30000,
      successThreshold: 2,
    })
    const key = getUniqueKey()

    // Trip the circuit
    await cb.recordFailure(key)
    assert.equal(await cb.getState(key), 'OPEN')

    // Manual reset
    await cb.reset(key)
    assert.equal(await cb.getState(key), 'CLOSED')

    // Should allow requests again
    const canRequest = await cb.canRequest(key)
    assert.isTrue(canRequest)
  })

  test('getStats returns correct statistics', async ({ assert }) => {
    const cb = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      successThreshold: 2,
    })
    const key = getUniqueKey()

    // Initial state
    let stats = await cb.getStats(key)
    assert.equal(stats.state, 'CLOSED')
    assert.equal(stats.failures, 0)
    assert.equal(stats.successes, 0)
    assert.isNull(stats.openedAt)

    // After some failures
    await cb.recordFailure(key)
    await cb.recordFailure(key)

    stats = await cb.getStats(key)
    assert.equal(stats.state, 'CLOSED')
    assert.equal(stats.failures, 2)
  })

  test('different keys have independent circuits', async ({ assert }) => {
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 30000,
      successThreshold: 2,
    })
    const key1 = getUniqueKey()
    const key2 = getUniqueKey()

    // Trip circuit for key1
    await cb.recordFailure(key1)
    await cb.recordFailure(key1)

    assert.equal(await cb.getState(key1), 'OPEN')
    assert.equal(await cb.getState(key2), 'CLOSED')

    // key2 should still allow requests
    assert.isFalse(await cb.canRequest(key1))
    assert.isTrue(await cb.canRequest(key2))
  })
})
