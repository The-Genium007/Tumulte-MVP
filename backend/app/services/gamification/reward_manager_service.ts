import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import * as Sentry from '@sentry/node'
import { streamer as Streamer } from '#models/streamer'
import GamificationEvent from '#models/gamification_event'
import CampaignGamificationConfig from '#models/campaign_gamification_config'
import StreamerGamificationConfig from '#models/streamer_gamification_config'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'
import { GamificationConfigRepository } from '#repositories/gamification_config_repository'
import { TwitchRewardService, type CreateRewardData } from '#services/twitch/twitch_reward_service'
import type { TwitchEventSubService } from '#services/twitch/twitch_eventsub_service'

/**
 * RewardManagerService - Orchestration de la création/gestion des rewards Twitch
 *
 * Ce service gère le cycle de vie des Channel Points Rewards pour la gamification :
 * - Création du reward quand un streamer active un événement
 * - Création de la subscription EventSub pour recevoir les rédemptions
 * - Mise à jour du coût quand le streamer le modifie
 * - Suppression/désactivation en cascade quand le MJ désactive
 */
@inject()
export class RewardManagerService {
  private eventSubService: TwitchEventSubService | null = null

  constructor(
    private streamerConfigRepo: StreamerGamificationConfigRepository,
    private campaignConfigRepo: GamificationConfigRepository,
    private twitchRewardService: TwitchRewardService
  ) {}

  /**
   * Injecte le service EventSub (optionnel, setter injection)
   *
   * Permet d'ajouter le support EventSub sans modifier le constructeur
   * ni casser les appelants existants. Appelé par le container IoC.
   */
  setEventSubService(service: TwitchEventSubService): void {
    this.eventSubService = service
    logger.info('[RewardManager] TwitchEventSubService injected successfully')
  }

  /**
   * Active un événement pour un streamer et crée le reward Twitch
   *
   * Stratégie "delete-before-recreate" :
   * On supprime TOUJOURS l'ancien reward Twitch avant d'en créer un nouveau.
   * Cela garantit le badge "Nouveau" sur Twitch (plus visible pour les viewers)
   * et évite les erreurs DUPLICATE_REWARD.
   */
  async enableForStreamer(
    streamer: Streamer,
    campaignId: string,
    eventId: string,
    costOverride?: number
  ): Promise<StreamerGamificationConfig> {
    const logCtx = { streamerId: streamer.id, campaignId, eventId }

    logger.info(
      {
        event: 'reward_enable_for_streamer',
        ...logCtx,
        hasEventSubService: !!this.eventSubService,
      },
      '[RewardManager] enableForStreamer called'
    )

    // 1. Vérifier que l'événement est activé par le MJ
    const campaignConfig = await this.campaignConfigRepo.findByCampaignAndEvent(campaignId, eventId)
    if (!campaignConfig || !campaignConfig.isEnabled) {
      throw new Error("Cet événement n'est pas activé pour cette campagne")
    }

    await campaignConfig.load('event')
    const event = campaignConfig.event

    // 2. Chercher ou créer la config streamer
    let streamerConfig = await this.streamerConfigRepo.findByStreamerCampaignAndEvent(
      streamer.id,
      campaignId,
      eventId
    )

    if (!streamerConfig) {
      streamerConfig = await this.streamerConfigRepo.create({
        campaignId,
        streamerId: streamer.id,
        eventId,
        isEnabled: true,
        costOverride: costOverride ?? null,
      })
    } else {
      streamerConfig.isEnabled = true
      if (costOverride !== undefined) {
        streamerConfig.costOverride = costOverride
      }
      await streamerConfig.save()
    }

    logger.info(
      {
        event: 'reward_config_state',
        ...logCtx,
        twitchRewardId: streamerConfig.twitchRewardId,
        twitchRewardStatus: streamerConfig.twitchRewardStatus,
        canCreate: streamerConfig.canCreateTwitchReward,
      },
      '[RewardManager] Current config state before reward creation'
    )

    // 3. Supprimer l'ancien reward Twitch s'il existe (delete-before-recreate)
    //    On supprime toujours pour garantir le badge "Nouveau" sur Twitch
    if (streamerConfig.twitchRewardId) {
      await this.deleteExistingReward(streamer, streamerConfig, logCtx)
    }

    // 4. Créer un nouveau reward Twitch frais
    const effectiveCost = streamerConfig.getEffectiveCost(campaignConfig, event)
    const reward = await this.createFreshReward(
      streamer,
      streamerConfig,
      event,
      effectiveCost,
      logCtx
    )

    if (reward) {
      // 5. Créer la subscription EventSub pour recevoir les rédemptions
      await this.ensureEventSubSubscription(streamer, reward.id, logCtx)
    }

    await streamerConfig.load('event')
    return streamerConfig
  }

