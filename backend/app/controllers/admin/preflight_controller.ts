import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { PreflightReportRepository } from '#repositories/preflight_report_repository'
import { PreflightReportDto } from '#dtos/preflight_report_dto'
import type { EventCategory } from '#services/preflight/types'

/**
 * PreflightController - Admin endpoints for pre-flight monitoring
 *
 * Protected by admin middleware. Provides access to pre-flight reports,
 * stats, and individual report details.
 */
export default class PreflightController {
  /**
   * GET /admin/preflight/reports
   *
   * Paginated list of pre-flight reports.
   * Query params: page, perPage, eventType, healthy
   */
  async list({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const perPage = Math.min(Number(request.input('perPage', 20)), 100)
    const eventType = request.input('eventType') as EventCategory | undefined
    const healthyParam = request.input('healthy')
    const healthy = healthyParam !== undefined ? healthyParam === 'true' : undefined

    const repository = new PreflightReportRepository()
    const paginated = await repository.findRecent(perPage, page, { eventType, healthy })

    return response.ok({
      data: PreflightReportDto.fromModelArray(paginated.all()),
      meta: {
        total: paginated.total,
        perPage: paginated.perPage,
        currentPage: paginated.currentPage,
        lastPage: paginated.lastPage,
      },
    })
  }

  /**
   * GET /admin/preflight/reports/:id
   *
   * Single report with full check details.
   */
  async show({ params, response }: HttpContext) {
    const repository = new PreflightReportRepository()
    const report = await repository.findById(params.id)

    if (!report) {
      return response.notFound({ error: 'Rapport non trouvé' })
    }

    return response.ok({ data: PreflightReportDto.fromModel(report) })
  }

  /**
   * GET /admin/preflight/stats
   *
   * Aggregated stats for a given period.
   * Query params: period (24h, 7d, 30d)
   */
  async stats({ request, response }: HttpContext) {
    const period = request.input('period', '24h') as '24h' | '7d' | '30d'

    let since: DateTime
    switch (period) {
      case '7d':
        since = DateTime.now().minus({ days: 7 })
        break
      case '30d':
        since = DateTime.now().minus({ days: 30 })
        break
      default:
        since = DateTime.now().minus({ hours: 24 })
        break
    }

    const repository = new PreflightReportRepository()
    const stats = await repository.getStats(since)

    return response.ok({
      data: {
        period,
        ...stats,
      },
    })
  }
}
