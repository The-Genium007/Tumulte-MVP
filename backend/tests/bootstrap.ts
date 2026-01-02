import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import pluginAdonisJS from '@japa/plugin-adonisjs'
import type { Config } from '@japa/runner/types'
import app from '@adonisjs/core/services/app'

/**
 * Configure Japa test runner plugins
 */
export const plugins: Config['plugins'] = [assert(), apiClient(), pluginAdonisJS(app)]

/**
 * Global test runner hooks
 */
export const runnerHooks: Pick<Config, 'setup' | 'teardown'> = {
  setup: [
    async () => {
      // Initialize the AdonisJS application
      await app.init()
      await app.boot()

      console.log('✅ Test environment initialized')
    },
  ],
  teardown: [
    async () => {
      // Gracefully terminate the application
      await app.terminate()

      console.log('✅ Test environment cleaned up')
    },
  ],
}

/**
 * Configure test reporters
 */
export const reporters: Config['reporters'] = {
  activated: ['spec'],
}

/**
 * Configure test suites
 */
export const suites: Config['suites'] = [
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