  /**
   * Désactive un événement pour un streamer (pause le reward Twitch)
   */
  async disableForStreamer(streamer: Streamer, campaignId: string, eventId: string): Promise<void> {
    const streamerConfig = await this.streamerConfigRepo.findByStreamerCampaignAndEvent(
      streamer.id,
      campaignId,
      eventId
    )

    if (!streamerConfig) {
      return
    }

    streamerConfig.isEnabled = false
    await streamerConfig.save()

    // Mettre en pause le reward Twitch (ne pas le supprimer pour conserver l'ID)
    if (streamerConfig.twitchRewardId && streamerConfig.twitchRewardStatus === 'active') {
      const success = await this.twitchRewardService.disableReward(
        streamer,
        streamerConfig.twitchRewardId
      )

      if (success) {
        streamerConfig.twitchRewardStatus = 'paused'
        await streamerConfig.save()

        logger.info(
          {
            event: 'reward_paused_for_streamer',
            streamerId: streamer.id,
            campaignId,
            eventId,
            rewardId: streamerConfig.twitchRewardId,
          },
          'Reward Twitch mis en pause pour le streamer'
        )
      }
    }
  }

  /**
   * Désactive tous les rewards d'une campagne pour un événement
   * Appelé quand le MJ désactive l'événement
   */
  async disableForCampaign(campaignId: string, eventId: string): Promise<void> {
    const configs = await this.streamerConfigRepo.findEnabledByCampaignAndEvent(campaignId, eventId)

    for (const config of configs) {
      try {
        await config.load('streamer')
        const streamer = config.streamer

        config.isEnabled = false
        await config.save()

        // Mettre en pause le reward Twitch
        if (config.twitchRewardId && config.twitchRewardStatus === 'active') {
          const success = await this.twitchRewardService.disableReward(
            streamer,
            config.twitchRewardId
          )

          if (success) {
            config.twitchRewardStatus = 'paused'
            await config.save()
          }
        }

        logger.info(
          {
            event: 'reward_disabled_cascade',
            streamerId: streamer.id,
            campaignId,
            eventId,
          },
          'Reward désactivé en cascade (MJ a désactivé événement)'
        )
      } catch (error) {
        logger.error(
          {
            event: 'reward_disable_cascade_error',
            configId: config.id,
            error: error instanceof Error ? error.message : String(error),
          },
          'Erreur lors de la désactivation en cascade'
        )
      }
    }
  }

  /**
   * Met à jour le coût d'un reward existant
   */
  async updateCost(
    streamer: Streamer,
    campaignId: string,
    eventId: string,
    newCost: number
  ): Promise<StreamerGamificationConfig | null> {
    const streamerConfig = await this.streamerConfigRepo.findByStreamerCampaignAndEvent(
      streamer.id,
      campaignId,
      eventId
    )

    if (!streamerConfig) {
      return null
    }

    streamerConfig.costOverride = newCost
    await streamerConfig.save()

    // Mettre à jour le reward Twitch si existant
    if (streamerConfig.twitchRewardId && streamerConfig.twitchRewardStatus === 'active') {
      await this.twitchRewardService.updateReward(streamer, streamerConfig.twitchRewardId, {
        cost: newCost,
      })

      logger.info(
        {
          event: 'reward_cost_updated',
          streamerId: streamer.id,
          campaignId,
          eventId,
          newCost,
        },
        'Coût du reward mis à jour'
      )
    }

    await streamerConfig.load('event')
    return streamerConfig
  }

