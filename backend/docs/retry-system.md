# Retry System - Technical Documentation

## Overview

The retry system is an agnostic and reusable infrastructure for handling transient errors during API calls. It includes:

- **Exponential backoff with jitter** for rate limits (429)
- **Progressive delay** for server errors (5xx)
- **Circuit breaker** to avoid failure cascades
- **Complete observability** via logs, WebSocket, and database

## Architecture

```
                      +---------------------+
                      |   RetryUtility      |
                      | (Generic wrapper)   |
                      +----------+----------+
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
+--------v--------+    +--------v--------+    +--------v--------+
| BackoffStrategy |    | CircuitBreaker  |    | RetryEventStore |
|  (Delay calc)   |    | (Redis-backed)  |    | (DB persistence)|
+-----------------+    +-----------------+    +-----------------+
```

## Files

| File | Description |
|------|-------------|
| `app/services/resilience/types.ts` | Interfaces, types, and predefined policies |
| `app/services/resilience/backoff_strategy.ts` | Retry delay calculation |
| `app/services/resilience/circuit_breaker.ts` | Redis circuit breaker |
| `app/services/resilience/retry_utility.ts` | Main wrapper |
| `app/services/resilience/retry_event_store.ts` | DB persistence |
| `app/models/retry_event.ts` | Lucid model |
| `app/exceptions/circuit_open_error.ts` | Custom exception |

## Usage

### Basic

```typescript
import { RetryUtility } from '#services/resilience/retry_utility'
import { RetryPolicies } from '#services/resilience/types'
import type { HttpCallResult } from '#services/resilience/types'

const retryUtility = new RetryUtility()

const result = await retryUtility.execute(
  async (): Promise<HttpCallResult<MyData>> => {
    const response = await fetch('https://api.example.com/data')

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: new Error(`HTTP ${response.status}`),
      }
    }

    const data = await response.json()
    return { success: true, statusCode: 200, data }
  },
  {
    ...RetryPolicies.SERVER_ERROR,
    context: { service: 'MyService', operation: 'getData' },
  }
)

if (result.success) {
  console.log('Data:', result.data)
} else {
  console.error('Failed after', result.attempts, 'attempts:', result.error)
}
```

### With Rate Limiting (429)

```typescript
const result = await retryUtility.execute(
  async (): Promise<HttpCallResult<void>> => {
    const response = await fetch('https://api.example.com/action', {
      method: 'POST',
    })

    // Extract Retry-After header for 429s
    const retryAfter = response.headers.get('Retry-After')

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        retryAfterSeconds: retryAfter ? parseInt(retryAfter, 10) : undefined,
        error: new Error(`HTTP ${response.status}`),
      }
    }

    return { success: true, statusCode: 200 }
  },
  RetryPolicies.RATE_LIMITED
)
```

### With Circuit Breaker

```typescript
const result = await retryUtility.execute(operation, {
  ...RetryPolicies.TWITCH_API,
  circuitBreakerKey: 'my-service-api', // Unique key for this service
})

if (result.circuitBreakerOpen) {
  console.log('Circuit breaker open - request blocked')
}
```

## Predefined Policies

### RATE_LIMITED
For 429 (Too Many Requests) errors:
- Max retries: 3
- Base delay: 1000ms
- Backoff: Exponential with jitter
- Max delay: 30s

### SERVER_ERROR
For 5xx errors:
- Max retries: 3
- Base delay: 500ms
- Backoff: Progressive (500ms → 1s → 2s)
- Max delay: 4s

### TWITCH_API
Optimized combination for Twitch API:
- Max retries: 3
- Base delay: 500ms
- Backoff: Exponential
- Retryable errors: 429, 500, 502, 503, 504
- Circuit breaker: enabled (key: 'twitch-api')
- Timeout per attempt: 10s
- Max delay: 30s

## Circuit Breaker

### States

1. **CLOSED** (Normal)
   - All requests pass through
   - Failures are counted

2. **OPEN** (Blocked)
   - Activated after N consecutive failures (default: 5)
   - All requests are immediately rejected
   - Duration: 30 seconds by default

3. **HALF_OPEN** (Test)
   - After timeout, 1-2 requests are allowed
   - Success → return to CLOSED
   - Failure → return to OPEN

