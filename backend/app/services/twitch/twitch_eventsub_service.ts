import { inject } from '@adonisjs/core'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import * as Sentry from '@sentry/node'
import { twitchApiService as TwitchApiService } from '#services/twitch/twitch_api_service'
import { RetryUtility } from '../resilience/retry_utility.js'
import { RetryPolicies, type RetryContext, type HttpCallResult } from '../resilience/types.js'

/**
 * Type d'event EventSub supporté
 *
 * Extensible : ajouter de nouveaux types ici pour supporter
 * d'autres événements Twitch sans modifier le service.
 */
export type EventSubType =
  | 'channel.channel_points_custom_reward_redemption.add'
  | 'channel.subscribe'
  | 'channel.cheer'
  | 'channel.raid'
  | 'channel.hype_train.begin'
  | 'channel.hype_train.end'
  | 'stream.online'
  | 'stream.offline'

/**
 * Condition EventSub — dépend du type d'event
 */
export interface EventSubCondition {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  broadcaster_user_id: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  reward_id?: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  moderator_user_id?: string
}

/**
 * Subscription EventSub retournée par l'API Twitch
 */
export interface EventSubSubscription {
  id: string
  type: string
  version: string
  status: string
  condition: Record<string, string>
  transport: {
    method: string
    callback?: string
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string
  cost: number
}

/**
 * Réponse paginée de l'API EventSub
 */
interface EventSubListResponse {
  data: EventSubSubscription[]
  total: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  total_cost: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  max_total_cost: number
  pagination: { cursor?: string }
}

/**
 * Options pour créer une subscription EventSub
 */
export interface CreateEventSubOptions {
  type: EventSubType
  version?: string
  condition: EventSubCondition
  /** Identifiant métier pour le tracking (ex: streamerId, campaignId) */
  metadata?: Record<string, string>
}

const HELIX_EVENTSUB_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions'

/**
 * TwitchEventSubService - Gestion des subscriptions EventSub Twitch
 *
 * Ce service gère le cycle de vie des abonnements EventSub via l'API Helix :
 * - Création de subscriptions (webhook transport)
 * - Listage des subscriptions actives
 * - Suppression de subscriptions
 * - Vérification d'existence (évite les doublons)
 *
 * Utilise un App Access Token (client_credentials) pour les opérations,
 * car les subscriptions webhook EventSub nécessitent un token d'application.
 */
@inject()
export class TwitchEventSubService {
  private clientId: string
  private callbackBaseUrl: string
  private webhookSecret: string
  private retryUtility: RetryUtility

  constructor(private twitchApiService: TwitchApiService) {
    this.clientId = env.get('TWITCH_CLIENT_ID') || ''
    this.webhookSecret = env.get('TWITCH_EVENTSUB_SECRET') || ''
    this.callbackBaseUrl =
      env.get('API_URL') || `http://${env.get('HOST', 'localhost')}:${env.get('PORT', 3333)}`
    this.retryUtility = new RetryUtility()
  }

  /**
   * Crée une subscription EventSub pour un type d'event donné
   *
   * Vérifie d'abord qu'une subscription identique n'existe pas déjà
   * pour éviter les doublons (Twitch facture les subscriptions).
   *
   * @returns La subscription créée ou existante, null en cas d'échec
   */
  async createSubscription(
    options: CreateEventSubOptions,
    retryContext?: RetryContext
  ): Promise<EventSubSubscription | null> {
    if (!this.webhookSecret) {
      logger.error(
        { event: 'eventsub_create_no_secret' },
        'TWITCH_EVENTSUB_SECRET non configuré — impossible de créer une subscription EventSub'
      )
      Sentry.captureMessage('TWITCH_EVENTSUB_SECRET non configuré pour EventSub', {
        level: 'error',
        tags: { service: 'twitch_eventsub', operation: 'createSubscription' },
      })
      return null
    }

    // Vérifier si une subscription identique existe déjà
    const existing = await this.findExistingSubscription(options.type, options.condition)

    if (existing) {
      logger.info(
        {
          event: 'eventsub_subscription_already_exists',
          subscriptionId: existing.id,
          type: options.type,
          broadcasterId: options.condition.broadcaster_user_id,
          rewardId: options.condition.reward_id,
          status: existing.status,
        },
        'Subscription EventSub déjà existante — skip création'
      )
      return existing
    }

    const context = retryContext || {
      service: 'TwitchEventSubService',
      operation: 'createSubscription',
      metadata: {
        type: options.type,
        broadcasterId: options.condition.broadcaster_user_id,
        ...options.metadata,
      },
    }

    const result = await this.retryUtility.execute(() => this.createSubscriptionHttp(options), {
      ...RetryPolicies.TWITCH_API,
      context,
    })

    if (result.success && result.data) {
      logger.info(
        {
          event: 'eventsub_subscription_created',
          subscriptionId: result.data.id,
          type: options.type,
          broadcasterId: options.condition.broadcaster_user_id,
          rewardId: options.condition.reward_id,
          status: result.data.status,
          attempts: result.attempts,
        },
        'Subscription EventSub créée avec succès'
      )
      return result.data
    }

    const errorMsg = result.error?.message || 'Unknown error'
    logger.error(
      {
        event: 'eventsub_subscription_creation_failed',
        type: options.type,
        broadcasterId: options.condition.broadcaster_user_id,
        rewardId: options.condition.reward_id,
        error: errorMsg,
        attempts: result.attempts,
      },
      'Échec de création de subscription EventSub'
    )
    Sentry.captureException(result.error || new Error(errorMsg), {
      tags: {
        service: 'twitch_eventsub',
        operation: 'createSubscription',
        eventType: options.type,
      },
      extra: {
        broadcasterId: options.condition.broadcaster_user_id,
        rewardId: options.condition.reward_id,
        attempts: result.attempts,
        ...options.metadata,
      },
    })

    return null
  }

