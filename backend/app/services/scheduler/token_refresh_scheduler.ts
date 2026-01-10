import cron from 'node-cron'
import logger from '@adonisjs/core/services/logger'
import { TokenRefreshService } from '../auth/token_refresh_service.js'

// Cron expression: every 3 hours and 30 minutes
// Run at: 0:00, 3:30, 7:00, 10:30, 14:00, 17:30, 21:00
const CRON_EXPRESSION = '0 0,7,14,21 * * *'
const CRON_EXPRESSION_HALF = '30 3,10,17 * * *'

/**
 * Scheduler for automatic Twitch token refresh
 */
export class TokenRefreshScheduler {
  private jobs: cron.ScheduledTask[] = []
  private tokenRefreshService: TokenRefreshService

  constructor() {
    this.tokenRefreshService = new TokenRefreshService()
  }

  /**
   * Start the scheduler
   * Called at application boot
   */
  start(): void {
    if (this.jobs.length > 0) {
      logger.warn('[Scheduler] Token refresh scheduler already running')
      return
    }

    // Schedule at full hours (0:00, 7:00, 14:00, 21:00)
    const job1 = cron.schedule(CRON_EXPRESSION, async () => {
      await this.runRefresh()
    })

    // Schedule at half hours (3:30, 10:30, 17:30)
    const job2 = cron.schedule(CRON_EXPRESSION_HALF, async () => {
      await this.runRefresh()
    })

    this.jobs.push(job1, job2)

    logger.info('[Scheduler] Token refresh scheduler started (every 3h30)')
  }

  /**
   * Stop the scheduler
   * Called at application shutdown
   */
  stop(): void {
    for (const job of this.jobs) {
      job.stop()
    }
    this.jobs = []
    logger.info('[Scheduler] Token refresh scheduler stopped')
  }

  /**
   * Run the refresh cycle
   */
  private async runRefresh(): Promise<void> {
    logger.info('[Scheduler] Starting scheduled token refresh')

    try {
      const report = await this.tokenRefreshService.refreshAllActiveTokens()

      logger.info(
        {
          total: report.total,
          success: report.success,
          failed: report.failed,
          skipped: report.skipped,
        },
        '[Scheduler] Completed scheduled token refresh'
      )
    } catch (error) {
      logger.error({ error }, '[Scheduler] Error during scheduled token refresh')
    }
  }

  /**
   * Manually trigger a refresh (for testing)
   */
  async triggerManualRefresh(): Promise<void> {
    await this.runRefresh()
  }
}

export default TokenRefreshScheduler
