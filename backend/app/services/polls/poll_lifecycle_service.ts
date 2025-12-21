import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import PollInstance from '#models/poll_instance'
import { PollInstanceRepository } from '#repositories/poll_instance_repository'
import { PollCreationService } from './poll_creation_service.js'
import { PollPollingService } from './poll_polling_service.js'
import { PollAggregationService } from './poll_aggregation_service.js'
import WebSocketService from '../websocket/websocket_service.js'

/**
 * Service pour gérer le cycle de vie des polls (start, cancel, end)
 */
@inject()
export class PollLifecycleService {
  constructor(
    private pollInstanceRepository: PollInstanceRepository,
    private pollCreationService: PollCreationService,
    private pollPollingService: PollPollingService,
    private pollAggregationService: PollAggregationService,
    private webSocketService: WebSocketService
  ) {
    // Configurer les callbacks pour éviter la dépendance circulaire
    this.pollPollingService.setAggregationService(this.pollAggregationService)
    this.pollPollingService.setOnPollEndCallback((pollInstance) => this.endPoll(pollInstance))
  }

  /**
   * Lance un poll instance
   */
  async launchPoll(pollInstanceId: string): Promise<void> {
    const pollInstance = await this.pollInstanceRepository.findById(pollInstanceId)

    if (!pollInstance) {
      throw new Error('Poll instance not found')
    }

    if (pollInstance.status !== 'PENDING') {
      throw new Error(`Poll cannot be launched from status ${pollInstance.status}`)
    }

    logger.info({ pollInstanceId }, 'Launching poll instance')

    // Créer les polls Twitch pour tous les streamers
    await this.pollCreationService.createPollsOnTwitch(pollInstance)

    // Mettre à jour le statut du poll
    await this.pollInstanceRepository.setStarted(pollInstanceId)

    // Recharger pour avoir startedAt
    const updatedInstance = await this.pollInstanceRepository.findById(pollInstanceId)
    if (!updatedInstance) {
      throw new Error('Poll instance not found after update')
    }

    // Démarrer le polling
    await this.pollPollingService.startPolling(updatedInstance)

    logger.info({ pollInstanceId }, 'Poll instance launched successfully')
  }

  /**
   * Annule un poll instance en cours
   */
  async cancelPoll(pollInstanceId: string): Promise<void> {
    const pollInstance = await this.pollInstanceRepository.findById(pollInstanceId)

    if (!pollInstance) {
      throw new Error('Poll instance not found')
    }

    if (pollInstance.status !== 'RUNNING') {
      throw new Error(`Poll cannot be cancelled from status ${pollInstance.status}`)
    }

    logger.info({ pollInstanceId }, 'Cancelling poll instance')

    // Arrêter le polling
    this.pollPollingService.stopPolling(pollInstanceId)

    // Terminer les polls Twitch sur tous les streamers
    await this.pollCreationService.terminatePollsOnTwitch(pollInstance)

    // Mettre à jour le statut
    await this.pollInstanceRepository.setCancelled(pollInstanceId)

    // Récupérer les résultats finaux
    const aggregated = await this.pollAggregationService.getAggregatedVotes(pollInstanceId)

    // Émettre l'événement WebSocket de fin
    this.webSocketService.emitPollEnd(pollInstanceId, aggregated)

    logger.info({ pollInstanceId, totalVotes: aggregated.totalVotes }, 'Poll instance cancelled')
  }

  /**
   * Termine un poll instance (appelé automatiquement par le polling)
   */
  async endPoll(pollInstance: PollInstance): Promise<void> {
    const pollInstanceId = pollInstance.id

    logger.info({ pollInstanceId }, 'Ending poll instance')

    // Arrêter le polling
    this.pollPollingService.stopPolling(pollInstanceId)

    // Mettre à jour le statut
    await this.pollInstanceRepository.setEnded(pollInstanceId)

    // Récupérer les résultats finaux
    const aggregated = await this.pollAggregationService.getAggregatedVotes(pollInstanceId)

    // Émettre l'événement WebSocket de fin
    this.webSocketService.emitPollEnd(pollInstanceId, aggregated)

    logger.info({ pollInstanceId, totalVotes: aggregated.totalVotes }, 'Poll instance ended')
  }

  /**
   * Nettoie les channel links d'un streamer pour une campagne
   */
  async removeStreamerFromCampaign(streamerId: string, campaignId: string): Promise<void> {
    await this.pollCreationService.removeStreamerFromCampaignPolls(streamerId, campaignId)
  }
}

export default PollLifecycleService
