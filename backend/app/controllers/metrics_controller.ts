import type { HttpContext } from '@adonisjs/core/http'
import { getMetricsService } from '#services/monitoring/metrics_service'

/**
 * Controller for Prometheus metrics endpoint.
 * Exposes application metrics for monitoring.
 */
export default class MetricsController {
  /**
   * GET /metrics
   * Returns all metrics in Prometheus format
   */
  async index({ response }: HttpContext) {
    const metricsService = getMetricsService()

    const metrics = await metricsService.getMetrics()
    const contentType = metricsService.getContentType()

    return response.header('Content-Type', contentType).send(metrics)
  }
}
