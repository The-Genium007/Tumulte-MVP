import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * Service pour gérer le cache Redis
 * Implémente les stratégies de cache pour les différentes entités
 */
export class RedisService {
  // TTL par défaut en secondes
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private readonly DEFAULT_TTL = 300 // 5 minutes

  /**
   * Clés Redis pour les résultats de polls
   */
  private getPollResultsKey(pollInstanceId: string): string {
    return `poll:results:${pollInstanceId}`
  }

  private getAggregatedVotesKey(pollInstanceId: string): string {
    return `poll:aggregated:${pollInstanceId}`
  }

  /**
   * Clés Redis pour les tokens de streamers
   */
  private getStreamerTokenKey(streamerId: string): string {
    return `streamer:tokens:${streamerId}`
  }

  /**
   * Clé Redis pour l'app access token Twitch
   */
  private getTwitchAppTokenKey(): string {
    return 'twitch:app-token'
  }

  /**
   * Cache des résultats de polls
   * TTL: durée du poll + 5 minutes
   */
  async cachePollResults(pollInstanceId: string, results: any, ttl?: number): Promise<void> {
    try {
      const key = this.getPollResultsKey(pollInstanceId)
      const finalTtl = ttl || this.DEFAULT_TTL

      await redis.setex(key, finalTtl, JSON.stringify(results))

      logger.debug({ pollInstanceId, ttl: finalTtl }, 'Cached poll results')
    } catch (error) {
      logger.error({ error, pollInstanceId }, 'Failed to cache poll results')
    }
  }

  async getCachedPollResults(pollInstanceId: string): Promise<any | null> {
    try {
      const key = this.getPollResultsKey(pollInstanceId)
      const cached = await redis.get(key)

      if (!cached) return null

      return JSON.parse(cached)
    } catch (error) {
      logger.error({ error, pollInstanceId }, 'Failed to get cached poll results')
      return null
    }
  }

  async invalidatePollResults(pollInstanceId: string): Promise<void> {
    try {
      const key = this.getPollResultsKey(pollInstanceId)
      await redis.del(key)

      logger.debug({ pollInstanceId }, 'Invalidated poll results cache')
    } catch (error) {
      logger.error({ error, pollInstanceId }, 'Failed to invalidate poll results')
    }
  }

  /**
   * Cache des votes agrégés en temps réel
   * TTL court: 5 secondes pendant le polling
   */
  async cacheAggregatedVotes(pollInstanceId: string, votes: any): Promise<void> {
    try {
      const key = this.getAggregatedVotesKey(pollInstanceId)
      await redis.setex(key, 5, JSON.stringify(votes))

      logger.debug({ pollInstanceId }, 'Cached aggregated votes')
    } catch (error) {
      logger.error({ error, pollInstanceId }, 'Failed to cache aggregated votes')
    }
  }

  async getCachedAggregatedVotes(pollInstanceId: string): Promise<any | null> {
    try {
      const key = this.getAggregatedVotesKey(pollInstanceId)
      const cached = await redis.get(key)

      if (!cached) return null

      return JSON.parse(cached)
    } catch (error) {
      logger.error({ error, pollInstanceId }, 'Failed to get cached aggregated votes')
      return null
    }
  }

  async deleteCachedAggregatedVotes(pollInstanceId: string): Promise<void> {
    try {
      const key = this.getAggregatedVotesKey(pollInstanceId)
      await redis.del(key)
      logger.debug({ pollInstanceId }, 'Deleted cached aggregated votes')
    } catch (error) {
      logger.error({ error, pollInstanceId }, 'Failed to delete cached aggregated votes')
    }
  }

  /**
   * Cache des tokens de streamers
   * TTL: jusqu'à expiration du token
   */
  async cacheStreamerTokens(
    streamerId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> {
    try {
      const key = this.getStreamerTokenKey(streamerId)
      const data = { accessToken, refreshToken }

      await redis.setex(key, expiresIn, JSON.stringify(data))

      logger.debug({ streamerId, expiresIn }, 'Cached streamer tokens')
    } catch (error) {
      logger.error({ error, streamerId }, 'Failed to cache streamer tokens')
    }
  }

  async getCachedStreamerTokens(
    streamerId: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const key = this.getStreamerTokenKey(streamerId)
      const cached = await redis.get(key)

      if (!cached) return null

      return JSON.parse(cached)
    } catch (error) {
      logger.error({ error, streamerId }, 'Failed to get cached streamer tokens')
      return null
    }
  }

