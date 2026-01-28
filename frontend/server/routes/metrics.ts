import { getMetrics, getMetricsContentType } from '../utils/metrics'

/**
 * GET /metrics
 * Prometheus metrics endpoint
 * Returns all metrics in Prometheus text format
 */
export default defineEventHandler(async (event) => {
  const metrics = await getMetrics()

  setHeader(event, 'Content-Type', getMetricsContentType())
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')

  return metrics
})
