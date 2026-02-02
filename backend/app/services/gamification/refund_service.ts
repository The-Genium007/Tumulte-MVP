import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import GamificationInstance from '#models/gamification_instance'
import GamificationContribution from '#models/gamification_contribution'
import { streamer as Streamer } from '#models/streamer'
import { TwitchRewardService } from '#services/twitch/twitch_reward_service'
import { DateTime } from 'luxon'

/**
 * Résultat d'un refund
 */
export interface RefundResult {
  instanceId: string
  totalContributions: number
  refundedCount: number
  failedCount: number
  errors: Array<{
    contributionId: string
    twitchUserId: string
    error: string
  }>
}

/**
 * RefundService - Gestion des remboursements de points de chaîne
 *
 * Quand une instance expire sans atteindre l'objectif (jauge non remplie),
 * ce service rembourse automatiquement tous les viewers qui ont contribué.
 *
 * Flow:
 * 1. Instance expire → status = 'expired'
 * 2. Job détecte l'expiration → appelle refundInstance()
 * 3. Pour chaque contribution non remboursée → API Twitch refund
 * 4. Marquer les contributions comme refunded
 * 5. Broadcast l'événement refund aux overlays
 */
@inject()
export class RefundService {
  constructor(private twitchRewardService: TwitchRewardService) {}

  /**
   * Rembourse toutes les contributions d'une instance expirée
   *
   * @param instance - L'instance dont les contributions doivent être remboursées
   * @returns Résultat du remboursement avec statistiques
   */
  async refundInstance(instance: GamificationInstance): Promise<RefundResult> {
    const result: RefundResult = {
      instanceId: instance.id,
      totalContributions: 0,
      refundedCount: 0,
      failedCount: 0,
      errors: [],
    }

    // Vérifier que l'instance est bien expirée
    if (instance.status !== 'expired') {
      logger.warn(
        {
          event: 'refund_invalid_status',
          instanceId: instance.id,
          status: instance.status,
        },
        'Tentative de refund sur une instance non expirée'
      )
      return result
    }

    // Récupérer le streamer pour les tokens Twitch
    if (!instance.streamerId) {
      logger.warn(
        {
          event: 'refund_no_streamer',
          instanceId: instance.id,
        },
        'Pas de streamer associé à cette instance'
      )
      return result
    }

    const streamer = await Streamer.find(instance.streamerId)
    if (!streamer) {
      logger.error(
        {
          event: 'refund_streamer_not_found',
          instanceId: instance.id,
          streamerId: instance.streamerId,
        },
        'Streamer non trouvé pour le refund'
      )
      return result
    }

    // Récupérer toutes les contributions non remboursées
    const contributions = await GamificationContribution.query()
      .where('instanceId', instance.id)
      .where('refunded', false)

    result.totalContributions = contributions.length

    if (contributions.length === 0) {
      logger.info(
        {
          event: 'refund_no_contributions',
          instanceId: instance.id,
        },
        'Aucune contribution à rembourser'
      )
      return result
    }

    logger.info(
      {
        event: 'refund_starting',
        instanceId: instance.id,
        contributionsCount: contributions.length,
      },
      'Début du remboursement des contributions'
    )

    // Rembourser chaque contribution
    for (const contribution of contributions) {
      try {
        // Appeler l'API Twitch pour le refund
        await this.twitchRewardService.refundRedemption(streamer, contribution.twitchRedemptionId)

        // Marquer comme remboursé
        contribution.refunded = true
        contribution.refundedAt = DateTime.now()
        await contribution.save()

        result.refundedCount++

        logger.debug(
          {
            event: 'contribution_refunded',
            contributionId: contribution.id,
            twitchUserId: contribution.twitchUserId,
            twitchUsername: contribution.twitchUsername,
          },
          'Contribution remboursée'
        )
      } catch (error) {
        result.failedCount++
        result.errors.push({
          contributionId: contribution.id,
          twitchUserId: contribution.twitchUserId,
          error: error instanceof Error ? error.message : String(error),
        })

        logger.error(
          {
            event: 'contribution_refund_failed',
            contributionId: contribution.id,
            twitchUserId: contribution.twitchUserId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Échec du remboursement de la contribution'
        )
      }
    }

    // Broadcast l'événement de refund
    this.broadcastRefundCompleted(instance, result)

    logger.info(
      {
        event: 'refund_completed',
        instanceId: instance.id,
        totalContributions: result.totalContributions,
        refundedCount: result.refundedCount,
        failedCount: result.failedCount,
      },
      'Remboursement terminé'
    )

    return result
  }

  /**
   * Traite toutes les instances expirées qui n'ont pas été remboursées
   *
   * Appelé périodiquement par le job d'expiration
   */
  async processExpiredInstances(): Promise<number> {
    // Trouver les instances expirées avec des contributions non remboursées
    const expiredInstances = await GamificationInstance.query()
      .where('status', 'expired')
      .whereHas('contributions', (query) => {
        query.where('refunded', false)
      })
      .preload('contributions', (query) => {
        query.where('refunded', false)
      })

    let processedCount = 0

    for (const instance of expiredInstances) {
      await this.refundInstance(instance)
      processedCount++
    }

    if (processedCount > 0) {
      logger.info(
        {
          event: 'expired_instances_processed',
          count: processedCount,
        },
        'Instances expirées traitées pour refund'
      )
    }

    return processedCount
  }

  /**
   * Broadcast l'événement de refund complété aux overlays
   */
  private broadcastRefundCompleted(instance: GamificationInstance, result: RefundResult): void {
    const channel = `gamification/${instance.campaignId}/instance`

    transmit.broadcast(channel, {
      type: 'instance_refunded',
      data: {
        instanceId: instance.id,
        streamerId: instance.streamerId,
        totalContributions: result.totalContributions,
        refundedCount: result.refundedCount,
        failedCount: result.failedCount,
      },
    })
  }
}

export default RefundService