  async invalidateStreamerTokens(streamerId: string): Promise<void> {
    try {
      const key = this.getStreamerTokenKey(streamerId)
      await redis.del(key)

      logger.debug({ streamerId }, 'Invalidated streamer tokens cache')
    } catch (error) {
      logger.error({ error, streamerId }, 'Failed to invalidate streamer tokens')
    }
  }

  /**
   * Cache de l'app access token Twitch
   * TTL: expiration - 10 minutes pour le rafraîchir avant expiration
   */
  async cacheAppAccessToken(token: string, expiresIn: number): Promise<void> {
    try {
      const key = this.getTwitchAppTokenKey()
      // Réduire le TTL de 10 minutes (600 secondes) pour rafraîchir avant expiration
      const ttl = Math.max(expiresIn - 600, 60)

      await redis.setex(key, ttl, token)

      logger.debug({ expiresIn, ttl }, 'Cached app access token')
    } catch (error) {
      logger.error({ error }, 'Failed to cache app access token')
    }
  }

  async getCachedAppAccessToken(): Promise<string | null> {
    try {
      const key = this.getTwitchAppTokenKey()
      return await redis.get(key)
    } catch (error) {
      logger.error({ error }, 'Failed to get cached app access token')
      return null
    }
  }

  /**
   * Clés Redis pour les votes chat (fallback non-affiliés)
   */
  private getChatVotesKey(pollInstanceId: string, streamerId: string): string {
    return `poll:chat:votes:${pollInstanceId}:${streamerId}`
  }

  /**
   * Clé Redis pour tracker les utilisateurs qui ont voté (vote UNIQUE)
   */
  private getChatVotersKey(pollInstanceId: string, streamerId: string): string {
    return `poll:chat:voters:${pollInstanceId}:${streamerId}`
  }

  /**
   * Incrémente le compteur de votes pour une option (mode chat)
   */
  async incrementChatVote(
    pollInstanceId: string,
    streamerId: string,
    optionIndex: number
  ): Promise<number> {
    try {
      const key = this.getChatVotesKey(pollInstanceId, streamerId)
      const newCount = await redis.hincrby(key, optionIndex.toString(), 1)

      logger.debug(
        {
          pollInstanceId,
          streamerId,
          optionIndex,
          newCount,
        },
        'Incremented chat vote'
      )

      return newCount
    } catch (error) {
      logger.error(
        { error, pollInstanceId, streamerId, optionIndex },
        'Failed to increment chat vote'
      )
      throw error
    }
  }

  /**
   * Récupère tous les votes d'un streamer (mode chat)
   */
  async getChatVotes(pollInstanceId: string, streamerId: string): Promise<Record<string, number>> {
    try {
      const key = this.getChatVotesKey(pollInstanceId, streamerId)
      const votes = await redis.hgetall(key)

      // Convertir les valeurs string en number
      const result: Record<string, number> = {}
      for (const [option, count] of Object.entries(votes)) {
        result[option] = Number.parseInt(count as string, 10)
      }

      return result
    } catch (error) {
      logger.error({ error, pollInstanceId, streamerId }, 'Failed to get chat votes')
      throw error
    }
  }

  /**
   * Définit un TTL sur les votes chat (appelé au démarrage du poll)
   */
  async setChatVotesTTL(
    pollInstanceId: string,
    streamerId: string,
    ttlSeconds: number
  ): Promise<void> {
    try {
      const key = this.getChatVotesKey(pollInstanceId, streamerId)
      await redis.expire(key, ttlSeconds)

      logger.debug({ pollInstanceId, streamerId, ttlSeconds }, 'Set chat votes TTL')
    } catch (error) {
      logger.error(
        { error, pollInstanceId, streamerId, ttlSeconds },
        'Failed to set chat votes TTL'
      )
    }
  }

  /**
   * Nettoie les votes chat d'un poll
   */
  async deleteChatVotes(pollInstanceId: string, streamerId: string): Promise<void> {
    try {
      const key = this.getChatVotesKey(pollInstanceId, streamerId)
      await redis.del(key)

      logger.debug({ pollInstanceId, streamerId }, 'Deleted chat votes')
    } catch (error) {
      logger.error({ error, pollInstanceId, streamerId }, 'Failed to delete chat votes')
    }
  }

