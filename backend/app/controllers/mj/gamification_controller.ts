import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import type { GamificationService } from '#services/gamification/gamification_service'
import { GamificationEventRepository } from '#repositories/gamification_event_repository'
import { GamificationConfigRepository } from '#repositories/gamification_config_repository'
import { GamificationInstanceRepository } from '#repositories/gamification_instance_repository'
import { CampaignRepository } from '#repositories/campaign_repository'
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
    private campaignRepository: CampaignRepository
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

    if (instance.status !== 'active') {
      return response.badRequest({ error: "L'instance n'est pas active" })
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
    // Bloquer en production
    const nodeEnv = process.env.NODE_ENV || 'development'
    if (nodeEnv === 'production') {
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
}
