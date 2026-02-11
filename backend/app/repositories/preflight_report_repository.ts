import { DateTime } from 'luxon'
import PreflightReport from '#models/preflight_report'
import type { PreFlightReport, EventCategory } from '#services/preflight/types'

/**
 * PreflightReportRepository - Persistence layer for pre-flight reports
 */
export class PreflightReportRepository {
  /**
   * Store a pre-flight report
   */
  async create(
    report: PreFlightReport,
    options?: { triggeredBy?: string; eventSlug?: string }
  ): Promise<PreflightReport> {
    return PreflightReport.create({
      campaignId: report.campaignId || null,
      eventType: report.eventType,
      eventSlug: options?.eventSlug ?? null,
      healthy: report.healthy,
      hasWarnings: report.hasWarnings,
      checks: report.checks,
      triggeredBy: options?.triggeredBy ?? null,
      mode: report.checks.length > 0 ? 'full' : 'full',
      durationMs: report.totalDurationMs,
    })
  }

  /**
   * Find recent reports with pagination
   */
  async findRecent(
    limit: number = 20,
    page: number = 1,
    filters?: { eventType?: EventCategory; healthy?: boolean }
  ) {
    const query = PreflightReport.query().orderBy('createdAt', 'desc')

    if (filters?.eventType) {
      query.where('eventType', filters.eventType)
    }
    if (filters?.healthy !== undefined) {
      query.where('healthy', filters.healthy)
    }

    return query.paginate(page, limit)
  }

  /**
   * Find reports by campaign
   */
  async findByCampaign(campaignId: string, limit: number = 20): Promise<PreflightReport[]> {
    return PreflightReport.query()
      .where('campaignId', campaignId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
  }

  /**
   * Find a single report by ID
   */
  async findById(id: string): Promise<PreflightReport | null> {
    return PreflightReport.find(id)
  }

  /**
   * Get aggregated stats for a period
   */
  async getStats(since: DateTime): Promise<{
    totalRuns: number
    passed: number
    warnings: number
    failed: number
    avgDurationMs: number
    mostFailedChecks: { name: string; failCount: number }[]
  }> {
    const reports = await PreflightReport.query().where('createdAt', '>=', since.toSQL()!)

    const totalRuns = reports.length
    const passed = reports.filter((r) => r.healthy && !r.hasWarnings).length
    const warnings = reports.filter((r) => r.healthy && r.hasWarnings).length
    const failed = reports.filter((r) => !r.healthy).length
    const avgDurationMs =
      totalRuns > 0 ? Math.round(reports.reduce((sum, r) => sum + r.durationMs, 0) / totalRuns) : 0

    // Count failed checks across all reports
    const failCounts = new Map<string, number>()
    for (const report of reports) {
      if (!report.checks) continue
      for (const check of report.checks) {
        if (check.status === 'fail') {
          failCounts.set(check.name, (failCounts.get(check.name) ?? 0) + 1)
        }
      }
    }

    const mostFailedChecks = [...failCounts.entries()]
      .map(([name, failCount]) => ({ name, failCount }))
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 10)

    return { totalRuns, passed, warnings, failed, avgDurationMs, mostFailedChecks }
  }

  /**
   * Delete reports older than a given date
   */
  async cleanup(olderThan: DateTime): Promise<number> {
    const result = await PreflightReport.query()
      .where('createdAt', '<', olderThan.toSQL()!)
      .delete()
    return result[0] as number
  }
}

export default PreflightReportRepository
