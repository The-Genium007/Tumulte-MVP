import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * Configuration for progressive lockout
 * Based on OWASP recommendations for brute force protection
 */
interface LockoutConfig {
  /** Max failed attempts before lockout starts */
  maxAttempts: number
  /** Base lockout duration in seconds (doubles with each lockout) */
  baseLockoutSeconds: number
  /** Maximum lockout duration in seconds */
  maxLockoutSeconds: number
  /** Window in seconds for counting failed attempts */
  attemptWindowSeconds: number
  /** Key prefix for Redis */
  keyPrefix: string
}

const DEFAULT_CONFIG: LockoutConfig = {
  maxAttempts: 5,
  baseLockoutSeconds: 30,
  maxLockoutSeconds: 3600, // 1 hour max
  attemptWindowSeconds: 900, // 15 minutes
  keyPrefix: 'auth_lockout',
}

/**
 * Middleware for progressive account lockout
 *
 * Implements OWASP brute force protection:
 * - Tracks failed login attempts per IP + email combination
 * - Implements exponential backoff (30s, 60s, 120s, 240s... up to 1h)
 * - Separate tracking for IP-only and IP+email
 * - Fail-closed on Redis errors (security first)
 */
export default class AuthLockoutMiddleware {
  async handle(
    { request, response }: HttpContext,
    next: NextFn,
    options: Partial<LockoutConfig> = {}
  ) {
    const config = { ...DEFAULT_CONFIG, ...options }
    const ip = request.ip()

    // Get email from request body for more targeted lockout
    const body = request.body()
    const email = body?.email?.toLowerCase?.()?.trim?.() || ''

    // Two-layer protection: IP-only and IP+email
    const ipKey = `${config.keyPrefix}:ip:${ip}`
    const comboKey = email ? `${config.keyPrefix}:combo:${ip}:${email}` : null

    try {
      // Check IP-level lockout first (prevents distributed attacks on single IP)
      const ipLockout = await this.checkLockout(ipKey, config)
      if (ipLockout.locked) {
        logger.warn({ ip, remainingSeconds: ipLockout.remainingSeconds }, 'IP locked out')
        return this.sendLockoutResponse(response, ipLockout.remainingSeconds)
      }

      // Check IP+email combo lockout (more targeted)
      if (comboKey) {
        const comboLockout = await this.checkLockout(comboKey, config)
        if (comboLockout.locked) {
          logger.warn(
            { ip, email: this.maskEmail(email), remainingSeconds: comboLockout.remainingSeconds },
            'IP+Email combo locked out'
          )
          return this.sendLockoutResponse(response, comboLockout.remainingSeconds)
        }
      }

      // Store keys in request for post-response tracking
      request.ctx!.lockoutKeys = { ipKey, comboKey }
      request.ctx!.lockoutConfig = config
    } catch (error) {
      // Fail closed - block request if Redis is unavailable
      logger.error({ error, ip }, 'Lockout check failed - blocking request (fail closed)')
      return response.serviceUnavailable({
        error: 'Service temporarily unavailable',
        message: 'Security service is unavailable. Please try again later.',
      })
    }

    await next()
  }

  /**
   * Check if the key is currently locked out
   */
  private async checkLockout(
    key: string,
    _config: LockoutConfig
  ): Promise<{ locked: boolean; remainingSeconds: number }> {
    const lockKey = `${key}:lock`
    const ttl = await redis.ttl(lockKey)

    if (ttl > 0) {
      return { locked: true, remainingSeconds: ttl }
    }

    return { locked: false, remainingSeconds: 0 }
  }

  /**
   * Record a failed login attempt and potentially trigger lockout
   * Called from login controller on failed authentication
   */
  static async recordFailedAttempt(
    ip: string,
    email?: string,
    config: Partial<LockoutConfig> = {}
  ): Promise<void> {
    const cfg = { ...DEFAULT_CONFIG, ...config }

    const ipKey = `${cfg.keyPrefix}:ip:${ip}`
    const comboKey = email ? `${cfg.keyPrefix}:combo:${ip}:${email.toLowerCase().trim()}` : null

    try {
      // Increment IP attempts
      await AuthLockoutMiddleware.incrementAndMaybeLock(ipKey, cfg)

      // Increment combo attempts if email provided
      if (comboKey) {
        await AuthLockoutMiddleware.incrementAndMaybeLock(comboKey, cfg)
      }
    } catch (error) {
      logger.error({ error, ip }, 'Failed to record failed login attempt')
    }
  }

  /**
   * Clear lockout on successful login
   */
  static async clearLockout(ip: string, email?: string): Promise<void> {
    const ipKey = `${DEFAULT_CONFIG.keyPrefix}:ip:${ip}`
    const comboKey = email
      ? `${DEFAULT_CONFIG.keyPrefix}:combo:${ip}:${email.toLowerCase().trim()}`
      : null

    try {
      await redis.del(`${ipKey}:attempts`)
      await redis.del(`${ipKey}:lock`)
      await redis.del(`${ipKey}:lockouts`)

      if (comboKey) {
        await redis.del(`${comboKey}:attempts`)
        await redis.del(`${comboKey}:lock`)
        await redis.del(`${comboKey}:lockouts`)
      }
    } catch (error) {
      logger.error({ error, ip }, 'Failed to clear lockout')
    }
  }

  /**
   * Increment attempt counter and apply lockout if threshold exceeded
   */
  private static async incrementAndMaybeLock(key: string, config: LockoutConfig): Promise<void> {
    const attemptsKey = `${key}:attempts`
    const lockKey = `${key}:lock`
    const lockoutsKey = `${key}:lockouts`

    // Increment attempts
    const attempts = await redis.incr(attemptsKey)

    // Set expiry on first attempt
    if (attempts === 1) {
      await redis.expire(attemptsKey, config.attemptWindowSeconds)
    }

    // Check if lockout should be triggered
    if (attempts >= config.maxAttempts) {
      // Get current lockout count for exponential backoff
      const lockoutCount = await redis.incr(lockoutsKey)

      // Calculate lockout duration with exponential backoff
      const lockoutDuration = Math.min(
        config.baseLockoutSeconds * Math.pow(2, lockoutCount - 1),
        config.maxLockoutSeconds
      )

      // Set lockout
      await redis.setex(lockKey, lockoutDuration, '1')

      // Reset attempts counter
      await redis.del(attemptsKey)

      // Set lockouts counter expiry (resets after long period of no lockouts)
      await redis.expire(lockoutsKey, config.maxLockoutSeconds * 2)

      logger.info(
        { key, lockoutDuration, lockoutCount },
        'Account lockout triggered due to failed attempts'
      )
    }
  }

  /**
   * Send lockout response with retry-after header
   */
  private sendLockoutResponse(response: HttpContext['response'], remainingSeconds: number) {
    response.header('Retry-After', String(remainingSeconds))
    return response.tooManyRequests({
      error: 'Trop de tentatives',
      message: `Compte temporairement verrouillé. Réessayez dans ${this.formatDuration(remainingSeconds)}.`,
      retryAfter: remainingSeconds,
    })
  }

  /**
   * Format duration for user-friendly display
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} seconde${seconds > 1 ? 's' : ''}`
    }
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  /**
   * Mask email for logging (privacy)
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!local || !domain) return '***'
    const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***'
    return `${maskedLocal}@${domain}`
  }
}

// Extend HttpContext to include lockout keys
declare module '@adonisjs/core/http' {
  interface HttpContext {
    lockoutKeys?: { ipKey: string; comboKey: string | null }
    lockoutConfig?: LockoutConfig
  }
}
