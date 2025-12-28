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
    const channel = `poll:${data.poll_instance_id}`

    // Émettre vers le canal général du poll (pour dashboard MJ)
    transmit.broadcast(channel, {
      event: 'poll:start',
      data,
    })

    // Émettre vers chaque streamer membre de la campagne (si applicable)
    try {
      const pollInstance = await PollInstance.find(data.poll_instance_id)

      if (pollInstance?.campaignId) {
        const memberships = await CampaignMembership.query()
          .where('campaign_id', pollInstance.campaignId)
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
          `WebSocket: poll:start emitted for poll ${data.poll_instance_id} to ${memberships.length} streamers`
        )
      } else {
        logger.info(`WebSocket: poll:start emitted for poll ${data.poll_instance_id} (no campaign)`)
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
          .where('campaign_id', pollInstance.campaignId)
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
}

export { WebSocketService as webSocketService }
