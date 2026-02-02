import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import redis from '@adonisjs/redis/services/main'
import { TwitchApiService } from './twitch_api_service.js'

/**
 * Données de viewer count pour un streamer
 */
export interface ViewerCountData {
  streamerId: string
  twitchUserId: string
  viewerCount: number
  isLive: boolean
  fetchedAt: Date
}

/**
 * ViewerCountService - Récupération et cache du nombre de viewers
 *
 * Gère le polling du viewer count via l'API Twitch avec cache Redis
 * pour éviter les appels excessifs.
 */
@inject()
export class ViewerCountService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly CACHE_PREFIX = 'viewer_count:'
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly CACHE_TTL_SECONDS = 60 // 1 minute

  constructor(private twitchApiService: TwitchApiService) {}

  /**
   * Récupère le viewer count pour un streamer (avec cache)
   */
  async getViewerCount(twitchUserId: string): Promise<ViewerCountData | null> {
    // Vérifier le cache
    const cached = await this.getFromCache(twitchUserId)
    if (cached) {
      return cached
    }

    // Fetch depuis l'API Twitch
    const fresh = await this.fetchViewerCount(twitchUserId)
    if (fresh) {
      await this.setCache(twitchUserId, fresh)
    }

    return fresh
  }

  /**
   * Récupère le viewer count pour plusieurs streamers
   */
  async getViewerCounts(twitchUserIds: string[]): Promise<Map<string, ViewerCountData>> {
    const results = new Map<string, ViewerCountData>()
    const toFetch: string[] = []

    // Vérifier le cache pour chaque ID
    for (const userId of twitchUserIds) {
      const cached = await this.getFromCache(userId)
      if (cached) {
        results.set(userId, cached)
      } else {
        toFetch.push(userId)
      }
    }

    // Fetch les manquants en batch
    if (toFetch.length > 0) {
      const fetched = await this.fetchViewerCountsBatch(toFetch)
      for (const [userId, data] of fetched) {
        results.set(userId, data)
        await this.setCache(userId, data)
      }
    }

    return results
  }

  /**
   * Force le refresh du cache pour un streamer
   */
  async refreshViewerCount(twitchUserId: string): Promise<ViewerCountData | null> {
    await this.clearCache(twitchUserId)
    return this.getViewerCount(twitchUserId)
  }

  /**
   * Invalide le cache pour un streamer
   */
  async clearCache(twitchUserId: string): Promise<void> {
    const key = `${ViewerCountService.CACHE_PREFIX}${twitchUserId}`
    await redis.del(key)
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async fetchViewerCount(twitchUserId: string): Promise<ViewerCountData | null> {
    try {
      const accessToken = await this.twitchApiService.getAppAccessToken()
      const streamsMap = await this.twitchApiService.getStreamsByUserIds(
        [twitchUserId],
        accessToken
      )

      const now = new Date()

      if (streamsMap.size === 0) {
        // Streamer offline
        return {
          streamerId: '', // Sera rempli par l'appelant si nécessaire
          twitchUserId,
          viewerCount: 0,
          isLive: false,
          fetchedAt: now,
        }
      }

      const stream = streamsMap.get(twitchUserId)
      return {
        streamerId: '',
        twitchUserId,
        viewerCount: stream?.viewer_count || 0,
        isLive: !!stream,
        fetchedAt: now,
      }
    } catch (error) {
      logger.error(
        {
          event: 'fetch_viewer_count_error',
          twitchUserId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Erreur lors de la récupération du viewer count'
      )
      return null
    }
  }

  private async fetchViewerCountsBatch(
    twitchUserIds: string[]
  ): Promise<Map<string, ViewerCountData>> {
    const results = new Map<string, ViewerCountData>()
    const now = new Date()

    try {
      const accessToken = await this.twitchApiService.getAppAccessToken()
      const streamsMap = await this.twitchApiService.getStreamsByUserIds(twitchUserIds, accessToken)

      // Créer les résultats pour tous les IDs demandés
      for (const userId of twitchUserIds) {
        const stream = streamsMap.get(userId)
        results.set(userId, {
          streamerId: '',
          twitchUserId: userId,
          viewerCount: stream?.viewer_count || 0,
          isLive: !!stream,
          fetchedAt: now,
        })
      }
    } catch (error) {
      logger.error(
        {
          event: 'fetch_viewer_counts_batch_error',
          count: twitchUserIds.length,
          error: error instanceof Error ? error.message : String(error),
        },
        'Erreur lors de la récupération batch des viewer counts'
      )

      // Retourner des données offline pour tous
      for (const userId of twitchUserIds) {
        results.set(userId, {
          streamerId: '',
          twitchUserId: userId,
          viewerCount: 0,
          isLive: false,
          fetchedAt: now,
        })
      }
    }

    return results
  }

  private async getFromCache(twitchUserId: string): Promise<ViewerCountData | null> {
    try {
      const key = `${ViewerCountService.CACHE_PREFIX}${twitchUserId}`
      const cached = await redis.get(key)

      if (!cached) {
        return null
      }

      const data = JSON.parse(cached)
      return {
        ...data,
        fetchedAt: new Date(data.fetchedAt),
      }
    } catch {
      return null
    }
  }

  private async setCache(twitchUserId: string, data: ViewerCountData): Promise<void> {
    try {
      const key = `${ViewerCountService.CACHE_PREFIX}${twitchUserId}`
      await redis.setex(key, ViewerCountService.CACHE_TTL_SECONDS, JSON.stringify(data))
    } catch (error) {
      logger.warn(
        {
          event: 'cache_viewer_count_error',
          twitchUserId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Erreur lors de la mise en cache du viewer count'
      )
    }
  }
}

export default ViewerCountService
