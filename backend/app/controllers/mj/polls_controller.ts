import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import { PollInstanceRepository } from '#repositories/poll_instance_repository'
import { PollRepository } from '#repositories/poll_repository'
import { CampaignRepository } from '#repositories/campaign_repository'
import { HealthCheckService } from '#services/health_check_service'
import { ReadinessService } from '#services/campaigns/readiness_service'
import { PushNotificationService } from '#services/notifications/push_notification_service'
import { PollInstanceDto } from '#dtos/polls/poll_instance_dto'
import { PollDto } from '#dtos/polls/poll_dto'
import { PollResultsDto } from '#dtos/polls/poll_results_dto'
import { launchPollSchema } from '#validators/polls/launch_poll_validator'
import { createPollSchema, updatePollSchema } from '#validators/polls/poll_validator'

/**
 * Contrôleur pour la gestion des polls (templates) et leur lancement (MJ)
 *
 * Architecture:
 * - Poll = template de sondage, lié directement à une Campaign
 * - PollInstance = instance lancée d'un poll
 */
@inject()
export default class PollsController {
  constructor(
    private pollInstanceRepository: PollInstanceRepository,
    private pollRepository: PollRepository,
    private campaignRepository: CampaignRepository,
    private healthCheckService: HealthCheckService,
    private readinessService: ReadinessService,
    private pushNotificationService: PushNotificationService
  ) {}

  // =============================================
  // CRUD des Polls (templates)
  // =============================================

