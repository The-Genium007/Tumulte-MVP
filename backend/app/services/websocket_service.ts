import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'
import type { PollAggregatedVotes } from './poll_service.js'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'

interface PollStartEvent {
  pollInstanceId: string
  title: string
  options: string[]
  durationSeconds: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  started_at: string
  endsAt: string
  [key: string]: any
}

interface RetryNotificationEvent {
  service: string
  operation: string
  attempt: number
  maxAttempts: number
  error?: string
  pollInstanceId?: string
  circuitBreakerTriggered?: boolean
  delayMs?: number
  timestamp: string
  [key: string]: any
}

interface PollUpdateEvent {
  pollInstanceId: string
  votesByOption: Record<string, number>
  totalVotes: number
  percentages: Record<string, number>
  [key: string]: any
}

interface PollEndEvent {
  pollInstanceId: string
  finalVotes: Record<string, number>
  totalVotes: number
  percentages: Record<string, number>
  winnerIndex: number | null
  [key: string]: any
}

class WebSocketService {
  /**
   * Émet l'événement de démarrage d'un sondage
   */
  async emitPollStart(data: PollStartEvent): Promise<void> {
    const channel = `poll:${data.pollInstanceId}`

    // Émettre vers le canal général du poll (pour dashboard MJ)
    transmit.broadcast(channel, {
      event: 'poll:start',
      data,
    })

    // Émettre vers chaque streamer membre de la campagne (si applicable)
    try {
      const pollInstance = await PollInstance.find(data.pollInstanceId)

      if (pollInstance?.campaignId) {
        const memberships = await CampaignMembership.query()
          .where('campaignId', pollInstance.campaignId)
          .where('status', 'ACTIVE')

        for (const membership of memberships) {
          transmit.broadcast(`streamer:${membership.streamerId}:polls`, {
            event: 'poll:start',
            data: {
              ...data,
              campaign_id: pollInstance.campaignId,
            },
          })
        }

        logger.info(
          `WebSocket: poll:start emitted for poll ${data.pollInstanceId} to ${memberships.length} streamers`
        )
      } else {
        logger.info(`WebSocket: poll:start emitted for poll ${data.pollInstanceId} (no campaign)`)
      }
    } catch (error) {
      logger.error(`WebSocket: failed to emit poll:start to streamers: ${error.message}`)
    }
  }

  /**
   * Émet l'événement de mise à jour d'un sondage
   */
  emitPollUpdate(pollInstanceId: string, aggregated: PollAggregatedVotes): void {
    const channel = `poll:${pollInstanceId}`

    const data: PollUpdateEvent = {
      pollInstanceId: pollInstanceId,
      votesByOption: aggregated.votesByOption,
      totalVotes: aggregated.totalVotes,
      percentages: aggregated.percentages,
    }

    transmit.broadcast(channel, {
      event: 'poll:update',
      data,
    })

    logger.debug(`WebSocket: poll:update emitted for poll ${pollInstanceId}`)
  }

  /**
   * Émet l'événement de fin d'un sondage
   */
  async emitPollEnd(pollInstanceId: string, aggregated: PollAggregatedVotes): Promise<void> {
    const channel = `poll:${pollInstanceId}`

    // Trouver l'option gagnante (celle avec le plus de votes)
    let winnerIndex: number | null = null
    let maxVotes = 0

    for (const [optionIndex, votes] of Object.entries(aggregated.votesByOption)) {
      if (votes > maxVotes) {
        maxVotes = votes
        winnerIndex = Number.parseInt(optionIndex)
      }
    }

    const data: PollEndEvent = {
      pollInstanceId: pollInstanceId,
      finalVotes: aggregated.votesByOption,
      totalVotes: aggregated.totalVotes,
      percentages: aggregated.percentages,
      winnerIndex: winnerIndex,
    }

    // Émettre vers le canal général du poll
    transmit.broadcast(channel, {
      event: 'poll:end',
      data,
    })

    // Émettre vers chaque streamer membre de la campagne
    try {
      const pollInstance = await PollInstance.find(pollInstanceId)

      if (pollInstance?.campaignId) {
        const memberships = await CampaignMembership.query()
          .where('campaignId', pollInstance.campaignId)
          .where('status', 'ACTIVE')

        for (const membership of memberships) {
          transmit.broadcast(`streamer:${membership.streamerId}:polls`, {
            event: 'poll:end',
            data: {
              ...data,
              campaign_id: pollInstance.campaignId,
            },
          })
        }
      }
    } catch (error) {
      logger.error(`WebSocket: failed to emit poll:end to streamers: ${error.message}`)
    }

    logger.info(`WebSocket: poll:end emitted for poll ${pollInstanceId}`)
  }

