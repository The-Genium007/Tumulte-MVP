import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  enabled: true,
  cookieName: 'tumulte-session',

  /**
   * When set to true, the session id cookie will be deleted
   * once the user closes the browser.
   */
  clearWithBrowser: false,

  /**
   * Define how long to keep the session data alive without
   * any activity.
   */
  age: '7 days',

  /**
   * Configuration for session cookie and the
   * cookie store
   *
   * Note: sameSite 'none' is required for cross-origin requests with credentials
   * when frontend and backend are on different domains (e.g., staging environment)
   */
  cookie: {
    path: '/',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: app.inProduction ? 'none' : 'lax',
  },

  /**
   * The store to use. In production, use Redis for:
   * - Session sharing across multiple instances (Docker Swarm)
   * - Ability to revoke sessions (logout global)
   * - Session visibility and management
   */
  store: env.get('SESSION_DRIVER', 'redis'),

  /**
   * List of configured stores. Refer documentation to see
   * list of available stores and their config.
   */
  stores: {
    cookie: stores.cookie(),
    redis: stores.redis({
      connection: 'main',
      // Prefix for Redis keys to identify sessions
      // Format: session:{sessionId}
    }),
  },
})

export default sessionConfig
