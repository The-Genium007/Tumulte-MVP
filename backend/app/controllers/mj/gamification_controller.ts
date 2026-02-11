import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import type { GamificationService } from '#services/gamification/gamification_service'
import { GamificationEventRepository } from '#repositories/gamification_event_repository'
import { GamificationConfigRepository } from '#repositories/gamification_config_repository'
import { GamificationInstanceRepository } from '#repositories/gamification_instance_repository'
import { CampaignRepository } from '#repositories/campaign_repository'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import {
  GamificationEventDto,
  GamificationEventListDto,
} from '#dtos/gamification/gamification_event_dto'
import { GamificationConfigEffectiveDto } from '#dtos/gamification/gamification_config_dto'
import {
  GamificationInstanceDto,
  GamificationInstanceHistoryDto,
} from '#dtos/gamification/gamification_instance_dto'
import {
  updateCampaignGamificationConfigSchema,
  triggerManualEventSchema,
} from '#validators/gamification/gamification_validators'
import { randomUUID, createHmac } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'

/**
 * GamificationController - Gestion de la gamification côté MJ
 */
@inject()
export default class GamificationController {
  private gamificationService!: GamificationService

  constructor(
    private eventRepository: GamificationEventRepository,
    private configRepository: GamificationConfigRepository,
    private instanceRepository: GamificationInstanceRepository,
    private campaignRepository: CampaignRepository,
    private streamerConfigRepository: StreamerGamificationConfigRepository,
    private membershipRepository: CampaignMembershipRepository
  ) {}

  /**
   * Initialise le service de gamification depuis le container
   * pour avoir l'injection du FoundryCommandAdapter
   */
  private async getGamificationService(): Promise<GamificationService> {
    if (!this.gamificationService) {
      this.gamificationService = await app.container.make('gamificationService')
    }
    return this.gamificationService
  }

  /**
   * Liste tous les événements disponibles
   * GET /mj/gamification/events
   */
  async listEvents({ response }: HttpContext) {
    const events = await this.eventRepository.findAll()

    return response.ok({
      data: GamificationEventListDto.fromModelArray(events),
    })
  }

  /**
   * Récupère les détails d'un événement
   * GET /mj/gamification/events/:eventId
   */
  async showEvent({ params, response }: HttpContext) {
    const event = await this.eventRepository.findById(params.eventId)

    if (!event) {
      return response.notFound({ error: 'Événement non trouvé' })
    }

    return response.ok({
      data: GamificationEventDto.fromModel(event),
    })
  }

