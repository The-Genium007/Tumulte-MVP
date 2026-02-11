import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import crypto from 'node:crypto'
import * as Sentry from '@sentry/node'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { GamificationService } from '#services/gamification/gamification_service'
import { GamificationConfigRepository } from '#repositories/gamification_config_repository'
import { StreamerGamificationConfigRepository } from '#repositories/streamer_gamification_config_repository'
import { StreamerRepository } from '#repositories/streamer_repository'

/**
 * Types EventSub Twitch
 * Note: These interfaces match Twitch API snake_case format
 */
/* eslint-disable @typescript-eslint/naming-convention */
interface EventSubNotification {
  subscription: {
    id: string
    type: string
    version: string
    status: string
    condition: Record<string, string>
    transport: {
      method: string
      callback?: string
    }
    created_at: string
  }
  event?: Record<string, unknown>
  challenge?: string
}

interface RedemptionEvent {
  id: string
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
  user_id: string
  user_login: string
  user_name: string
  user_input: string
  status: 'unfulfilled' | 'fulfilled' | 'canceled'
  reward: {
    id: string
    title: string
    cost: number
    prompt: string
  }
  redeemed_at: string
}
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * TwitchEventSubController - Gestion des webhooks EventSub Twitch
 *
 * Reçoit et traite les notifications EventSub, notamment les redemptions
 * de points de chaîne pour la gamification.
 */
@inject()
export default class TwitchEventSubController {
  private webhookSecret: string

  constructor(
    private gamificationService: GamificationService,
    private configRepository: GamificationConfigRepository,
    private streamerConfigRepository: StreamerGamificationConfigRepository,
    private streamerRepository: StreamerRepository
  ) {
    this.webhookSecret = env.get('TWITCH_EVENTSUB_SECRET') || ''
  }

  /**
   * Point d'entrée principal pour les webhooks EventSub
   * POST /webhooks/twitch/eventsub
   */
  async handle({ request, response }: HttpContext) {
    // Vérifier la signature
    const isValid = this.verifySignature(request)
    if (!isValid) {
      logger.warn(
        {
          event: 'eventsub_invalid_signature',
          hasRawBody: !!request.raw(),
          hasSecret: !!this.webhookSecret,
          messageType: request.header('Twitch-Eventsub-Message-Type'),
        },
        'Signature EventSub invalide'
      )
      return response.forbidden({ error: 'Invalid signature' })
    }

    const messageType = request.header('Twitch-Eventsub-Message-Type')
    const body = request.body() as EventSubNotification

    // Gestion du challenge (vérification de l'URL)
    if (messageType === 'webhook_callback_verification') {
      logger.info(
        { event: 'eventsub_verification', subscriptionType: body.subscription.type },
        'Vérification EventSub reçue'
      )
      return response.ok(body.challenge)
    }

    // Gestion des révocations
    if (messageType === 'revocation') {
      logger.warn(
        {
          event: 'eventsub_revocation',
          subscriptionId: body.subscription.id,
          subscriptionType: body.subscription.type,
          status: body.subscription.status,
        },
        'Subscription EventSub révoquée'
      )
      return response.ok({ received: true })
    }

    // Gestion des notifications
    if (messageType === 'notification') {
      await this.handleNotification(body)
      return response.ok({ received: true })
    }

    logger.warn({ event: 'eventsub_unknown_type', messageType }, 'Type de message EventSub inconnu')
    return response.ok({ received: true })
  }

  /**
   * Traite une notification EventSub
   */
  private async handleNotification(notification: EventSubNotification): Promise<void> {
    const { subscription, event } = notification

    logger.info(
      {
        event: 'eventsub_notification',
        subscriptionType: subscription.type,
        subscriptionId: subscription.id,
      },
      'Notification EventSub reçue'
    )

    switch (subscription.type) {
      case 'channel.channel_points_custom_reward_redemption.add':
        await this.handleRedemption(event as unknown as RedemptionEvent)
        break

      default:
        logger.debug(
          { event: 'eventsub_unhandled_type', type: subscription.type },
          'Type de notification non géré'
        )
    }
  }

