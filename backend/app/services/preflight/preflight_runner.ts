import * as Sentry from '@sentry/node'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { PreflightReportRepository } from '#repositories/preflight_report_repository'
import { getMetricsService } from '#services/monitoring/metrics_service'
import type { PreFlightRegistry } from './preflight_registry.js'
import type { CheckContext, CheckResult, PreFlightReport } from './types.js'

/**
 * PreFlightRunner - Orchestrates pre-flight check execution
 *
 * Collects applicable checks from the registry, executes them in priority order,
 * and produces a unified report. Supports short-circuiting on critical failures
 * (priority 0 checks failing skips all higher-priority checks).
 *
 * Registered as `bind` in the IoC container (new instance per call).
 */
export class PreFlightRunner {
  constructor(private registry: PreFlightRegistry) {}

  /**
   * Run all applicable pre-flight checks for the given context.
   *
   * @param ctx - Check context (campaign, user, event type, mode)
   * @returns Complete pre-flight report
   */
  async run(ctx: CheckContext): Promise<PreFlightReport> {
    const startTime = Date.now()
    const checks = this.registry.getChecksFor(ctx.eventType, ctx.mode)

    logger.info(
      {
        event: 'preflight_run_start',
        campaignId: ctx.campaignId,
        eventType: ctx.eventType,
        mode: ctx.mode,
        checkCount: checks.length,
        checkNames: checks.map((c) => c.name),
      },
      'Starting pre-flight checks'
    )

    const results: CheckResult[] = []
    let shortCircuited = false

    // Group checks by priority tier for short-circuit logic
    let currentPriorityTier = -1

    for (const check of checks) {
      // Detect priority tier change
      if (check.priority !== currentPriorityTier) {
        // If we're entering a new tier and the previous tier had a failure,
        // short-circuit: skip all remaining checks
        if (currentPriorityTier >= 0 && results.some((r) => r.status === 'fail')) {
          shortCircuited = true
          logger.warn(
            {
              event: 'preflight_short_circuit',
              failedTier: currentPriorityTier,
              skippedFrom: check.priority,
              skippedChecks: checks
                .filter((c) => c.priority > currentPriorityTier)
                .map((c) => c.name),
            },
            'Short-circuiting: critical check failed, skipping remaining checks'
          )
          break
        }
        currentPriorityTier = check.priority
      }

      // Execute the check with error isolation
      const result = await this.executeCheck(check, ctx)
      results.push(result)
    }

    const totalDurationMs = Date.now() - startTime
    const hasFail = results.some((r) => r.status === 'fail')
    const hasWarn = results.some((r) => r.status === 'warn')

    const report: PreFlightReport = {
      healthy: !hasFail,
      hasWarnings: hasWarn,
      checks: results,
      timestamp: DateTime.now().toISO()!,
      totalDurationMs,
      eventType: ctx.eventType,
      campaignId: ctx.campaignId,
    }

    logger.info(
      {
        event: 'preflight_run_complete',
        campaignId: ctx.campaignId,
        eventType: ctx.eventType,
        mode: ctx.mode,
        healthy: report.healthy,
        hasWarnings: report.hasWarnings,
        shortCircuited,
        totalDurationMs,
        results: results.map((r) => ({ name: r.name, status: r.status, durationMs: r.durationMs })),
      },
      'Pre-flight checks completed'
    )

    // Track in Sentry, DB, and Prometheus (non-blocking)
    this.trackReport(report, ctx).catch((err) => {
      logger.error({ err }, 'Failed to track pre-flight report')
    })

    return report
  }

  /**
   * Execute a single check with error isolation.
   * If the check throws, it's caught and reported as a 'fail' result.
   */
  private async executeCheck(
    check: { name: string; execute: (ctx: CheckContext) => Promise<CheckResult> },
    ctx: CheckContext
  ): Promise<CheckResult> {
    const checkStart = Date.now()

    try {
      const result = await check.execute(ctx)
      // Ensure durationMs is set even if the check didn't set it
      if (!result.durationMs) {
        result.durationMs = Date.now() - checkStart
      }
      return result
    } catch (error) {
      const durationMs = Date.now() - checkStart

      logger.error(
        {
          event: 'preflight_check_error',
          checkName: check.name,
          error: error instanceof Error ? error.message : String(error),
          durationMs,
        },
        'Pre-flight check threw an unexpected error'
      )

      return {
        name: check.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error during check',
        durationMs,
      }
    }
  }
  /**
   * Track the report in Sentry, persist to DB, and record Prometheus metrics.
   * Runs asynchronously — failures here don't affect the pre-flight result.
   */
  private async trackReport(report: PreFlightReport, ctx: CheckContext): Promise<void> {
    const failedChecks = report.checks.filter((c) => c.status === 'fail').map((c) => c.name)

    // Sentry breadcrumb on every run
    Sentry.addBreadcrumb({
      category: 'preflight',
      message: report.healthy ? 'Pre-flight passed' : 'Pre-flight failed',
      level: report.healthy ? 'info' : 'warning',
      data: {
        eventType: ctx.eventType,
        campaignId: ctx.campaignId,
        mode: ctx.mode,
        failedChecks,
        durationMs: report.totalDurationMs,
      },
    })

    // Sentry event on failure
    if (!report.healthy) {
      Sentry.captureMessage(`Pre-flight failed: ${ctx.eventType}`, {
        level: 'warning',
        tags: {
          'preflight.eventType': ctx.eventType,
          'preflight.campaignId': ctx.campaignId,
          'preflight.mode': ctx.mode,
        },
        extra: {
          failedChecks: report.checks.filter((c) => c.status === 'fail'),
          totalDurationMs: report.totalDurationMs,
        },
      })
    }

    // Prometheus metrics
    try {
      const metrics = getMetricsService()
      const result = report.healthy ? (report.hasWarnings ? 'warn' : 'pass') : 'fail'
      metrics.recordPreflightRun(ctx.eventType, result)

      for (const check of report.checks) {
        metrics.recordPreflightCheckDuration(check.name, check.durationMs / 1000)
      }
    } catch {
      // Metrics service may not be initialized in tests
    }

    // Persist to DB
    try {
      const repository = new PreflightReportRepository()
      await repository.create(report, {
        triggeredBy: ctx.userId,
        eventSlug: ctx.metadata?.eventSlug as string | undefined,
      })
    } catch (err) {
      logger.warn({ err }, 'Failed to persist pre-flight report to database')
    }
  }
}

export default PreFlightRunner
