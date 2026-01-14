import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'
import type { PollAggregatedVotes } from '#services/polls/poll_aggregation_service'
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
    const channel = `poll:${data.pollInstanceId}`

    logger.info({
      event: 'websocket_emitPollStart_called',
      pollInstanceId: data.pollInstanceId,
      channel,
      durationSeconds: data.durationSeconds,
    })

    // Émettre vers le canal général du poll (pour dashboard MJ)
    transmit.broadcast(channel, {
      event: 'poll:start',
      data,
    })

    logger.info({
      event: 'websocket_poll_start_broadcast_sent',
      channel,
      pollInstanceId: data.pollInstanceId,
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
              campaign_id: String(pollInstance.campaignId),
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
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`WebSocket: failed to emit poll:start to streamers: ${errorMessage}`)
    }
  }

  /**
   * Émet l'événement de mise à jour d'un sondage
   */
  async emitPollUpdate(pollInstanceId: string, aggregated: PollAggregatedVotes): Promise<void> {
    const channel = `poll:${pollInstanceId}`

    const data: PollUpdateEvent = {
      pollInstanceId: pollInstanceId,
      votesByOption: aggregated.votesByOption,
      totalVotes: aggregated.totalVotes,
      percentages: aggregated.percentages,
    }

    logger.info({
      event: 'websocket_emitPollUpdate_called',
      pollInstanceId,
      channel,
      totalVotes: aggregated.totalVotes,
    })

    // Émettre vers le canal général du poll (pour dashboard MJ)
    transmit.broadcast(channel, {
      event: 'poll:update',
      data,
    })

    logger.info({
      event: 'websocket_poll_update_broadcast_sent',
      channel,
      pollInstanceId,
      totalVotes: aggregated.totalVotes,
    })

    // Émettre vers chaque streamer membre de la campagne (pour les overlays)
    try {
      const pollInstance = await PollInstance.find(pollInstanceId)

      if (pollInstance?.campaignId) {
        const memberships = await CampaignMembership.query()
          .where('campaignId', pollInstance.campaignId)
          .where('status', 'ACTIVE')

        for (const membership of memberships) {
          transmit.broadcast(`streamer:${membership.streamerId}:polls`, {
            event: 'poll:update',
            data: {
              ...data,
              campaign_id: String(pollInstance.campaignId),
            },
          })
        }

        logger.debug(
          `WebSocket: poll:update emitted for poll ${pollInstanceId} to ${memberships.length} streamers`
        )
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`WebSocket: failed to emit poll:update to streamers: ${errorMessage}`)
    }
  }

  /**
   * Convertit un Record en objet sérialisable (convertit les clés et valeurs en primitives)
   */
  private makeSerializable(obj: Record<string, number>): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Convertir les valeurs non sérialisables (NaN, Infinity) en 0
      const numValue = typeof value === 'number' && Number.isFinite(value) ? value : 0
      result[String(key)] = numValue
    }
    return result
  }

  /**
   * Émet l'événement de fin d'un sondage
   */
  async emitPollEnd(pollInstanceId: string, aggregated: PollAggregatedVotes): Promise<void> {
    const channel = `poll:${pollInstanceId}`

    logger.info({
      event: 'websocket_emitPollEnd_called',
      pollInstanceId,
      channel,
      totalVotes: aggregated.totalVotes,
      votesByOption: aggregated.votesByOption,
    })

    // Trouver l'option gagnante (celle avec le plus de votes)
    let winnerIndex: number | null = null
    let maxVotes = 0

    for (const [optionIndex, votes] of Object.entries(aggregated.votesByOption)) {
      if (votes > maxVotes) {
        maxVotes = votes
        winnerIndex = Number.parseInt(optionIndex)
      }
    }

    // Préparer des données sérialisables
    const finalVotes = this.makeSerializable(aggregated.votesByOption)
    const percentages = this.makeSerializable(aggregated.percentages)

    logger.info({
      event: 'websocket_poll_end_data_prepared',
      pollInstanceId,
      finalVotes,
      percentages,
      totalVotes: aggregated.totalVotes,
      winnerIndex,
    })

    const data: PollEndEvent = {
      pollInstanceId: pollInstanceId,
      finalVotes: finalVotes,
      totalVotes: aggregated.totalVotes,
      percentages: percentages,
      winnerIndex: winnerIndex,
    }

    logger.info({
      event: 'websocket_poll_end_broadcasting',
      channel,
      pollInstanceId,
      dataKeys: Object.keys(data),
    })

    // Émettre vers le canal général du poll
    transmit.broadcast(channel, {
      event: 'poll:end',
      data,
    })

    logger.info({
      event: 'websocket_poll_end_broadcast_sent',
      channel,
      pollInstanceId,
      totalVotes: data.totalVotes,
    })

    // Émettre vers chaque streamer membre de la campagne
    try {
      const pollInstance = await PollInstance.find(pollInstanceId)

      if (pollInstance?.campaignId) {
        const memberships = await CampaignMembership.query()
          .where('campaignId', pollInstance.campaignId)
          .where('status', 'ACTIVE')

        // S'assurer que toutes les données sont sérialisables
        const serializableData = {
          pollInstanceId: String(data.pollInstanceId),
          finalVotes: finalVotes,
          totalVotes: data.totalVotes,
          percentages: percentages,
          winnerIndex: data.winnerIndex,
          campaign_id: String(pollInstance.campaignId),
        }

        for (const membership of memberships) {
          const streamerChannel = `streamer:${membership.streamerId}:polls`
          logger.debug(`Emitting poll:end to channel: ${streamerChannel}`)

          try {
            transmit.broadcast(streamerChannel, {
              event: 'poll:end',
              data: serializableData,
            })
          } catch (broadcastError) {
            const errorMsg =
              broadcastError instanceof Error ? broadcastError.message : String(broadcastError)
            logger.error(
              `Failed to broadcast poll:end to ${streamerChannel}: ${errorMsg}`,
              serializableData
            )
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`WebSocket: failed to emit poll:end to streamers: ${errorMessage}`)
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
}

export { WebSocketService as webSocketService }