  /**
   * Traite une redemption de points de chaîne
   *
   * Nouveau flux avec StreamerGamificationConfig:
   * 1. Premier clic → crée une instance et compte comme contribution
   * 2. Clics suivants → ajoutent des contributions à l'instance active
   * 3. Objectif atteint → instance passe en état "armed" (en attente d'un critique)
   */
  private async handleRedemption(event: RedemptionEvent): Promise<void> {
    logger.info(
      {
        event: 'redemption_received',
        redemptionId: event.id,
        rewardId: event.reward.id,
        rewardTitle: event.reward.title,
        userId: event.user_id,
        userName: event.user_name,
        cost: event.reward.cost,
      },
      'Redemption de points de chaîne reçue'
    )

    // Trouver le streamer par son Twitch user ID
    const streamer = await this.streamerRepository.findByTwitchUserId(event.broadcaster_user_id)
    if (!streamer) {
      logger.warn(
        {
          event: 'redemption_unknown_streamer',
          twitchUserId: event.broadcaster_user_id,
        },
        'Redemption pour un streamer inconnu'
      )
      return
    }

    // D'abord chercher dans StreamerGamificationConfig (nouveau système)
    const streamerConfig = await this.streamerConfigRepository.findByTwitchRewardId(event.reward.id)

    if (streamerConfig) {
      logger.info(
        {
          event: 'redemption_config_matched',
          rewardId: event.reward.id,
          streamerConfigId: streamerConfig.id,
          eventId: streamerConfig.eventId,
          campaignId: streamerConfig.campaignId,
        },
        'Config streamer trouvée pour ce reward ID'
      )
      await this.handleStreamerRedemption(event, streamer.id, streamerConfig)
      return
    }

    logger.warn(
      {
        event: 'redemption_no_streamer_config',
        rewardId: event.reward.id,
        rewardTitle: event.reward.title,
        streamerId: streamer.id,
        broadcasterId: event.broadcaster_user_id,
      },
      'Aucune StreamerGamificationConfig trouvée pour ce reward ID — fallback ancien système'
    )

    // Fallback: ancien système avec CampaignGamificationConfig
    const config = await this.configRepository.findByTwitchRewardId(event.reward.id)
    if (!config) {
      logger.warn(
        {
          event: 'redemption_not_gamification',
          rewardId: event.reward.id,
          rewardTitle: event.reward.title,
          broadcasterId: event.broadcaster_user_id,
          streamerId: streamer.id,
        },
        'Redemption pour un reward non lié à la gamification — aucune config trouvée pour ce reward ID'
      )
      Sentry.captureMessage('Redemption reçue mais aucune config gamification trouvée', {
        level: 'warning',
        tags: {
          service: 'twitch_eventsub',
          operation: 'handleRedemption',
        },
        extra: {
          rewardId: event.reward.id,
          rewardTitle: event.reward.title,
          broadcasterId: event.broadcaster_user_id,
          streamerId: streamer.id,
        },
      })
      return
    }

    // Traiter la redemption via le service de gamification (ancien flux)
    try {
      const result = await this.gamificationService.onRedemption({
        redemptionId: event.id,
        rewardId: event.reward.id,
        streamerId: streamer.id,
        twitchUserId: event.user_id,
        twitchUsername: event.user_name,
        amount: event.reward.cost,
      })

      if (result.processed) {
        logger.info(
          {
            event: 'redemption_processed',
            redemptionId: event.id,
            instanceId: result.instance?.id,
            objectiveReached: result.objectiveReached,
          },
          'Redemption traitée avec succès'
        )
      }
    } catch (error) {
      logger.error(
        {
          event: 'redemption_processing_error',
          redemptionId: event.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Erreur lors du traitement de la redemption'
      )
      Sentry.captureException(error, {
        tags: {
          service: 'twitch_eventsub',
          operation: 'handleRedemption',
        },
        extra: {
          redemptionId: event.id,
          rewardId: event.reward.id,
          broadcasterId: event.broadcaster_user_id,
          streamerId: streamer.id,
        },
      })
    }
  }

  /**
   * Traite une redemption via le nouveau système StreamerGamificationConfig
   *
   * Ce système permet aux streamers d'avoir leur propre reward Twitch
   * avec un flux en deux étapes:
   * 1. ACTIVATION: Les viewers remplissent la jauge
   * 2. ARMED: En attente d'un jet critique pour consommer l'effet
   */
  private async handleStreamerRedemption(
    event: RedemptionEvent,
    streamerId: string,
    streamerConfig: Awaited<
      ReturnType<StreamerGamificationConfigRepository['findByTwitchRewardId']>
    >
  ): Promise<void> {
    if (!streamerConfig) return

    try {
      const result = await this.gamificationService.onStreamerRedemption({
        redemptionId: event.id,
        rewardId: event.reward.id,
        streamerId,
        streamerConfigId: streamerConfig.id,
        campaignId: streamerConfig.campaignId,
        eventId: streamerConfig.eventId,
        twitchUserId: event.user_id,
        twitchUsername: event.user_name,
        amount: event.reward.cost,
      })

      logger.info(
        {
          event: 'streamer_redemption_processed',
          redemptionId: event.id,
          instanceId: result.instance?.id,
          isNewInstance: result.isNewInstance,
          objectiveReached: result.objectiveReached,
          isArmed: result.isArmed,
        },
        'Redemption streamer traitée avec succès'
      )
    } catch (error) {
      logger.error(
        {
          event: 'streamer_redemption_error',
          redemptionId: event.id,
          streamerConfigId: streamerConfig.id,
          campaignId: streamerConfig.campaignId,
          eventId: streamerConfig.eventId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Erreur lors du traitement de la redemption streamer'
      )
      Sentry.captureException(error, {
        tags: {
          service: 'twitch_eventsub',
          operation: 'handleStreamerRedemption',
        },
        extra: {
          redemptionId: event.id,
          rewardId: event.reward.id,
          streamerId,
          streamerConfigId: streamerConfig.id,
          campaignId: streamerConfig.campaignId,
          eventId: streamerConfig.eventId,
        },
      })
    }
  }

  /**
   * Vérifie la signature HMAC de la requête EventSub
   */
  private verifySignature(request: HttpContext['request']): boolean {
    if (!this.webhookSecret) {
      logger.warn({ event: 'eventsub_no_secret' }, 'TWITCH_EVENTSUB_SECRET non configuré')
      return false
    }

    const messageId = request.header('Twitch-Eventsub-Message-Id')
    const timestamp = request.header('Twitch-Eventsub-Message-Timestamp')
    const signature = request.header('Twitch-Eventsub-Message-Signature')

    if (!messageId || !timestamp || !signature) {
      return false
    }

    // Vérifier que le timestamp n'est pas trop vieux (10 minutes)
    const messageTime = new Date(timestamp).getTime()
    const now = Date.now()
    if (Math.abs(now - messageTime) > 10 * 60 * 1000) {
      logger.warn({ event: 'eventsub_old_message', timestamp }, 'Message EventSub trop ancien')
      return false
    }

    // Calculer le HMAC
    const rawBody = request.raw() || JSON.stringify(request.body())
    const message = messageId + timestamp + rawBody

    const expectedSignature =
      'sha256=' + crypto.createHmac('sha256', this.webhookSecret).update(message).digest('hex')

    // Comparaison sécurisée
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    } catch {
      return false
    }
  }
}
