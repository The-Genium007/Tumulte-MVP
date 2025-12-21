import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Streamer from '#models/streamer'
import PollTemplate from '#models/poll_template'
import PollInstance from '#models/poll_instance'
import Campaign from '#models/campaign'
import PollService from '#services/poll_service'
import PollSession from '#models/poll_session'
import Poll from '#models/poll'
import PollResult from '#models/poll_result'
import TwitchPollService from '#services/twitch_poll_service'
import TwitchChatService from '#services/twitch/twitch_chat_service'
import TwitchChatCountdownService from '#services/twitch/twitch_chat_countdown_service'
import RedisService from '#services/cache/redis_service'
import CampaignMembership from '#models/campaign_membership'

export default class MJController {
  private _chatService?: TwitchChatService
  private _chatCountdownService?: TwitchChatCountdownService
  private _redisService?: RedisService

  private async getChatService() {
    if (!this._chatService) {
      const app = (await import('@adonisjs/core/services/app')).default
      this._chatService = await app.container.make('TwitchChatService')
    }
    return this._chatService
  }

  private async getChatCountdownService() {
    if (!this._chatCountdownService) {
      const app = (await import('@adonisjs/core/services/app')).default
      this._chatCountdownService = await app.container.make('TwitchChatCountdownService')
    }
    return this._chatCountdownService
  }

  private async getRedisService() {
    if (!this._redisService) {
      const app = (await import('@adonisjs/core/services/app')).default
      this._redisService = await app.container.make('RedisService')
    }
    return this._redisService
  }

  private readonly pollService = new PollService()
  private readonly twitchPollService = new TwitchPollService()

  /**
   * Liste tous les streamers
   */
  async listStreamers({ response }: HttpContext) {
    const streamers = await Streamer.query().orderBy('created_at', 'desc')

    return response.ok({
      data: streamers.map((streamer) => ({
        id: streamer.id,
        twitch_user_id: streamer.twitchUserId,
        twitch_login: streamer.twitchLogin,
        twitch_display_name: streamer.twitchDisplayName,
        is_active: streamer.isActive,
        created_at: streamer.createdAt.toISO(),
      })),
    })
  }

