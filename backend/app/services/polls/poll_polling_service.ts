import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { PollChannelLinkRepository } from '#repositories/poll_channel_link_repository'
import { twitchPollService as TwitchPollService } from '../twitch/twitch_poll_service.js'
import { webSocketService as WebSocketService } from '../websocket/websocket_service.js'

// Forward declaration to avoid circular dependency
type PollAggregationService = {
  aggregateAndEmit(pollInstanceId: string): Promise<any>
}

/**
 * Service pour gérer le polling (récupération périodique des votes)
 *
 * NOTE: Pas de @inject() car c'est un singleton avec injection manuelle dans container.ts
 */
export class PollPollingService {
  private static instanceCount = 0
  private instanceId: string
  // Changed from setInterval to setTimeout for queue-based polling
  private pollingTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private pollingActive: Set<string> = new Set() // Flag actif/inactif pour chaque poll
  private cyclesInProgress: Set<string> = new Set() // Prévient le chevauchement de cycles
  private sentMessages: Map<string, Set<string>> = new Map() // pollInstanceId -> Set de messages envoyés
  private aggregationService?: PollAggregationService
  private onPollEndCallback?: (pollInstance: PollInstance) => Promise<void>
  private twitchChatService: any // Sera initialisé de manière lazy
  // Polling cycle interval
  private static readonly pollingIntervalMs = 3000

  constructor(
    private pollChannelLinkRepository: PollChannelLinkRepository,
    private twitchPollService: TwitchPollService,
    private webSocketService: WebSocketService
  ) {
    PollPollingService.instanceCount++
    this.instanceId = `PPS-${PollPollingService.instanceCount}-${Date.now()}`
    logger.info({
      event: 'poll_polling_service_constructor',
      instanceId: this.instanceId,
      totalInstances: PollPollingService.instanceCount,
    })
  }

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
   * Initialise le TwitchChatService de manière lazy
   */
  private async getTwitchChatService(): Promise<any> {
    if (!this.twitchChatService) {
      const { twitchChatService: twitchChatServiceClass } =
        await import('../twitch/twitch_chat_service.js')
      const { redisService: redisServiceClass } = await import('../cache/redis_service.js')
      const redisServiceInstance = await app.container.make(redisServiceClass)
      this.twitchChatService = new twitchChatServiceClass(redisServiceInstance)
    }
    return this.twitchChatService
  }

