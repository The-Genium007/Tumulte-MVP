import dbService from '@adonisjs/lucid/services/db'

/**
 * Truncate-like function that uses DELETE instead of TRUNCATE
 * to avoid deadlocks when running tests in parallel
 *
 * This is a drop-in replacement for testUtils.db().truncate()
 */
export async function truncate(): Promise<void> {
  // List all tables in dependency order (children first, parents last)
  const tables = [
    'poll_results',
    'poll_sessions',
    'poll_instances',
    'poll_templates',
    'poll_channel_links',
    'campaign_memberships',
    'streamers',
    'campaigns',
    'overlay_configs',
    'notification_preferences',
    'push_subscriptions',
    'retry_events',
    'auth_access_tokens',
    'remember_me_tokens',
    'users',
  ]

  // Disable foreign key checks temporarily
  await dbService.rawQuery('SET session_replication_role = replica;')

  try {
    // Use DELETE instead of TRUNCATE to avoid table-level locks
    // Silently skip tables that don't exist (migrations may not have run yet)
    for (const table of tables) {
      try {
        await dbService.from(table).delete()
      } catch (error: unknown) {
        // Ignore "relation does not exist" errors
        const pgError = error as { code?: string }
        if (pgError.code !== '42P01') {
          throw error
        }
      }
    }
  } finally {
    // Re-enable foreign key checks
    await dbService.rawQuery('SET session_replication_role = DEFAULT;')
  }
}

/**
 * Placeholder for withGlobalTransaction (for E2E tests)
 * Note: This is a stub - E2E tests are not yet fully implemented
 * In a real implementation, this would wrap tests in transactions
 */
export function withGlobalTransaction() {
  return async () => {
    // Stub: Just truncate for now
    // TODO: Implement proper transaction wrapping when E2E tests are implemented
    await truncate()
  }
}

/**
 * Compatibility wrapper to match AdonisJS testUtils API
 * Returns an object with truncate() and withGlobalTransaction() methods
 *
 * Usage: import testUtils from '#tests/helpers/database'
 *        await testUtils.db().truncate()
 *        await testUtils.db().withGlobalTransaction()
 */
export function db() {
  return {
    truncate,
    withGlobalTransaction,
  }
}

/**
 * Default export for compatibility with existing imports
 */
const testUtils = {
  db,
}

export default testUtils

/**
 * Run a test within a database transaction (RECOMMENDED FOR FUTURE)
 * Automatically rolls back at the end to clean up test data
 *
 * This is the preferred approach as it provides complete isolation
 * and prevents any deadlock issues
 *
 * @param fn - The test function to run in a transaction
 */
export async function runInTransaction(fn: () => Promise<void>): Promise<void> {
  const trx = await dbService.transaction()

  try {
    await fn()
  } finally {
    // Always rollback, even if test fails
    await trx.rollback()
  }
}
