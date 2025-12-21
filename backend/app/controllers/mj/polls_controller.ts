import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PollInstanceRepository } from '#repositories/poll_instance_repository'
import { CampaignRepository } from '#repositories/campaign_repository'
import { PollLifecycleService } from '#services/polls/poll_lifecycle_service'
import { PollAggregationService } from '#services/polls/poll_aggregation_service'
import { PollInstanceDto } from '#dtos/polls/poll_instance_dto'
import { PollResultsDto } from '#dtos/polls/poll_results_dto'
import { validateRequest } from '#middleware/validate_middleware'
import { launchPollSchema } from '#validators/polls/launch_poll_validator'

/**
 * Contrôleur pour le lancement et le contrôle des polls (MJ)
 */
@inject()
export default class PollsController {
  constructor(
    private pollInstanceRepository: PollInstanceRepository,
    private campaignRepository: CampaignRepository,
    private pollLifecycleService: PollLifecycleService,
    private pollAggregationService: PollAggregationService
  ) {}

  /**
   * Lance un nouveau poll pour une campagne
   * POST /api/v2/mj/campaigns/:campaignId/polls/launch
   */
  async launch({ auth, params, request, response }: HttpContext) {
    await validateRequest(launchPollSchema)({ request, response } as HttpContext, async () => {})

    const userId = auth.user!.id

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const data = request.only(['title', 'options', 'durationSeconds', 'templateId'])

    // Créer l'instance de poll
    const pollInstance = await this.pollInstanceRepository.create({
      templateId: data.templateId || null,
      campaignId: params.campaignId,
      createdBy: userId,
      title: data.title,
      options: data.options,
      durationSeconds: data.durationSeconds || 60,
    })

    // Lancer le poll (création Twitch + démarrage polling)
    try {
      await this.pollLifecycleService.launchPoll(pollInstance.id)

      // Recharger pour avoir les données à jour
      const updatedInstance = await this.pollInstanceRepository.findByIdWithLinks(pollInstance.id)

      return response.created({
        data: PollInstanceDto.fromModel(updatedInstance!),
      })
    } catch (error) {
      // En cas d'erreur, marquer le poll comme failed
      await this.pollInstanceRepository.updateStatus(pollInstance.id, 'FAILED')

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
      await this.pollLifecycleService.cancelPoll(params.id)

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
    const aggregated = await this.pollAggregationService.getAggregatedVotesWithCache(params.id)

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
    const aggregated = await this.pollAggregationService.getAggregatedVotes(params.id)

    return response.ok({
      data: {
        status: pollInstance.status,
        ...aggregated,
      },
    })
  }
}
