import client, { Registry, Counter, Histogram, Gauge } from 'prom-client'

/**
 * Prometheus metrics service for observability.
 * Exposes metrics for monitoring with Grafana/Prometheus.
 *
 * Metrics include:
 * - HTTP request count and duration
 * - WebSocket connections
 * - Business metrics (polls, votes)
 * - Database and Redis connection pools
 */
export default class MetricsService {
  private registry: Registry
  private initialized = false

  // HTTP metrics
  public httpRequestsTotal!: Counter
  public httpRequestDuration!: Histogram

  // WebSocket metrics
  public websocketConnectionsTotal!: Gauge

  // Business metrics
  public pollsLaunchedTotal!: Counter
  public pollsActiveTotal!: Gauge
  public votesReceivedTotal!: Counter

  // Infrastructure metrics
  public dbConnectionsActive!: Gauge
  public dbConnectionsIdle!: Gauge
  public redisConnectionsActive!: Gauge

  // Cache metrics
  public cacheHitsTotal!: Counter
  public cacheMissesTotal!: Counter

  constructor() {
    this.registry = new Registry()
    this.initializeMetrics()
  }

  private initializeMetrics(): void {
    if (this.initialized) return
    this.initialized = true

    // Collect default Node.js metrics (CPU, memory, event loop, GC)
    client.collectDefaultMetrics({
      register: this.registry,
      prefix: 'tumulte_',
    })

    // HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'tumulte_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    })

    this.httpRequestDuration = new Histogram({
      name: 'tumulte_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    })

    // WebSocket metrics
    this.websocketConnectionsTotal = new Gauge({
      name: 'tumulte_websocket_connections_total',
      help: 'Current number of WebSocket connections',
      registers: [this.registry],
    })

    // Business metrics
    this.pollsLaunchedTotal = new Counter({
      name: 'tumulte_polls_launched_total',
      help: 'Total number of polls launched',
      labelNames: ['campaign_id'],
      registers: [this.registry],
    })

    this.pollsActiveTotal = new Gauge({
      name: 'tumulte_polls_active_total',
      help: 'Current number of active polls',
      registers: [this.registry],
    })

    this.votesReceivedTotal = new Counter({
      name: 'tumulte_votes_received_total',
      help: 'Total number of votes received',
      labelNames: ['campaign_id', 'streamer_id'],
      registers: [this.registry],
    })

    // Database pool metrics
    this.dbConnectionsActive = new Gauge({
      name: 'tumulte_db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    })

    this.dbConnectionsIdle = new Gauge({
      name: 'tumulte_db_connections_idle',
      help: 'Number of idle database connections',
      registers: [this.registry],
    })

    // Redis metrics
    this.redisConnectionsActive = new Gauge({
      name: 'tumulte_redis_connections_active',
      help: 'Number of active Redis connections',
      registers: [this.registry],
    })

    // Cache metrics
    this.cacheHitsTotal = new Counter({
      name: 'tumulte_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
      registers: [this.registry],
    })

    this.cacheMissesTotal = new Counter({
      name: 'tumulte_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
      registers: [this.registry],
    })
  }

  /**
   * Record an HTTP request
   */
  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    // eslint-disable-next-line camelcase
    const labels = { method, route, status_code: String(statusCode) }
    this.httpRequestsTotal.inc(labels)
    this.httpRequestDuration.observe(labels, durationMs / 1000)
  }

  /**
   * Update WebSocket connection count
   */
  setWebsocketConnections(count: number): void {
    this.websocketConnectionsTotal.set(count)
  }

  /**
   * Record a poll launch
   */
  recordPollLaunch(campaignId: string): void {
    this.pollsLaunchedTotal.inc({ campaign_id: campaignId })
  }

  /**
   * Update active polls count
   */
  setActivePolls(count: number): void {
    this.pollsActiveTotal.set(count)
  }

  /**
   * Record a vote
   */
  recordVote(campaignId: string, streamerId: string): void {
    this.votesReceivedTotal.inc({ campaign_id: campaignId, streamer_id: streamerId })
  }

  /**
   * Update database pool metrics
   */
  setDbPoolMetrics(active: number, idle: number): void {
    this.dbConnectionsActive.set(active)
    this.dbConnectionsIdle.set(idle)
  }

  /**
   * Update Redis connection count
   */
  setRedisConnections(count: number): void {
    this.redisConnectionsActive.set(count)
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheType: string): void {
    // eslint-disable-next-line camelcase
    this.cacheHitsTotal.inc({ cache_type: cacheType })
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheType: string): void {
    // eslint-disable-next-line camelcase
    this.cacheMissesTotal.inc({ cache_type: cacheType })
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics()
  }

  /**
   * Get content type for Prometheus
   */
  getContentType(): string {
    return this.registry.contentType
  }
}

// Singleton instance
let metricsServiceInstance: MetricsService | null = null

export function getMetricsService(): MetricsService {
  if (!metricsServiceInstance) {
    metricsServiceInstance = new MetricsService()
  }
  return metricsServiceInstance
}
