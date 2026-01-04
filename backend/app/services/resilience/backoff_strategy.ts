/**
 * Backoff Strategy Service
 * Calculates delays for retry attempts using various strategies
 *
 * Security: All parameters are validated to prevent DoS via excessive delays
 */

// Maximum safe values to prevent DoS
const MAX_ATTEMPT = 10 // Prevent Math.pow(2, 1000) = Infinity
const MAX_BASE_DELAY_MS = 60000 // 1 minute
const MAX_DELAY_CAP_MS = 300000 // 5 minutes
const MAX_RETRY_AFTER_SECONDS = 300 // 5 minutes - don't trust external APIs blindly

export class BackoffStrategy {
  /**
   * Validate and sanitize backoff parameters
   * @throws Error if parameters are invalid
   */
  private validateParams(attempt: number, baseDelayMs: number, maxDelayMs: number): void {
    if (attempt < 0 || attempt > MAX_ATTEMPT) {
      throw new Error(`Attempt must be between 0 and ${MAX_ATTEMPT}, got ${attempt}`)
    }
    if (baseDelayMs < 0 || baseDelayMs > MAX_BASE_DELAY_MS) {
      throw new Error(`baseDelayMs must be between 0 and ${MAX_BASE_DELAY_MS}, got ${baseDelayMs}`)
    }
    if (maxDelayMs < 0 || maxDelayMs > MAX_DELAY_CAP_MS) {
      throw new Error(`maxDelayMs must be between 0 and ${MAX_DELAY_CAP_MS}, got ${maxDelayMs}`)
    }
  }

  /**
   * Sanitize Retry-After header value to prevent DoS from malicious APIs
   */
  private sanitizeRetryAfter(retryAfterSeconds: number | undefined): number | undefined {
    if (retryAfterSeconds === undefined || retryAfterSeconds <= 0) {
      return undefined
    }
    // Cap at maximum safe value
    return Math.min(retryAfterSeconds, MAX_RETRY_AFTER_SECONDS)
  }
  /**
   * Calculate exponential backoff with jitter
   * Formula: baseDelay × 2^attempt + random(0, 1000)
   *
   * @param attempt - Current attempt number (0-indexed)
   * @param baseDelayMs - Base delay in milliseconds
   * @param maxDelayMs - Maximum delay cap in milliseconds
   * @returns Calculated delay in milliseconds
   */
  calculateExponentialWithJitter(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
    // Calculate exponential delay: baseDelay × 2^attempt
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt)

    // Add random jitter between 0 and 1000ms to prevent thundering herd
    const jitter = Math.floor(Math.random() * 1000)

    // Apply the maximum delay cap
    return Math.min(exponentialDelay + jitter, maxDelayMs)
  }

  /**
   * Calculate progressive delay (fixed increments)
   * Pattern: 500ms -> 1s -> 2s -> 4s (doubles each attempt)
   *
   * @param attempt - Current attempt number (0-indexed)
   * @param baseDelayMs - Base delay in milliseconds
   * @returns Calculated delay in milliseconds
   */
  calculateProgressive(attempt: number, baseDelayMs: number): number {
    // Simple doubling: baseDelay × 2^attempt
    return baseDelayMs * Math.pow(2, attempt)
  }

  /**
   * Calculate delay respecting Retry-After header
   * If Retry-After is provided, use it; otherwise fall back to calculated delay
   *
   * @param retryAfterSeconds - Value from Retry-After header (in seconds)
   * @param fallbackDelayMs - Fallback delay if Retry-After not provided
   * @returns Delay in milliseconds
   */
  calculateWithRetryAfter(retryAfterSeconds: number | undefined, fallbackDelayMs: number): number {
    if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
      // Convert seconds to milliseconds
      return retryAfterSeconds * 1000
    }
    return fallbackDelayMs
  }

  /**
   * Calculate the appropriate delay based on options
   *
   * @param attempt - Current attempt number (0-indexed)
   * @param baseDelayMs - Base delay in milliseconds
   * @param maxDelayMs - Maximum delay cap in milliseconds
   * @param useExponential - Whether to use exponential backoff with jitter
   * @param retryAfterSeconds - Optional Retry-After header value
   * @returns Calculated delay in milliseconds
   */
  calculate(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
    useExponential: boolean,
    retryAfterSeconds?: number
  ): number {
    // Validate parameters to prevent DoS
    this.validateParams(attempt, baseDelayMs, maxDelayMs)

    // Sanitize Retry-After to prevent external API DoS
    const safeRetryAfter = this.sanitizeRetryAfter(retryAfterSeconds)

    // First, calculate the base delay based on strategy
    let baseCalculatedDelay: number

    if (useExponential) {
      baseCalculatedDelay = this.calculateExponentialWithJitter(attempt, baseDelayMs, maxDelayMs)
    } else {
      baseCalculatedDelay = Math.min(this.calculateProgressive(attempt, baseDelayMs), maxDelayMs)
    }

    // If Retry-After is provided, respect it (but apply maxDelayMs cap)
    if (safeRetryAfter !== undefined) {
      const retryAfterMs = safeRetryAfter * 1000
      return Math.min(retryAfterMs, maxDelayMs)
    }

    return baseCalculatedDelay
  }
}

export default BackoffStrategy
