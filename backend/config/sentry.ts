import env from '#start/env'
import * as Sentry from '@sentry/node'

const sentryConfig = {
  dsn: env.get('SENTRY_DSN', ''),
  environment: env.get('NODE_ENV', 'development'),
  tracesSampleRate: env.get('NODE_ENV') === 'production' ? 0.1 : 1.0,
  enabled: env.get('SENTRY_DSN', '') !== '',
}

// Initialize Sentry if DSN is provided
if (sentryConfig.enabled) {
  Sentry.init(sentryConfig)
}

export default sentryConfig
export { Sentry }
