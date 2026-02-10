import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'
import type { PollAggregatedVotes } from '#services/polls/poll_aggregation_service'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'

// ========================================
// GAMIFICATION EVENT INTERFACES
// ========================================

interface GamificationStartEvent {
  id: string
  campaignId: string
  eventId: string
  event: {
    id: string
    slug: string
    name: string
    type: 'individual' | 'group'
    actionType: string
    rewardColor: string
  }
  type: 'individual' | 'group'
  status: string
  objectiveTarget: number
  currentProgress: number
  progressPercentage: number
  isObjectiveReached: boolean
  duration: number
  startsAt: string
  expiresAt: string
  completedAt: string | null
  streamerId: string | null
  viewerCountAtStart: number | null
  triggerData: Record<string, unknown> | null
}

interface GamificationProgressData {
  instanceId: string
  campaignId: string
  currentProgress: number
  objectiveTarget: number
  progressPercentage: number
  isObjectiveReached: boolean
  contributorUsername: string
}

interface GamificationArmedData {
  instanceId: string
  campaignId: string
  armedAt: string | null
  streamerId: string | null
  eventId: string
}

interface GamificationCompleteData {
  instanceId: string
  campaignId: string
  success: boolean
  message?: string
}

interface GamificationExpiredData {
  instanceId: string
  campaignId: string
}

interface GamificationActionExecutedData {
  instanceId: string
  campaignId: string
  eventName: string
  actionType: string
  success: boolean
  message?: string
  originalValue?: number
  invertedValue?: number
}

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
  votesByOption: Record<string, number>
  totalVotes: number
  percentages: Record<string, number>
  winnerIndex: number | null
  cancelled: boolean
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
  async emitPollEnd(
    pollInstanceId: string,
    aggregated: PollAggregatedVotes,
    cancelled: boolean = false
  ): Promise<void> {
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
    const votesByOption = this.makeSerializable(aggregated.votesByOption)
    const percentages = this.makeSerializable(aggregated.percentages)

    logger.info({
      event: 'websocket_poll_end_data_prepared',
      pollInstanceId,
      votesByOption,
      percentages,
      totalVotes: aggregated.totalVotes,
      winnerIndex,
    })

    const data: PollEndEvent = {
      pollInstanceId: pollInstanceId,
      votesByOption: votesByOption,
      totalVotes: aggregated.totalVotes,
      percentages: percentages,
      winnerIndex: winnerIndex,
      cancelled: cancelled,
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
          votesByOption: votesByOption,
          totalVotes: data.totalVotes,
          percentages: percentages,
          winnerIndex: data.winnerIndex,
          cancelled: data.cancelled,
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

  // ========================================
  // GAMIFICATION - Streamer overlay broadcasts
  // ========================================

  /**
   * Résout les streamers actifs d'une campagne et broadcast un message vers leurs canaux overlay
   */
  private async broadcastToStreamerOverlays(
    campaignId: string,
    eventName: string,
    payload: object
  ): Promise<void> {
    try {
      const memberships = await CampaignMembership.query()
        .where('campaignId', campaignId)
        .where('status', 'ACTIVE')

      for (const membership of memberships) {
        transmit.broadcast(`streamer:${membership.streamerId}:polls`, {
          event: eventName,
          data: payload,
        } as any)
      }

      logger.debug(
        `WebSocket: ${eventName} emitted to ${memberships.length} streamers for campaign ${campaignId}`
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`WebSocket: failed to emit ${eventName} to streamers: ${errorMessage}`)
    }
  }

  /**
   * Émet le démarrage d'une instance de gamification vers les overlays streamer
   */
  async emitGamificationStart(data: GamificationStartEvent): Promise<void> {
    await this.broadcastToStreamerOverlays(data.campaignId, 'gamification:start', data)
  }

  /**
   * Émet la progression d'une instance de gamification vers les overlays streamer
   */
  async emitGamificationProgress(data: GamificationProgressData): Promise<void> {
    await this.broadcastToStreamerOverlays(data.campaignId, 'gamification:progress', data)
  }

  /**
   * Émet le passage en état "armed" d'une instance vers les overlays streamer
   */
  async emitGamificationArmed(data: GamificationArmedData): Promise<void> {
    await this.broadcastToStreamerOverlays(data.campaignId, 'gamification:armed', data)
  }

  /**
   * Émet la complétion d'une instance de gamification vers les overlays streamer
   */
  async emitGamificationComplete(data: GamificationCompleteData): Promise<void> {
    await this.broadcastToStreamerOverlays(data.campaignId, 'gamification:complete', data)
  }

  /**
   * Émet l'expiration d'une instance de gamification vers les overlays streamer
   */
  async emitGamificationExpired(data: GamificationExpiredData): Promise<void> {
    await this.broadcastToStreamerOverlays(data.campaignId, 'gamification:expired', data)
  }

  /**
   * Émet l'exécution d'une action de gamification vers les overlays streamer
   */
  async emitGamificationActionExecuted(data: GamificationActionExecutedData): Promise<void> {
    await this.broadcastToStreamerOverlays(data.campaignId, 'gamification:action_executed', data)
  }
}

export { WebSocketService as webSocketService }
