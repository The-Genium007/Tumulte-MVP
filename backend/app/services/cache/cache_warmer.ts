import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'
import { campaign as Campaign } from '#models/campaign'
import { streamer as Streamer } from '#models/streamer'
import { DateTime } from 'luxon'

/**
 * Service for warming up the cache at application startup.
 * Pre-loads frequently accessed data to reduce cache misses
 * and improve response times for the first requests.
 */
export default class CacheWarmer {
  private readonly campaignTtl = 3600 // 1 hour
  private readonly streamerTtl = 3600 // 1 hour

  /**
   * Run all warmup tasks.
   * This is called after the application starts.
   */
  async warmup(): Promise<void> {
    const startTime = Date.now()
    logger.info('[CacheWarmer] Starting cache warmup...')

    try {
      const results = await Promise.allSettled([
        this.warmActiveCampaigns(),
        this.warmActiveStreamers(),
      ])

      // Log results
      results.forEach((result, index) => {
        const taskName = ['activeCampaigns', 'activeStreamers'][index]
        if (result.status === 'rejected') {
          logger.error({ error: result.reason }, `[CacheWarmer] ${taskName} warmup failed`)
        }
      })

      const duration = Date.now() - startTime
      logger.info({ durationMs: duration }, '[CacheWarmer] Cache warmup completed')
    } catch (error) {
      logger.error({ error }, '[CacheWarmer] Cache warmup failed')
    }
  }

  /**
   * Warm cache with recently active campaigns.
   * Loads campaigns that have had activity in the last 30 days.
   */
  private async warmActiveCampaigns(): Promise<number> {
    const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toSQL()

    // Find campaigns with recent activity (updated in last 30 days)
    const campaigns = await Campaign.query()
      .where('updated_at', '>=', thirtyDaysAgo!)
      .preload('memberships', (query) => {
        query.preload('streamer')
      })
      .limit(100) // Limit to prevent memory issues

    let warmedCount = 0

    for (const campaign of campaigns) {
      try {
        const cacheKey = `campaign:${campaign.id}:data`
        const cacheData = {
          id: campaign.id,
          name: campaign.name,
          ownerId: campaign.ownerId,
          memberCount: campaign.memberships?.length || 0,
          cachedAt: new Date().toISOString(),
        }

        await redis.set(cacheKey, JSON.stringify(cacheData), 'EX', this.campaignTtl)
        warmedCount++
      } catch (error) {
        logger.debug({ campaignId: campaign.id, error }, '[CacheWarmer] Failed to cache campaign')
      }
    }

    logger.info({ count: warmedCount }, '[CacheWarmer] Warmed active campaigns')
    return warmedCount
  }

  /**
   * Warm cache with streamers that have valid tokens.
   * These are streamers likely to participate in polls soon.
   */
  private async warmActiveStreamers(): Promise<number> {
    // Find streamers with valid (non-expired) tokens
    const streamers = await Streamer.query()
      .whereNotNull('accessTokenEncrypted')
      .whereNotNull('refreshTokenEncrypted')
      .limit(200) // Limit to prevent memory issues

    let warmedCount = 0

    for (const streamer of streamers) {
      try {
        const cacheKey = `streamer:${streamer.id}:info`
        const cacheData = {
          id: streamer.id,
          twitchUserId: streamer.twitchUserId,
          twitchDisplayName: streamer.twitchDisplayName,
          hasValidToken: true,
          cachedAt: new Date().toISOString(),
        }

        await redis.set(cacheKey, JSON.stringify(cacheData), 'EX', this.streamerTtl)
        warmedCount++
      } catch (error) {
        logger.debug({ streamerId: streamer.id, error }, '[CacheWarmer] Failed to cache streamer')
      }
    }

    logger.info({ count: warmedCount }, '[CacheWarmer] Warmed active streamers')
    return warmedCount
  }

  /**
   * Clear all warmed cache entries.
   * Useful for cache invalidation or testing.
   */
  async clearWarmedCache(): Promise<void> {
    logger.info('[CacheWarmer] Clearing warmed cache...')

    // Use SCAN to safely iterate over keys (better than KEYS for large datasets)
    const patterns = ['campaign:*:data', 'streamer:*:info']

    for (const pattern of patterns) {
      let cursor = '0'
      do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = newCursor

        if (keys.length > 0) {
          await redis.del(...keys)
        }
      } while (cursor !== '0')
    }

    logger.info('[CacheWarmer] Warmed cache cleared')
  }
}
