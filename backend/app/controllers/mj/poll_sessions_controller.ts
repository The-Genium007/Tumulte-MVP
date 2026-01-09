import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { PollSessionRepository } from '#repositories/poll_session_repository'
import { PollRepository } from '#repositories/poll_repository'
import { CampaignRepository } from '#repositories/campaign_repository'
import { PollInstanceRepository } from '#repositories/poll_instance_repository'
import { HealthCheckService } from '#services/health_check_service'
import { ReadinessService } from '#services/campaigns/readiness_service'
import { PushNotificationService } from '#services/notifications/push_notification_service'
import { PollSessionDto } from '#dtos/polls/poll_session_dto'
import { PollDto } from '#dtos/polls/poll_dto'
import { PollInstanceDto } from '#dtos/polls/poll_instance_dto'
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
    private campaignRepository: CampaignRepository,
    private pollInstanceRepository: PollInstanceRepository,
    private healthCheckService: HealthCheckService,
    private readinessService: ReadinessService,
    private pushNotificationService: PushNotificationService
  ) {}

  /**
   * Liste toutes les sessions de la campagne
   * GET /mj/campaigns/:campaignId/sessions
   */
  async indexByCampaign({ auth, params, response }: HttpContext) {
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
   * Lance une session de sondage avec Health Check
   * POST /api/v2/mj/campaigns/:campaignId/sessions/:sessionId/launch
   */
  async launch({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const { campaignId, sessionId } = params

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    // Vérifier que la session existe et appartient à l'utilisateur
    const session = await this.pollSessionRepository.findByIdWithPolls(sessionId)
    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    if (session.ownerId !== userId) {
      return response.forbidden({ error: 'Not authorized' })
    }

    // Vérifier qu'il y a au moins un poll dans la session
    if (!session.polls || session.polls.length === 0) {
      return response.badRequest({
        error: 'Session has no polls',
        message: 'Cannot launch an empty session',
      })
    }

    logger.info(
      {
        event: 'session_launch_initiated',
        userId,
        campaignId,
        sessionId,
        pollCount: session.polls.length,
      },
      'Starting session launch with health check'
    )

    // Effectuer le health check avant de lancer la session
    const healthCheck = await this.healthCheckService.performHealthCheck(campaignId, userId)

    if (!healthCheck.healthy) {
      // Récupérer les détails de readiness si le check tokens a échoué
      let readinessDetails = null
      if (!healthCheck.services.tokens.valid) {
        readinessDetails = await this.readinessService.getCampaignReadiness(campaignId)

        // Récupérer le nom de la campagne pour les notifications
        const campaign = await this.campaignRepository.findById(campaignId)
        const campaignName = campaign?.name ?? 'Campagne'

        // Envoyer des notifications aux streamers avec des problèmes
        if (readinessDetails) {
          for (const streamer of readinessDetails.streamers) {
            if (!streamer.isReady && streamer.issues.length > 0 && streamer.userId) {
              // Ne pas notifier le GM (il voit déjà l'erreur)
              if (streamer.userId !== userId) {
                this.pushNotificationService
                  .sendSessionActionRequired(streamer.userId, campaignName, streamer.issues)
                  .then(() => {
                    logger.info(
                      {
                        event: 'session_action_required_notification_sent',
                        streamerId: streamer.streamerId,
                        userId: streamer.userId,
                        issues: streamer.issues,
                      },
                      'Session action required notification sent to streamer'
                    )
                  })
                  .catch((err: unknown) => {
                    logger.warn(
                      {
                        event: 'session_action_required_notification_failed',
                        streamerId: streamer.streamerId,
                        error: err instanceof Error ? err.message : String(err),
                      },
                      'Failed to send session action required notification'
                    )
                  })
              }
            }
          }
        }
      }

      logger.error(
        {
          event: 'session_launch_blocked',
          userId,
          campaignId,
          sessionId,
          healthCheck,
          readinessDetails,
        },
        'Health check failed, blocking session launch'
      )

      return response.status(503).json({
        error: 'System health check failed. Cannot launch session.',
        healthCheck,
        readinessDetails,
      })
    }

    logger.info({ campaignId, sessionId }, 'Health check passed, session ready to launch')

    // En mode dev, envoyer une notification de test au MJ
    if (!app.inProduction) {
      const pushService = new PushNotificationService()
      pushService
        .sendToUser(
          userId,
          'session:reminder',
          {
            title: '[DEV] Session lancée !',
            body: `La session "${session.name}" est prête à être lancée.`,
            data: {
              url: `/mj/campaigns/${campaignId}`,
              campaignId,
            },
            actions: [{ action: 'view', title: 'Voir' }],
          },
          true // bypassPreferences
        )
        .then((result) => {
          logger.info(
            { event: 'push_notification_dev_test_sent', userId, sent: result.sent },
            'Dev test notification sent'
          )
        })
        .catch((err: unknown) => {
          logger.warn(
            {
              event: 'push_notification_dev_test_failed',
              error: err instanceof Error ? err.message : String(err),
            },
            'Failed to send dev test notification'
          )
        })
    }

    // Retourner la session avec ses polls
    return response.ok({
      data: {
        ...PollSessionDto.fromModel(session),
        polls: session.polls.map((poll) => PollDto.fromModel(poll)),
      },
    })
  }

  /**
   * Crée une nouvelle session de sondages
   * POST /api/v2/mj/campaigns/:campaignId/sessions
   */
  async storeByCampaign({ auth, params, request, response }: HttpContext) {
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

  /**
   * Récupère le statut d'une session avec le sondage en cours
   * GET /api/v2/mj/campaigns/:campaignId/sessions/:sessionId/status
   *
   * Utilisé par le frontend pour valider l'état local vs backend
   */
  async status({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const { campaignId, sessionId } = params

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    // Récupérer la session
    const session = await this.pollSessionRepository.findByIdWithPolls(sessionId)
    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    if (session.ownerId !== userId) {
      return response.forbidden({ error: 'Not authorized' })
    }

    // Récupérer le sondage en cours pour cette campagne
    const runningPolls = await this.pollInstanceRepository.findRunningByCampaign(campaignId)
    const currentPoll = runningPolls.length > 0 ? runningPolls[0] : null

    return response.ok({
      data: {
        session: {
          ...PollSessionDto.fromModel(session),
          polls: session.polls ? session.polls.map((poll) => PollDto.fromModel(poll)) : [],
        },
        currentPoll: currentPoll ? PollInstanceDto.fromModel(currentPoll) : null,
        serverTime: Date.now(),
      },
    })
  }

  /**
   * Heartbeat pour synchronisation temps réel
   * POST /api/v2/mj/campaigns/:campaignId/sessions/:sessionId/heartbeat
   *
   * Appelé périodiquement par le frontend (toutes les 30s)
   * Retourne l'état actuel pour détecter les désynchronisations
   */
  async heartbeat({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const { campaignId, sessionId } = params

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    // Vérifier que la session existe
    const session = await this.pollSessionRepository.findById(sessionId)
    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    if (session.ownerId !== userId) {
      return response.forbidden({ error: 'Not authorized' })
    }

    // Récupérer le sondage en cours pour cette campagne
    const runningPolls = await this.pollInstanceRepository.findRunningByCampaign(campaignId)
    const currentPoll = runningPolls.length > 0 ? runningPolls[0] : null

    logger.debug(
      {
        event: 'session_heartbeat',
        userId,
        campaignId,
        sessionId,
        hasCurrentPoll: !!currentPoll,
        currentPollId: currentPoll?.id,
        currentPollStatus: currentPoll?.status,
      },
      'Session heartbeat received'
    )

    return response.ok({
      data: {
        sessionActive: true,
        currentPoll: currentPoll ? PollInstanceDto.fromModel(currentPoll) : null,
        serverTime: Date.now(),
      },
    })
  }
}
