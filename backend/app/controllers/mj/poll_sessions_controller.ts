import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PollSessionRepository } from '#repositories/poll_session_repository'
import { PollRepository } from '#repositories/poll_repository'
import { CampaignRepository } from '#repositories/campaign_repository'
import { PollSessionDto } from '#dtos/polls/poll_session_dto'
import { PollDto } from '#dtos/polls/poll_dto'
import { validateRequest } from '#middleware/validate_middleware'
import { createPollSessionSchema } from '#validators/polls/create_poll_session_validator'
import { addPollSchema } from '#validators/polls/add_poll_validator'

/**
 * Contrôleur pour la gestion des sessions de sondages (MJ)
 */
@inject()
export default class PollSessionsController {
  constructor(
    private pollSessionRepository: PollSessionRepository,
    private pollRepository: PollRepository,
    private campaignRepository: CampaignRepository
  ) {}

  /**
   * Liste toutes les sessions de la campagne
   * GET /api/v2/mj/campaigns/:campaignId/sessions
   */
  async index({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const sessions = await this.pollSessionRepository.findByCampaign(params.campaignId)

    return response.ok({
      data: sessions.map((session) => PollSessionDto.fromModel(session)),
    })
  }

  /**
   * Récupère une session avec ses polls
   * GET /api/v2/mj/sessions/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const session = await this.pollSessionRepository.findByIdWithPolls(params.id)

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    // Vérifier l'ownership
    if (session.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    return response.ok({
      data: {
        ...PollSessionDto.fromModel(session),
        polls: session.polls ? session.polls.map((poll) => PollDto.fromModel(poll)) : [],
      },
    })
  }

  /**
   * Crée une nouvelle session de sondages
   * POST /api/v2/mj/campaigns/:campaignId/sessions
   */
  async store({ auth, params, request, response }: HttpContext) {
    await validateRequest(createPollSessionSchema)(
      { request, response } as HttpContext,
      async () => {}
    )

    const userId = auth.user!.id

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const data = request.only(['name', 'defaultDurationSeconds'])

    const session = await this.pollSessionRepository.create({
      ownerId: userId,
      campaignId: params.campaignId,
      name: data.name,
      defaultDurationSeconds: data.defaultDurationSeconds || 60,
    })

    return response.created({
      data: PollSessionDto.fromModel(session),
    })
  }

  /**
   * Met à jour une session
   * PUT /api/v2/mj/sessions/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const session = await this.pollSessionRepository.findById(params.id)

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    if (session.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    const data = request.only(['name', 'defaultDurationSeconds'])

    if (data.name) session.name = data.name
    if (data.defaultDurationSeconds !== undefined)
      session.defaultDurationSeconds = data.defaultDurationSeconds

    await this.pollSessionRepository.update(session)

    return response.ok({
      data: PollSessionDto.fromModel(session),
    })
  }

  /**
   * Supprime une session
   * DELETE /api/v2/mj/sessions/:id
   */
  async destroy({ auth, params, response }: HttpContext) {
    const session = await this.pollSessionRepository.findById(params.id)

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    if (session.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    await this.pollSessionRepository.delete(session)

    return response.noContent()
  }

  /**
   * Ajoute un poll à une session
   * POST /api/v2/mj/sessions/:id/polls
   */
  async addPoll({ auth, params, request, response }: HttpContext) {
    await validateRequest(addPollSchema)({ request, response } as HttpContext, async () => {})

    const session = await this.pollSessionRepository.findById(params.id)

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    if (session.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    const data = request.only(['question', 'options', 'type', 'channelPointsPerVote'])

    // Obtenir le prochain orderIndex
    const orderIndex = await this.pollRepository.getNextOrderIndex(params.id)

    const poll = await this.pollRepository.create({
      sessionId: params.id,
      question: data.question,
      options: data.options,
      type: data.type || 'STANDARD',
      orderIndex,
      channelPointsPerVote: data.channelPointsPerVote || null,
    })

    return response.created({
      data: PollDto.fromModel(poll),
    })
  }

  /**
   * Met à jour un poll d'une session
   * PUT /api/v2/mj/sessions/:id/polls/:pollId
   */
  async updatePoll({ auth, params, request, response }: HttpContext) {
    const session = await this.pollSessionRepository.findById(params.id)

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    if (session.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    const poll = await this.pollRepository.findById(params.pollId)

    if (!poll || poll.sessionId !== params.id) {
      return response.notFound({ error: 'Poll not found' })
    }

    const data = request.only(['question', 'options', 'type', 'channelPointsPerVote'])

    if (data.question) poll.question = data.question
    if (data.options) poll.options = data.options
    if (data.type) poll.type = data.type
    if (data.channelPointsPerVote !== undefined)
      poll.channelPointsAmount = data.channelPointsPerVote

    await this.pollRepository.update(poll)

    return response.ok({
      data: PollDto.fromModel(poll),
    })
  }

  /**
   * Supprime un poll d'une session
   * DELETE /api/v2/mj/sessions/:id/polls/:pollId
   */
  async deletePoll({ auth, params, response }: HttpContext) {
    const session = await this.pollSessionRepository.findById(params.id)

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    if (session.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    const poll = await this.pollRepository.findById(params.pollId)

    if (!poll || poll.sessionId !== params.id) {
      return response.notFound({ error: 'Poll not found' })
    }

    await this.pollRepository.delete(poll)

    return response.noContent()
  }

  /**
   * Réordonne les polls d'une session
   * PUT /api/v2/mj/sessions/:id/polls/reorder
   */
  async reorderPolls({ auth, params, request, response }: HttpContext) {
    const session = await this.pollSessionRepository.findById(params.id)

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    if (session.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    const { pollIds } = request.only(['pollIds'])

    if (!Array.isArray(pollIds)) {
      return response.badRequest({ error: 'pollIds must be an array' })
    }

    await this.pollRepository.reorderPolls(params.id, pollIds)

    return response.ok({ message: 'Polls reordered successfully' })
  }
}
