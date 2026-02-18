import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'
import { TwitchRewardService } from '#services/twitch/twitch_reward_service'
import type { GamificationActionType } from '#models/gamification_event'
import GamificationInstance from '#models/gamification_instance'

/**
 * Action types qui nécessitent un combat actif pour fonctionner.
 * Les rewards Twitch associés sont automatiquement pausés/dépausés
 * en fonction de l'état du combat dans Foundry VTT.
 */
export const COMBAT_REQUIRED_ACTION_TYPES: GamificationActionType[] = [
  'monster_buff',
  'monster_debuff',
]

/**
 * CombatRewardToggleService - Toggle automatique des rewards Twitch selon l'état du combat
 *
 * Quand un combat commence dans Foundry VTT, ce service réactive les rewards
 * monster_buff/monster_debuff pour que les viewers puissent interagir.
 * Quand le combat se termine, il les met en pause et annule les instances en cours.
 */
@inject()
export class CombatRewardToggleService {
  constructor(
    private streamerConfigRepo: StreamerGamificationConfigRepository,
    private twitchRewardService: TwitchRewardService
  ) {}

  /**
   * Appelé quand un combat commence ou se synchronise (reconnexion).
   * Réactive tous les rewards monster paused pour la campagne.
   * Idempotent : ne touche que les rewards actuellement en pause.
   */
  async onCombatStart(campaignId: string): Promise<void> {
    const configs = await this.streamerConfigRepo.findPausedCombatRewardsByCampaign(
      campaignId,
      COMBAT_REQUIRED_ACTION_TYPES
    )

    if (configs.length === 0) {
      logger.debug(
        { event: 'combat_reward_toggle_noop', campaignId },
        'Aucun reward combat à réactiver'
      )
      return
    }

    logger.info(
      {
        event: 'combat_reward_toggle_start',
        campaignId,
        configCount: configs.length,
      },
      'Réactivation des rewards combat'
    )

    let activatedCount = 0

    for (const config of configs) {
      try {
        const success = await this.twitchRewardService.enableReward(
          config.streamer,
          config.twitchRewardId!
        )

        if (success) {
          config.twitchRewardStatus = 'active'
          await config.save()
          activatedCount++
        }
      } catch (error) {
        logger.error(
          {
            event: 'combat_reward_activate_error',
            campaignId,
            streamerId: config.streamerId,
            rewardId: config.twitchRewardId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Erreur lors de la réactivation du reward combat'
        )
      }
    }

    logger.info(
      {
        event: 'combat_reward_toggle_done',
        campaignId,
        activated: activatedCount,
        total: configs.length,
      },
      `${activatedCount}/${configs.length} rewards combat réactivés`
    )

    await this.broadcastChatMessage(
      campaignId,
      '⚔️ Combat ! Les interactions monstres sont disponibles !'
    )
  }

  /**
   * Appelé quand un combat se termine.
   * Met en pause tous les rewards monster actifs, annule les instances en cours.
   */
  async onCombatEnd(campaignId: string): Promise<void> {
    const configs = await this.streamerConfigRepo.findActiveCombatRewardsByCampaign(
      campaignId,
      COMBAT_REQUIRED_ACTION_TYPES
    )

    if (configs.length === 0) {
      logger.debug(
        { event: 'combat_reward_pause_noop', campaignId },
        'Aucun reward combat à mettre en pause'
      )
      // Annuler quand même les instances (cas edge: reward déjà pausé manuellement)
      await this.cancelActiveCombatInstances(campaignId)
      return
    }

    logger.info(
      {
        event: 'combat_reward_pause_start',
        campaignId,
        configCount: configs.length,
      },
      'Mise en pause des rewards combat'
    )

    let pausedCount = 0

    for (const config of configs) {
      try {
        const success = await this.twitchRewardService.disableReward(
          config.streamer,
          config.twitchRewardId!
        )

        if (success) {
          config.twitchRewardStatus = 'paused'
          await config.save()
          pausedCount++
        }
      } catch (error) {
        logger.error(
          {
            event: 'combat_reward_pause_error',
            campaignId,
            streamerId: config.streamerId,
            rewardId: config.twitchRewardId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Erreur lors de la mise en pause du reward combat'
        )
      }
    }

    logger.info(
      {
        event: 'combat_reward_pause_done',
        campaignId,
        paused: pausedCount,
        total: configs.length,
      },
      `${pausedCount}/${configs.length} rewards combat mis en pause`
    )

    const cancelledCount = await this.cancelActiveCombatInstances(campaignId)

    if (cancelledCount > 0) {
      logger.info(
        {
          event: 'combat_instances_cancelled',
          campaignId,
          cancelledCount,
        },
        `${cancelledCount} instances combat annulées (fin de combat)`
      )
    }

    await this.broadcastChatMessage(
      campaignId,
      '🛡️ Combat terminé. Les interactions monstres sont désactivées.'
    )
  }

  /**
   * Annule toutes les instances actives pour les événements combat de la campagne.
   * Utilise GamificationService pour les broadcasts WebSocket.
   */
  private async cancelActiveCombatInstances(campaignId: string): Promise<number> {
    const activeInstances = await GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'active')
      .whereHas('event', (eventQuery) => {
        eventQuery.whereIn('actionType', COMBAT_REQUIRED_ACTION_TYPES)
      })

    if (activeInstances.length === 0) {
      return 0
    }

    let gamificationService: any = null
    try {
      gamificationService = await app.container.make('gamificationService')
    } catch {
      logger.warn('Could not resolve gamificationService for combat instance cancellation')
    }

    let cancelledCount = 0

    for (const instance of activeInstances) {
      try {
        if (gamificationService) {
          await gamificationService.cancelInstance(instance.id)
        } else {
          instance.status = 'cancelled'
          await instance.save()
        }
        cancelledCount++
      } catch (error) {
        logger.error(
          {
            event: 'combat_instance_cancel_error',
            instanceId: instance.id,
            campaignId,
            error: error instanceof Error ? error.message : String(error),
          },
          "Erreur lors de l'annulation d'une instance combat"
        )
      }
    }

    return cancelledCount
  }

  /**
   * Envoie un message chat à tous les streamers actifs de la campagne.
   */
  private async broadcastChatMessage(campaignId: string, message: string): Promise<void> {
    try {
      const { CampaignMembershipRepository } =
        await import('#repositories/campaign_membership_repository')
      const membershipRepo = new CampaignMembershipRepository()
      const memberships = await membershipRepo.findActiveByCampaign(campaignId)

      let chatService: any = null
      try {
        chatService = await app.container.make('twitchChatService')
      } catch {
        logger.warn('Could not resolve twitchChatService for combat chat notification')
        return
      }

      for (const membership of memberships) {
        try {
          await chatService.sendMessage(membership.streamerId, message)
        } catch (error) {
          logger.warn(
            {
              event: 'combat_chat_message_failed',
              streamerId: membership.streamerId,
              campaignId,
              error: error instanceof Error ? error.message : String(error),
            },
            'Échec envoi message chat combat au streamer'
          )
        }
      }
    } catch (error) {
      logger.error(
        {
          event: 'combat_chat_broadcast_error',
          campaignId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Erreur lors du broadcast chat combat'
      )
    }
  }
}
