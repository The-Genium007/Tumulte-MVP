import { getMetrics, getMetricsContentType } from '../utils/metrics'

/**
 * GET /metrics
 * Prometheus metrics endpoint
 * Returns all metrics in Prometheus text format
 *
 * Protected by IP allowlist or Bearer token to prevent public access
 * to internal application metrics (CPU, memory, request rates, etc.)
 */
export default defineEventHandler(async (event) => {
  // Check for Bearer token or IP allowlist
  const authHeader = getRequestHeader(event, 'authorization')
  const metricsToken = process.env.METRICS_AUTH_TOKEN

  if (metricsToken) {
    // Token-based auth: Prometheus scraper sends Bearer token
    if (authHeader !== `Bearer ${metricsToken}`) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  } else {
    // IP-based fallback: only allow localhost / Docker internal
    const ip = getRequestIP(event, { xForwardedFor: false }) ?? ''
    const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1']
    if (!allowedIPs.includes(ip)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  const metrics = await getMetrics()

  setHeader(event, 'Content-Type', getMetricsContentType())
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')

  return metrics
})