  /**
   * Supprime une subscription EventSub par son ID
   */
  async deleteSubscription(subscriptionId: string, retryContext?: RetryContext): Promise<boolean> {
    const context = retryContext || {
      service: 'TwitchEventSubService',
      operation: 'deleteSubscription',
      metadata: { subscriptionId },
    }

    const result = await this.retryUtility.execute(
      () => this.deleteSubscriptionHttp(subscriptionId),
      { ...RetryPolicies.TWITCH_API, context }
    )

    if (result.success) {
      logger.info(
        {
          event: 'eventsub_subscription_deleted',
          subscriptionId,
          attempts: result.attempts,
        },
        'Subscription EventSub supprimée'
      )
      return true
    }

    // 404 = subscription déjà supprimée, on considère ça comme un succès
    const lastAttempt = result.attemptDetails[result.attemptDetails.length - 1]
    if (lastAttempt?.statusCode === 404) {
      logger.info(
        {
          event: 'eventsub_subscription_already_deleted',
          subscriptionId,
        },
        'Subscription EventSub déjà supprimée (404)'
      )
      return true
    }

    logger.error(
      {
        event: 'eventsub_subscription_deletion_failed',
        subscriptionId,
        error: result.error?.message,
        attempts: result.attempts,
      },
      'Échec de suppression de subscription EventSub'
    )
    Sentry.captureException(result.error || new Error('EventSub deletion failed'), {
      tags: {
        service: 'twitch_eventsub',
        operation: 'deleteSubscription',
      },
      extra: { subscriptionId, attempts: result.attempts },
    })

    return false
  }

  /**
   * Supprime toutes les subscriptions EventSub pour un broadcaster donné
   *
   * Utile lors de la révocation d'autorisation d'un streamer.
   *
   * @param broadcasterId - Twitch user ID du broadcaster
   * @param type - Filtrer par type d'event (optionnel)
   * @returns Nombre de subscriptions supprimées
   */
  async deleteSubscriptionsForBroadcaster(
    broadcasterId: string,
    type?: EventSubType
  ): Promise<{ deleted: number; failed: number }> {
    const subscriptions = await this.listSubscriptions(type)
    const result = { deleted: 0, failed: 0 }

    const matching = subscriptions.filter(
      (sub) => sub.condition.broadcaster_user_id === broadcasterId
    )

    if (matching.length === 0) {
      logger.debug(
        {
          event: 'eventsub_no_subscriptions_to_delete',
          broadcasterId,
          type: type || 'all',
        },
        'Aucune subscription EventSub à supprimer pour ce broadcaster'
      )
      return result
    }

    logger.info(
      {
        event: 'eventsub_bulk_delete_start',
        broadcasterId,
        count: matching.length,
        type: type || 'all',
      },
      `Suppression de ${matching.length} subscription(s) EventSub pour le broadcaster`
    )

    for (const sub of matching) {
      const success = await this.deleteSubscription(sub.id)
      if (success) {
        result.deleted++
      } else {
        result.failed++
      }
    }

    logger.info(
      {
        event: 'eventsub_bulk_delete_complete',
        broadcasterId,
        deleted: result.deleted,
        failed: result.failed,
      },
      'Suppression en masse des subscriptions EventSub terminée'
    )

    return result
  }

  /**
   * Liste toutes les subscriptions EventSub actives
   *
   * @param type - Filtrer par type d'event (optionnel)
   */
  async listSubscriptions(type?: EventSubType): Promise<EventSubSubscription[]> {
    const allSubscriptions: EventSubSubscription[] = []
    let cursor: string | undefined

    do {
      const result = await this.listSubscriptionsPageHttp(type, cursor)
      if (!result.success || !result.data) {
        logger.error(
          {
            event: 'eventsub_list_failed',
            error: result.error?.message,
            type: type || 'all',
          },
          'Échec de listage des subscriptions EventSub'
        )
        break
      }

      allSubscriptions.push(...result.data.data)
      cursor = result.data.pagination.cursor
    } while (cursor)

    return allSubscriptions
  }