  /**
   * Démarre le polling pour un poll instance
   */
  async startPolling(pollInstance: PollInstance): Promise<void> {
    const pollId = pollInstance.id

    // Si un polling est déjà en cours, on l'arrête d'abord
    if (this.pollingTimeouts.has(pollId) || this.pollingActive.has(pollId)) {
      logger.warn({
        event: 'polling_already_running',
        pollInstanceId: pollId,
        instanceId: this.instanceId,
        message: 'Stopping existing polling before starting new one',
      })
      this.stopPolling(pollId)
    }

    // NOUVEAU : Marquer le polling comme actif
    this.pollingActive.add(pollId)

    // Calculer la date de fin
    const endsAt = pollInstance.startedAt!.plus({ seconds: pollInstance.durationSeconds })
    const timeRemaining = endsAt.diff(DateTime.now(), 'seconds').seconds

    logger.info({
      event: 'polling_started',
      pollInstanceId: pollId,
      instanceId: this.instanceId,
      campaignId: pollInstance.campaignId,
      durationSeconds: pollInstance.durationSeconds,
      startedAt: pollInstance.startedAt!.toISO(),
      endsAt: endsAt.toISO(),
      timeRemainingSeconds: Math.round(timeRemaining),
    })

    // Émettre l'événement de démarrage du poll IMMÉDIATEMENT (supprimé le délai 500ms)
    // Le frontend s'abonne au WebSocket avant de lancer le poll, donc pas besoin d'attendre
    this.webSocketService.emitPollStart({
      pollInstanceId: pollId,
      title: pollInstance.title,
      options: pollInstance.options,
      durationSeconds: pollInstance.durationSeconds,
      started_at: pollInstance.startedAt!.toISO()!,
      endsAt: endsAt.toISO()!,
    })

    logger.info({
      event: 'websocket_poll_start_emitted',
      pollInstanceId: pollId,
    })

    // Compteurs de polling
    let pollingCycleCount = 0

    // Fonction de polling (queue-based: exécute un cycle puis schedule le suivant)
    const runPollingCycle = async () => {
      logger.info({
        event: 'polling_cycle_start',
        pollInstanceId: pollId,
        instanceId: this.instanceId,
        checks: {
          isActive: this.pollingActive.has(pollId),
          hasTimeout: this.pollingTimeouts.has(pollId),
          hasCycleInProgress: this.cyclesInProgress.has(pollId),
        },
      })

      // ====== NIVEAU 1 : Vérification active flag (PREMIÈRE LIGNE) ======
      if (!this.pollingActive.has(pollId)) {
        logger.debug({
          event: 'polling_cycle_skipped_inactive',
          pollInstanceId: pollId,
          instanceId: this.instanceId,
          reason: 'Polling marked as inactive',
        })
        return
      }

      // ====== NIVEAU 2 : Prévenir chevauchement de cycles (ne devrait jamais arriver avec queue-based) ======
      if (this.cyclesInProgress.has(pollId)) {
        logger.warn({
          event: 'polling_cycle_overlapped',
          pollInstanceId: pollId,
          reason: 'Previous cycle still running (should not happen with queue-based polling)',
        })
        return
      }

      this.cyclesInProgress.add(pollId)

      const cycleStartTime = Date.now()
      pollingCycleCount++

      try {
        // ====== NIVEAU 4 : Re-vérifier active avant chaque section async ======
        if (!this.pollingActive.has(pollId)) {
          logger.debug({
            event: 'polling_stopped_during_cycle',
            pollInstanceId: pollId,
            cycle: pollingCycleCount,
          })
          return
        }

        const now = DateTime.now()
        const remainingSeconds = Math.round(endsAt.diff(now, 'seconds').seconds)

        // Récupérer tous les channel links pour ce poll (nécessaire pour les messages)
        const channelLinks = await this.pollChannelLinkRepository.findByPollInstance(pollId)

        // ====== NIVEAU 5 : Re-vérifier active après chaque await majeur ======
        if (!this.pollingActive.has(pollId)) {
          logger.debug({
            event: 'polling_stopped_after_channel_fetch',
            pollInstanceId: pollId,
            cycle: pollingCycleCount,
          })
          return
        }

        // Vérifier si le poll est terminé
        if (now >= endsAt) {
          // IMPORTANT: Envoyer les messages finaux AVANT de terminer le poll
          await this.sendAutomaticChatMessages(
            pollId,
            remainingSeconds,
            pollInstance.durationSeconds,
            channelLinks
          )

          logger.info({
            event: 'poll_time_expired',
            pollInstanceId: pollId,
            totalCycles: pollingCycleCount,
            scheduledEnd: endsAt.toISO(),
            actualEnd: now.toISO(),
          })
          this.stopPolling(pollId)

          // Appeler le callback de fin si configuré
          if (this.onPollEndCallback) {
            await this.onPollEndCallback(pollInstance)
          }
          return
        }

        const apiPolls = channelLinks.filter((l) => l.twitchPollId !== null)
        const chatPolls = channelLinks.filter((l) => l.twitchPollId === null)

        let successfulPolls = 0
        let failedPolls = 0
        let totalVotesAllStreamers = 0

        // Mettre à jour chaque channel link
        for (const link of channelLinks) {
          // ====== NIVEAU 6 : Vérifier active dans les boucles ======
          if (!this.pollingActive.has(pollId)) {
            logger.debug({
              event: 'polling_stopped_during_link_processing',
              pollInstanceId: pollId,
              cycle: pollingCycleCount,
            })
            return
          }

          try {
            const pollFetchStart = Date.now()

            // Distinction entre polls API (avec twitchPollId) et polls IRC (sans twitchPollId)
            if (link.twitchPollId) {
              // ========== POLL API TWITCH ==========
              const accessToken = await link.streamer.getDecryptedAccessToken()

              const pollData = await this.twitchPollService.withTokenRefresh(
                (token) =>
                  this.twitchPollService.getPoll(
                    link.streamer.twitchUserId,
                    link.twitchPollId!,
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
              totalVotesAllStreamers += totalVotes

              // Mettre à jour le link
              await this.pollChannelLinkRepository.updateVotes(link.id, votesByOption, totalVotes)

              // Mettre à jour le statut
              const newStatus = this.mapTwitchStatusToLinkStatus(pollData.status)
              const statusChanged = newStatus !== link.status
              if (statusChanged) {
                await this.pollChannelLinkRepository.updateStatus(link.id, newStatus)
                logger.info({
                  event: 'poll_status_changed',
                  pollInstanceId: pollId,
                  streamer_id: link.streamerId,
                  twitchPollId: link.twitchPollId,
                  oldStatus: link.status,
                  newStatus,
                })
              }

              successfulPolls++

              const pollFetchDuration = Date.now() - pollFetchStart
              logger.debug({
                event: 'poll_fetch_success',
                pollInstanceId: pollId,
                streamer_id: link.streamerId,
                twitchPollId: link.twitchPollId,
                totalVotes,
                twitchStatus: pollData.status,
                durationMs: pollFetchDuration,
              })
            } else {
              // ========== POLL IRC (CHAT) ==========
              // Récupérer les votes depuis Redis
              const { redisService: redisServiceClass } = await import('../cache/redis_service.js')
              const redisService = await app.container.make(redisServiceClass)

              const chatVotes = await redisService.getChatVotes(pollId, link.streamerId)

              // Convertir en format attendu (index en string)
              const votesByOption: Record<string, number> = {}
              for (const [optionIndex, votes] of Object.entries(chatVotes)) {
                votesByOption[optionIndex] = votes
              }

              // Calculer le total des votes
              const totalVotes = Object.values(votesByOption).reduce((sum, votes) => sum + votes, 0)
              totalVotesAllStreamers += totalVotes

              // Synchroniser vers la base de données
              await this.pollChannelLinkRepository.updateVotes(link.id, votesByOption, totalVotes)

              successfulPolls++

              const pollFetchDuration = Date.now() - pollFetchStart
              logger.debug({
                event: 'chat_poll_sync_success',
                pollInstanceId: pollId,
                streamer_id: link.streamerId,
                streamerDisplayName: link.streamer.twitchDisplayName,
                totalVotes,
                votesByOption,
                durationMs: pollFetchDuration,
              })
            }
          } catch (error) {
            failedPolls++
            logger.error({
              event: link.twitchPollId ? 'poll_fetch_failed' : 'chat_poll_sync_failed',
              pollInstanceId: pollId,
              streamer_id: link.streamerId,
              streamerDisplayName: link.streamer.twitchDisplayName,
              twitchPollId: link.twitchPollId || 'chat-mode',
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }

        // ====== NIVEAU 7 : Vérifier active avant les opérations finales ======
        if (!this.pollingActive.has(pollId)) {
          logger.debug({
            event: 'polling_stopped_before_messages',
            pollInstanceId: pollId,
            cycle: pollingCycleCount,
          })
          return
        }

        // Envoyer les messages automatiques dans le chat
        await this.sendAutomaticChatMessages(
          pollId,
          remainingSeconds,
          pollInstance.durationSeconds,
          channelLinks
        )

        // Agréger les résultats et émettre via WebSocket
        if (this.aggregationService) {
          await this.aggregationService.aggregateAndEmit(pollId)
        }

        const cycleDuration = Date.now() - cycleStartTime

        logger.info({
          event: 'polling_cycle_completed',
          pollInstanceId: pollId,
          cycle: pollingCycleCount,
          timeRemainingSeconds: remainingSeconds,
          totalStreamers: channelLinks.length,
          apiPolls: apiPolls.length,
          chatPolls: chatPolls.length,
          successfulPolls,
          failedPolls,
          totalVotes: totalVotesAllStreamers,
          cycleDurationMs: cycleDuration,
        })
      } catch (error) {
        logger.error({
          event: 'polling_cycle_error',
          pollInstanceId: pollId,
          cycle: pollingCycleCount,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      } finally {
        // ====== CRITIQUE : Toujours nettoyer le flag de cycle en cours ======
        this.cyclesInProgress.delete(pollId)

        // ====== QUEUE-BASED : Schedule le prochain cycle APRÈS que le courant soit terminé ======
        // Cela évite l'accumulation de cycles si l'API Twitch est lente
        if (this.pollingActive.has(pollId)) {
          const nextTimeout = setTimeout(() => {
            runPollingCycle().catch((error) => {
              logger.error({
                event: 'polling_cycle_error_unhandled',
                pollInstanceId: pollId,
                error: error instanceof Error ? error.message : String(error),
              })
            })
          }, PollPollingService.pollingIntervalMs)
          this.pollingTimeouts.set(pollId, nextTimeout)
        }
      }
    }

    // Lancer le premier cycle immédiatement (sans await pour ne pas bloquer)
    runPollingCycle().catch((error) => {
      logger.error({
        event: 'initial_poll_error',
        pollInstanceId: pollId,
        error: error instanceof Error ? error.message : String(error),
      })
    })

    logger.info({
      event: 'polling_queue_started',
      pollInstanceId: pollId,
      intervalMs: PollPollingService.pollingIntervalMs,
      expectedCycles: Math.ceil(
        pollInstance.durationSeconds / (PollPollingService.pollingIntervalMs / 1000)
      ),
    })
  }

  /**
   * Envoie des messages automatiques dans le chat en fonction du temps restant
   * Note: Les affiliés/partners ont déjà le countdown natif Twitch, donc on ne leur envoie pas
   */
  private async sendAutomaticChatMessages(
    pollInstanceId: string,
    remainingSeconds: number,
    durationSeconds: number,
    channelLinks: any[]
  ): Promise<void> {
    const messageKey = (seconds: number) => `${pollInstanceId}:${seconds}`

    // Initialiser le set pour ce poll si nécessaire
    if (!this.sentMessages.has(pollInstanceId)) {
      this.sentMessages.set(pollInstanceId, new Set())
    }

    const sentSet = this.sentMessages.get(pollInstanceId)!

    // Filtrer : ne pas envoyer le countdown aux affiliés/partners (ils ont le timer natif Twitch)
    // On garde seulement les streamers en mode chat (non-affiliés) pour les messages de countdown
    const nonAffiliateLinks = channelLinks.filter((link) => {
      const broadcasterType = (link.streamer?.broadcasterType || '').toLowerCase()
      return broadcasterType !== 'affiliate' && broadcasterType !== 'partner'
    })

    // Messages de countdown uniquement pour les non-affiliés (ils n'ont pas le timer natif Twitch)
    if (nonAffiliateLinks.length > 0) {
      // Message à la moitié du temps
      const halfwaySeconds = Math.floor(durationSeconds / 2)
      if (
        remainingSeconds <= halfwaySeconds &&
        remainingSeconds > halfwaySeconds - 3 &&
        !sentSet.has(messageKey(halfwaySeconds))
      ) {
        sentSet.add(messageKey(halfwaySeconds))
        await this.broadcastMessage(
          nonAffiliateLinks,
          `⏱️ Il reste ${remainingSeconds} secondes pour voter !`
        )
      }

      // Message à 10 secondes
      if (remainingSeconds <= 10 && remainingSeconds > 7 && !sentSet.has(messageKey(10))) {
        sentSet.add(messageKey(10))
        await this.broadcastMessage(nonAffiliateLinks, `⏱️ Plus que 10 secondes pour voter !`)
      }

      // Message à 5 secondes - condition élargie pour tenir compte du cycle de 3s
      if (remainingSeconds <= 6 && remainingSeconds > 3 && !sentSet.has(messageKey(5))) {
        sentSet.add(messageKey(5))
        await this.broadcastMessage(nonAffiliateLinks, `⏱️ 5 secondes restantes !`)
      }

      // Message à 4 secondes - condition élargie
      if (remainingSeconds <= 5 && remainingSeconds > 2 && !sentSet.has(messageKey(4))) {
        sentSet.add(messageKey(4))
        await this.broadcastMessage(nonAffiliateLinks, `⏱️ 4...`)
      }

      // Message à 3 secondes
      if (remainingSeconds <= 4 && remainingSeconds > 1 && !sentSet.has(messageKey(3))) {
        sentSet.add(messageKey(3))
        await this.broadcastMessage(nonAffiliateLinks, `⏱️ 3...`)
      }

      // Message à 2 secondes - condition élargie
      if (remainingSeconds <= 3 && remainingSeconds > 0 && !sentSet.has(messageKey(2))) {
        sentSet.add(messageKey(2))
        await this.broadcastMessage(nonAffiliateLinks, `⏱️ 2...`)
      }

      // Message à 1 seconde - condition élargie pour accepter aussi les valeurs négatives
      if (remainingSeconds <= 2 && remainingSeconds >= -1 && !sentSet.has(messageKey(1))) {
        sentSet.add(messageKey(1))
        await this.broadcastMessage(nonAffiliateLinks, `⏱️ 1...`)
      }

      // Message de clôture pour les non-affiliés
      if (remainingSeconds <= 0 && !sentSet.has(messageKey(0))) {
        sentSet.add(messageKey(0))
        await this.broadcastMessage(
          nonAffiliateLinks,
          `🔒 Les votes sont clôturés ! Merci d'avoir voté !`
        )
      }
    }
  }

  /**
   * Diffuse un message sur tous les streamers d'un poll
   */
  private async broadcastMessage(channelLinks: any[], message: string): Promise<void> {
    const chatService = await this.getTwitchChatService()

    for (const link of channelLinks) {
      try {
        await chatService.sendMessage(link.streamerId, message)
        logger.debug({
          event: 'automatic_chat_message_sent',
          streamer_id: link.streamerId,
          message,
        })
      } catch (error) {
        logger.warn({
          event: 'automatic_chat_message_failed',
          streamer_id: link.streamerId,
          message,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  /**
   * Arrête le polling pour un poll instance
   */
  stopPolling(pollInstanceId: string): void {
    logger.info({
      event: 'stop_polling_called',
      pollInstanceId,
      instanceId: this.instanceId,
      beforeState: {
        hadTimeout: this.pollingTimeouts.has(pollInstanceId),
        wasActive: this.pollingActive.has(pollInstanceId),
        hadCycleInProgress: this.cyclesInProgress.has(pollInstanceId),
        allActivePolls: Array.from(this.pollingActive),
        allTimeouts: Array.from(this.pollingTimeouts.keys()),
      },
    })

    // 1. Marquer comme inactif IMMÉDIATEMENT (avant tout autre nettoyage)
    this.pollingActive.delete(pollInstanceId)

    // 2. Arrêter le timeout en attente (queue-based)
    const timeout = this.pollingTimeouts.get(pollInstanceId)
    if (timeout) {
      clearTimeout(timeout)
      this.pollingTimeouts.delete(pollInstanceId)
    }

    // 3. Nettoyer les cycles en cours
    this.cyclesInProgress.delete(pollInstanceId)

    // 4. Nettoyer les messages envoyés
    this.sentMessages.delete(pollInstanceId)

    logger.info({
      event: 'polling_stopped',
      pollInstanceId,
      instanceId: this.instanceId,
      hadTimeout: !!timeout,
      afterState: {
        hasTimeout: this.pollingTimeouts.has(pollInstanceId),
        isActive: this.pollingActive.has(pollInstanceId),
        hasCycleInProgress: this.cyclesInProgress.has(pollInstanceId),
      },
    })
  }

  /**
   * Envoie un message d'annulation dans tous les chats
   */
  async sendCancellationMessage(pollInstanceId: string): Promise<void> {
    try {
      const channelLinks = await this.pollChannelLinkRepository.findByPollInstance(pollInstanceId)
      await this.broadcastMessage(channelLinks, `❌ Le sondage a été annulé par le MJ.`)

      logger.info({
        event: 'cancellation_message_sent',
        pollInstanceId,
        channelLinksCount: channelLinks.length,
      })
    } catch (error) {
      logger.error({
        event: 'cancellation_message_failed',
        pollInstanceId,
        error: error instanceof Error ? error.message : String(error),
      })
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
