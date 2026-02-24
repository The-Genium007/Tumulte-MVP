import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import { z } from 'zod'
import { streamer as Streamer } from '#models/streamer'
import { campaign as Campaign } from '#models/campaign'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'
import { GamificationConfigRepository } from '#repositories/gamification_config_repository'
// GamificationEventRepository non utilisé directement - les events sont chargés via les configs
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import type { RewardManagerService } from '#services/gamification/reward_manager_service'

// Schéma de validation pour activer un événement
const enableEventSchema = z.object({
  costOverride: z.number().int().min(1).max(1000000).optional(),
})

// Schéma de validation pour mettre à jour le coût
const updateCostSchema = z.object({
  cost: z.number().int().min(1).max(1000000),
})

/**
 * StreamerGamificationController - Gestion de la gamification côté Streamer
 *
 * Permet aux streamers de :
 * - Voir les événements activés par le MJ pour leur campagne
 * - Activer/désactiver les rewards sur leur chaîne Twitch
 * - Personnaliser le coût en points de chaîne
 */
@inject()
export default class StreamerGamificationController {
  private _rewardManagerService!: RewardManagerService

  constructor(
    private streamerConfigRepo: StreamerGamificationConfigRepository,
    private campaignConfigRepo: GamificationConfigRepository,
    private membershipRepo: CampaignMembershipRepository
  ) {}

  /**
   * Lazy getter pour RewardManagerService — résout via le binding nommé du container
   * afin que setEventSubService() ait été appelé (contrairement à @inject() auto-résolution)
   */
  private async getRewardManagerService(): Promise<RewardManagerService> {
    if (!this._rewardManagerService) {
      this._rewardManagerService = await app.container.make('rewardManagerService')
    }
    return this._rewardManagerService
  }

  /**
   * Vérifie que l'utilisateur a accès à la campagne en tant que streamer
   * (soit membre actif, soit propriétaire de la campagne)
   */
  private async checkStreamerAccess(
    userId: string,
    campaignId: string
  ): Promise<{ streamer: InstanceType<typeof Streamer>; error?: string }> {
    // Vérifier que l'utilisateur a un profil streamer
    const streamer = await Streamer.query().where('userId', userId).first()
    if (!streamer) {
      return { streamer: null as never, error: 'Profil streamer requis' }
    }

    // Vérifier si l'utilisateur est propriétaire de la campagne
    const campaign = await Campaign.find(campaignId)
    if (!campaign) {
      return { streamer: null as never, error: 'Campagne non trouvée' }
    }

    const isOwner = campaign.ownerId === userId

    // Si pas propriétaire, vérifier l'adhésion
    if (!isOwner) {
      const membership = await this.membershipRepo.findByCampaignAndStreamer(
        campaignId,
        streamer.id
      )
      if (!membership || membership.status !== 'ACTIVE') {
        return { streamer: null as never, error: "Vous n'êtes pas membre de cette campagne" }
      }
    }

    return { streamer }
  }