  /**
   * Calcule le coût recommandé basé sur la config MJ
   */
  getRecommendedCost(
    campaignConfig: CampaignGamificationConfig | null,
    event: GamificationEvent
  ): number {
    if (campaignConfig?.cost !== null && campaignConfig?.cost !== undefined) {
      return campaignConfig.cost
    }
    return event.defaultCost
  }

  /**
   * Récupère les infos de difficulté pour l'UI
   */
  getDifficultyExplanation(
    campaignConfig: CampaignGamificationConfig | null,
    event: GamificationEvent
  ): string {
    const coefficient = campaignConfig?.objectiveCoefficient ?? event.defaultObjectiveCoefficient
    const percentage = Math.round(coefficient * 100)
    return `${percentage}% des viewers doivent cliquer`
  }

  /**
   * Supprime un reward Twitch existant avant recréation
   *
   * Tente la suppression par ID connu. Si le reward n'existe plus sur Twitch (404),
   * on considère ça comme un succès. En cas d'échec, on tente un cleanup par titre
   * via listRewards() pour gérer les DUPLICATE_REWARD.
   */
  private async deleteExistingReward(
    streamer: Streamer,
    config: StreamerGamificationConfig,
    logCtx: { streamerId: string; campaignId: string; eventId: string }
  ): Promise<void> {
    const oldRewardId = config.twitchRewardId

    logger.info(
      {
        event: 'reward_delete_before_recreate',
        ...logCtx,
        oldRewardId,
        oldStatus: config.twitchRewardStatus,
      },
      '[RewardManager] Deleting existing reward before recreate'
    )

    if (oldRewardId) {
      const deleteResult = await this.twitchRewardService.deleteRewardWithRetry(
        streamer,
        oldRewardId
      )

      if (deleteResult.success) {
        logger.info(
          {
            event: 'reward_deleted_before_recreate',
            ...logCtx,
            oldRewardId,
            wasAlreadyDeleted: deleteResult.isAlreadyDeleted,
          },
          '[RewardManager] Old reward deleted successfully'
        )
      } else {
        logger.warn(
          {
            event: 'reward_delete_failed_before_recreate',
            ...logCtx,
            oldRewardId,
          },
          '[RewardManager] Failed to delete old reward by ID, will try cleanup by title'
        )
      }
    }

    // Reset DB state regardless — we'll create a fresh reward next
    config.twitchRewardId = null
    config.twitchRewardStatus = 'not_created'
    config.deletionFailedAt = null
    config.deletionRetryCount = 0
    config.nextDeletionRetryAt = null
    await config.save()
  }

