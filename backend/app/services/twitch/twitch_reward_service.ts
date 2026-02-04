import { inject } from '@adonisjs/core'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { streamer as Streamer } from '#models/streamer'
import { RetryUtility } from '../resilience/retry_utility.js'
import { RetryPolicies, type RetryContext, type HttpCallResult } from '../resilience/types.js'

/**
 * Données pour créer une récompense Channel Points
 */
export interface CreateRewardData {
  title: string
  cost: number
  prompt?: string
  backgroundColor?: string
  isEnabled?: boolean
  isUserInputRequired?: boolean
  maxPerStream?: number
  maxPerUserPerStream?: number
  globalCooldownSeconds?: number
  shouldSkipRequestQueue?: boolean
}

/**
 * Réponse de création de récompense
 */
export interface TwitchReward {
  id: string
  broadcasterId: string
  broadcasterLogin: string
  broadcasterName: string
  title: string
  prompt: string
  cost: number
  image: {
    url1x: string
    url2x: string
    url4x: string
  } | null
  defaultImage: {
    url1x: string
    url2x: string
    url4x: string
  }
  backgroundColor: string
  isEnabled: boolean
  isUserInputRequired: boolean
  isMaxPerStreamEnabled: boolean
  maxPerStream: number
  isMaxPerUserPerStreamEnabled: boolean
  maxPerUserPerStream: number
  isGlobalCooldownEnabled: boolean
  globalCooldownSeconds: number
  isPaused: boolean
  shouldRedemptionsSkipRequestQueue: boolean
}

/**
 * Informations sur les slots de récompenses
 */
export interface RewardSlotsInfo {
  used: number
  max: number
  available: number
}

/**
 * TwitchRewardService - Gestion des Channel Points Rewards via l'API Twitch
 *
 * Permet de créer, modifier, activer/désactiver et supprimer des récompenses
 * de points de chaîne pour la gamification.
 */
@inject()
export class TwitchRewardService {
  private clientId: string
  private retryUtility: RetryUtility

  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly MAX_REWARDS_PER_CHANNEL = 50
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly HELIX_BASE_URL = 'https://api.twitch.tv/helix'

  constructor() {
    this.clientId = env.get('TWITCH_CLIENT_ID') || ''
    this.retryUtility = new RetryUtility()
  }

  /**
   * Crée une nouvelle récompense Channel Points
   */
  async createReward(
    streamer: Streamer,
    data: CreateRewardData,
    retryContext?: RetryContext
  ): Promise<TwitchReward | null> {
    const accessToken = await streamer.getDecryptedAccessToken()
    if (!accessToken) {
      logger.error(
        { streamerId: streamer.id, event: 'create_reward_no_token' },
        'Pas de token pour créer la récompense'
      )
      return null
    }

    const result = await this.createRewardWithRetry(
      streamer.twitchUserId,
      accessToken,
      data,
      retryContext || {
        service: 'TwitchRewardService',
        operation: 'createReward',
        metadata: { streamerId: streamer.id, title: data.title },
      }
    )

    if (result.success && result.data) {
      logger.info(
        {
          event: 'reward_created',
          streamerId: streamer.id,
          rewardId: result.data.id,
          title: data.title,
        },
        'Récompense Channel Points créée'
      )
      return result.data
    }

    logger.error(
      {
        event: 'reward_creation_failed',
        streamerId: streamer.id,
        title: data.title,
        error: result.error?.message,
        attempts: result.attempts,
      },
      'Échec de création de récompense'
    )
    return null
  }

  /**
   * Met à jour une récompense existante
   */
  async updateReward(
    streamer: Streamer,
    rewardId: string,
    updates: Partial<CreateRewardData>
  ): Promise<TwitchReward | null> {
    const accessToken = await streamer.getDecryptedAccessToken()
    if (!accessToken) {
      return null
    }

    const result = await this.updateRewardHttp(
      streamer.twitchUserId,
      accessToken,
      rewardId,
      updates
    )

    if (result.success && result.data) {
      logger.info(
        {
          event: 'reward_updated',
          streamerId: streamer.id,
          rewardId,
        },
        'Récompense mise à jour'
      )
      return result.data
    }

    return null
  }