  /**
   * Liste tous les templates de sondages (optionnellement filtrés par campagne)
   */
  async listTemplates({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { campaignId } = params

    // Si campaignId est fourni, vérifier que la campagne appartient au MJ
    if (campaignId) {
      const campaign = await Campaign.query()
        .where('id', campaignId)
        .where('owner_id', user.id)
        .first()

      if (!campaign) {
        return response.notFound({ error: 'Campaign not found' })
      }
    }

    // Vérifier si un template par défaut existe déjà (uniquement pour templates sans campagne)
    if (!campaignId) {
      const defaultTemplateExists = await PollTemplate.query()
        .where('owner_id', user.id)
        .where('is_default', true)
        .first()

      // Si aucun template par défaut n'existe, en créer un
      if (!defaultTemplateExists) {
        await PollTemplate.create({
          ownerId: user.id,
          label: '🎮 Template de démonstration',
          title: 'Ceci est un sondage de test',
          options: ['Option Test 1', 'Option Test 2', 'Option Test 3'],
          durationSeconds: 60,
          isDefault: true,
        })
      }
    }

    const query = PollTemplate.query().where('owner_id', user.id)

    // Filtrer par campagne si fourni
    if (campaignId) {
      query.where('campaign_id', campaignId)
    } else {
      // Sinon, ne récupérer que les templates sans campagne (legacy)
      query.whereNull('campaign_id')
    }

    const templates = await query.orderBy('created_at', 'desc')

    return response.ok({
      data: templates.map((template) => ({
        id: template.id,
        label: template.label,
        title: template.title,
        options: template.options,
        duration_seconds: template.durationSeconds,
        is_default: template.isDefault,
        created_at: template.createdAt.toISO(),
      })),
    })
  }

  /**
   * Crée un nouveau template (optionnellement lié à une campagne)
   */
  async createTemplate({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { campaignId } = params
    const { label, title, options, duration_seconds } = request.only([
      'label',
      'title',
      'options',
      'duration_seconds',
    ])

    // Si campaignId est fourni, vérifier que la campagne appartient au MJ
    if (campaignId) {
      const campaign = await Campaign.query()
        .where('id', campaignId)
        .where('owner_id', user.id)
        .first()

      if (!campaign) {
        return response.notFound({ error: 'Campaign not found' })
      }
    }

    // Validation
    if (!label || !title || !options || !duration_seconds) {
      return response.badRequest({ error: 'Missing required fields' })
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
      return response.badRequest({ error: 'Options must be an array with 2 to 5 choices' })
    }

    if (duration_seconds < 15 || duration_seconds > 1800) {
      return response.badRequest({ error: 'Duration must be between 15 and 1800 seconds' })
    }

    try {
      const template = await PollTemplate.create({
        ownerId: user.id,
        campaignId: campaignId || null,
        label,
        title,
        options,
        durationSeconds: duration_seconds,
      })

      logger.info(
        `Template ${template.id} created by MJ ${user.id} for campaign ${campaignId || 'none'}`
      )

      return response.created({
        data: {
          id: template.id,
          label: template.label,
          title: template.title,
          options: template.options,
          duration_seconds: template.durationSeconds,
          created_at: template.createdAt.toISO(),
        },
      })
    } catch (error) {
      logger.error(`Failed to create template: ${error.message}`)
      return response.internalServerError({ error: 'Failed to create template' })
    }
  }

  /**
   * Met à jour un template existant
   */
  async updateTemplate({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const templateId = params.id
    const { label, title, options, duration_seconds } = request.only([
      'label',
      'title',
      'options',
      'duration_seconds',
    ])

    // Récupérer le template
    const template = await PollTemplate.query()
      .where('id', templateId)
      .where('owner_id', user.id)
      .first()

    if (!template) {
      return response.notFound({ error: 'Template not found' })
    }

    // Empêcher la modification des templates par défaut
    if (template.isDefault) {
      return response.forbidden({ error: 'Cannot modify default templates' })
    }

    // Validation
    if (options && (!Array.isArray(options) || options.length < 2 || options.length > 5)) {
      return response.badRequest({ error: 'Options must be an array with 2 to 5 choices' })
    }

    if (duration_seconds && (duration_seconds < 15 || duration_seconds > 1800)) {
      return response.badRequest({ error: 'Duration must be between 15 and 1800 seconds' })
    }

    try {
      // Mettre à jour les champs fournis
      if (label) template.label = label
      if (title) template.title = title
      if (options) template.options = options
      if (duration_seconds) template.durationSeconds = duration_seconds

      await template.save()

      logger.info(`Template ${template.id} updated by MJ ${user.id}`)

      return response.ok({
        data: {
          id: template.id,
          label: template.label,
          title: template.title,
          options: template.options,
          duration_seconds: template.durationSeconds,
          updated_at: template.updatedAt.toISO(),
        },
      })
    } catch (error) {
      logger.error(`Failed to update template: ${error.message}`)
      return response.internalServerError({ error: 'Failed to update template' })
    }
  }

  /**
   * Supprime un template
   */
  async deleteTemplate({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const templateId = params.id

    const template = await PollTemplate.query()
      .where('id', templateId)
      .where('owner_id', user.id)
      .first()

    if (!template) {
      return response.notFound({ error: 'Template not found' })
    }

    // Empêcher la suppression des templates par défaut
    if (template.isDefault) {
      return response.forbidden({ error: 'Cannot delete default templates' })
    }

    try {
      await template.delete()

      logger.info(`Template ${templateId} deleted by MJ ${user.id}`)

      return response.ok({ message: 'Template deleted successfully' })
    } catch (error) {
      logger.error(`Failed to delete template: ${error.message}`)
      return response.internalServerError({ error: 'Failed to delete template' })
    }
  }

  /**
   * Lance un nouveau sondage (optionnellement lié à une campagne)
   */
  async launchPoll({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { campaignId } = params
    const { template_id, title, options, duration_seconds } = request.only([
      'template_id',
      'title',
      'options',
      'duration_seconds',
    ])

    // Si campaignId est fourni, vérifier que la campagne appartient au MJ
    if (campaignId) {
      const campaign = await Campaign.query()
        .where('id', campaignId)
        .where('owner_id', user.id)
        .first()

      if (!campaign) {
        return response.notFound({ error: 'Campaign not found' })
      }
    }

    let pollTitle: string
    let pollOptions: string[]
    let pollDuration: number

    // Si un template_id est fourni, charger le template
    if (template_id) {
      const template = await PollTemplate.query()
        .where('id', template_id)
        .where('owner_id', user.id)
        .first()

      if (!template) {
        return response.notFound({ error: 'Template not found' })
      }

      pollTitle = template.title
      pollOptions = template.options
      pollDuration = template.durationSeconds
    } else {
      // Sinon, utiliser les valeurs fournies
      if (!title || !options || !duration_seconds) {
        return response.badRequest({
          error: 'Either template_id or (title, options, duration_seconds) must be provided',
        })
      }

      if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
        return response.badRequest({ error: 'Options must be an array with 2 to 5 choices' })
      }

      if (duration_seconds < 15 || duration_seconds > 1800) {
        return response.badRequest({ error: 'Duration must be between 15 and 1800 seconds' })
      }

      pollTitle = title
      pollOptions = options
      pollDuration = duration_seconds
    }

    try {
      // Créer l'instance de sondage
      const pollInstance = await PollInstance.create({
        templateId: template_id || null,
        campaignId: campaignId || null,
        title: pollTitle,
        options: pollOptions,
        durationSeconds: pollDuration,
        status: 'PENDING',
        createdBy: user.id,
      })

      logger.info(`Poll instance ${pollInstance.id} created by MJ ${user.id}`)

      // Créer les sondages Twitch sur tous les streamers actifs
      await this.pollService.createPollsOnTwitch(pollInstance)

      // Mettre à jour le statut et démarrer le polling
      pollInstance.status = 'RUNNING'
      pollInstance.startedAt = DateTime.now()
      await pollInstance.save()

      // Démarrer le système de polling
      await this.pollService.startPolling(pollInstance)

      logger.info(`Poll instance ${pollInstance.id} started`)

      return response.created({
        data: {
          id: pollInstance.id,
          title: pollInstance.title,
          options: pollInstance.options,
          duration_seconds: pollInstance.durationSeconds,
          status: pollInstance.status,
          started_at: pollInstance.startedAt?.toISO(),
        },
      })
    } catch (error) {
      logger.error(`Failed to launch poll: ${error.message}`)
      return response.internalServerError({ error: 'Failed to launch poll' })
    }
  }

  /**
   * Liste tous les sondages (optionnellement filtrés par campagne)
   */
  async listPolls({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { campaignId } = params
    const status = request.input('status') // Filtre optionnel par statut

    // Si campaignId est fourni, vérifier que la campagne appartient au MJ
    if (campaignId) {
      const campaign = await Campaign.query()
        .where('id', campaignId)
        .where('owner_id', user.id)
        .first()

      if (!campaign) {
        return response.notFound({ error: 'Campaign not found' })
      }
    }

    const query = PollInstance.query().where('created_by', user.id).orderBy('created_at', 'desc')

    // Filtrer par campagne
    if (campaignId) {
      query.where('campaign_id', campaignId)
    } else {
      // Sinon, ne récupérer que les polls sans campagne (legacy)
      query.whereNull('campaign_id')
    }

    if (status) {
      query.where('status', status)
    }

    const polls = await query.preload('channelLinks')

    return response.ok({
      data: polls.map((poll) => ({
        id: poll.id,
        title: poll.title,
        options: poll.options,
        duration_seconds: poll.durationSeconds,
        status: poll.status,
        started_at: poll.startedAt?.toISO(),
        ended_at: poll.endedAt?.toISO(),
        channel_links_count: poll.channelLinks.length,
        created_at: poll.createdAt.toISO(),
      })),
    })
  }

  /**
   * Récupère un sondage spécifique avec ses résultats
   */
  async getPoll({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const pollId = params.id

    const poll = await PollInstance.query()
      .where('id', pollId)
      .where('created_by', user.id)
      .preload('channelLinks', (query) => {
        query.preload('streamer')
      })
      .first()

    if (!poll) {
      return response.notFound({ error: 'Poll not found' })
    }

    // Récupérer les votes agrégés
    const aggregated = await this.pollService.getAggregatedVotes(pollId)

    return response.ok({
      data: {
        id: poll.id,
        title: poll.title,
        options: poll.options,
        duration_seconds: poll.durationSeconds,
        status: poll.status,
        started_at: poll.startedAt?.toISO(),
        ended_at: poll.endedAt?.toISO(),
        total_votes: aggregated.totalVotes,
        votes_by_option: aggregated.votesByOption,
        percentages: aggregated.percentages,
        channel_links: poll.channelLinks.map((link) => ({
          id: link.id,
          streamer: {
            id: link.streamer.id,
            twitch_display_name: link.streamer.twitchDisplayName,
            twitch_login: link.streamer.twitchLogin,
          },
          status: link.status,
          total_votes: link.totalVotes,
          votes_by_option: link.votesByOption,
        })),
        created_at: poll.createdAt.toISO(),
      },
    })
  }

  // ==========================================
  // POLL SESSIONS
  // ==========================================

  /**
   * Liste toutes les sessions de sondages pour une campagne
   */
  async listPollSessions({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { campaignId } = params

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    const sessions = await PollSession.query()
      .where('campaign_id', campaignId)
      .preload('polls')
      .orderBy('created_at', 'desc')

    return response.ok({
      data: sessions.map((session) => ({
        id: session.id,
        name: session.name,
        default_duration_seconds: session.defaultDurationSeconds,
        polls_count: session.polls.length,
        created_at: session.createdAt.toISO(),
        updated_at: session.updatedAt.toISO(),
      })),
    })
  }

  /**
   * Crée une nouvelle session de sondages
   */
  async createPollSession({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { campaignId } = params
    const { name, default_duration_seconds } = request.only(['name', 'default_duration_seconds'])

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    // Validation
    if (!name || !default_duration_seconds) {
      return response.badRequest({ error: 'Missing required fields' })
    }

    if (default_duration_seconds < 15 || default_duration_seconds > 1800) {
      return response.badRequest({ error: 'Duration must be between 15 and 1800 seconds' })
    }

    try {
      const session = await PollSession.create({
        ownerId: user.id,
        campaignId,
        name,
        defaultDurationSeconds: default_duration_seconds,
      })

      logger.info(`Poll session ${session.id} created by MJ ${user.id} for campaign ${campaignId}`)

      return response.created({
        data: {
          id: session.id,
          name: session.name,
          default_duration_seconds: session.defaultDurationSeconds,
          polls_count: 0,
          created_at: session.createdAt.toISO(),
        },
      })
    } catch (error) {
      logger.error(`Failed to create poll session: ${error.message}`)
      return response.internalServerError({ error: 'Failed to create poll session' })
    }
  }

  /**
   * Récupère une session spécifique avec tous ses sondages
   */
  async getPollSession({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { campaignId, id } = params

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    const session = await PollSession.query()
      .where('id', id)
      .where('campaign_id', campaignId)
      .preload('polls', (query) => {
        query.orderBy('order_index', 'asc')
      })
      .first()

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    return response.ok({
      data: {
        id: session.id,
        name: session.name,
        default_duration_seconds: session.defaultDurationSeconds,
        polls: session.polls.map((poll) => ({
          id: poll.id,
          question: poll.question,
          options: poll.options,
          type: poll.type,
          order_index: poll.orderIndex,
          channel_points_enabled: poll.channelPointsEnabled,
          channel_points_amount: poll.channelPointsAmount,
          created_at: poll.createdAt.toISO(),
        })),
        created_at: session.createdAt.toISO(),
        updated_at: session.updatedAt.toISO(),
      },
    })
  }

  /**
   * Met à jour une session de sondages
   */
  async updatePollSession({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { campaignId, id } = params
    const { name, default_duration_seconds } = request.only(['name', 'default_duration_seconds'])

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    const session = await PollSession.query()
      .where('id', id)
      .where('campaign_id', campaignId)
      .first()

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    // Validation
    if (
      default_duration_seconds &&
      (default_duration_seconds < 15 || default_duration_seconds > 1800)
    ) {
      return response.badRequest({ error: 'Duration must be between 15 and 1800 seconds' })
    }

    try {
      if (name) session.name = name
      if (default_duration_seconds) session.defaultDurationSeconds = default_duration_seconds

      await session.save()

      logger.info(`Poll session ${session.id} updated by MJ ${user.id}`)

      return response.ok({
        data: {
          id: session.id,
          name: session.name,
          default_duration_seconds: session.defaultDurationSeconds,
          updated_at: session.updatedAt.toISO(),
        },
      })
    } catch (error) {
      logger.error(`Failed to update poll session: ${error.message}`)
      return response.internalServerError({ error: 'Failed to update poll session' })
    }
  }

  /**
   * Supprime une session de sondages
   */
  async deletePollSession({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { campaignId, id } = params

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    const session = await PollSession.query()
      .where('id', id)
      .where('campaign_id', campaignId)
      .first()

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    try {
      await session.delete()

      logger.info(`Poll session ${id} deleted by MJ ${user.id}`)

      return response.ok({ message: 'Poll session deleted successfully' })
    } catch (error) {
      logger.error(`Failed to delete poll session: ${error.message}`)
      return response.internalServerError({ error: 'Failed to delete poll session' })
    }
  }

  /**
   * Ajoute un sondage à une session
   */
  async addPollToSession({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { campaignId, sessionId } = params
    const { question, options, type, channel_points_enabled, channel_points_amount } = request.only(
      ['question', 'options', 'type', 'channel_points_enabled', 'channel_points_amount']
    )

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    // Vérifier que la session existe
    const session = await PollSession.query()
      .where('id', sessionId)
      .where('campaign_id', campaignId)
      .first()

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    // Validation
    if (!question || !options || !type) {
      return response.badRequest({ error: 'Missing required fields' })
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
      return response.badRequest({ error: 'Options must be an array with 2 to 5 choices' })
    }

    if (type !== 'STANDARD' && type !== 'UNIQUE') {
      return response.badRequest({ error: 'Type must be STANDARD or UNIQUE' })
    }

    try {
      // Obtenir l'index max actuel
      const maxIndexPoll = await Poll.query()
        .where('session_id', sessionId)
        .orderBy('order_index', 'desc')
        .first()

      const nextIndex = maxIndexPoll ? maxIndexPoll.orderIndex + 1 : 0

      const poll = await Poll.create({
        sessionId,
        question,
        options,
        type,
        orderIndex: nextIndex,
        channelPointsEnabled: channel_points_enabled || false,
        channelPointsAmount: channel_points_enabled ? channel_points_amount : null,
      })

      logger.info(`Poll ${poll.id} added to session ${sessionId} by MJ ${user.id}`)

      return response.created({
        data: {
          id: poll.id,
          question: poll.question,
          options: poll.options,
          type: poll.type,
          order_index: poll.orderIndex,
          channel_points_enabled: poll.channelPointsEnabled,
          channel_points_amount: poll.channelPointsAmount,
          created_at: poll.createdAt.toISO(),
        },
      })
    } catch (error) {
      logger.error(`Failed to add poll to session: ${error.message}`)
      return response.internalServerError({ error: 'Failed to add poll to session' })
    }
  }

  /**
   * Met à jour un sondage dans une session
   */
  async updatePollInSession({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { campaignId, sessionId, pollId } = params
    const { question, options, type } = request.only(['question', 'options', 'type'])

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    // Vérifier que la session existe
    const session = await PollSession.query()
      .where('id', sessionId)
      .where('campaign_id', campaignId)
      .first()

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    const poll = await Poll.query().where('id', pollId).where('session_id', sessionId).first()

    if (!poll) {
      return response.notFound({ error: 'Poll not found' })
    }

    // Validation
    if (options && (!Array.isArray(options) || options.length < 2 || options.length > 5)) {
      return response.badRequest({ error: 'Options must be an array with 2 to 5 choices' })
    }

    if (type && type !== 'STANDARD' && type !== 'UNIQUE') {
      return response.badRequest({ error: 'Type must be STANDARD or UNIQUE' })
    }

    try {
      if (question) poll.question = question
      if (options) poll.options = options
      if (type) poll.type = type

      await poll.save()

      logger.info(`Poll ${poll.id} updated in session ${sessionId} by MJ ${user.id}`)

      return response.ok({
        data: {
          id: poll.id,
          question: poll.question,
          options: poll.options,
          type: poll.type,
          order_index: poll.orderIndex,
          updated_at: poll.updatedAt.toISO(),
        },
      })
    } catch (error) {
      logger.error(`Failed to update poll in session: ${error.message}`)
      return response.internalServerError({ error: 'Failed to update poll in session' })
    }
  }

  /**
   * Supprime un sondage d'une session
   */
  async deletePollFromSession({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { campaignId, sessionId, pollId } = params

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    // Vérifier que la session existe
    const session = await PollSession.query()
      .where('id', sessionId)
      .where('campaign_id', campaignId)
      .first()

    if (!session) {
      return response.notFound({ error: 'Poll session not found' })
    }

    const poll = await Poll.query().where('id', pollId).where('session_id', sessionId).first()

    if (!poll) {
      return response.notFound({ error: 'Poll not found' })
    }

    try {
      await poll.delete()

      logger.info(`Poll ${pollId} deleted from session ${sessionId} by MJ ${user.id}`)

      return response.ok({ message: 'Poll deleted successfully' })
    } catch (error) {
      logger.error(`Failed to delete poll from session: ${error.message}`)
      return response.internalServerError({ error: 'Failed to delete poll from session' })
    }
  }

  /**
   * Lance un sondage d'une session sur Twitch
   */
  async launchPollFromSession({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { campaignId, pollId } = params

    logger.info({
      message: 'launchPollFromSession called',
      user_id: user.id,
      campaign_id: campaignId,
      poll_id: pollId,
    })

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      logger.warn({ message: 'Campaign not found', campaign_id: campaignId, user_id: user.id })
      return response.notFound({ error: 'Campaign not found' })
    }

    // Récupérer le sondage avec sa session
    const poll = await Poll.query()
      .where('id', pollId)
      .preload('session', (query) => {
        query.where('campaign_id', campaignId)
      })
      .first()

    logger.info({ message: 'Poll fetched', poll_found: !!poll, has_session: !!poll?.session })

    if (!poll || !poll.session) {
      logger.warn({ message: 'Poll not found or no session', poll_id: pollId })
      return response.notFound({ error: 'Poll not found' })
    }

    // Vérifier qu'un résultat n'existe pas déjà pour ce sondage EN COURS
    const existingResult = await PollResult.query()
      .where('poll_id', pollId)
      .where('campaign_id', campaignId)
      .whereIn('status', ['PENDING', 'RUNNING'])
      .first()

    logger.info({
      message: 'Checked existing result',
      has_existing: !!existingResult,
      existing_status: existingResult?.status,
    })

    if (existingResult) {
      logger.warn({
        message: 'Poll already running',
        poll_id: pollId,
        existing_result_id: existingResult.id,
        status: existingResult.status,
      })
      return response.badRequest({
        error: 'Poll is already running or pending',
        details: 'Please cancel or wait for the current poll to end before relaunching',
      })
    }

    // Si un poll a déjà été lancé mais est terminé/annulé/échoué, on peut le relancer
    // (création d'un nouveau PollResult)

    try {
      // Créer un résultat de sondage
      const pollResult = await PollResult.create({
        pollId,
        campaignId,
        status: 'PENDING',
        twitchPolls: {},
        totalVotes: 0,
        votesByOption: {},
      })

      // Récupérer les membres actifs de la campagne
      const members = await CampaignMembership.query()
        .where('campaign_id', campaignId)
        .where('status', 'ACTIVE')
        .preload('streamer')

      if (members.length === 0) {
        pollResult.status = 'FAILED'
        await pollResult.save()
        return response.badRequest({ error: 'No active streamers in campaign' })
      }

      // Déterminer les paramètres du sondage Twitch
      const channelPointsEnabled = poll.type === 'STANDARD' || poll.channelPointsEnabled
      const channelPointsAmount = poll.channelPointsAmount || 0

      const twitchPollsData: Record<string, any> = {}
      const failedStreamers: string[] = []
      const chatStreamers: string[] = []

      // Lancer le sondage sur chaque streamer
      for (const member of members) {
        try {
          // Récupérer l'access token déchiffré
          const accessToken = await member.streamer.getDecryptedAccessToken()

          // DÉTECTION DU MODE : Vérifier si le streamer est affilié/partenaire
          const shouldUseChatFallback =
            !member.streamer.broadcasterType ||
            (member.streamer.broadcasterType.toLowerCase() !== 'affiliate' &&
              member.streamer.broadcasterType.toLowerCase() !== 'partner')

          if (shouldUseChatFallback) {
            // MODE CHAT : Fallback pour streamers non-affiliés
            await this.launchChatPollForStreamer(member, poll, pollResult, accessToken)

            twitchPollsData[member.streamer.id] = {
              mode: 'CHAT',
              status: 'ACTIVE',
              streamer_name: member.streamer.twitchDisplayName,
              chat_connected: true,
              channel_points_enabled: false,
              channel_points_amount: 0,
            }

            chatStreamers.push(member.streamer.id)
          } else {
            // MODE API : Utiliser l'API Twitch Polls (code existant)
            const twitchPollResult = await this.twitchPollService.createPoll(
              member.streamer.twitchUserId,
              accessToken,
              poll.question,
              poll.options,
              poll.session.defaultDurationSeconds
            )

            twitchPollsData[member.streamer.id] = {
              mode: 'API',
              twitch_poll_id: twitchPollResult.id,
              status: twitchPollResult.status,
              streamer_name: member.streamer.twitchDisplayName,
              channel_points_enabled: channelPointsEnabled,
              channel_points_amount: channelPointsAmount,
            }
          }
        } catch (error) {
          logger.error(
            `Failed to create poll on streamer ${member.streamer.twitchDisplayName}: ${error.message}`
          )
          failedStreamers.push(member.streamer.twitchDisplayName)
          twitchPollsData[member.streamer.id] = {
            status: 'FAILED',
            error: error.message,
            streamer_name: member.streamer.twitchDisplayName,
          }
        }
      }

      // Planifier les countdowns pour les streamers en mode chat
      if (chatStreamers.length > 0) {
        const chatCountdownService = await this.getChatCountdownService()
        chatCountdownService.scheduleCountdown(
          pollResult.id,
          poll.session.defaultDurationSeconds,
          chatStreamers
        )
      }

      // Mettre à jour le résultat
      pollResult.twitchPolls = twitchPollsData
      pollResult.status = 'RUNNING'
      pollResult.startedAt = DateTime.now()
      await pollResult.save()

      logger.info({
        message: 'Poll launched by MJ',
        poll_id: pollId,
        poll_instance_id: pollResult.id,
        mj_id: user.id,
        streamers_count: members.length,
        failed_streamers: failedStreamers,
      })

      return response.created({
        data: {
          id: pollResult.id,
          poll_id: pollId,
          status: pollResult.status,
          started_at: pollResult.startedAt?.toISO(),
          streamers_count: members.length,
          failed_streamers: failedStreamers,
        },
      })
    } catch (error) {
      logger.error(`Failed to launch poll: ${error.message}`)
      return response.internalServerError({ error: 'Failed to launch poll' })
    }
  }

  /**
   * Récupère les résultats d'un sondage
   */
  async getPollResults({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { campaignId, pollId } = params

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    // Récupérer le résultat du sondage
    const pollResult = await PollResult.query()
      .where('poll_id', pollId)
      .where('campaign_id', campaignId)
      .orderBy('created_at', 'desc')
      .first()

    if (!pollResult) {
      return response.notFound({ error: 'Poll result not found' })
    }

    // Si le sondage est toujours en cours, récupérer les résultats en temps réel
    if (pollResult.status === 'RUNNING') {
      try {
        const twitchPollsData = pollResult.twitchPolls as Record<string, any>
        const votesByOption: Record<string, number> = {}
        let totalVotes = 0

        // Récupérer les résultats de chaque streamer
        for (const [streamerId, pollData] of Object.entries(twitchPollsData)) {
          const isChat = pollData.mode === 'CHAT'

          try {
            if (isChat) {
              // MODE CHAT : Récupérer depuis Redis
              const chatService = await this.getChatService()
              const chatVotes = await chatService.getVotes(pollResult.id, streamerId)

              // Agréger les votes (clés = index: "0", "1", "2")
              for (const [optionIndex, votes] of Object.entries(chatVotes)) {
                const optionIndexNum = parseInt(optionIndex, 10)
                const poll = await Poll.find(pollId)
                if (!poll) continue

                const optionTitle = poll.options[optionIndexNum]
                if (!optionTitle) continue

                if (!votesByOption[optionTitle]) {
                  votesByOption[optionTitle] = 0
                }
                votesByOption[optionTitle] += votes
                totalVotes += votes
              }
            } else {
              // MODE API : Code existant
              if (!pollData.twitch_poll_id) continue

              const streamer = await Streamer.find(streamerId)
              if (!streamer) continue

              // Récupérer l'access token déchiffré
              const accessToken = await streamer.getDecryptedAccessToken()

              const twitchPoll = await this.twitchPollService.getPoll(
                streamer.twitchUserId,
                pollData.twitch_poll_id,
                accessToken
              )

              // Agréger les votes
              for (const choice of twitchPoll.choices) {
                if (!votesByOption[choice.title]) {
                  votesByOption[choice.title] = 0
                }
                votesByOption[choice.title] += choice.votes
                totalVotes += choice.votes
              }

              // Mettre à jour le statut si le poll est terminé
              if (twitchPoll.status === 'COMPLETED' || twitchPoll.status === 'TERMINATED') {
                twitchPollsData[streamerId].status = twitchPoll.status
              }
            }
          } catch (error) {
            logger.error(
              `Failed to fetch poll results for streamer ${streamerId}: ${error.message}`
            )
          }
        }

        // Mettre à jour les résultats
        pollResult.votesByOption = votesByOption
        pollResult.totalVotes = totalVotes
        pollResult.twitchPolls = twitchPollsData

        // Vérifier si tous les polls sont terminés
        const allCompleted = Object.values(twitchPollsData).every(
          (data: any) =>
            data.status === 'COMPLETED' || data.status === 'TERMINATED' || data.status === 'FAILED'
        )

        if (allCompleted) {
          pollResult.status = 'COMPLETED'
          pollResult.endedAt = DateTime.now()
        }

        await pollResult.save()
      } catch (error) {
        logger.error(`Failed to update poll results: ${error.message}`)
      }
    }

    // Préparer les résultats pour le frontend
    const results = Object.entries(pollResult.votesByOption).map(([option, votes]) => ({
      option,
      votes,
    }))

    return response.ok({
      data: {
        id: pollResult.id,
        poll_id: pollId,
        status: pollResult.status,
        total_votes: pollResult.totalVotes,
        results,
        started_at: pollResult.startedAt?.toISO(),
        ended_at: pollResult.endedAt?.toISO(),
      },
    })
  }

  /**
   * Annule un sondage en cours
   */
  async cancelPollFromSession({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { campaignId, pollId } = params

    logger.info({
      message: 'cancelPollFromSession called',
      user_id: user.id,
      campaign_id: campaignId,
      poll_id: pollId,
    })

    // Vérifier que la campagne appartient au MJ
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .where('owner_id', user.id)
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found' })
    }

    // Récupérer le résultat du sondage en cours
    const pollResult = await PollResult.query()
      .where('poll_id', pollId)
      .where('campaign_id', campaignId)
      .where('status', 'RUNNING')
      .first()

    if (!pollResult) {
      return response.notFound({
        error: 'No running poll found for this poll ID',
      })
    }

    try {
      const twitchPollsData = pollResult.twitchPolls as Record<string, any>
      const cancelledStreamers: string[] = []
      const failedCancellations: string[] = []

      // Annuler le sondage sur chaque streamer
      for (const [streamerId, pollData] of Object.entries(twitchPollsData)) {
        if (pollData.status === 'FAILED') continue

        const isChat = pollData.mode === 'CHAT'

        try {
          if (isChat) {
            // MODE CHAT : Annulation via chat
            const chatCountdownService = await this.getChatCountdownService()
            const chatService = await this.getChatService()

            // Annuler les countdowns
            chatCountdownService.cancelCountdown(pollResult.id)

            // Envoyer message d'annulation AVANT de déconnecter
            await chatService.sendMessage(streamerId, '❌ Sondage annulé par le MJ')

            // Déconnecter le client IRC
            await chatService.disconnectFromPoll(streamerId, pollResult.id)

            twitchPollsData[streamerId].status = 'TERMINATED'
            cancelledStreamers.push(pollData.streamer_name || streamerId)
          } else {
            // MODE API : Code existant
            if (!pollData.twitch_poll_id) continue

            const streamer = await Streamer.find(streamerId)
            if (!streamer) {
              failedCancellations.push(pollData.streamer_name || streamerId)
              continue
            }

            if (
              !streamer.broadcasterType ||
              (streamer.broadcasterType.toLowerCase() !== 'affiliate' &&
                streamer.broadcasterType.toLowerCase() !== 'partner')
            ) {
              logger.warn(
                `Skipping remote cancellation for streamer ${streamer.twitchDisplayName}: not affiliate/partner`
              )
              failedCancellations.push(pollData.streamer_name || streamer.twitchDisplayName)
              twitchPollsData[streamerId].status = 'TERMINATED'
              continue
            }

            // Récupérer l'access token déchiffré
            const accessToken = await streamer.getDecryptedAccessToken()

            // Terminer le sondage sur Twitch (status TERMINATED)
            await this.twitchPollService.endPoll(
              streamer.twitchUserId,
              pollData.twitch_poll_id,
              accessToken,
              'TERMINATED'
            )

            twitchPollsData[streamerId].status = 'TERMINATED'
            cancelledStreamers.push(pollData.streamer_name || streamer.twitchDisplayName)
          }
        } catch (error) {
          logger.error(`Failed to cancel poll on streamer ${streamerId}: ${error.message}`)
          failedCancellations.push(pollData.streamer_name || streamerId)
          twitchPollsData[streamerId].status = 'TERMINATED'
        }
      }

      // Mettre à jour le résultat avec le statut CANCELLED
      pollResult.twitchPolls = twitchPollsData
      pollResult.status = 'CANCELLED' // Statut distinct pour les annulations manuelles
      pollResult.endedAt = DateTime.now()
      pollResult.cancelledBy = user.id
      pollResult.cancelledAt = DateTime.now()
      await pollResult.save()

      logger.info({
        message: 'Poll cancelled by MJ',
        poll_id: pollId,
        poll_instance_id: pollResult.id,
        mj_id: user.id,
        cancelled_streamers_count: cancelledStreamers.length,
        failed_cancellations_count: failedCancellations.length,
        failed_cancellations: failedCancellations,
      })

      return response.ok({
        data: {
          id: pollResult.id,
          poll_id: pollId,
          status: pollResult.status,
          cancelled_streamers: cancelledStreamers,
          failed_cancellations: failedCancellations,
          ended_at: pollResult.endedAt?.toISO(),
        },
      })
    } catch (error) {
      logger.error(`Failed to cancel poll: ${error.message}`)
      return response.internalServerError({ error: 'Failed to cancel poll' })
    }
  }

  /**
   * Lance un poll en mode chat pour un streamer (fallback non-affilié)
   */
  private async launchChatPollForStreamer(
    member: CampaignMembership,
    poll: Poll,
    pollResult: PollResult,
    accessToken: string
  ): Promise<void> {
    const streamer = member.streamer
    const chatService = await this.getChatService()
    const redisService = await this.getRedisService()

    // Connecter le client IRC
    await chatService.connectToPoll(
      streamer.id,
      streamer.twitchLogin,
      accessToken,
      pollResult.id,
      poll.options.length
    )

    // Définir le TTL Redis (durée + 5 minutes de marge)
    await redisService.setChatVotesTTL(
      pollResult.id,
      streamer.id,
      poll.session.defaultDurationSeconds + 300
    )

    // Envoyer le message initial
    const initialMessage = this.buildInitialChatMessage(
      poll.question,
      poll.options,
      poll.session.defaultDurationSeconds
    )

    await chatService.sendMessage(streamer.id, initialMessage)

    logger.info({
      event: 'chat_poll_launched',
      poll_instance_id: pollResult.id,
      streamer_id: streamer.id,
      streamer_name: streamer.twitchDisplayName,
      options_count: poll.options.length,
      duration: poll.session.defaultDurationSeconds,
    })
  }

  /**
   * Construit le message initial multiligne pour le chat
   */
  private buildInitialChatMessage(
    question: string,
    options: string[],
    durationSeconds: number
  ): string {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

    let message = `🎮 SONDAGE - ${durationSeconds} secondes\n${question}\n`

    options.forEach((option, index) => {
      const emoji = emojis[index] || `${index + 1}️⃣`
      message += `${emoji} ${option}\n`
    })

    message += `Votez en tapant ${options.map((_, i) => i + 1).join(', ')} !`

    return message
  }
}