  /**
   * Crée un reward Twitch frais avec gestion de DUPLICATE_REWARD
   *
   * Si la création échoue avec DUPLICATE_REWARD, on tente de supprimer
   * le reward conflictuel par titre via listRewards(), puis on réessaie.
   */
  private async createFreshReward(
    streamer: Streamer,
    config: StreamerGamificationConfig,
    event: GamificationEvent,
    cost: number,
    logCtx: { streamerId: string; campaignId: string; eventId: string }
  ): Promise<{ id: string } | null> {
    const title = this.getRewardTitle(event)

    logger.info(
      {
        event: 'reward_create_fresh',
        ...logCtx,
        title,
        cost,
      },
      '[RewardManager] Creating fresh reward'
    )

    // Première tentative de création
    let reward = await this.createTwitchReward(streamer, event, cost)

    // Si la création échoue, c'est probablement un DUPLICATE_REWARD
    // On tente un cleanup par titre et on réessaie
    if (!reward) {
      logger.warn(
        {
          event: 'reward_create_failed_trying_cleanup',
          ...logCtx,
          title,
        },
        '[RewardManager] First create attempt failed, attempting cleanup by title'
      )

      const cleaned = await this.cleanupDuplicateByTitle(streamer, title, logCtx)

      if (cleaned) {
        logger.info(
          {
            event: 'reward_duplicate_cleaned',
            ...logCtx,
            title,
          },
          '[RewardManager] Duplicate reward cleaned up, retrying create'
        )

        // Deuxième tentative après cleanup
        reward = await this.createTwitchReward(streamer, event, cost)
      }
    }

    if (reward) {
      config.twitchRewardId = reward.id
      config.twitchRewardStatus = 'active'
      await config.save()

      logger.info(
        {
          event: 'reward_created_fresh',
          ...logCtx,
          rewardId: reward.id,
          cost,
        },
        '[RewardManager] Fresh reward created successfully'
      )
    } else {
      logger.error(
        {
          event: 'reward_create_fresh_failed',
          ...logCtx,
          title,
        },
        '[RewardManager] Failed to create fresh reward after all attempts'
      )
      Sentry.captureMessage('Failed to create fresh Twitch reward after cleanup', {
        level: 'error',
        tags: {
          service: 'reward_manager',
          operation: 'createFreshReward',
        },
        extra: { ...logCtx, title, cost },
      })
    }

    return reward
  }

  /**
   * Supprime un reward Twitch conflictuel trouvé par titre
   *
   * Utilisé quand createReward échoue avec DUPLICATE_REWARD.
   * Liste tous les rewards manageables du streamer, trouve celui avec
   * le même titre, et le supprime.
   */
  private async cleanupDuplicateByTitle(
    streamer: Streamer,
    title: string,
    logCtx: { streamerId: string; campaignId: string; eventId: string }
  ): Promise<boolean> {
    try {
      const rewards = await this.twitchRewardService.listRewards(streamer)

      logger.info(
        {
          event: 'reward_list_for_cleanup',
          ...logCtx,
          totalRewards: rewards.length,
          rewardTitles: rewards.map((r) => r.title),
          targetTitle: title,
        },
        '[RewardManager] Listed rewards for duplicate cleanup'
      )

      const duplicate = rewards.find((r) => r.title === title)

      if (!duplicate) {
        logger.warn(
          {
            event: 'reward_duplicate_not_found',
            ...logCtx,
            title,
          },
          '[RewardManager] No duplicate found by title'
        )
        return false
      }

      logger.info(
        {
          event: 'reward_deleting_duplicate',
          ...logCtx,
          duplicateRewardId: duplicate.id,
          title,
        },
        '[RewardManager] Found and deleting duplicate reward'
      )

      const deleted = await this.twitchRewardService.deleteReward(streamer, duplicate.id)

      if (deleted) {
        logger.info(
          {
            event: 'reward_duplicate_deleted',
            ...logCtx,
            duplicateRewardId: duplicate.id,
          },
          '[RewardManager] Duplicate reward deleted'
        )
      } else {
        logger.error(
          {
            event: 'reward_duplicate_delete_failed',
            ...logCtx,
            duplicateRewardId: duplicate.id,
          },
          '[RewardManager] Failed to delete duplicate reward'
        )
      }

      return deleted
    } catch (error) {
      logger.error(
        {
          event: 'reward_cleanup_by_title_error',
          ...logCtx,
          title,
          error: error instanceof Error ? error.message : String(error),
        },
        '[RewardManager] Error during cleanup by title'
      )
      return false
    }
  }

