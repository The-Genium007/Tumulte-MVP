import { test } from '@japa/runner'
import { BackoffStrategy } from '#services/resilience/backoff_strategy'

test.group('BackoffStrategy - calculateExponentialWithJitter', () => {
  test('exponential backoff increases delay exponentially', ({ assert }) => {
    const strategy = new BackoffStrategy()

    // Run multiple times to account for jitter and get ranges
    const samples = 100
    const delays0: number[] = []
    const delays1: number[] = []
    const delays2: number[] = []

    for (let i = 0; i < samples; i++) {
      delays0.push(strategy.calculateExponentialWithJitter(0, 1000, 30000))
      delays1.push(strategy.calculateExponentialWithJitter(1, 1000, 30000))
      delays2.push(strategy.calculateExponentialWithJitter(2, 1000, 30000))
    }

    // Attempt 0: base delay (1000) + jitter (0-1000) = 1000-2000
    const min0 = Math.min(...delays0)
    const max0 = Math.max(...delays0)
    assert.isAtLeast(min0, 1000, 'Attempt 0 min should be >= 1000')
    assert.isAtMost(max0, 2000, 'Attempt 0 max should be <= 2000')

    // Attempt 1: base × 2^1 (2000) + jitter (0-1000) = 2000-3000
    const min1 = Math.min(...delays1)
    const max1 = Math.max(...delays1)
    assert.isAtLeast(min1, 2000, 'Attempt 1 min should be >= 2000')
    assert.isAtMost(max1, 3000, 'Attempt 1 max should be <= 3000')

    // Attempt 2: base × 2^2 (4000) + jitter (0-1000) = 4000-5000
    const min2 = Math.min(...delays2)
    const max2 = Math.max(...delays2)
    assert.isAtLeast(min2, 4000, 'Attempt 2 min should be >= 4000')
    assert.isAtMost(max2, 5000, 'Attempt 2 max should be <= 5000')
  })

  test('jitter adds variance to delays', ({ assert }) => {
    const strategy = new BackoffStrategy()
    const samples = 50
    const delays: number[] = []

    for (let i = 0; i < samples; i++) {
      delays.push(strategy.calculateExponentialWithJitter(0, 1000, 30000))
    }

    // Check that not all delays are the same (jitter is working)
    const uniqueDelays = new Set(delays)
    assert.isAbove(uniqueDelays.size, 1, 'Jitter should create variance in delays')
  })

  test('respects maximum delay cap', ({ assert }) => {
    const strategy = new BackoffStrategy()
    const maxDelay = 5000

    // With 10 attempts, exponential would be 1000 × 2^10 = 1,024,000ms
    // Should be capped at maxDelay
    for (let i = 0; i < 20; i++) {
      const delay = strategy.calculateExponentialWithJitter(10, 1000, maxDelay)
      assert.isAtMost(delay, maxDelay, 'Delay should respect max cap')
    }
  })

  test('handles edge case with attempt 0', ({ assert }) => {
    const strategy = new BackoffStrategy()

    // 1000 × 2^0 = 1000, + jitter (0-1000) = 1000-2000
    const delay = strategy.calculateExponentialWithJitter(0, 1000, 30000)
    assert.isAtLeast(delay, 1000)
    assert.isAtMost(delay, 2000)
  })
})

test.group('BackoffStrategy - calculateProgressive', () => {
  test('progressive delay doubles each attempt', ({ assert }) => {
    const strategy = new BackoffStrategy()

    assert.equal(strategy.calculateProgressive(0, 500), 500, 'Attempt 0: 500ms')
    assert.equal(strategy.calculateProgressive(1, 500), 1000, 'Attempt 1: 1000ms')
    assert.equal(strategy.calculateProgressive(2, 500), 2000, 'Attempt 2: 2000ms')
    assert.equal(strategy.calculateProgressive(3, 500), 4000, 'Attempt 3: 4000ms')
  })

  test('works with different base delays', ({ assert }) => {
    const strategy = new BackoffStrategy()

    assert.equal(strategy.calculateProgressive(0, 100), 100)
    assert.equal(strategy.calculateProgressive(1, 100), 200)
    assert.equal(strategy.calculateProgressive(2, 100), 400)

    assert.equal(strategy.calculateProgressive(0, 1000), 1000)
    assert.equal(strategy.calculateProgressive(1, 1000), 2000)
    assert.equal(strategy.calculateProgressive(2, 1000), 4000)
  })
})