  /**
   * Vérifie si un utilisateur a déjà voté (mode UNIQUE)
   */
  async hasUserVoted(
    pollInstanceId: string,
    streamerId: string,
    username: string
  ): Promise<boolean> {
    try {
      const key = this.getChatVotersKey(pollInstanceId, streamerId)
      const voted = await redis.hexists(key, username.toLowerCase())
      return voted === 1
    } catch (error) {
      logger.error({ error, pollInstanceId, streamerId, username }, 'Failed to check user vote')
      return false
    }
  }

  /**
   * Enregistre le vote d'un utilisateur (mode UNIQUE)
   */
  async recordUserVote(
    pollInstanceId: string,
    streamerId: string,
    username: string,
    optionIndex: number
  ): Promise<void> {
    try {
      const key = this.getChatVotersKey(pollInstanceId, streamerId)
      await redis.hset(key, username.toLowerCase(), optionIndex.toString())

      logger.debug({ pollInstanceId, streamerId, username, optionIndex }, 'Recorded user vote')
    } catch (error) {
      logger.error(
        { error, pollInstanceId, streamerId, username, optionIndex },
        'Failed to record user vote'
      )
      throw error
    }
  }

  /**
   * Récupère le vote d'un utilisateur (mode UNIQUE)
   */
  async getUserVote(
    pollInstanceId: string,
    streamerId: string,
    username: string
  ): Promise<number | null> {
    try {
      const key = this.getChatVotersKey(pollInstanceId, streamerId)
      const vote = await redis.hget(key, username.toLowerCase())
      return vote ? Number.parseInt(vote, 10) : null
    } catch (error) {
      logger.error({ error, pollInstanceId, streamerId, username }, 'Failed to get user vote')
      return null
    }
  }

  /**
   * Change le vote d'un utilisateur (mode UNIQUE - changement de choix)
   */
  async changeUserVote(
    pollInstanceId: string,
    streamerId: string,
    username: string,
    oldOptionIndex: number,
    newOptionIndex: number
  ): Promise<void> {
    try {
      // Décrémenter l'ancienne option
      const votesKey = this.getChatVotesKey(pollInstanceId, streamerId)
      await redis.hincrby(votesKey, oldOptionIndex.toString(), -1)

      // Incrémenter la nouvelle option
      await redis.hincrby(votesKey, newOptionIndex.toString(), 1)

      // Mettre à jour le choix de l'utilisateur
      const votersKey = this.getChatVotersKey(pollInstanceId, streamerId)
      await redis.hset(votersKey, username.toLowerCase(), newOptionIndex.toString())

      logger.debug(
        { pollInstanceId, streamerId, username, oldOptionIndex, newOptionIndex },
        'Changed user vote'
      )
    } catch (error) {
      logger.error(
        { error, pollInstanceId, streamerId, username, oldOptionIndex, newOptionIndex },
        'Failed to change user vote'
      )
      throw error
    }
  }

  /**
   * Nettoie les votants d'un poll
   */
  async deleteChatVoters(pollInstanceId: string, streamerId: string): Promise<void> {
    try {
      const key = this.getChatVotersKey(pollInstanceId, streamerId)
      await redis.del(key)

      logger.debug({ pollInstanceId, streamerId }, 'Deleted chat voters')
    } catch (error) {
      logger.error({ error, pollInstanceId, streamerId }, 'Failed to delete chat voters')
    }
  }

  /**
   * Utilitaire: vérifier la connexion Redis
   */
  async ping(): Promise<void> {
    try {
      await redis.ping()
    } catch (error) {
      logger.error({ error }, 'Redis ping failed')
      throw new Error('Redis connection failed')
    }
  }

  /**
   * Utilitaire: nettoyer toutes les clés d'un pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length === 0) return 0

      await redis.del(...keys)
      logger.info({ pattern, count: keys.length }, 'Cleared Redis keys')

      return keys.length
    } catch (error) {
      logger.error({ error, pattern }, 'Failed to clear Redis pattern')
      return 0
    }
  }
}

export default RedisService
export { RedisService as redisService }