  /**
   * Vérifie si une subscription identique existe déjà
   *
   * Compare le type et les conditions pour détecter les doublons.
   */
  async findExistingSubscription(
    type: EventSubType,
    condition: EventSubCondition
  ): Promise<EventSubSubscription | null> {
    const subscriptions = await this.listSubscriptions(type)

    return (
      subscriptions.find((sub) => {
        if (sub.type !== type) return false
        if (sub.condition.broadcaster_user_id !== condition.broadcaster_user_id) return false

        // Pour les rewards, vérifier aussi le reward_id si spécifié
        if (condition.reward_id && sub.condition.reward_id !== condition.reward_id) return false

        // Seules les subscriptions enabled/webhook_callback_verification_pending comptent
        return sub.status === 'enabled' || sub.status === 'webhook_callback_verification_pending'
      }) || null
    )
  }

  // ========================================
  // HTTP CALLS (privés)
  // ========================================

  private async createSubscriptionHttp(
    options: CreateEventSubOptions
  ): Promise<HttpCallResult<EventSubSubscription>> {
    try {
      const appToken = await this.twitchApiService.getAppAccessToken()
      const callbackUrl = `${this.callbackBaseUrl}/webhooks/twitch/eventsub`

      const body = {
        type: options.type,
        version: options.version || '1',
        condition: this.buildCondition(options.condition),
        transport: {
          method: 'webhook',
          callback: callbackUrl,
          secret: this.webhookSecret,
        },
      }

      const response = await fetch(HELIX_EVENTSUB_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Client-Id': this.clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      })

      const retryAfterHeader = response.headers.get('Retry-After')
      const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined

      if (!response.ok) {
        const errorText = await response.text()

        // 409 = subscription déjà existante (Twitch renvoie conflict)
        if (response.status === 409) {
          logger.info(
            {
              event: 'eventsub_subscription_conflict',
              type: options.type,
              broadcasterId: options.condition.broadcaster_user_id,
            },
            'Subscription EventSub déjà existante (409 Conflict)'
          )
          // On traite le 409 comme un succès — la subscription existe
          // On refetch pour retourner les données existantes
          const existing = await this.findExistingSubscription(options.type, options.condition)
          if (existing) {
            return { success: true, data: existing, statusCode: 200 }
          }
        }

        return {
          success: false,
          statusCode: response.status,
          retryAfterSeconds,
          error: new Error(`Twitch EventSub API error: ${response.status} - ${errorText}`),
        }
      }

      const json = (await response.json()) as { data: Record<string, unknown>[] }
      const subscription = this.mapSubscription(json.data[0])

      return {
        success: true,
        data: subscription,
        statusCode: response.status,
      }
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  private async deleteSubscriptionHttp(subscriptionId: string): Promise<HttpCallResult<void>> {
    try {
      const appToken = await this.twitchApiService.getAppAccessToken()

      const response = await fetch(`${HELIX_EVENTSUB_URL}?id=${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Client-Id': this.clientId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          statusCode: response.status,
          error: new Error(`Twitch EventSub delete error: ${response.status} - ${errorText}`),
        }
      }

      return { success: true, statusCode: response.status }
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  private async listSubscriptionsPageHttp(
    type?: EventSubType,
    cursor?: string
  ): Promise<HttpCallResult<EventSubListResponse>> {
    try {
      const appToken = await this.twitchApiService.getAppAccessToken()

      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (cursor) params.set('after', cursor)

      const url =
        params.toString().length > 0
          ? `${HELIX_EVENTSUB_URL}?${params.toString()}`
          : HELIX_EVENTSUB_URL

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Client-Id': this.clientId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          statusCode: response.status,
          error: new Error(`Twitch EventSub list error: ${response.status} - ${errorText}`),
        }
      }

      const json = (await response.json()) as EventSubListResponse

      return {
        success: true,
        data: json,
        statusCode: response.status,
      }
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  // ========================================
  // HELPERS
  // ========================================

  /**
   * Construit l'objet condition en snake_case pour l'API Twitch
   * Ne garde que les champs non-undefined
   */
  private buildCondition(condition: EventSubCondition): Record<string, string> {
    /* eslint-disable camelcase */
    const result: Record<string, string> = {
      broadcaster_user_id: condition.broadcaster_user_id,
    }
    if (condition.reward_id) {
      result.reward_id = condition.reward_id
    }
    if (condition.moderator_user_id) {
      result.moderator_user_id = condition.moderator_user_id
    }
    /* eslint-enable camelcase */
    return result
  }

  private mapSubscription(data: Record<string, unknown>): EventSubSubscription {
    const transport = data.transport as Record<string, string>
    const condition = data.condition as Record<string, string>

    return {
      id: data.id as string,
      type: data.type as string,
      version: data.version as string,
      status: data.status as string,
      condition,
      transport: {
        method: transport.method,
        callback: transport.callback,
      },
      created_at: data.created_at as string,
      cost: data.cost as number,
    }
  }
}

export default TwitchEventSubService
