import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PollChannelLinkRepository } from '#repositories/poll_channel_link_repository'
import RedisService from '../cache/redis_service.js'
import WebSocketService from '../websocket/websocket_service.js'

export interface PollAggregatedVotes {
  pollInstanceId: string
  votesByOption: Record<string, number>
  totalVotes: number
  percentages: Record<string, number>
}

/**
 * Service pour agréger les votes de tous les channel links
 */
@inject()
export class PollAggregationService {
  constructor(
    private pollChannelLinkRepository: PollChannelLinkRepository,
    private redisService: RedisService,
    private webSocketService: WebSocketService
  ) {}

  /**
   * Agrège les votes de tous les channel links pour un poll instance
   */
  async getAggregatedVotes(pollInstanceId: string): Promise<PollAggregatedVotes> {
    const channelLinks = await this.pollChannelLinkRepository.findByPollInstance(pollInstanceId)

    const votesByOption: Record<string, number> = {}
    let totalVotes = 0

    // Agréger les votes
    for (const link of channelLinks) {
      for (const [optionIndex, votes] of Object.entries(link.votesByOption)) {
        votesByOption[optionIndex] = (votesByOption[optionIndex] || 0) + votes
        totalVotes += votes
      }
    }

    // Calculer les pourcentages
    const percentages: Record<string, number> = {}
    for (const [optionIndex, votes] of Object.entries(votesByOption)) {
      percentages[optionIndex] =
        totalVotes > 0 ? Math.round((votes / totalVotes) * 100 * 10) / 10 : 0
    }

    return {
      pollInstanceId,
      votesByOption,
      totalVotes,
      percentages,
    }
  }

  /**
   * Agrège les votes et met en cache dans Redis
   */
  async getAggregatedVotesWithCache(pollInstanceId: string): Promise<PollAggregatedVotes> {
    // Essayer de récupérer depuis le cache
    const cached = await this.redisService.getCachedAggregatedVotes(pollInstanceId)
    if (cached) {
      return cached
    }

    // Calculer et mettre en cache
    const aggregated = await this.getAggregatedVotes(pollInstanceId)
    await this.redisService.cacheAggregatedVotes(pollInstanceId, aggregated)

    return aggregated
  }

  /**
   * Agrège les votes et émet un événement WebSocket
   */
  async aggregateAndEmit(pollInstanceId: string): Promise<PollAggregatedVotes> {
    const aggregated = await this.getAggregatedVotes(pollInstanceId)

    // Émettre via WebSocket
    this.webSocketService.emitPollUpdate(pollInstanceId, aggregated)

    // Mettre en cache
    await this.redisService.cacheAggregatedVotes(pollInstanceId, aggregated)

    logger.debug(`Poll instance ${pollInstanceId} aggregated: ${aggregated.totalVotes} total votes`)

    return aggregated
  }

  /**
   * Invalide le cache pour un poll instance
   */
  async invalidateCache(pollInstanceId: string): Promise<void> {
    await this.redisService.deleteCachedAggregatedVotes(pollInstanceId)
    logger.debug(`Cache invalidated for poll instance ${pollInstanceId}`)
  }
}

export default PollAggregationService
