import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * Middleware de rate limiting basé sur Redis
 * Limite le nombre de requêtes par IP sur une fenêtre de temps
 */
export default class RateLimitMiddleware {
  /**
   * Nombre maximum de requêtes par fenêtre
   */
  private maxRequests: number

  /**
   * Durée de la fenêtre en secondes
   */
  private windowSeconds: number

  constructor(maxRequests: number = 60, windowSeconds: number = 60) {
    this.maxRequests = maxRequests
    this.windowSeconds = windowSeconds
  }

  async handle({ request, response }: HttpContext, next: NextFn) {
    const ip = request.ip()
    const key = `rate_limit:${ip}`

    try {
      const current = await redis.incr(key)

      // Définir l'expiration uniquement sur la première requête de la fenêtre
      if (current === 1) {
        await redis.expire(key, this.windowSeconds)
      }

      // Ajouter les headers de rate limit
      const ttl = await redis.ttl(key)
      response.header('X-RateLimit-Limit', String(this.maxRequests))
      response.header('X-RateLimit-Remaining', String(Math.max(0, this.maxRequests - current)))
      response.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + ttl))

      // Vérifier si la limite est dépassée
      if (current > this.maxRequests) {
        logger.warn({ ip, current, limit: this.maxRequests }, 'Rate limit exceeded')
        response.header('Retry-After', String(ttl))
        return response.tooManyRequests({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: ttl,
        })
      }
    } catch (error) {
      // En cas d'erreur Redis, on laisse passer (fail open)
      // mais on log l'erreur pour investigation
      logger.error({ error, ip }, 'Rate limit check failed')
    }

    await next()
  }
}

/**
 * Factory pour créer des instances avec différentes configurations
 */
export function rateLimitMiddleware(maxRequests: number = 60, windowSeconds: number = 60) {
  return new RateLimitMiddleware(maxRequests, windowSeconds)
}