  /**
   * Active une récompense
   */
  async enableReward(streamer: Streamer, rewardId: string): Promise<boolean> {
    const result = await this.updateReward(streamer, rewardId, { isEnabled: true })
    return result !== null
  }

  /**
   * Désactive une récompense
   */
  async disableReward(streamer: Streamer, rewardId: string): Promise<boolean> {
    const result = await this.updateReward(streamer, rewardId, { isEnabled: false })
    return result !== null
  }

  /**
   * Supprime une récompense (sans retry)
   */
  async deleteReward(streamer: Streamer, rewardId: string): Promise<boolean> {
    const accessToken = await streamer.getDecryptedAccessToken()
    if (!accessToken) {
      return false
    }

    const result = await this.deleteRewardHttp(streamer.twitchUserId, accessToken, rewardId)

    if (result.success) {
      logger.info(
        {
          event: 'reward_deleted',
          streamerId: streamer.id,
          rewardId,
        },
        'Récompense supprimée'
      )
      return true
    }

    logger.error(
      {
        event: 'reward_deletion_failed',
        streamerId: streamer.id,
        rewardId,
        error: result.error?.message,
      },
      'Échec de suppression de récompense'
    )
    return false
  }

  /**
   * Supprime une récompense avec retry automatique
   *
   * Utilisé par le système de cleanup pour les rewards orphelins.
   * Gère automatiquement les erreurs 429 (rate limit) et 5xx (erreurs serveur)
   * avec backoff exponentiel.
   *
   * @returns Object avec success, et isAlreadyDeleted pour les 404
   */
  async deleteRewardWithRetry(
    streamer: Streamer,
    rewardId: string,
    retryContext?: RetryContext
  ): Promise<{ success: boolean; isAlreadyDeleted: boolean }> {
    const accessToken = await streamer.getDecryptedAccessToken()
    if (!accessToken) {
      logger.warn(
        { streamerId: streamer.id, rewardId, event: 'delete_reward_no_token' },
        'Pas de token pour supprimer la récompense'
      )
      return { success: false, isAlreadyDeleted: false }
    }

    const context = retryContext || {
      service: 'TwitchRewardService',
      operation: 'deleteRewardWithRetry',
      metadata: { streamerId: streamer.id, rewardId },
    }

    const result = await this.retryUtility.execute(
      () => this.deleteRewardHttp(streamer.twitchUserId, accessToken, rewardId),
      { ...RetryPolicies.TWITCH_API, context }
    )

    // Get the last attempt's status code for error handling
    const lastAttempt = result.attemptDetails[result.attemptDetails.length - 1]
    const lastStatusCode = lastAttempt?.statusCode

    if (result.success) {
      logger.info(
        {
          event: 'reward_deleted_with_retry',
          streamerId: streamer.id,
          rewardId,
          attempts: result.attempts,
        },
        'Récompense supprimée (avec retry)'
      )
      return { success: true, isAlreadyDeleted: false }
    }

    // 404 = reward déjà supprimé sur Twitch, on considère ça comme un succès
    if (lastStatusCode === 404) {
      logger.info(
        {
          event: 'reward_already_deleted',
          streamerId: streamer.id,
          rewardId,
        },
        'Récompense déjà supprimée sur Twitch (404)'
      )
      return { success: true, isAlreadyDeleted: true }
    }

    logger.error(
      {
        event: 'reward_deletion_failed_after_retries',
        streamerId: streamer.id,
        rewardId,
        error: result.error?.message,
        attempts: result.attempts,
        statusCode: lastStatusCode,
      },
      'Échec de suppression de récompense après retries'
    )
    return { success: false, isAlreadyDeleted: false }
  }

  /**
   * Récupère le nombre de récompenses utilisées sur une chaîne
   */
  async getRewardSlotsInfo(streamer: Streamer): Promise<RewardSlotsInfo | null> {
    const accessToken = await streamer.getDecryptedAccessToken()
    if (!accessToken) {
      return null
    }

    const result = await this.getRewardsHttp(streamer.twitchUserId, accessToken)

    if (result.success && result.data) {
      const used = result.data.length
      return {
        used,
        max: TwitchRewardService.MAX_REWARDS_PER_CHANNEL,
        available: TwitchRewardService.MAX_REWARDS_PER_CHANNEL - used,
      }
    }

    return null
  }

