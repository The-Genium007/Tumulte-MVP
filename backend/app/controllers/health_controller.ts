import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  latencyMs?: number
  error?: string
  details?: Record<string, unknown>
}

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    database: ServiceStatus
    redis: ServiceStatus
  }
  instance: {
    memoryUsage: {
      heapUsed: string
      heapTotal: string
      rss: string
    }
    pid: number
  }
}

/**
 * Controller for health check endpoints.
 * Provides both simple and detailed health information.
 */
export default class HealthController {
  /**
   * GET /health
   * Simple health check for Docker/Kubernetes probes
   */
  async simple({ response }: HttpContext) {
    return response.ok({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * GET /health/details
   * Detailed health check with service status
   * Protected endpoint for debugging
   */
  async details({ response }: HttpContext): Promise<void> {
    const startTime = Date.now()

    const [databaseStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ])

    const memoryUsage = process.memoryUsage()
    const overallStatus = this.determineOverallStatus([databaseStatus, redisStatus])

    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: env.get('APP_VERSION', '0.0.0'),
      environment: env.get('NODE_ENV', 'development'),
      services: {
        database: databaseStatus,
        redis: redisStatus,
      },
      instance: {
        memoryUsage: {
          heapUsed: this.formatBytes(memoryUsage.heapUsed),
          heapTotal: this.formatBytes(memoryUsage.heapTotal),
          rss: this.formatBytes(memoryUsage.rss),
        },
        pid: process.pid,
      },
    }

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

    response.header('X-Health-Check-Duration-Ms', String(Date.now() - startTime))
    return response.status(statusCode).send(healthResponse)
  }

  /**
   * GET /health/ready
   * Readiness probe - checks if app can serve traffic
   */
  async ready({ response }: HttpContext) {
    const [dbOk, redisOk] = await Promise.all([this.isDatabaseReady(), this.isRedisReady()])

    if (dbOk && redisOk) {
      return response.ok({ ready: true })
    }

    return response.serviceUnavailable({
      ready: false,
      database: dbOk,
      redis: redisOk,
    })
  }

  /**
   * GET /health/live
   * Liveness probe - checks if app is running
   */
  async live({ response }: HttpContext) {
    return response.ok({ alive: true })
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const start = Date.now()

    try {
      await db.rawQuery('SELECT 1')
      const latencyMs = Date.now() - start

      // Get pool stats if available (Knex internal API)
      const client = db.connection().getReadClient() as unknown as {
        pool?: {
          numUsed: () => number
          numFree: () => number
          numPendingAcquires: () => number
          numPendingCreates: () => number
        }
      }
      const pool = client.pool
      const poolDetails = pool
        ? {
            total: pool.numUsed() + pool.numFree(),
            used: pool.numUsed(),
            free: pool.numFree(),
            pendingAcquires: pool.numPendingAcquires(),
            pendingCreates: pool.numPendingCreates(),
          }
        : undefined

      return {
        status: 'healthy',
        latencyMs,
        details: poolDetails ? { pool: poolDetails } : undefined,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    const start = Date.now()

    try {
      await redis.ping()
      const latencyMs = Date.now() - start

      // Get Redis info
      const info = await redis.info('memory')
      const usedMemoryMatch = info.match(/used_memory_human:(\S+)/)
      const usedMemory = usedMemoryMatch ? usedMemoryMatch[1] : 'unknown'

      return {
        status: 'healthy',
        latencyMs,
        details: {
          memoryUsed: usedMemory,
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async isDatabaseReady(): Promise<boolean> {
    try {
      await db.rawQuery('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  private async isRedisReady(): Promise<boolean> {
    try {
      await redis.ping()
      return true
    } catch {
      return false
    }
  }

  private determineOverallStatus(statuses: ServiceStatus[]): 'healthy' | 'unhealthy' | 'degraded' {
    const hasUnhealthy = statuses.some((s) => s.status === 'unhealthy')
    const hasDegraded = statuses.some((s) => s.status === 'degraded')

    if (hasUnhealthy) return 'unhealthy'
    if (hasDegraded) return 'degraded'
    return 'healthy'
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let unitIndex = 0
    let value = bytes

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex++
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`
  }
}
