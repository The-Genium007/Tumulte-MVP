/**
 * Resilience Types & Interfaces
 * Agnostic retry system for API calls
 */

/**
 * Configuration for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (excluding initial attempt) */
  maxRetries: number

  /** Base delay in milliseconds for backoff calculation */
  baseDelayMs: number

  /** Maximum delay cap in milliseconds */
  maxDelayMs: number

  /** Enable exponential backoff with jitter (true) or progressive delay (false) */
  useExponentialBackoff: boolean

  /** List of HTTP status codes that should trigger a retry */
  retryableErrors: number[]

  /** Optional timeout for each attempt in milliseconds */
  attemptTimeoutMs?: number

  /** Identifier for circuit breaker grouping (e.g., 'twitch-api', 'twitch-polls') */
  circuitBreakerKey?: string

  /** Context for logging/tracking */
  context?: RetryContext
}

/**
 * Contextual information for logging and tracking
 */
export interface RetryContext {
  /** Service making the call */
  service: string

  /** Operation being performed */
  operation: string

  /** Additional metadata */
  metadata?: Record<string, unknown>

  /** Campaign ID for context */
  campaignId?: string

  /** Poll instance ID for context */
  pollInstanceId?: string

  /** Streamer ID for context */
  streamerId?: string
}

/**
 * Result of a retry-wrapped operation
 */
export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean

  /** The result data if successful */
  data?: T

  /** The final error if all retries failed */
  error?: Error

  /** Total number of attempts made */
  attempts: number

  /** Total time spent in milliseconds */
  totalDurationMs: number

  /** Whether circuit breaker was open */
  circuitBreakerOpen: boolean

  /** Details of each attempt */
  attemptDetails: AttemptDetail[]
}

/**
 * Details of a single retry attempt
 */
export interface AttemptDetail {
  /** Attempt number (1-indexed) */
  attempt: number

  /** HTTP status code if applicable */
  statusCode?: number

  /** Error message if failed */
  errorMessage?: string

  /** Delay waited before this attempt in milliseconds */
  delayMs: number

  /** Duration of this attempt in milliseconds */
  durationMs: number

  /** Timestamp of attempt */
  timestamp: Date

  /** Whether Retry-After header was respected */
  usedRetryAfter: boolean
}

/**
 * Standardized response wrapper for HTTP calls
 * Operations must return this format to work with RetryUtility
 */
export interface HttpCallResult<T> {
  /** Whether the HTTP call was successful (2xx) */
  success: boolean

  /** The response data if successful */
  data?: T

  /** HTTP status code */
  statusCode: number

  /** Value from Retry-After header in seconds (for 429 responses) */
  retryAfterSeconds?: number

  /** Error details if not successful */
  error?: Error
}

/**
 * Circuit breaker state
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number

  /** Time in milliseconds before attempting half-open state */
  resetTimeoutMs: number

  /** Number of successful calls in half-open state to close the circuit */
  successThreshold: number
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  successThreshold: 2,
}

/**
 * Retry event data for database storage
 */
export interface RetryEventData {
  service: string
  operation: string
  attempts: number
  success: boolean
  totalDurationMs: number
  finalStatusCode?: number
  errorMessage?: string
  circuitBreakerTriggered: boolean
  circuitBreakerKey?: string
  metadata?: Record<string, unknown>
  streamerId?: string
  campaignId?: string
  pollInstanceId?: string
}

/**
 * Pre-defined retry policies for common scenarios
 */
export const RetryPolicies = {
  /**
   * For rate-limited APIs (429 responses)
   * Uses exponential backoff with jitter
   */
  RATE_LIMITED: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    useExponentialBackoff: true,
    retryableErrors: [429],
  } as Omit<RetryOptions, 'context'>,

  /**
   * For server errors (5xx responses)
   * Uses progressive delay (500ms -> 1s -> 2s)
   */
  SERVER_ERROR: {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 4000,
    useExponentialBackoff: false,
    retryableErrors: [500, 502, 503, 504],
  } as Omit<RetryOptions, 'context'>,

  /**
   * Combined policy for Twitch API calls
   * Handles both rate limiting and server errors
   */
  TWITCH_API: {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 30000,
    useExponentialBackoff: true,
    retryableErrors: [429, 500, 502, 503, 504],
    circuitBreakerKey: 'twitch-api',
    attemptTimeoutMs: 10000,
  } as Omit<RetryOptions, 'context'>,

  /**
   * For Twitch poll operations (critical path)
   */
  TWITCH_POLLS: {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 30000,
    useExponentialBackoff: true,
    retryableErrors: [429, 500, 502, 503, 504],
    circuitBreakerKey: 'twitch-polls',
    attemptTimeoutMs: 10000,
  } as Omit<RetryOptions, 'context'>,
} as const
