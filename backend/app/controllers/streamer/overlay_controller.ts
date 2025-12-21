import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { StreamerRepository } from '#repositories/streamer_repository'
import { PollInstanceRepository } from '#repositories/poll_instance_repository'
import { PollChannelLinkRepository } from '#repositories/poll_channel_link_repository'
import { PollAggregationService } from '#services/polls/poll_aggregation_service'

/**
 * Contrôleur pour l'overlay OBS (Streamer)
 * Routes publiques pour afficher les polls sur le stream
 */
@inject()
export default class OverlayController {
  constructor(
    private streamerRepository: StreamerRepository,
    private pollInstanceRepository: PollInstanceRepository,
    private pollChannelLinkRepository: PollChannelLinkRepository,
    private pollAggregationService: PollAggregationService
  ) {}

  /**
   * Récupère les informations du streamer pour l'overlay
   * GET /api/v2/overlay/streamer/:streamerId
   */
  async streamerInfo({ params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findById(params.streamerId)

    if (!streamer) {
      return response.notFound({ error: 'Streamer not found' })
    }

    return response.ok({
      data: {
        id: streamer.id,
        twitchDisplayName: streamer.twitchDisplayName,
        twitchUserId: streamer.twitchUserId,
        profileImageUrl: streamer.profileImageUrl,
        isActive: streamer.isActive,
      },
    })
  }

  /**
   * Récupère le poll actif pour un streamer (pour l'overlay)
   * GET /api/v2/overlay/streamer/:streamerId/active-poll
   */
  async activePoll({ params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findById(params.streamerId)

    if (!streamer) {
      return response.notFound({ error: 'Streamer not found' })
    }

    // Trouver les channel links actifs pour ce streamer
    const activeLinks = await this.pollChannelLinkRepository.findByPollInstance('')

    // Filtrer pour ce streamer et status RUNNING
    const streamerLinks = activeLinks.filter(
      (link) => link.streamerId === params.streamerId && link.status === 'RUNNING'
    )

    if (streamerLinks.length === 0) {
      return response.ok({ data: null })
    }

    // Prendre le premier poll actif
    const link = streamerLinks[0]
    const pollInstance = await this.pollInstanceRepository.findById(link.pollInstanceId)

    if (!pollInstance) {
      return response.ok({ data: null })
    }

    // Récupérer les résultats agrégés
    const aggregated = await this.pollAggregationService.getAggregatedVotes(pollInstance.id)

    return response.ok({
      data: {
        pollInstanceId: pollInstance.id,
        title: pollInstance.title,
        options: pollInstance.options,
        durationSeconds: pollInstance.durationSeconds,
        startedAt: pollInstance.startedAt?.toISO(),
        status: pollInstance.status,
        // Résultats locaux du streamer
        localVotes: link.votesByOption,
        localTotalVotes: link.totalVotes,
        // Résultats agrégés de tous les streamers
        aggregatedVotes: aggregated.votesByOption,
        aggregatedTotalVotes: aggregated.totalVotes,
        percentages: aggregated.percentages,
      },
    })
  }

  /**
   * Récupère les résultats d'un poll spécifique pour un streamer
   * GET /api/v2/overlay/streamer/:streamerId/poll/:pollInstanceId
   */
  async pollResults({ params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findById(params.streamerId)

    if (!streamer) {
      return response.notFound({ error: 'Streamer not found' })
    }

    const pollInstance = await this.pollInstanceRepository.findById(params.pollInstanceId)

    if (!pollInstance) {
      return response.notFound({ error: 'Poll not found' })
    }

    // Trouver le channel link pour ce streamer et ce poll
    const link = await this.pollChannelLinkRepository.findByPollAndStreamer(
      params.pollInstanceId,
      params.streamerId
    )

    if (!link) {
      return response.notFound({ error: 'Poll not found for this streamer' })
    }

    // Récupérer les résultats agrégés
    const aggregated = await this.pollAggregationService.getAggregatedVotesWithCache(
      pollInstance.id
    )

    return response.ok({
      data: {
        pollInstanceId: pollInstance.id,
        title: pollInstance.title,
        options: pollInstance.options,
        status: pollInstance.status,
        startedAt: pollInstance.startedAt?.toISO(),
        endedAt: pollInstance.endedAt?.toISO(),
        // Résultats locaux du streamer
        localVotes: link.votesByOption,
        localTotalVotes: link.totalVotes,
        // Résultats agrégés
        aggregatedVotes: aggregated.votesByOption,
        aggregatedTotalVotes: aggregated.totalVotes,
        percentages: aggregated.percentages,
      },
    })
  }
}