  /**
   * Liste toutes les récompenses d'une chaîne
   */
  async listRewards(streamer: Streamer): Promise<TwitchReward[]> {
    const accessToken = await streamer.getDecryptedAccessToken()
    if (!accessToken) {
      return []
    }

    const result = await this.getRewardsHttp(streamer.twitchUserId, accessToken)
    return result.success && result.data ? result.data : []
  }

  /**
   * Met à jour le cooldown d'une récompense
   */
  async setCooldown(streamer: Streamer, rewardId: string, seconds: number): Promise<boolean> {
    const updates: Partial<CreateRewardData> = {
      globalCooldownSeconds: seconds > 0 ? seconds : undefined,
    }
    const result = await this.updateReward(streamer, rewardId, updates)
    return result !== null
  }

  /**
   * Rembourse une redemption de points de chaîne
   *
   * Met à jour le statut de la redemption à 'CANCELED' ce qui rembourse
   * automatiquement les points au viewer.
   *
   * @param streamer - Le streamer sur la chaîne duquel le refund doit être fait
   * @param redemptionId - L'ID de la redemption Twitch à rembourser
   * @returns true si le refund a réussi, false sinon
   */
  async refundRedemption(streamer: Streamer, redemptionId: string): Promise<boolean> {
    const accessToken = await streamer.getDecryptedAccessToken()
    if (!accessToken) {
      logger.error(
        { streamerId: streamer.id, event: 'refund_no_token' },
        'Pas de token pour le remboursement'
      )
      return false
    }

    // Pour refund, on a besoin du reward_id et de la redemption_id
    // Malheureusement l'API Twitch nécessite le reward_id, on doit le récupérer
    // via les redemptions ou le stocker dans la contribution

    const result = await this.updateRedemptionStatusHttp(
      streamer.twitchUserId,
      accessToken,
      redemptionId,
      'CANCELED' // CANCELED = refund automatique des points
    )

    if (result.success) {
      logger.info(
        {
          event: 'redemption_refunded',
          streamerId: streamer.id,
          redemptionId,
        },
        'Redemption remboursée'
      )
      return true
    }

    logger.error(
      {
        event: 'redemption_refund_failed',
        streamerId: streamer.id,
        redemptionId,
        error: result.error?.message,
      },
      'Échec du remboursement'
    )
    return false
  }

  /**
   * Rembourse une redemption avec le reward_id connu
   *
   * Version plus efficace si on a stocké le reward_id avec la contribution.
   */
  async refundRedemptionWithRewardId(
    streamer: Streamer,
    rewardId: string,
    redemptionId: string
  ): Promise<boolean> {
    const accessToken = await streamer.getDecryptedAccessToken()
    if (!accessToken) {
      return false
    }

    const result = await this.updateRedemptionStatusWithRewardHttp(
      streamer.twitchUserId,
      accessToken,
      rewardId,
      redemptionId,
      'CANCELED'
    )

    if (result.success) {
      logger.info(
        {
          event: 'redemption_refunded',
          streamerId: streamer.id,
          rewardId,
          redemptionId,
        },
        'Redemption remboursée'
      )
      return true
    }

    return false
  }

  // ========================================
  // HTTP CALLS
  // ========================================

  private async createRewardWithRetry(
    broadcasterId: string,
    accessToken: string,
    data: CreateRewardData,
    context: RetryContext
  ) {
    return this.retryUtility.execute(
      () => this.createRewardHttp(broadcasterId, accessToken, data),
      { ...RetryPolicies.TWITCH_API, context }
    )
  }