test.group('BackoffStrategy - calculateWithRetryAfter', () => {
  test('uses Retry-After when provided', ({ assert }) => {
    const strategy = new BackoffStrategy()

    // 10 seconds = 10000ms
    const delay = strategy.calculateWithRetryAfter(10, 1000)
    assert.equal(delay, 10000, 'Should convert seconds to milliseconds')
  })

  test('uses fallback when Retry-After is undefined', ({ assert }) => {
    const strategy = new BackoffStrategy()

    const delay = strategy.calculateWithRetryAfter(undefined, 1000)
    assert.equal(delay, 1000, 'Should use fallback delay')
  })

  test('uses fallback when Retry-After is 0', ({ assert }) => {
    const strategy = new BackoffStrategy()

    const delay = strategy.calculateWithRetryAfter(0, 1000)
    assert.equal(delay, 1000, 'Should use fallback delay when Retry-After is 0')
  })

  test('uses fallback when Retry-After is negative', ({ assert }) => {
    const strategy = new BackoffStrategy()

    const delay = strategy.calculateWithRetryAfter(-5, 1000)
    assert.equal(delay, 1000, 'Should use fallback delay when Retry-After is negative')
  })
})

test.group('BackoffStrategy - calculate (combined)', () => {
  test('uses exponential with jitter when useExponential is true', ({ assert }) => {
    const strategy = new BackoffStrategy()

    const delays: number[] = []
    for (let i = 0; i < 20; i++) {
      delays.push(strategy.calculate(1, 1000, 30000, true))
    }

    // Should have variance due to jitter
    const uniqueDelays = new Set(delays)
    assert.isAbove(uniqueDelays.size, 1, 'Should have variance from jitter')

    // All should be in expected range (2000-3000)
    delays.forEach((delay) => {
      assert.isAtLeast(delay, 2000)
      assert.isAtMost(delay, 3000)
    })
  })

  test('uses progressive when useExponential is false', ({ assert }) => {
    const strategy = new BackoffStrategy()

    // Progressive should be deterministic
    const delay1 = strategy.calculate(0, 500, 30000, false)
    const delay2 = strategy.calculate(0, 500, 30000, false)

    assert.equal(delay1, delay2, 'Progressive should be deterministic')
    assert.equal(delay1, 500)
  })

  test('respects Retry-After over calculated delay', ({ assert }) => {
    const strategy = new BackoffStrategy()

    // Retry-After of 15 seconds should override calculated delay
    const delay = strategy.calculate(0, 500, 30000, true, 15)
    assert.equal(delay, 15000, 'Should use Retry-After value')
  })

  test('caps Retry-After at maxDelayMs', ({ assert }) => {
    const strategy = new BackoffStrategy()

    // Retry-After of 60 seconds, but max is 10000ms
    const delay = strategy.calculate(0, 500, 10000, true, 60)
    assert.equal(delay, 10000, 'Should cap Retry-After at maxDelayMs')
  })

  test('applies maxDelayMs to progressive delay', ({ assert }) => {
    const strategy = new BackoffStrategy()

    // Progressive at attempt 10 would be 500 × 2^10 = 512000ms
    // Should be capped at 4000ms
    const delay = strategy.calculate(10, 500, 4000, false)
    assert.equal(delay, 4000, 'Should cap progressive delay at maxDelayMs')
  })
})
