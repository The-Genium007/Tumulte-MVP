import { recordHttpRequest } from '../utils/metrics'

/**
 * Middleware to record HTTP request metrics for Prometheus
 * Records: method, route, status_code, duration
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const method = event.method
  const path = getRequestURL(event).pathname

  // Skip metrics for health and metrics endpoints to avoid noise
  if (path.startsWith('/health') || path === '/metrics') {
    return
  }

  // Use onAfterResponse to capture the response status
  event.node.res.on('finish', () => {
    const duration = Date.now() - startTime
    const statusCode = event.node.res.statusCode

    // Normalize route to avoid high cardinality
    // Replace dynamic segments like UUIDs and numbers with placeholders
    const normalizedRoute = path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')

    recordHttpRequest(method, normalizedRoute, statusCode, duration)
  })
})