### Configuration

```typescript
const retryUtility = new RetryUtility({
  failureThreshold: 5,    // Failures before opening
  resetTimeoutMs: 30000,  // OPEN duration
  successThreshold: 2,    // Successes to close
})
```

### Redis Keys

```
circuit:{key}:state       → 'CLOSED' | 'OPEN' | 'HALF_OPEN'
circuit:{key}:failures    → failure counter
circuit:{key}:successes   → success counter (half-open)
circuit:{key}:openedAt    → open timestamp
```

## Backoff Strategies

### Exponential with Jitter

```
delay = baseDelay × 2^attempt + random(0, 1000)
```

Example with baseDelay=500ms:
- Attempt 1: 500-1500ms
- Attempt 2: 1000-2000ms
- Attempt 3: 2000-3000ms

### Progressive

```
delay = baseDelay × (attempt + 1)
```

Example with baseDelay=500ms:
- Attempt 1: 500ms
- Attempt 2: 1000ms
- Attempt 3: 1500ms

### Retry-After Header

If the API returns a `Retry-After` header, this delay is used as priority (converted to milliseconds).

## Observability

### Logs

Each attempt and final result is logged via `@adonisjs/core/services/logger`:

```
[INFO] RetryUtility: Attempt 1/4 for TwitchPollService:createPoll
[WARN] RetryUtility: Attempt 2/4 failed (429), retrying in 1523ms
[INFO] RetryUtility: Success after 2 attempts (1845ms total)
```

### WebSocket

Real-time notifications to GM via `campaign:{id}:notifications` channel:

```typescript
// Emitted events
'api:retry'           // On each attempt
'api:retry-success'   // Success after retry(s)
'api:retry-exhausted' // Final failure
```

### Database

Events are persisted in the `retry_events` table for analytics:

```typescript
interface RetryEvent {
  id: string
  service: string           // e.g., 'TwitchPollService'
  operation: string         // e.g., 'createPoll'
  attempts: number
  success: boolean
  totalDurationMs: number
  finalStatusCode: number | null
  errorMessage: string | null
  circuitBreakerTriggered: boolean
  circuitBreakerKey: string | null
  metadata: Record<string, unknown> | null
  streamerId: string | null
  campaignId: string | null
  pollInstanceId: string | null
  createdAt: DateTime
}
```

## RetryResult

Structure returned by `execute()`:

```typescript
interface RetryResult<T> {
  success: boolean
  data?: T                          // Data if success
  error?: Error                     // Error if failure
  attempts: number                  // Number of attempts
  totalDurationMs: number           // Total duration
  circuitBreakerOpen: boolean       // If blocked by circuit breaker
  attemptDetails: AttemptDetail[]   // Detail of each attempt
}

interface AttemptDetail {
  attempt: number
  statusCode?: number
  errorMessage?: string
  delayMs: number                   // Delay before this attempt
  durationMs: number                // Duration of this attempt
  timestamp: Date
  usedRetryAfter: boolean
}
```

## Integration with Token Refresh

For APIs requiring token refresh (401), combine with `withTokenRefresh`:

```typescript
async withTokenRefreshAndRetry<T>(
  operation: (accessToken: string) => Promise<HttpCallResult<T>>,
  getAccessToken: () => Promise<string>,
  refreshToken: string,
  onTokenRefreshed: (newAccess: string, newRefresh: string) => Promise<void>,
  retryOptions: RetryOptions
): Promise<RetryResult<T>> {
  // 1. Attempt operation with retry
  // 2. On 401, refresh token and retry
  // 3. Other errors handled by RetryUtility
}
```

## Tests

Unit tests cover:

- `backoff_strategy.spec.ts`: Delay calculation
- `circuit_breaker.spec.ts`: States and transitions
- `retry_utility.spec.ts`: Complete retry logic

Run:
```bash
npm run test:unit -- --files="tests/unit/services/resilience/**"
```

## Best Practices

1. **Always define a context** for logging/tracking
2. **Use distinct circuit breaker keys** per service/endpoint
3. **Respect Retry-After headers** from APIs
4. **Don't retry client errors** (4xx except 429)
5. **Monitor retry_events** to detect recurring issues
6. **Configure alerts** on open circuit breakers
