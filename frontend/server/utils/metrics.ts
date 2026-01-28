import client, { Registry, Counter, Histogram, Gauge } from 'prom-client'

/**
 * Prometheus metrics service for frontend observability.
 * Exposes metrics for monitoring with Grafana/Prometheus.
 *
 * Metrics include:
 * - HTTP request count and duration
 * - Active connections
 * - Default Node.js metrics (CPU, memory, event loop, GC)
 */

const registry = new Registry()

// Collect default Node.js metrics (CPU, memory, event loop, GC)
client.collectDefaultMetrics({
  register: registry,
  prefix: 'tumulte_frontend_',
})

// HTTP metrics
export const httpRequestsTotal = new Counter({
  name: 'tumulte_frontend_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
})

export const httpRequestDuration = new Histogram({
  name: 'tumulte_frontend_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
})

// Connection metrics
export const activeConnections = new Gauge({
  name: 'tumulte_frontend_active_connections',
  help: 'Number of active HTTP connections',
  registers: [registry],
})

/**
 * Record an HTTP request
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationMs: number
): void {
  // eslint-disable-next-line camelcase -- Prometheus convention uses snake_case for labels
  const labels = { method, route, status_code: String(statusCode) }
  httpRequestsTotal.inc(labels)
  httpRequestDuration.observe(labels, durationMs / 1000)
}

/**
 * Update active connections count
 */
export function setActiveConnections(count: number): void {
  activeConnections.set(count)
}

/**
 * Get all metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics()
}

/**
 * Get content type for Prometheus
 */
export function getMetricsContentType(): string {
  return registry.contentType
}
