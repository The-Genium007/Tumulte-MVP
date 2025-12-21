import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import PollInstance from '#models/poll_instance'
import { PollChannelLinkRepository } from '#repositories/poll_channel_link_repository'
import TwitchPollService from '../twitch/twitch_poll_service.js'
import WebSocketService from '../websocket/websocket_service.js'

// Forward declaration to avoid circular dependency
type PollAggregationService = {
  aggregateAndEmit(pollInstanceId: string): Promise<any>
}

/**
 * Service pour gérer le polling (récupération périodique des votes)
 */
@inject()
export class PollPollingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()
  private aggregationService?: PollAggregationService
  private onPollEndCallback?: (pollInstance: PollInstance) => Promise<void>

  constructor(
    private pollChannelLinkRepository: PollChannelLinkRepository,
    private twitchPollService: TwitchPollService,
    private webSocketService: WebSocketService
  ) {}

  /**
   * Configure le service d'agrégation (évite la dépendance circulaire)
   */
  setAggregationService(service: PollAggregationService): void {
    this.aggregationService = service
  }

  /**
   * Configure le callback pour la fin du poll (évite la dépendance circulaire)
   */
  setOnPollEndCallback(callback: (pollInstance: PollInstance) => Promise<void>): void {
    this.onPollEndCallback = callback
  }

  /**
   * Démarre le polling pour un poll instance
   */
  async startPolling(pollInstance: PollInstance): Promise<void> {
    const pollId = pollInstance.id

    // Si un polling est déjà en cours, on l'arrête d'abord
    if (this.pollingIntervals.has(pollId)) {
      this.stopPolling(pollId)
    }

    logger.info(`Starting polling for poll instance ${pollId}`)

    // Calculer la date de fin
    const endsAt = pollInstance.startedAt!.plus({ seconds: pollInstance.durationSeconds })

    // Émettre l'événement de démarrage du poll
    this.webSocketService.emitPollStart({
      poll_instance_id: pollId,
      title: pollInstance.title,
      options: pollInstance.options,
      duration_seconds: pollInstance.durationSeconds,
      started_at: pollInstance.startedAt!.toISO()!,
      ends_at: endsAt.toISO()!,
    })

    // Fonction de polling
    const poll = async () => {
      try {
        // Vérifier si le poll est terminé
        if (DateTime.now() >= endsAt) {
          logger.info(`Poll instance ${pollId} has ended`)
          this.stopPolling(pollId)

          // Appeler le callback de fin si configuré
          if (this.onPollEndCallback) {
            await this.onPollEndCallback(pollInstance)
          }
          return
        }

        // Récupérer tous les channel links pour ce poll
        const channelLinks = await this.pollChannelLinkRepository.findByPollInstance(pollId)

        // Mettre à jour chaque channel link
        for (const link of channelLinks) {
          try {
            const accessToken = await link.streamer.getDecryptedAccessToken()

            const pollData = await this.twitchPollService.withTokenRefresh(
              (token) =>
                this.twitchPollService.getPoll(
                  link.streamer.twitchUserId,
                  link.twitchPollId,
                  token
                ),
              async () => accessToken,
              await link.streamer.getDecryptedRefreshToken(),
              async (newAccessToken, newRefreshToken) => {
                await link.streamer.updateTokens(newAccessToken, newRefreshToken)
              }
            )

            // Convertir les votes en map par index d'option
            const votesByOption: Record<string, number> = {}
            pollData.choices.forEach((choice, index) => {
              votesByOption[index.toString()] = choice.votes
            })

            // Calculer le total des votes
            const totalVotes = Object.values(votesByOption).reduce((sum, votes) => sum + votes, 0)

            // Mettre à jour le link
            await this.pollChannelLinkRepository.updateVotes(link.id, votesByOption, totalVotes)

            // Mettre à jour le statut
            const newStatus = this.mapTwitchStatusToLinkStatus(pollData.status)
            if (newStatus !== link.status) {
              await this.pollChannelLinkRepository.updateStatus(link.id, newStatus)
            }
          } catch (error) {
            logger.error(
              `Failed to update poll for streamer ${link.streamer.twitchDisplayName}: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }

        // Agréger les résultats et émettre via WebSocket
        if (this.aggregationService) {
          await this.aggregationService.aggregateAndEmit(pollId)
        }

        logger.debug(`Poll instance ${pollId} updated`)
      } catch (error) {
        logger.error(
          `Error during polling for poll instance ${pollId}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    // Lancer le premier poll immédiatement
    await poll()

    // Puis toutes les 3 secondes
    const interval = setInterval(poll, 3000)
    this.pollingIntervals.set(pollId, interval)
  }

  /**
   * Arrête le polling pour un poll instance
   */
  stopPolling(pollInstanceId: string): void {
    const interval = this.pollingIntervals.get(pollInstanceId)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(pollInstanceId)
      logger.info(`Polling stopped for poll instance ${pollInstanceId}`)
    }
  }

  /**
   * Mappe le statut Twitch au statut de link
   */
  private mapTwitchStatusToLinkStatus(
    twitchStatus: string
  ): 'CREATED' | 'RUNNING' | 'COMPLETED' | 'TERMINATED' {
    switch (twitchStatus) {
      case 'ACTIVE':
        return 'RUNNING'
      case 'COMPLETED':
      case 'ARCHIVED':
        return 'COMPLETED'
      case 'TERMINATED':
      case 'MODERATED':
      case 'INVALID':
        return 'TERMINATED'
      default:
        return 'CREATED'
    }
  }
}

export default PollPollingService
