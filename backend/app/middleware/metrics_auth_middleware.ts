import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

/**
 * Middleware to protect the /metrics endpoint for Prometheus scraping.
 *
 * Accepts requests with a valid Bearer token matching METRICS_TOKEN env var.
 * If METRICS_TOKEN is not set, the endpoint is open (dev-friendly default).
 */
export default class MetricsAuthMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const expectedToken = env.get('METRICS_TOKEN')

    // No token configured = open access (dev mode)
    if (!expectedToken) {
      return next()
    }

    const authHeader = request.header('authorization')
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return response.unauthorized({ error: 'Invalid metrics token.' })
    }

    return next()
  }
}
