import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import type { Config } from '@japa/runner/types'

/**
 * Configure Japa test runner plugins
 * - assert: Assertion library
 * - apiClient: HTTP client for functional tests
 * - pluginAdonisJS: AdonisJS integration (database transactions, encryption, etc.)
 */
export const plugins = [
  assert(),
  apiClient(),
  pluginAdonisJS(app, { baseURL: 'http://localhost:3334' }),
]

/**
 * Configure test suites - starts HTTP server for functional and e2e tests
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['functional', 'e2e'].includes(suite.name)) {
    return suite.setup(async () => {
      // Flush rate limit keys to prevent 429 errors across test groups
      const keys = await redis.keys('rate_limit:*')
      if (keys.length > 0) {
        await redis.del(keys)
      }
      return testUtils.httpServer().start()
    })
  }
}

/**
 * Tables to truncate after tests (in order to respect FK constraints)
 * Order matters: truncate child tables before parent tables
 */
const TABLES_TO_TRUNCATE = [
  'auth_access_tokens',
  'notification_preferences',
  'campaign_memberships',
  'poll_results',
  'poll_instances',
  'polls',
  'campaign_sessions',
  'overlay_configs',
  'vtt_connections',
  'streamers',
  'streamer_gamification_configs',
  'campaigns',
  'auth_providers',
  'users',
]

/**
 * Global test runner hooks
 */
export const runnerHooks = {
  setup: [
    async () => {
      // Verify we're using the test database to prevent accidental data loss
      const dbName = process.env.DB_DATABASE ?? ''
      if (!dbName.includes('test')) {
        throw new Error(
          `SAFETY CHECK FAILED: Tests must run on a test database (got: ${dbName}). ` +
            'Update .env.test to use DB_DATABASE=twitch_polls_test'
        )
      }

      // Run migrations using Ace command
      const ace = await import('@adonisjs/core/services/ace')
      await ace.default.exec('migration:run', [])

      console.log('✅ Test environment initialized')
    },
  ],
  teardown: [
    async () => {
      // Clean up all test data to prevent pollution between test runs
      try {
        for (const table of TABLES_TO_TRUNCATE) {
          try {
            await db.rawQuery(`TRUNCATE TABLE "${table}" CASCADE`)
          } catch {
            // Table might not exist, skip silently
          }
        }

        // Clean up Redis rate limit keys
        const keys = await redis.keys('rate_limit:*')
        if (keys.length > 0) {
          await redis.del(keys)
        }

        console.log('✅ Test database cleaned up')
      } catch (error) {
        console.error('⚠️ Failed to clean up test database:', error)
      }
    },
  ],
}

/**
 * Configure test reporters
 */
export const reporters = {
  activated: ['spec'],
}

/**
 * Configure test suites
 */
export const suites = [
  {
    name: 'unit',
    files: ['tests/unit/**/*.spec.ts'],
    timeout: 5000,
  },
  {
    name: 'functional',
    files: ['tests/functional/**/*.spec.ts'],
    timeout: 30000,
  },
  {
    name: 'e2e',
    files: ['tests/e2e/**/*.spec.ts'],
    timeout: 60000,
  },
]
