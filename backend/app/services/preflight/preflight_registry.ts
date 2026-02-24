import logger from '@adonisjs/core/services/logger'
import type { PreFlightCheck, EventCategory, RunMode } from './types.js'
import { LIGHT_MODE_MAX_PRIORITY } from './types.js'

/**
 * PreFlightRegistry - Dynamic registry for pre-flight checks
 *
 * Checks register themselves here and the runner queries the registry
 * to find applicable checks for a given event type and mode.
 *
 * Registered as a singleton in the IoC container — lives for the app lifetime.
 */
export class PreFlightRegistry {
  private checks: Map<string, PreFlightCheck> = new Map()

  /**
   * Register a pre-flight check.
   * Duplicate names are rejected with a warning.
   */
  register(check: PreFlightCheck): void {
    if (this.checks.has(check.name)) {
      logger.warn(
        { checkName: check.name },
        '[PreFlightRegistry] Check already registered, skipping duplicate'
      )
      return
    }

    this.checks.set(check.name, check)
    logger.debug(
      {
        checkName: check.name,
        priority: check.priority,
        appliesTo: check.appliesTo,
      },
      '[PreFlightRegistry] Check registered'
    )
  }

  /**
   * Remove a check by name (useful for testing).
   */
  unregister(name: string): boolean {
    return this.checks.delete(name)
  }

  /**
   * Get all checks applicable to a given event type and mode,
   * sorted by priority (lowest first).
   *
   * In 'light' mode, only checks with priority <= LIGHT_MODE_MAX_PRIORITY are returned.
   */
  getChecksFor(eventType: EventCategory, mode: RunMode): PreFlightCheck[] {
    return [...this.checks.values()]
      .filter((check) => {
        // Check applies to this event type?
        const matchesType = check.appliesTo.includes(eventType) || check.appliesTo.includes('all')

        // In light mode, skip high-priority (business) checks
        const matchesMode = mode === 'full' || check.priority <= LIGHT_MODE_MAX_PRIORITY

        return matchesType && matchesMode
      })
      .sort((a, b) => a.priority - b.priority)
  }

  /**
   * Get all registered checks (for diagnostics).
   */
  all(): PreFlightCheck[] {
    return [...this.checks.values()]
  }

  /**
   * Number of registered checks.
   */
  get size(): number {
    return this.checks.size
  }

  /**
   * Check if a check with the given name is registered.
   */
  has(name: string): boolean {
    return this.checks.has(name)
  }
}

export default PreFlightRegistry