  /**
   * Émet un événement quand un streamer quitte une campagne
   */
  emitStreamerLeftCampaign(streamerId: string, campaignId: string): void {
    transmit.broadcast(`streamer:${streamerId}:polls`, {
      event: 'streamer:left-campaign',
      data: { campaign_id: campaignId },
    })

    logger.info(`WebSocket: streamer:left-campaign emitted for streamer ${streamerId}`)
  }

  /**
   * Émet un événement de changement de readiness d'un streamer
   * Utilisé pour la waiting list en temps réel
   */
  emitStreamerReadinessChange(
    campaignId: string,
    streamerId: string,
    isReady: boolean,
    streamerName: string
  ): void {
    const channel = `campaign:${campaignId}:readiness`

    transmit.broadcast(channel, {
      event: isReady ? 'streamer:ready' : 'streamer:not-ready',
      data: {
        streamerId,
        streamerName,
        isReady,
        timestamp: new Date().toISOString(),
      },
    })

    logger.info(
      `WebSocket: ${isReady ? 'streamer:ready' : 'streamer:not-ready'} emitted for ${streamerName} on campaign ${campaignId}`
    )
  }

  /**
   * Émet une notification de retry API vers le MJ
   * Permet au MJ de voir en temps réel les tentatives de retry
   */
  emitRetryNotification(
    campaignId: string,
    data: {
      service: string
      operation: string
      attempt: number
      maxAttempts: number
      error?: string
      pollInstanceId?: string
      circuitBreakerTriggered?: boolean
      delayMs?: number
    }
  ): void {
    const channel = `campaign:${campaignId}:notifications`

    const event: RetryNotificationEvent = {
      service: data.service,
      operation: data.operation,
      attempt: data.attempt,
      maxAttempts: data.maxAttempts,
      error: data.error,
      pollInstanceId: data.pollInstanceId,
      circuitBreakerTriggered: data.circuitBreakerTriggered,
      delayMs: data.delayMs,
      timestamp: new Date().toISOString(),
    }

    transmit.broadcast(channel, {
      event: 'api:retry',
      data: event,
    })

    const logLevel = data.circuitBreakerTriggered ? 'warn' : 'info'
    logger[logLevel](
      `WebSocket: api:retry emitted for ${data.service}:${data.operation} ` +
        `(attempt ${data.attempt}/${data.maxAttempts}) on campaign ${campaignId}`
    )
  }

  /**
   * Émet une notification de succès après retry
   */
  emitRetrySuccess(
    campaignId: string,
    data: {
      service: string
      operation: string
      totalAttempts: number
      totalDurationMs: number
      pollInstanceId?: string
    }
  ): void {
    const channel = `campaign:${campaignId}:notifications`

    transmit.broadcast(channel, {
      event: 'api:retry-success',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    })

    logger.info(
      `WebSocket: api:retry-success emitted for ${data.service}:${data.operation} ` +
        `(${data.totalAttempts} attempts, ${data.totalDurationMs}ms) on campaign ${campaignId}`
    )
  }

  /**
   * Émet une notification d'échec définitif après épuisement des retries
   */
  emitRetryExhausted(
    campaignId: string,
    data: {
      service: string
      operation: string
      totalAttempts: number
      totalDurationMs: number
      error: string
      pollInstanceId?: string
      circuitBreakerTriggered?: boolean
    }
  ): void {
    const channel = `campaign:${campaignId}:notifications`

    transmit.broadcast(channel, {
      event: 'api:retry-exhausted',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    })

    logger.error(
      `WebSocket: api:retry-exhausted emitted for ${data.service}:${data.operation} ` +
        `(${data.totalAttempts} attempts, ${data.totalDurationMs}ms) on campaign ${campaignId}: ${data.error}`
    )
  }
}

export { WebSocketService as webSocketService }
