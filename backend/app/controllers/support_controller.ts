import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { campaign as Campaign } from '#models/campaign'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { supportReportService } from '#services/support/support_report_service'
import type { BackendContext, FrontendContext } from '#services/support/support_report_service'
import { backendLogService } from '#services/support/backend_log_service'

export default class SupportController {
  /**
   * Envoie un rapport de bug vers Discord #support-bugs
   * POST /support/report
   */
  async report({ auth, request, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Unauthenticated' })
    }

    await user.load((loader) => loader.load('streamer'))

    const body = request.body() ?? {}
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const includeDiagnostics = body.includeDiagnostics !== false // true par défaut
    const frontend: FrontendContext | undefined =
      body.frontend && typeof body.frontend === 'object' ? body.frontend : undefined

    if (!title || title.length < 5) {
      return response.badRequest({ error: 'Title must be at least 5 characters' })
    }

    if (!description || description.length < 10) {
      return response.badRequest({ error: 'Description must be at least 10 characters' })
    }

    const backendContext: BackendContext = {
      nodeEnv: env.get('NODE_ENV'),
      appVersion: env.get('APP_VERSION', '0.3.0'),
    }

    // Count campaigns owned by user
    const [campaignAggregate] = await Campaign.query().where('ownerId', user.id).count('* as total')
    backendContext.campaignCount = Number(
      campaignAggregate?.$extras?.total ?? campaignAggregate?.$extras?.count ?? 0
    )

    if (user.streamer) {
      const [aggregate] = await CampaignMembership.query()
        .where('streamerId', user.streamer.id)
        .where('status', 'ACTIVE')
        .count('* as total')
      backendContext.membershipsCount = Number(
        aggregate?.$extras?.total ?? aggregate?.$extras?.count ?? 0
      )
    }

    const requestId = typeof request.id === 'function' ? request.id() : undefined

    try {
      const result = await supportReportService.sendBugReport({
        user,
        streamer: user.streamer,
        title,
        description,
        includeDiagnostics,
        frontend,
        backendContext,
        requestContext: {
          id: requestId,
          ip: request.ip(),
          url: request.url(),
          method: request.method(),
          userAgent: request.header('user-agent'),
          host: request.header('host'),
        },
      })

      return response.ok({
        message: 'Rapport de bug envoyé',
        githubIssueUrl: result.githubIssueUrl,
        discordSent: result.discordSent,
      })
    } catch (error) {
      logger.error({
        message: 'Failed to send bug report',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      return response.internalServerError({
        error: 'Unable to send bug report',
      })
    }
  }

  /**
   * Envoie une suggestion vers Discord #suggestions + GitHub Issue
   * POST /support/suggestion
   */
  async suggestion({ auth, request, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Unauthenticated' })
    }

    await user.load((loader) => loader.load('streamer'))

    const body = request.body() ?? {}
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''

    if (!title || title.length < 5) {
      return response.badRequest({ error: 'Title must be at least 5 characters' })
    }

    if (!description || description.length < 10) {
      return response.badRequest({ error: 'Description must be at least 10 characters' })
    }

    try {
      const result = await supportReportService.sendSuggestion({
        user,
        streamer: user.streamer,
        title,
        description,
      })

      return response.ok({
        message: 'Suggestion envoyée',
        githubDiscussionUrl: result.githubDiscussionUrl,
        discordSent: result.discordSent,
      })
    } catch (error) {
      logger.error({
        message: 'Failed to send suggestion',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      return response.internalServerError({
        error: 'Unable to send suggestion',
      })
    }
  }

  /**
   * Récupère les logs backend de l'utilisateur connecté
   * GET /support/logs
   */
  async getLogs({ auth, request, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Unauthenticated' })
    }

    // Paramètre optionnel pour limiter le nombre de logs
    const limit = Math.min(Number(request.input('limit', 50)), 100)

    try {
      const logs = await backendLogService.getUserLogs(user.id.toString(), limit)

      return response.ok({
        data: {
          logs,
          userContext: {
            userId: user.id,
            displayName: user.displayName,
          },
        },
      })
    } catch (error) {
      logger.error({
        message: 'Failed to get support logs',
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      })

      return response.internalServerError({
        error: 'Unable to retrieve support logs',
      })
    }
  }
}