  /**
   * Récupère la configuration gamification d'une campagne
   * GET /mj/campaigns/:id/gamification
   */
  async getCampaignConfig({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const campaignId = params.id

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    const configs = await this.configRepository.findByCampaign(campaignId)

    return response.ok({
      data: GamificationConfigEffectiveDto.fromModelArray(configs),
    })
  }

  /**
   * Active un événement pour une campagne
   * POST /mj/campaigns/:id/gamification/events/:eventId/enable
   */
  async enableEvent({ auth, params, request, response }: HttpContext) {
    const userId = auth.user!.id
    const campaignId = params.id
    const eventId = params.eventId

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    // Vérifier que l'événement existe
    const event = await this.eventRepository.findById(eventId)
    if (!event) {
      return response.notFound({ error: 'Événement non trouvé' })
    }

    // Valider les overrides optionnels
    const validationResult = await updateCampaignGamificationConfigSchema.safeParseAsync(
      request.all()
    )

    // Transformer null en undefined pour compatibilité avec le service
    const rawOverrides = validationResult.success ? validationResult.data : undefined
    const overrides = rawOverrides
      ? {
          cost: rawOverrides.cost ?? undefined,
          objectiveCoefficient: rawOverrides.objectiveCoefficient ?? undefined,
          minimumObjective: rawOverrides.minimumObjective ?? undefined,
          duration: rawOverrides.duration ?? undefined,
          cooldown: rawOverrides.cooldown ?? undefined,
          maxClicksPerUserPerSession: rawOverrides.maxClicksPerUserPerSession,
        }
      : undefined

    const gamificationService = await this.getGamificationService()
    const config = await gamificationService.enableEventForCampaign(campaignId, eventId, overrides)

    await config.load('event')

    return response.ok({
      data: GamificationConfigEffectiveDto.fromModel(config),
    })
  }

  /**
   * Désactive un événement pour une campagne
   * POST /mj/campaigns/:id/gamification/events/:eventId/disable
   */
  async disableEvent({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const campaignId = params.id
    const eventId = params.eventId

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    const gamificationService = await this.getGamificationService()
    await gamificationService.disableEventForCampaign(campaignId, eventId)

    return response.ok({ message: 'Événement désactivé' })
  }

  /**
   * Met à jour la configuration d'un événement pour une campagne
   * PUT /mj/campaigns/:id/gamification/events/:eventId
   */
  async updateConfig({ auth, params, request, response }: HttpContext) {
    const userId = auth.user!.id
    const campaignId = params.id
    const eventId = params.eventId

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    // Valider les données
    const validationResult = await updateCampaignGamificationConfigSchema.safeParseAsync(
      request.all()
    )

    if (!validationResult.success) {
      return response.badRequest({
        error: 'Validation échouée',
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    // Récupérer ou créer la config
    let config = await this.configRepository.findByCampaignAndEvent(campaignId, eventId)

    if (!config) {
      // Vérifier que l'événement existe
      const event = await this.eventRepository.findById(eventId)
      if (!event) {
        return response.notFound({ error: 'Événement non trouvé' })
      }

      config = await this.configRepository.create({
        campaignId,
        eventId,
        isEnabled: validationResult.data.isEnabled ?? false,
      })
    }

    // Mettre à jour les champs
    const data = validationResult.data
    if (data.isEnabled !== undefined) config.isEnabled = data.isEnabled
    if (data.cost !== undefined) config.cost = data.cost
    if (data.objectiveCoefficient !== undefined)
      config.objectiveCoefficient = data.objectiveCoefficient
    if (data.minimumObjective !== undefined) config.minimumObjective = data.minimumObjective
    if (data.duration !== undefined) config.duration = data.duration
    if (data.cooldown !== undefined) config.cooldown = data.cooldown
    if (data.maxClicksPerUserPerSession !== undefined)
      config.maxClicksPerUserPerSession = data.maxClicksPerUserPerSession

    await config.save()
    await config.load('event')

    return response.ok({
      data: GamificationConfigEffectiveDto.fromModel(config),
    })
  }

  /**
   * Récupère les instances d'une campagne
   * GET /mj/campaigns/:id/gamification/instances
   *
   * Query params:
   * - status=active : seulement les instances actives
   * - status=recent : instances "en cours" + terminées récemment (défaut)
   * - status=history : historique complet (limité à 50)
   * - status=<autre> : filtre par statut spécifique
   */
  async listInstances({ auth, params, request, response }: HttpContext) {
    const userId = auth.user!.id
    const campaignId = params.id
    const status = request.input('status', 'recent') // Défaut: recent

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    // Seulement les instances actives
    if (status === 'active') {
      const instances = await this.instanceRepository.findActiveByCampaign(campaignId)
      return response.ok({
        data: GamificationInstanceDto.fromModelArray(instances),
      })
    }

    // Instances "récentes" pour affichage MJ (défaut)
    // - active/armed: toujours
    // - completed: 5 minutes
    // - expired/cancelled: 2 minutes
    if (status === 'recent') {
      const instances = await this.instanceRepository.findRecentForDisplay(campaignId)
      return response.ok({
        data: GamificationInstanceDto.fromModelArray(instances),
      })
    }

    // Historique complet
    const instances = await this.instanceRepository.findByCampaign(campaignId, {
      status: status === 'history' ? undefined : (status as any),
      limit: 50,
    })

    return response.ok({
      data: GamificationInstanceHistoryDto.fromModelArray(instances),
    })
  }

  /**
   * Déclenche manuellement un événement
   * POST /mj/campaigns/:id/gamification/trigger
   */
  async triggerEvent({ auth, params, request, response }: HttpContext) {
    const userId = auth.user!.id
    const campaignId = params.id

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    // Valider les données
    const validationResult = await triggerManualEventSchema.safeParseAsync(request.all())

    if (!validationResult.success) {
      return response.badRequest({
        error: 'Validation échouée',
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const { eventId, streamerId, viewerCount, customData } = validationResult.data

    // TODO: Récupérer le nom du streamer
    const streamerName = 'Streamer'

    const gamificationService = await this.getGamificationService()
    const instance = await gamificationService.triggerManualEvent(
      campaignId,
      eventId,
      streamerId,
      streamerName,
      viewerCount,
      customData
    )

    if (!instance) {
      return response.badRequest({
        error: "Impossible de déclencher l'événement (peut-être en cooldown)",
      })
    }

    await instance.load('event')

    return response.created({
      data: GamificationInstanceDto.fromModel(instance),
    })
  }

  /**
   * Annule une instance active
   * POST /mj/campaigns/:id/gamification/instances/:instanceId/cancel
   */
  async cancelInstance({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const campaignId = params.id
    const instanceId = params.instanceId

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    // Vérifier que l'instance existe et appartient à cette campagne
    const instance = await this.instanceRepository.findById(instanceId)
    if (!instance || instance.campaignId !== campaignId) {
      return response.notFound({ error: 'Instance non trouvée' })
    }

    if (instance.status !== 'active' && instance.status !== 'armed') {
      return response.badRequest({
        error: "L'instance doit être active ou armée pour être annulée",
      })
    }

    const gamificationService = await this.getGamificationService()
    const cancelled = await gamificationService.cancelInstance(instanceId)
    await cancelled.load('event')

    return response.ok({
      data: GamificationInstanceDto.fromModel(cancelled),
    })
  }

  /**
   * Force la complétion d'une instance (DEV/STAGING uniquement)
   * POST /mj/campaigns/:id/gamification/instances/:instanceId/force-complete
   */
  async forceComplete({ auth, params, response }: HttpContext) {
    // Bloquer en production (ENV_SUFFIX distingue prod/staging, contrairement à NODE_ENV)
    const envSuffix = process.env.ENV_SUFFIX || 'dev'
    if (envSuffix === 'prod') {
      return response.forbidden({ error: 'Cette route est désactivée en production' })
    }

    const userId = auth.user!.id
    const campaignId = params.id
    const instanceId = params.instanceId

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    // Vérifier que l'instance existe et appartient à cette campagne
    const instance = await this.instanceRepository.findById(instanceId)
    if (!instance || instance.campaignId !== campaignId) {
      return response.notFound({ error: 'Instance non trouvée' })
    }

    if (instance.status !== 'active') {
      return response.badRequest({ error: "L'instance n'est pas active" })
    }

    // Forcer la complétion
    const gamificationService = await this.getGamificationService()
    const completed = await gamificationService.forceCompleteInstance(instanceId)
    await completed.load('event')

    return response.ok({
      data: GamificationInstanceDto.fromModel(completed),
    })
  }

  /**
   * Réinitialise les cooldowns de gamification d'une campagne
   * POST /mj/campaigns/:id/gamification/reset-cooldowns
   *
   * DEV/STAGING uniquement.
   */
  async resetCooldowns({ auth, params, response }: HttpContext) {
    const envSuffix = process.env.ENV_SUFFIX || 'dev'
    if (envSuffix === 'prod') {
      return response.forbidden({ error: 'Cette route est désactivée en production' })
    }

    const userId = auth.user!.id
    const campaignId = params.id

    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    const gamificationService = await this.getGamificationService()
    await gamificationService.onSessionStart(campaignId)

    return response.ok({
      data: { message: 'Cooldowns réinitialisés' },
    })
  }

  /**
   * Récupère les statistiques de gamification d'une campagne
   * GET /mj/campaigns/:id/gamification/stats
   */
  async getStats({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const campaignId = params.id

    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    const counts = await this.instanceRepository.countByStatus(campaignId)

    return response.ok({
      data: {
        totalInstances: counts.active + counts.completed + counts.expired + counts.cancelled,
        activeInstances: counts.active,
        completedInstances: counts.completed,
        expiredInstances: counts.expired,
        cancelledInstances: counts.cancelled,
        successRate:
          counts.completed + counts.expired > 0
            ? Math.round((counts.completed / (counts.completed + counts.expired)) * 100)
            : 0,
      },
    })
  }

  /**
   * Simule une redemption Channel Points via self HTTP call au webhook EventSub
   * POST /mj/campaigns/:id/gamification/events/:eventId/simulate-redemption
   *
   * DEV/STAGING uniquement. Envoie un vrai POST HTTP signé HMAC au endpoint
   * /webhooks/twitch/eventsub pour tester le pipeline complet.
   */
  async simulateRedemption({ auth, params, response }: HttpContext) {
    const envSuffix = process.env.ENV_SUFFIX || 'dev'
    if (envSuffix === 'prod') {
      return response.forbidden({ error: 'Cette route est désactivée en production' })
    }

    const userId = auth.user!.id
    const campaignId = params.id
    const eventId = params.eventId

    const isOwner = await this.campaignRepository.isOwner(campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: "Vous n'êtes pas propriétaire de cette campagne" })
    }

    // Trouver un streamer membre actif de la campagne avec une config gamification
    const memberships = await this.membershipRepository.findActiveByCampaign(campaignId)
    if (memberships.length === 0) {
      return response.badRequest({
        error: 'Aucun streamer actif dans cette campagne',
      })
    }

    // Chercher un streamer qui a activé cet événement (StreamerGamificationConfig avec twitchRewardId)
    let streamerConfig = null
    let targetMembership = null

    for (const membership of memberships) {
      const config = await this.streamerConfigRepository.findByStreamerCampaignAndEvent(
        membership.streamerId,
        campaignId,
        eventId
      )
      if (config?.twitchRewardId && config.isEnabled) {
        streamerConfig = config
        targetMembership = membership
        break
      }
    }

    // Si aucun streamer n'a de twitchRewardId (non-affilié), auto-provisionner un reward simulé
    if (!streamerConfig || !targetMembership) {
      // Prendre le premier membre actif avec un compte Twitch lié
      const eligibleMembership = memberships.find((m) => m.streamer?.twitchUserId)
      if (!eligibleMembership) {
        return response.badRequest({
          error: 'Aucun streamer avec un compte Twitch lié dans cette campagne',
        })
      }

      // Chercher ou créer la StreamerGamificationConfig
      let config = await this.streamerConfigRepository.findByStreamerCampaignAndEvent(
        eligibleMembership.streamerId,
        campaignId,
        eventId
      )

      if (!config) {
        config = await this.streamerConfigRepository.create({
          campaignId,
          streamerId: eligibleMembership.streamerId,
          eventId,
          isEnabled: true,
        })
      } else if (!config.isEnabled) {
        await this.streamerConfigRepository.setEnabled(config.id, true)
        config.isEnabled = true
      }

      // Auto-provisionner un twitchRewardId simulé
      const simRewardId = `sim_reward_${randomUUID()}`
      await this.streamerConfigRepository.updateTwitchReward(config.id, simRewardId, 'active')
      config.twitchRewardId = simRewardId
      config.twitchRewardStatus = 'active' as any

      // Recharger la relation event
      config = await this.streamerConfigRepository.findByStreamerCampaignAndEvent(
        eligibleMembership.streamerId,
        campaignId,
        eventId
      )

      streamerConfig = config!
      targetMembership = eligibleMembership

      logger.info(
        {
          event: 'simulate_redemption_auto_provision',
          streamerId: eligibleMembership.streamerId,
          simRewardId,
          campaignId,
          eventId,
        },
        'Auto-provisioned simulated twitchRewardId for non-affiliate streamer'
      )
    }

    const streamer = targetMembership.streamer
    if (!streamer?.twitchUserId) {
      return response.badRequest({
        error: "Le streamer n'a pas de compte Twitch lié",
      })
    }

    // Vérifier que le secret EventSub est configuré
    const webhookSecret = env.get('TWITCH_EVENTSUB_SECRET') || ''
    if (!webhookSecret) {
      return response.badRequest({
        error:
          'TWITCH_EVENTSUB_SECRET non configuré dans .env. ' +
          'Ajoutez un secret (ex: "dev-test-secret") pour la vérification de signature.',
      })
    }

    // Réinitialiser les cooldowns pour cette campagne avant la simulation
    // afin de permettre des tests en boucle sans être bloqué
    const gamificationService = await this.getGamificationService()
    await gamificationService.onSessionStart(campaignId)

    // Construire le payload EventSub identique à Twitch
    const redemptionId = randomUUID()
    const testViewerId = String(Math.floor(Math.random() * 900000000) + 100000000)
    const testViewerName = `test_viewer_${Math.floor(Math.random() * 9999)}`

    const effectiveCost = streamerConfig.getEffectiveCost(
      await this.configRepository.findByCampaignAndEvent(campaignId, eventId),
      streamerConfig.event
    )

    const eventsubPayload = {
      subscription: {
        id: randomUUID(),
        type: 'channel.channel_points_custom_reward_redemption.add',
        version: '1',
        status: 'enabled',
        condition: {
          broadcaster_user_id: streamer.twitchUserId,
        },
        transport: {
          method: 'webhook',
          callback: `http://localhost/webhooks/twitch/eventsub`,
        },
        created_at: new Date().toISOString(),
      },

      event: {
        id: redemptionId,
        broadcaster_user_id: streamer.twitchUserId,
        broadcaster_user_login: streamer.twitchLogin || 'test_broadcaster', // eslint-disable-line camelcase
        broadcaster_user_name: streamer.twitchDisplayName || 'Test_Broadcaster', // eslint-disable-line camelcase
        user_id: testViewerId,
        user_login: testViewerName, // eslint-disable-line camelcase
        user_name: testViewerName, // eslint-disable-line camelcase
        user_input: '', // eslint-disable-line camelcase
        status: 'unfulfilled',
        reward: {
          id: streamerConfig.twitchRewardId,
          title: streamerConfig.event?.name || 'Gamification Test',
          cost: effectiveCost,
          prompt: '',
        },
        redeemed_at: new Date().toISOString(), // eslint-disable-line camelcase
      },
    }

    // Calculer la signature HMAC-SHA256 (même algo que twitch_eventsub_controller.ts:295-330)
    const messageId = randomUUID()
    const timestamp = new Date().toISOString()
    const bodyString = JSON.stringify(eventsubPayload)
    const hmacMessage = messageId + timestamp + bodyString
    const signature =
      'sha256=' + createHmac('sha256', webhookSecret).update(hmacMessage).digest('hex')

    // Self HTTP call vers le vrai endpoint webhook
    const port = env.get('PORT', 3333)
    const host = env.get('HOST', 'localhost')
    const webhookUrl = `http://${host}:${port}/webhooks/twitch/eventsub`

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Twitch-Eventsub-Message-Id': messageId,
          'Twitch-Eventsub-Message-Timestamp': timestamp,
          'Twitch-Eventsub-Message-Signature': signature,
          'Twitch-Eventsub-Message-Type': 'notification',
        },
        body: bodyString,
      })

      const webhookStatus = webhookResponse.status
      const webhookBody = await webhookResponse.text()

      if (webhookStatus === 200) {
        logger.info(
          {
            event: 'simulate_redemption_success',
            campaignId,
            eventId,
            streamerId: streamer.id,
            redemptionId,
            viewerName: testViewerName,
          },
          'Simulation redemption réussie'
        )

        return response.ok({
          message: 'Redemption simulée avec succès',
          data: {
            redemptionId,
            viewerName: testViewerName,
            cost: effectiveCost,
            streamerId: streamer.id,
            streamerName: streamer.twitchDisplayName || streamer.twitchLogin,
            webhookStatus,
          },
        })
      }

      logger.warn(
        {
          event: 'simulate_redemption_webhook_failed',
          webhookStatus,
          webhookBody,
        },
        'Le webhook EventSub a rejeté la simulation'
      )

      return response.badRequest({
        error: `Le webhook a répondu avec le status ${webhookStatus}`,
        details: webhookBody,
      })
    } catch (err) {
      logger.error(
        { event: 'simulate_redemption_error', error: (err as Error).message },
        'Erreur lors du self HTTP call'
      )

      return response.internalServerError({
        error: 'Erreur lors de la simulation',
        details: (err as Error).message,
      })
    }
  }
}
