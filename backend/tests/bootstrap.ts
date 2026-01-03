import { assert } from '@japa/assert'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import app from '@adonisjs/core/services/app'

/**
 * Configure Japa test runner plugins
 * Note: HTTP client tests are converted to mock-based tests
 */
export const plugins = [assert(), pluginAdonisJS(app)]

/**
 * Global test runner hooks
 */
export const runnerHooks = {
  setup: [
    async () => {
      // Run migrations to ensure auth_access_tokens table exists
      const ace = await import('@adonisjs/core/services/ace')
      await ace.default.exec('migration:run', [])

      console.log('✅ Test environment initialized')
    },
  ],
  teardown: [
    async () => {
      console.log('✅ Test environment cleaned up')
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