  /**
   * Liste tous les polls d'une campagne
   * GET /mj/campaigns/:campaignId/polls
   */
  async indexByCampaign({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const polls = await this.pollRepository.findByCampaign(params.campaignId)

    // Récupérer le poll actif pour cette campagne (s'il existe)
    const runningPolls = await this.pollInstanceRepository.findRunningByCampaign(params.campaignId)
    const activePollInstance = runningPolls.length > 0 ? runningPolls[0] : null

    return response.ok({
      data: polls.map((poll) => PollDto.fromModel(poll)),
      activePollInstance: activePollInstance ? PollInstanceDto.fromModel(activePollInstance) : null,
    })
  }

  /**
   * Crée un nouveau poll (template)
   * POST /mj/campaigns/:campaignId/polls
   */
  async store({ auth, params, request, response }: HttpContext) {
    const validationResult = await createPollSchema.safeParseAsync(request.all())

    if (!validationResult.success) {
      return response.badRequest({
        error: 'Validation failed',
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const userId = auth.user!.id

    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const data = validationResult.data

    const poll = await this.pollRepository.create({
      campaignId: params.campaignId,
      question: data.question,
      options: data.options,
      type: data.type || 'STANDARD',
      durationSeconds: data.durationSeconds || 60,
      channelPointsAmount: data.channelPointsAmount ?? null,
    })

    logger.info({
      event: 'poll_created',
      pollId: poll.id,
      campaignId: params.campaignId,
      userId,
    })

    return response.created({
      data: PollDto.fromModel(poll),
    })
  }

  /**
   * Récupère un poll
   * GET /mj/polls/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const poll = await this.pollRepository.findById(params.id)

    if (!poll) {
      return response.notFound({ error: 'Poll not found' })
    }

    const isOwner = await this.campaignRepository.isOwner(poll.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    return response.ok({
      data: PollDto.fromModel(poll),
    })
  }

  /**
   * Met à jour un poll (template)
   * PUT /mj/polls/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const poll = await this.pollRepository.findById(params.id)

    if (!poll) {
      return response.notFound({ error: 'Poll not found' })
    }

    const isOwner = await this.campaignRepository.isOwner(poll.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    const validationResult = await updatePollSchema.safeParseAsync(request.all())

    if (!validationResult.success) {
      return response.badRequest({
        error: 'Validation failed',
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const data = validationResult.data

    const updatedPoll = await this.pollRepository.update(poll, {
      question: data.question,
      options: data.options,
      type: data.type,
      durationSeconds: data.durationSeconds,
      channelPointsAmount: data.channelPointsAmount,
    })

    logger.info({
      event: 'poll_updated',
      pollId: poll.id,
      campaignId: poll.campaignId,
    })

    return response.ok({
      data: PollDto.fromModel(updatedPoll),
    })
  }

  /**
   * Supprime un poll (template)
   * DELETE /mj/polls/:id
   */
  async destroy({ auth, params, response }: HttpContext) {
    const poll = await this.pollRepository.findById(params.id)

    if (!poll) {
      return response.notFound({ error: 'Poll not found' })
    }

    const isOwner = await this.campaignRepository.isOwner(poll.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    await this.pollRepository.delete(poll)

    logger.info({
      event: 'poll_deleted',
      pollId: params.id,
      campaignId: poll.campaignId,
    })

    return response.noContent()
  }

  // =============================================
  // Lancement et contrôle des polls
  // =============================================

  /**
   * Lance un poll depuis son template
   * POST /mj/polls/:id/launch
   *
   * Crée une nouvelle PollInstance depuis le Poll template
   */
  async launchFromPoll({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const poll = await this.pollRepository.findById(params.id)

    if (!poll) {
      return response.notFound({ error: 'Poll not found' })
    }

    const isOwner = await this.campaignRepository.isOwner(poll.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    // Vérifier qu'aucun poll n'est déjà en cours
    const runningPolls = await this.pollInstanceRepository.findRunningByCampaign(poll.campaignId)
    if (runningPolls.length > 0) {
      const existingPoll = runningPolls[0]
      logger.warn({
        event: 'poll_launch_blocked',
        pollId: params.id,
        existingPollInstanceId: existingPoll.id,
        reason: 'A poll is already running',
      })

      return response.conflict({
        error: 'Un sondage est déjà en cours',
        message: 'Attendez que le sondage actuel se termine ou annulez-le.',
        activePollInstance: PollInstanceDto.fromModel(existingPoll),
      })
    }

    // Effectuer le health check avant de lancer
    const healthCheck = await this.healthCheckService.performHealthCheck(poll.campaignId, userId)

    if (!healthCheck.healthy) {
      let readinessDetails = null
      if (!healthCheck.services.tokens.valid) {
        readinessDetails = await this.readinessService.getCampaignReadiness(poll.campaignId)

        const campaign = await this.campaignRepository.findById(poll.campaignId)
        const campaignName = campaign?.name ?? 'Campagne'

        // Notifier les streamers avec des problèmes
        if (readinessDetails) {
          for (const streamer of readinessDetails.streamers) {
            if (!streamer.isReady && streamer.issues.length > 0 && streamer.userId) {
              if (streamer.userId !== userId) {
                this.pushNotificationService
                  .sendSessionActionRequired(streamer.userId, campaignName, streamer.issues)
                  .catch((err: unknown) => {
                    logger.warn({
                      event: 'notification_failed',
                      error: err instanceof Error ? err.message : String(err),
                    })
                  })
              }
            }
          }
        }
      }

      logger.error({
        event: 'poll_launch_blocked_health',
        pollId: params.id,
        campaignId: poll.campaignId,
        healthCheck,
      })

      return response.status(503).json({
        error: 'Health check failed. Cannot launch poll.',
        healthCheck,
        readinessDetails,
      })
    }

    logger.info({
      event: 'poll_launch_initiated',
      pollId: params.id,
      campaignId: poll.campaignId,
      question: poll.question,
      durationSeconds: poll.durationSeconds,
    })

    // Créer l'instance de poll depuis le template
    const pollInstance = await this.pollInstanceRepository.create({
      pollId: poll.id,
      templateId: null,
      campaignId: poll.campaignId,
      createdBy: userId,
      title: poll.question,
      options: poll.options,
      durationSeconds: poll.durationSeconds,
      type: poll.type,
      channelPointsEnabled: poll.channelPointsEnabled,
      channelPointsAmount: poll.channelPointsAmount,
    })

    // Mettre à jour lastLaunchedAt sur le poll
    await this.pollRepository.updateLastLaunchedAt(poll.id)

    logger.info({
      event: 'poll_instance_created',
      pollInstanceId: pollInstance.id,
      pollId: poll.id,
      campaignId: poll.campaignId,
    })

    // Lancer le poll
    try {
      const pollLifecycleService = await app.container.make('pollLifecycleService')
      await pollLifecycleService.launchPoll(pollInstance.id)

      const updatedInstance = await this.pollInstanceRepository.findByIdWithLinks(pollInstance.id)

      logger.info({
        event: 'poll_launch_successful',
        pollInstanceId: pollInstance.id,
        pollId: poll.id,
        channelLinksCount: updatedInstance!.channelLinks?.length || 0,
      })

      return response.created({
        data: PollInstanceDto.fromModel(updatedInstance!),
        pollId: poll.id,
      })
    } catch (error) {
      logger.error({
        event: 'poll_launch_failed',
        pollInstanceId: pollInstance.id,
        pollId: poll.id,
        error: error instanceof Error ? error.message : String(error),
      })

      await this.pollInstanceRepository.setEnded(pollInstance.id)

      return response.internalServerError({
        error: 'Failed to launch poll',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Lance un nouveau poll avec données directes (legacy)
   * POST /mj/campaigns/:campaignId/polls/launch
   */
  async launch({ auth, params, request, response }: HttpContext) {
    const validationResult = await launchPollSchema.safeParseAsync(request.all())

    if (!validationResult.success) {
      return response.badRequest({
        error: 'Validation failed',
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      })
    }

    const userId = auth.user!.id

    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      logger.warn({
        event: 'poll_launch_forbidden',
        userId,
        campaignId: params.campaignId,
        reason: 'User is not campaign owner',
      })
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const data = request.only([
      'title',
      'options',
      'durationSeconds',
      'templateId',
      'type',
      'channelPointsEnabled',
      'channelPointsAmount',
    ])

    // Vérifier si un sondage est déjà en cours
    const existingRunningPolls = await this.pollInstanceRepository.findRunningByCampaign(
      params.campaignId
    )
    if (existingRunningPolls.length > 0) {
      const existingPoll = existingRunningPolls[0]
      logger.warn({
        event: 'poll_launch_idempotent_return',
        userId,
        campaignId: params.campaignId,
        existingPollId: existingPoll.id,
        reason: 'A poll is already running for this campaign',
      })

      const existingInstance = await this.pollInstanceRepository.findByIdWithLinks(existingPoll.id)
      return response.ok({
        data: PollInstanceDto.fromModel(existingInstance!),
        message: 'A poll is already running',
        idempotent: true,
      })
    }

    logger.info({
      event: 'poll_launch_initiated',
      userId,
      campaignId: params.campaignId,
      title: data.title,
      optionsCount: data.options.length,
      durationSeconds: data.durationSeconds || 60,
      templateId: data.templateId || null,
      type: data.type || 'STANDARD',
      channelPointsEnabled: data.channelPointsEnabled || false,
      channelPointsAmount: data.channelPointsAmount || null,
    })

    const pollInstance = await this.pollInstanceRepository.create({
      templateId: data.templateId || null,
      campaignId: params.campaignId,
      createdBy: userId,
      title: data.title,
      options: data.options,
      durationSeconds: data.durationSeconds || 60,
      type: data.type || 'STANDARD',
      channelPointsEnabled: data.channelPointsEnabled || false,
      channelPointsAmount: data.channelPointsAmount || null,
    })

    logger.info({
      event: 'poll_instance_created',
      pollInstanceId: pollInstance.id,
      campaignId: params.campaignId,
      status: pollInstance.status,
    })

    try {
      const pollLifecycleService = await app.container.make('pollLifecycleService')
      await pollLifecycleService.launchPoll(pollInstance.id)

      const updatedInstance = await this.pollInstanceRepository.findByIdWithLinks(pollInstance.id)

      logger.info({
        event: 'poll_launch_successful',
        pollInstanceId: pollInstance.id,
        campaignId: params.campaignId,
        channelLinksCount: updatedInstance!.channelLinks?.length || 0,
      })

      return response.created({
        data: PollInstanceDto.fromModel(updatedInstance!),
      })
    } catch (error) {
      logger.error({
        event: 'poll_launch_failed',
        pollInstanceId: pollInstance.id,
        campaignId: params.campaignId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      await this.pollInstanceRepository.setEnded(pollInstance.id)

      return response.internalServerError({
        error: 'Failed to launch poll',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Annule un poll en cours
   * POST /mj/polls/:id/cancel
   */
  async cancel({ auth, params, response }: HttpContext) {
    const pollInstance = await this.pollInstanceRepository.findById(params.id)

    if (!pollInstance) {
      return response.notFound({ error: 'Poll instance not found' })
    }

    if (!pollInstance.campaignId) {
      return response.badRequest({ error: 'Poll instance has no associated campaign' })
    }

    const isOwner = await this.campaignRepository.isOwner(pollInstance.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    try {
      const pollLifecycleService = await app.container.make('pollLifecycleService')
      await pollLifecycleService.cancelPoll(params.id)

      const updatedInstance = await this.pollInstanceRepository.findByIdWithLinks(params.id)

      return response.ok({
        data: PollInstanceDto.fromModel(updatedInstance!),
      })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to cancel poll',
      })
    }
  }

  /**
   * Récupère les résultats d'un poll
   * GET /mj/polls/:id/results
   */
  async results({ auth, params, response }: HttpContext) {
    const pollInstance = await this.pollInstanceRepository.findByIdWithLinks(params.id)

    if (!pollInstance) {
      return response.notFound({ error: 'Poll instance not found' })
    }

    if (!pollInstance.campaignId) {
      return response.badRequest({ error: 'Poll instance has no associated campaign' })
    }

    const isOwner = await this.campaignRepository.isOwner(pollInstance.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    const pollAggregationService = await app.container.make('pollAggregationService')
    const aggregated = await pollAggregationService.getAggregatedVotesWithCache(params.id)

    return response.ok({
      data: PollResultsDto.fromAggregated(pollInstance, aggregated),
    })
  }

  /**
   * Liste les instances de polls d'une campagne (legacy - pour compatibilité)
   * GET /mj/campaigns/:campaignId/polls/instances
   */
  async index({ auth, params, request, response }: HttpContext) {
    const userId = auth.user!.id

    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const status = request.input('status')

    let polls
    if (status === 'RUNNING') {
      polls = await this.pollInstanceRepository.findRunningByCampaign(params.campaignId)
    } else if (status === 'COMPLETED') {
      polls = await this.pollInstanceRepository.findCompletedByCampaign(params.campaignId)
    } else {
      polls = await this.pollInstanceRepository.findByCampaign(params.campaignId)
    }

    return response.ok({
      data: polls.map((poll) => PollInstanceDto.fromModel(poll)),
    })
  }

  /**
   * Récupère une instance de poll avec ses détails
   * GET /mj/polls/:id/instance
   */
  async showInstance({ auth, params, response }: HttpContext) {
    const pollInstance = await this.pollInstanceRepository.findByIdWithLinks(params.id)

    if (!pollInstance) {
      return response.notFound({ error: 'Poll instance not found' })
    }

    if (!pollInstance.campaignId) {
      return response.badRequest({ error: 'Poll instance has no associated campaign' })
    }

    const isOwner = await this.campaignRepository.isOwner(pollInstance.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    return response.ok({
      data: PollInstanceDto.fromModel(pollInstance),
    })
  }

  /**
   * Récupère les résultats live d'un poll en cours
   * GET /mj/polls/:id/live
   */
  async live({ auth, params, response }: HttpContext) {
    const pollInstance = await this.pollInstanceRepository.findById(params.id)

    if (!pollInstance) {
      return response.notFound({ error: 'Poll instance not found' })
    }

    if (!pollInstance.campaignId) {
      return response.badRequest({ error: 'Poll instance has no associated campaign' })
    }

    const isOwner = await this.campaignRepository.isOwner(pollInstance.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    if (pollInstance.status !== 'RUNNING') {
      return response.badRequest({ error: 'Poll is not running' })
    }

    const pollAggregationService = await app.container.make('pollAggregationService')
    const aggregated = await pollAggregationService.getAggregatedVotes(params.id)

    return response.ok({
      data: {
        status: pollInstance.status,
        ...aggregated,
      },
    })
  }
}