  private async createRewardHttp(
    broadcasterId: string,
    accessToken: string,
    data: CreateRewardData
  ): Promise<HttpCallResult<TwitchReward>> {
    try {
      const url = `${TwitchRewardService.HELIX_BASE_URL}/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`

      const body: Record<string, unknown> = {
        title: data.title,
        cost: data.cost,
      }

      // Twitch API uses snake_case
      /* eslint-disable camelcase */
      if (data.prompt) body.prompt = data.prompt
      if (data.backgroundColor) body.background_color = data.backgroundColor
      if (data.isEnabled !== undefined) body.is_enabled = data.isEnabled
      if (data.isUserInputRequired !== undefined)
        body.is_user_input_required = data.isUserInputRequired
      if (data.shouldSkipRequestQueue !== undefined)
        body.should_redemptions_skip_request_queue = data.shouldSkipRequestQueue

      if (data.maxPerStream !== undefined && data.maxPerStream > 0) {
        body.is_max_per_stream_enabled = true
        body.max_per_stream = data.maxPerStream
      }

      if (data.maxPerUserPerStream !== undefined && data.maxPerUserPerStream > 0) {
        body.is_max_per_user_per_stream_enabled = true
        body.max_per_user_per_stream = data.maxPerUserPerStream
      }

      if (data.globalCooldownSeconds !== undefined && data.globalCooldownSeconds > 0) {
        body.is_global_cooldown_enabled = true
        body.global_cooldown_seconds = data.globalCooldownSeconds
      }
      /* eslint-enable camelcase */

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
        logger.error(
          {
            event: 'twitch_create_reward_error',
            statusCode: response.status,
            error: errorText,
          },
          'Erreur API Twitch create reward'
        )

        return {
          success: false,
          statusCode: response.status,
          retryAfterSeconds,
          error: new Error(`Twitch API error: ${response.status} - ${errorText}`),
        }
      }

      const json = (await response.json()) as { data: Record<string, unknown>[] }
      const reward = this.mapTwitchReward(json.data[0])

      return {
        success: true,
        data: reward,
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

  private async updateRewardHttp(
    broadcasterId: string,
    accessToken: string,
    rewardId: string,
    updates: Partial<CreateRewardData>
  ): Promise<HttpCallResult<TwitchReward>> {
    try {
      const url = `${TwitchRewardService.HELIX_BASE_URL}/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`

      const body: Record<string, unknown> = {}

      // Twitch API uses snake_case
      /* eslint-disable camelcase */
      if (updates.title) body.title = updates.title
      if (updates.cost) body.cost = updates.cost
      if (updates.prompt) body.prompt = updates.prompt
      if (updates.backgroundColor) body.background_color = updates.backgroundColor
      if (updates.isEnabled !== undefined) body.is_enabled = updates.isEnabled

      if (updates.globalCooldownSeconds !== undefined) {
        if (updates.globalCooldownSeconds > 0) {
          body.is_global_cooldown_enabled = true
          body.global_cooldown_seconds = updates.globalCooldownSeconds
        } else {
          body.is_global_cooldown_enabled = false
        }
      }
      /* eslint-enable camelcase */

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          statusCode: response.status,
          error: new Error(`Twitch API error: ${response.status} - ${errorText}`),
        }
      }

      const json = (await response.json()) as { data: Record<string, unknown>[] }
      const reward = this.mapTwitchReward(json.data[0])

      return {
        success: true,
        data: reward,
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

  private async deleteRewardHttp(
    broadcasterId: string,
    accessToken: string,
    rewardId: string
  ): Promise<HttpCallResult<void>> {
    try {
      const url = `${TwitchRewardService.HELIX_BASE_URL}/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          statusCode: response.status,
          error: new Error(`Twitch API error: ${response.status} - ${errorText}`),
        }
      }

      return {
        success: true,
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

  /**
   * Met à jour le statut d'une redemption (nécessite de chercher le reward_id)
   *
   * Note: Cette méthode est plus lente car elle doit d'abord récupérer
   * les redemptions pour trouver le reward_id associé.
   */
  private async updateRedemptionStatusHttp(
    broadcasterId: string,
    accessToken: string,
    redemptionId: string,
    status: 'FULFILLED' | 'CANCELED'
  ): Promise<HttpCallResult<void>> {
    try {
      // D'abord, on doit trouver le reward_id associé à cette redemption
      // On récupère toutes les redemptions en attente pour trouver la bonne
      const rewardsResult = await this.getRewardsHttp(broadcasterId, accessToken)
      if (!rewardsResult.success || !rewardsResult.data) {
        return {
          success: false,
          statusCode: 0,
          error: new Error('Impossible de récupérer les rewards'),
        }
      }

      // Chercher dans chaque reward la redemption
      for (const reward of rewardsResult.data) {
        const result = await this.updateRedemptionStatusWithRewardHttp(
          broadcasterId,
          accessToken,
          reward.id,
          redemptionId,
          status
        )

        if (result.success) {
          return result
        }

        // Si 404, la redemption n'est pas pour ce reward, continuer
        if (result.statusCode !== 404) {
          // Autre erreur, on log mais on continue
          logger.debug(
            {
              event: 'redemption_search_error',
              rewardId: reward.id,
              redemptionId,
              statusCode: result.statusCode,
            },
            'Redemption non trouvée pour ce reward'
          )
        }
      }

      return {
        success: false,
        statusCode: 404,
        error: new Error('Redemption non trouvée dans aucun reward'),
      }
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  /**
   * Met à jour le statut d'une redemption avec le reward_id connu
   */
  private async updateRedemptionStatusWithRewardHttp(
    broadcasterId: string,
    accessToken: string,
    rewardId: string,
    redemptionId: string,
    status: 'FULFILLED' | 'CANCELED'
  ): Promise<HttpCallResult<void>> {
    try {
      const url =
        `${TwitchRewardService.HELIX_BASE_URL}/channel_points/custom_rewards/redemptions` +
        `?broadcaster_id=${broadcasterId}&reward_id=${rewardId}&id=${redemptionId}`

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          statusCode: response.status,
          error: new Error(`Twitch API error: ${response.status} - ${errorText}`),
        }
      }

      return {
        success: true,
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

  private async getRewardsHttp(
    broadcasterId: string,
    accessToken: string
  ): Promise<HttpCallResult<TwitchReward[]>> {
    try {
      const url = `${TwitchRewardService.HELIX_BASE_URL}/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&only_manageable_rewards=true`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          statusCode: response.status,
          error: new Error(`Twitch API error: ${response.status} - ${errorText}`),
        }
      }

      const json = (await response.json()) as { data: Record<string, unknown>[] }
      const rewards = json.data.map((r: Record<string, unknown>) => this.mapTwitchReward(r))

      return {
        success: true,
        data: rewards,
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

  private mapTwitchReward(data: Record<string, unknown>): TwitchReward {
    const image = data.image as Record<string, string> | null
    const defaultImage = data.default_image as Record<string, string>

    return {
      id: data.id as string,
      broadcasterId: data.broadcaster_id as string,
      broadcasterLogin: data.broadcaster_login as string,
      broadcasterName: data.broadcaster_name as string,
      title: data.title as string,
      prompt: (data.prompt as string) || '',
      cost: data.cost as number,
      image: image
        ? {
            url1x: image.url_1x,
            url2x: image.url_2x,
            url4x: image.url_4x,
          }
        : null,
      defaultImage: {
        url1x: defaultImage.url_1x,
        url2x: defaultImage.url_2x,
        url4x: defaultImage.url_4x,
      },
      backgroundColor: data.background_color as string,
      isEnabled: data.is_enabled as boolean,
      isUserInputRequired: data.is_user_input_required as boolean,
      isMaxPerStreamEnabled: data.is_max_per_stream_enabled as boolean,
      maxPerStream: data.max_per_stream as number,
      isMaxPerUserPerStreamEnabled: data.is_max_per_user_per_stream_enabled as boolean,
      maxPerUserPerStream: data.max_per_user_per_stream as number,
      isGlobalCooldownEnabled: data.is_global_cooldown_enabled as boolean,
      globalCooldownSeconds: data.global_cooldown_seconds as number,
      isPaused: data.is_paused as boolean,
      shouldRedemptionsSkipRequestQueue: data.should_redemptions_skip_request_queue as boolean,
    }
  }
}

export default TwitchRewardService
