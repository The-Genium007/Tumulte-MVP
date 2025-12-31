import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { campaign as Campaign } from '#models/campaign'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { supportReportService as SupportReportService } from '#services/support_report_service'
import type { BackendContext, FrontendContext } from '#services/support_report_service'

export default class SupportController {
  private readonly supportReportService = new SupportReportService()

  async report({ auth, request, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Unauthenticated' })
    }

    await user.load('streamer')

    const body = request.body() ?? {}
    const description = typeof body.description === 'string' ? body.description : ''
    const frontend: FrontendContext | undefined =
      body.frontend && typeof body.frontend === 'object' ? body.frontend : undefined

    const backendContext: BackendContext = {
      nodeEnv: env.get('NODE_ENV'),
      appVersion: process.env.npm_package_version,
    }

    if (user.role === 'MJ') {
      const [aggregate] = await Campaign.query().where('ownerId', user.id).count('* as total')
      backendContext.campaignCount = Number(
        aggregate?.$extras?.total ?? aggregate?.$extras?.count ?? 0
      )
    }

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
      await this.supportReportService.send({
        user,
        streamer: user.streamer,
        description,
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
        message: 'Support report envoyé',
      })
    } catch (error) {
      logger.error({
        message: 'Failed to send support report',
        error: error?.message,
        stack: error?.stack,
      })

      return response.internalServerError({
        error: 'Unable to send support report',
      })
    }
  }
}
