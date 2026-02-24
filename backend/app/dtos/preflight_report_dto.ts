import PreflightReport from '#models/preflight_report'
import type { CheckResult, EventCategory, RunMode } from '#services/preflight/types'

export class PreflightReportDto {
  id!: string
  campaignId!: string | null
  eventType!: EventCategory
  eventSlug!: string | null
  healthy!: boolean
  hasWarnings!: boolean
  checks!: CheckResult[]
  triggeredBy!: string | null
  mode!: RunMode
  durationMs!: number
  createdAt!: string

  static fromModel(report: PreflightReport): PreflightReportDto {
    return {
      id: report.id,
      campaignId: report.campaignId,
      eventType: report.eventType,
      eventSlug: report.eventSlug,
      healthy: report.healthy,
      hasWarnings: report.hasWarnings,
      checks: report.checks,
      triggeredBy: report.triggeredBy,
      mode: report.mode,
      durationMs: report.durationMs,
      createdAt: report.createdAt.toISO()!,
    }
  }

  static fromModelArray(reports: PreflightReport[]): PreflightReportDto[] {
    return reports.map((r) => PreflightReportDto.fromModel(r))
  }
}

export default PreflightReportDto
