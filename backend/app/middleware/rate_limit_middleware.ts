import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * Options for rate limiting configuration
 */
export interface RateLimitOptions {
  maxRequests?: number
  windowSeconds?: number
  /**
   * Optional key prefix for route-specific limits
   * e.g., 'auth' will use 'rate_limit:auth:{ip}' instead of 'rate_limit:{ip}'
   */
  keyPrefix?: string
}

/**
 * Middleware de rate limiting basé sur Redis
 * Limite le nombre de requêtes par IP sur une fenêtre de temps
 *
 * Usage in routes:
 * .use(middleware.rateLimit({ maxRequests: 10, windowSeconds: 60, keyPrefix: 'auth' }))
 * or
 * .use(middleware.rateLimit()) // uses defaults: 60 requests per 60 seconds
 */
export default class RateLimitMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn, options: RateLimitOptions = {}) {
    const maxRequests = options.maxRequests ?? 60
    const windowSeconds = options.windowSeconds ?? 60
    const keyPrefix = options.keyPrefix ?? 'default'

    const ip = request.ip()
    const key = `rate_limit:${keyPrefix}:${ip}`

    try {
      const current = await redis.incr(key)

      // Définir l'expiration uniquement sur la première requête de la fenêtre
      if (current === 1) {
        await redis.expire(key, windowSeconds)
      }

      // Ajouter les headers de rate limit
      const ttl = await redis.ttl(key)
      response.header('X-RateLimit-Limit', String(maxRequests))
      response.header('X-RateLimit-Remaining', String(Math.max(0, maxRequests - current)))
      response.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + ttl))

      // Vérifier si la limite est dépassée
      if (current > maxRequests) {
        logger.warn({ ip, current, limit: maxRequests, keyPrefix }, 'Rate limit exceeded')
        response.header('Retry-After', String(ttl))
        return response.tooManyRequests({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: ttl,
        })
      }
    } catch (error) {
      // En cas d'erreur Redis, on bloque la requête (fail closed)
      // pour éviter les abus quand le rate limiting est indisponible
      logger.error(
        { error, ip, keyPrefix },
        'Rate limit check failed - blocking request (fail closed)'
      )
      return response.serviceUnavailable({
        error: 'Service temporarily unavailable',
        message: 'Rate limiting service is unavailable. Please try again later.',
      })
    }

    await next()
  }
}
