import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import { PollInstanceRepository } from '#repositories/poll_instance_repository'
import { CampaignRepository } from '#repositories/campaign_repository'
import { PollInstanceDto } from '#dtos/polls/poll_instance_dto'
import { PollResultsDto } from '#dtos/polls/poll_results_dto'
import { launchPollSchema } from '#validators/polls/launch_poll_validator'

/**
 * Contrôleur pour le lancement et le contrôle des polls (MJ)
 *
 * NOTE: pollLifecycleService et pollAggregationService sont résolus via container
 * car ce sont des singletons sans @inject()
 */
@inject()
export default class PollsController {
  constructor(
    private pollInstanceRepository: PollInstanceRepository,
    private campaignRepository: CampaignRepository
  ) {}

  /**
   * Lance un nouveau poll pour une campagne
   * POST /api/v2/mj/campaigns/:campaignId/polls/launch
   */
  async launch({ auth, params, request, response }: HttpContext) {
    // Valider les données de la requête
    const validationResult = await launchPollSchema.safeParseAsync(request.all())

    if (!validationResult.success) {
      return response.badRequest({
        error: 'Validation failed',
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      })
    }

    const userId = auth.user!.id

    // Vérifier l'ownership de la campagne
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

    // === IDEMPOTENCE CHECK ===
    // Vérifier si un sondage est déjà en cours pour cette campagne
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

      // Retourner le sondage existant au lieu d'en créer un nouveau
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

    // Créer l'instance de poll
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

    // Lancer le poll (création Twitch + démarrage polling)
    try {
      const pollLifecycleService = await app.container.make('pollLifecycleService')
      await pollLifecycleService.launchPoll(pollInstance.id)

      // Recharger pour avoir les données à jour
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

      // En cas d'erreur, marquer le poll comme ended
      await this.pollInstanceRepository.setEnded(pollInstance.id)

      return response.internalServerError({
        error: 'Failed to launch poll',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Annule un poll en cours
   * POST /api/v2/mj/polls/:id/cancel
   */
  async cancel({ auth, params, response }: HttpContext) {
    const pollInstance = await this.pollInstanceRepository.findById(params.id)

    if (!pollInstance) {
      return response.notFound({ error: 'Poll instance not found' })
    }

    if (!pollInstance.campaignId) {
      return response.badRequest({ error: 'Poll instance has no associated campaign' })
    }

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(pollInstance.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    try {
      const pollLifecycleService = await app.container.make('pollLifecycleService')
      await pollLifecycleService.cancelPoll(params.id)

      // Recharger pour avoir les données à jour
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
   * GET /api/v2/mj/polls/:id/results
   */
  async results({ auth, params, response }: HttpContext) {
    const pollInstance = await this.pollInstanceRepository.findByIdWithLinks(params.id)

    if (!pollInstance) {
      return response.notFound({ error: 'Poll instance not found' })
    }

    if (!pollInstance.campaignId) {
      return response.badRequest({ error: 'Poll instance has no associated campaign' })
    }

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(pollInstance.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    // Récupérer les résultats agrégés
    const pollAggregationService = await app.container.make('pollAggregationService')
    const aggregated = await pollAggregationService.getAggregatedVotesWithCache(params.id)

    return response.ok({
      data: PollResultsDto.fromAggregated(pollInstance, aggregated),
    })
  }

  /**
   * Liste tous les polls d'une campagne
   * GET /api/v2/mj/campaigns/:campaignId/polls
   */
  async index({ auth, params, request, response }: HttpContext) {
    const userId = auth.user!.id

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const status = request.input('status')

    let polls
    if (status === 'RUNNING') {
      polls = await this.pollInstanceRepository.findRunningByCampaign(params.campaignId)
    } else {
      polls = await this.pollInstanceRepository.findByCampaign(params.campaignId)
    }

    return response.ok({
      data: polls.map((poll) => PollInstanceDto.fromModel(poll)),
    })
  }

  /**
   * Récupère un poll avec ses détails
   * GET /api/v2/mj/polls/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const pollInstance = await this.pollInstanceRepository.findByIdWithLinks(params.id)

    if (!pollInstance) {
      return response.notFound({ error: 'Poll instance not found' })
    }

    if (!pollInstance.campaignId) {
      return response.badRequest({ error: 'Poll instance has no associated campaign' })
    }

    // Vérifier l'ownership de la campagne
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
   * GET /api/v2/mj/polls/:id/live
   */
  async live({ auth, params, response }: HttpContext) {
    const pollInstance = await this.pollInstanceRepository.findById(params.id)

    if (!pollInstance) {
      return response.notFound({ error: 'Poll instance not found' })
    }

    if (!pollInstance.campaignId) {
      return response.badRequest({ error: 'Poll instance has no associated campaign' })
    }

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(pollInstance.campaignId, auth.user!.id)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized' })
    }

    if (pollInstance.status !== 'RUNNING') {
      return response.badRequest({ error: 'Poll is not running' })
    }

    // Récupérer les résultats agrégés en temps réel
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
