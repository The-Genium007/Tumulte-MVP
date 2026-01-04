/*
|--------------------------------------------------------------------------
| Token Refresh Scheduler
|--------------------------------------------------------------------------
|
| This file is loaded automatically at application boot to start the
| token refresh scheduler that keeps Twitch tokens fresh.
|
*/

import { TokenRefreshScheduler } from '#services/scheduler/token_refresh_scheduler'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'

// Only start scheduler in web environment (not during tests or CLI commands)
if (app.getEnvironment() === 'web') {
  const scheduler = new TokenRefreshScheduler()
  scheduler.start()

  // Graceful shutdown
  app.terminating(() => {
    logger.info('[Scheduler] Application terminating, stopping scheduler...')
    scheduler.stop()
  })
}