  /**
   * Liste les événements gamification disponibles pour cette campagne
   * avec le statut d'activation du streamer
   * GET /dashboard/campaigns/:campaignId/gamification
   */
  async list({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const campaignId = params.campaignId as string

    // Vérifier l'accès (membre actif OU propriétaire)
    const { streamer, error } = await this.checkStreamerAccess(user.id, campaignId)
    if (error) {
      return response.forbidden({ error })
    }

    // Récupérer les configs MJ activées pour cette campagne
    const campaignConfigs = await this.campaignConfigRepo.findEnabledByCampaign(campaignId)

    // Récupérer les configs streamer
    const streamerConfigs = await this.streamerConfigRepo.findByStreamerAndCampaign(
      streamer.id,
      campaignId
    )

    // Mapper les données pour l'UI
    const events = await Promise.all(
      campaignConfigs.map(async (campaignConfig) => {
        await campaignConfig.load('event')
        const event = campaignConfig.event

        const streamerConfig = streamerConfigs.find((sc) => sc.eventId === event.id)

        const rewardManager = await this.getRewardManagerService()
        const recommendedCost = rewardManager.getRecommendedCost(campaignConfig, event)
        const difficultyExplanation = rewardManager.getDifficultyExplanation(campaignConfig, event)

        return {
          eventId: event.id,
          eventName: event.name,
          eventSlug: event.slug,
          eventDescription: event.description,
          actionType: event.actionType,
          rewardColor: event.rewardColor,

          // État MJ
          isEnabledByCampaign: campaignConfig.isEnabled,

          // État Streamer
          isEnabledByStreamer: streamerConfig?.isEnabled ?? false,
          twitchRewardId: streamerConfig?.twitchRewardId ?? null,
          twitchRewardStatus: streamerConfig?.twitchRewardStatus ?? 'not_created',

          // Coûts
          recommendedCost,
          streamerCostOverride: streamerConfig?.costOverride ?? null,
          effectiveCost: streamerConfig
            ? streamerConfig.getEffectiveCost(campaignConfig, event)
            : recommendedCost,

          // Explications
          difficultyExplanation,
        }
      })
    )

    // Vérifier si le streamer est affilié ou partenaire (peut utiliser les points de chaîne)
    const canUseChannelPoints =
      streamer.broadcasterType === 'affiliate' || streamer.broadcasterType === 'partner'

    return response.ok({
      data: {
        events,
        hasAnyEnabled: events.some((e) => e.isEnabledByStreamer),
        canUseChannelPoints,
      },
    })
  }

  /**
   * Active un événement sur la chaîne du streamer (crée le reward Twitch)
   * POST /dashboard/campaigns/:campaignId/gamification/events/:eventId/enable
   */
  async enable({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const campaignId = params.campaignId as string
    const eventId = params.eventId as string

    // Vérifier l'accès (membre actif OU propriétaire)
    const { streamer, error } = await this.checkStreamerAccess(user.id, campaignId)
    if (error) {
      return response.forbidden({ error })
    }

    // Valider les données
    const validationResult = await enableEventSchema.safeParseAsync(request.all())
    const costOverride = validationResult.success ? validationResult.data.costOverride : undefined

    try {
      const rewardManager = await this.getRewardManagerService()
      const config = await rewardManager.enableForStreamer(
        streamer,
        campaignId,
        eventId,
        costOverride
      )

      // Récupérer la config campagne pour les infos complètes
      const campaignConfig = await this.campaignConfigRepo.findByCampaignAndEvent(
        campaignId,
        eventId
      )
      await campaignConfig?.load('event')

      return response.ok({
        data: {
          eventId: config.eventId,
          isEnabledByStreamer: config.isEnabled,
          twitchRewardId: config.twitchRewardId,
          twitchRewardStatus: config.twitchRewardStatus,
          effectiveCost: campaignConfig
            ? config.getEffectiveCost(campaignConfig, campaignConfig.event)
            : config.costOverride,
        },
        message: 'Événement activé sur votre chaîne',
      })
    } catch (err) {
      return response.badRequest({
        error: err instanceof Error ? err.message : "Impossible d'activer l'événement",
      })
    }
  }

  /**
   * Désactive un événement sur la chaîne du streamer
   * POST /dashboard/campaigns/:campaignId/gamification/events/:eventId/disable
   */
  async disable({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const campaignId = params.campaignId as string
    const eventId = params.eventId as string

    // Vérifier l'accès (membre actif OU propriétaire)
    const { streamer, error } = await this.checkStreamerAccess(user.id, campaignId)
    if (error) {
      return response.forbidden({ error })
    }

    const rewardManager = await this.getRewardManagerService()
    await rewardManager.disableForStreamer(streamer, campaignId, eventId)

    return response.ok({
      message: 'Événement désactivé sur votre chaîne',
    })
  }

  /**
   * Met à jour le coût override du streamer
   * PUT /dashboard/campaigns/:campaignId/gamification/events/:eventId/cost
   */
  async updateCost({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const campaignId = params.campaignId as string
    const eventId = params.eventId as string

    // Vérifier l'accès (membre actif OU propriétaire)
    const { streamer, error } = await this.checkStreamerAccess(user.id, campaignId)
    if (error) {
      return response.forbidden({ error })
    }

    // Valider les données
    const validationResult = await updateCostSchema.safeParseAsync(request.all())
    if (!validationResult.success) {
      return response.badRequest({
        error: 'Coût invalide',
        details: validationResult.error.issues,
      })
    }

    const { cost } = validationResult.data

    const rewardManager = await this.getRewardManagerService()
    const config = await rewardManager.updateCost(streamer, campaignId, eventId, cost)

    if (!config) {
      return response.notFound({
        error: "Configuration non trouvée. Activez d'abord l'événement.",
      })
    }

    return response.ok({
      data: {
        eventId: config.eventId,
        streamerCostOverride: config.costOverride,
        effectiveCost: cost,
      },
      message: 'Coût mis à jour',
    })
  }
}
