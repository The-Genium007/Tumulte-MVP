/**
 * PreFlight System - Core Types & Interfaces
 *
 * Extensible pre-flight check system that validates system health
 * before launching polls, gamification events, or any future feature.
 *
 * To add a new check:
 * 1. Create a class implementing PreFlightCheck
 * 2. Register it in the PreFlightRegistry (container.ts boot sequence)
 * 3. Done — the runner auto-discovers and executes it
 */

/**
 * Categories of events that can be pre-flight checked.
 * 'all' means the check applies to every event type.
 */
export type EventCategory = 'poll' | 'gamification' | 'all'

/**
 * Result status of a single check.
 * - pass: Check succeeded
 * - warn: Check succeeded with non-critical issues (logged but doesn't block)
 * - fail: Check failed (blocks the operation in 'full' mode)
 */
export type CheckStatus = 'pass' | 'warn' | 'fail'

/**
 * Execution mode for the pre-flight runner.
 * - full: Blocking, runs all checks. Used before MJ-initiated launches.
 * - light: Non-blocking, runs only infra + token checks (priority <= 10).
 *          Used for automatic events (dice rolls, redemptions).
 */
export type RunMode = 'full' | 'light'

/**
 * Priority threshold for light mode.
 * Checks with priority > this value are skipped in light mode.
 */
export const LIGHT_MODE_MAX_PRIORITY = 10

/**
 * Interface for a single pre-flight check.
 *
 * Implement this to add custom health checks.
 * Checks are sorted by priority (lower = runs first).
 *
 * Priority guidelines:
 * - 0: Infrastructure (Redis, WebSocket) — if these fail, nothing works
 * - 5: External APIs (Twitch API availability)
 * - 10: Authentication (streamer tokens, OAuth)
 * - 15: Connections (VTT connection)
 * - 20: Business rules (cooldowns, config enabled, handler availability)
 */
export interface PreFlightCheck {
  /** Unique name for this check (used in reports and metrics) */
  name: string

  /** Which event categories this check applies to */
  appliesTo: EventCategory[]

  /** Execution priority (lower = runs first). See guidelines above. */
  priority: number

  /** Execute the check and return a result */
  execute(ctx: CheckContext): Promise<CheckResult>
}

/**
 * Context passed to each check during execution.
 */
export interface CheckContext {
  /** Campaign being checked */
  campaignId: string

  /** User who triggered the check (null for automatic/system triggers) */
  userId?: string

  /** Type of event being launched */
  eventType: EventCategory

  /** Execution mode */
  mode: RunMode

  /** Additional metadata (eventSlug, streamerId, etc.) */
  metadata?: Record<string, unknown>
}

/**
 * Result of a single check execution.
 */
export interface CheckResult {
  /** Name of the check that produced this result */
  name: string

  /** Status of the check */
  status: CheckStatus

  /** Human-readable message explaining the result */
  message?: string

  /** Detailed data (invalid streamers, error objects, etc.) */
  details?: unknown

  /** User-facing suggestion to fix the issue (e.g. "Reconnectez le streamer X") */
  remediation?: string

  /** How long this check took to execute (ms) */
  durationMs: number
}

/**
 * Complete report from a pre-flight run.
 */
export interface PreFlightReport {
  /** true if all checks passed (no 'fail' status) */
  healthy: boolean

  /** true if at least one check returned 'warn' */
  hasWarnings: boolean

  /** Individual check results */
  checks: CheckResult[]

  /** ISO timestamp of when the report was generated */
  timestamp: string

  /** Total execution time (ms) */
  totalDurationMs: number

  /** Event type that was checked */
  eventType: EventCategory

  /** Campaign that was checked */
  campaignId: string
}