  /**
   * S'assure qu'une subscription EventSub existe pour recevoir les rédemptions
   *
   * Méthode résiliente : si le service EventSub n'est pas injecté ou si la
   * création échoue, le reward reste fonctionnel — les rédemptions ne seront
   * simplement pas reçues automatiquement (diagnostic via logs Sentry).
   *
   * @param streamer - Le streamer dont la chaîne doit être surveillée
   * @param rewardId - L'ID du reward Twitch (pour filtrer les rédemptions)
   * @param metadata - Contexte métier pour le tracking Sentry
   */
  private async ensureEventSubSubscription(
    streamer: Streamer,
    rewardId: string,
    metadata: { streamerId: string; campaignId: string; eventId: string }
  ): Promise<void> {
    if (!this.eventSubService) {
      logger.warn(
        {
          event: 'eventsub_service_not_available',
          ...metadata,
          rewardId,
        },
        'TwitchEventSubService non injecté — subscription EventSub non créée'
      )
      return
    }

    try {
      // eslint-disable-next-line camelcase
      const condition = { broadcaster_user_id: streamer.twitchUserId, reward_id: rewardId }
      const subscription = await this.eventSubService.createSubscription({
        type: 'channel.channel_points_custom_reward_redemption.add',
        condition,
        metadata: {
          streamerId: metadata.streamerId,
          campaignId: metadata.campaignId,
          eventId: metadata.eventId,
        },
      })

      if (subscription) {
        logger.info(
          {
            event: 'eventsub_subscription_ensured',
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            rewardId,
            ...metadata,
          },
          'Subscription EventSub assurée pour le reward'
        )
      } else {
        logger.error(
          {
            event: 'eventsub_subscription_ensure_failed',
            rewardId,
            ...metadata,
          },
          'Échec de création de la subscription EventSub — les rédemptions ne seront pas reçues'
        )
        Sentry.captureMessage('EventSub subscription creation failed for reward', {
          level: 'error',
          tags: {
            service: 'reward_manager',
            operation: 'ensureEventSubSubscription',
          },
          extra: { rewardId, ...metadata },
        })
      }
    } catch (error) {
      logger.error(
        {
          event: 'eventsub_subscription_ensure_error',
          rewardId,
          error: error instanceof Error ? error.message : String(error),
          ...metadata,
        },
        'Erreur lors de la création de la subscription EventSub'
      )
      Sentry.captureException(error, {
        tags: {
          service: 'reward_manager',
          operation: 'ensureEventSubSubscription',
        },
        extra: { rewardId, ...metadata },
      })
    }
  }

  /**
   * Crée un reward Twitch Channel Points
   */
  private async createTwitchReward(
    streamer: Streamer,
    event: GamificationEvent,
    cost: number
  ): Promise<{ id: string } | null> {
    const rewardData: CreateRewardData = {
      title: this.getRewardTitle(event),
      cost,
      prompt: this.getRewardPrompt(event),
      backgroundColor: event.rewardColor,
      isEnabled: true,
      isUserInputRequired: false,
      shouldSkipRequestQueue: true, // Auto-fulfill pour éviter la file d'attente
    }

    const reward = await this.twitchRewardService.createReward(streamer, rewardData)
    return reward ? { id: reward.id } : null
  }

  /**
   * Génère le titre du reward selon l'événement
   */
  private getRewardTitle(event: GamificationEvent): string {
    switch (event.actionType) {
      case 'dice_invert':
        return '🎲 Inverser le Dé'
      case 'chat_message':
        return '💬 Message Spécial'
      case 'stat_modify':
        return '📊 Modifier Stats'
      default:
        return event.name
    }
  }

  /**
   * Génère la description du reward selon l'événement
   */
  private getRewardPrompt(event: GamificationEvent): string {
    switch (event.actionType) {
      case 'dice_invert':
        return "Active la jauge d'inversion ! Si le chat réussit à la remplir, le prochain critique sera inversé !"
      case 'chat_message':
        return 'Envoie un message spécial dans le chat du jeu !'
      case 'stat_modify':
        return 'Participe à modifier les statistiques du personnage !'
      default:
        return event.description || 'Participe à cet événement de gamification !'
    }
  }
}

export default RewardManagerService
