import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import redis from '@adonisjs/redis/services/main'
import { TwitchApiService } from './twitch_api_service.js'

/**
 * Statut live d'un streamer
 */
export interface LiveStatusEntry {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  is_live: boolean
  // eslint-disable-next-line @typescript-eslint/naming-convention
  game_name?: string
  title?: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  viewer_count?: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  started_at?: string
}

export type LiveStatusMap = Record<string, LiveStatusEntry>

/**
 * LiveStatusService - Gestion du statut live avec cache Redis
 *
 * Optimise les appels à l'API Twitch en cachant le statut live
 * par campagne pour éviter les requêtes redondantes.
 */
@inject()
export class LiveStatusService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly CACHE_PREFIX = 'live_status:campaign:'
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly CACHE_TTL_SECONDS = 30 // 30 secondes

  constructor(private twitchApiService: TwitchApiService) {}

  /**
   * Récupère le statut live des streamers d'une campagne (avec cache)
   */
  async getLiveStatus(campaignId: string, twitchUserIds: string[]): Promise<LiveStatusMap> {
    if (twitchUserIds.length === 0) {
      return {}
    }

    // 1. Vérifier le cache
    const cached = await this.getFromCache(campaignId)
    if (cached) {
      logger.debug({
        event: 'live_status_cache_hit',
        campaignId,
        memberCount: twitchUserIds.length,
      })
      return cached
    }

    // 2. Fetch depuis Twitch
    logger.info({
      event: 'live_status_fetch',
      campaignId,
      twitchUserIds,
      memberCount: twitchUserIds.length,
    })

    const liveStatus = await this.fetchFromTwitch(twitchUserIds)

    // 3. Mettre en cache
    await this.setCache(campaignId, liveStatus)

    return liveStatus
  }

  /**
   * Invalide le cache pour une campagne
   */
  async invalidateCache(campaignId: string): Promise<void> {
    const key = `${LiveStatusService.CACHE_PREFIX}${campaignId}`
    await redis.del(key)
    logger.debug({ event: 'live_status_cache_invalidated', campaignId })
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async fetchFromTwitch(twitchUserIds: string[]): Promise<LiveStatusMap> {
    try {
      const accessToken = await this.twitchApiService.getAppAccessToken()

      const liveStreams = await this.twitchApiService.getStreamsByUserIds(
        twitchUserIds,
        accessToken
      )

      logger.info({
        event: 'twitch_streams_response',
        liveStreamCount: liveStreams.size,
        liveUserIds: Array.from(liveStreams.keys()),
      })

      // Construire la map de statut
      const liveStatus: LiveStatusMap = {}

      for (const twitchUserId of twitchUserIds) {
        const stream = liveStreams.get(twitchUserId)
        if (stream) {
          liveStatus[twitchUserId] = {
            // eslint-disable-next-line camelcase
            is_live: true,
            // eslint-disable-next-line camelcase
            game_name: stream.game_name,
            title: stream.title,
            // eslint-disable-next-line camelcase
            viewer_count: stream.viewer_count,

            started_at: stream.started_at,
          }
        } else {
          // eslint-disable-next-line camelcase
          liveStatus[twitchUserId] = { is_live: false }
        }
      }

      return liveStatus
    } catch (error) {
      logger.error({
        event: 'live_status_fetch_error',
        error: error instanceof Error ? error.message : String(error),
      })

      // En cas d'erreur, retourner tous offline
      const liveStatus: LiveStatusMap = {}
      for (const twitchUserId of twitchUserIds) {
        // eslint-disable-next-line camelcase
        liveStatus[twitchUserId] = { is_live: false }
      }
      return liveStatus
    }
  }

  private async getFromCache(campaignId: string): Promise<LiveStatusMap | null> {
    try {
      const key = `${LiveStatusService.CACHE_PREFIX}${campaignId}`
      const cached = await redis.get(key)

      if (!cached) {
        return null
      }

      return JSON.parse(cached) as LiveStatusMap
    } catch {
      return null
    }
  }

  private async setCache(campaignId: string, data: LiveStatusMap): Promise<void> {
    try {
      const key = `${LiveStatusService.CACHE_PREFIX}${campaignId}`
      await redis.setex(key, LiveStatusService.CACHE_TTL_SECONDS, JSON.stringify(data))
    } catch (error) {
      logger.warn({
        event: 'live_status_cache_error',
        campaignId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

export default LiveStatusService
