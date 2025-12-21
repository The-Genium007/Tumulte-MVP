import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'
import type { PollAggregatedVotes } from '#services/polls/poll_aggregation_service'
import PollInstance from '#models/poll_instance'
import CampaignMembership from '#models/campaign_membership'

interface PollStartEvent {
  poll_instance_id: string
  title: string
  options: string[]
  duration_seconds: number
  started_at: string
  ends_at: string
  [key: string]: any
}

interface PollUpdateEvent {
  poll_instance_id: string
  votes_by_option: Record<string, number>
  total_votes: number
  percentages: Record<string, number>
  [key: string]: any
}

interface PollEndEvent {
  poll_instance_id: string
  final_votes: Record<string, number>
  total_votes: number
  percentages: Record<string, number>
  winner_index: number | null
  [key: string]: any
}

export default class WebSocketService {
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
      poll_instance_id: pollInstanceId,
      votes_by_option: aggregated.votesByOption,
      total_votes: aggregated.totalVotes,
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
        winnerIndex = parseInt(optionIndex)
      }
    }

    const data: PollEndEvent = {
      poll_instance_id: pollInstanceId,
      final_votes: aggregated.votesByOption,
      total_votes: aggregated.totalVotes,
      percentages: aggregated.percentages,
      winner_index: winnerIndex,
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
