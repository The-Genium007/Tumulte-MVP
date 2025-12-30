import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { PollChannelLinkRepository } from '#repositories/poll_channel_link_repository'
import type { PollAggregatedVotes } from './poll_aggregation_service.js'

interface RankedOption {
  optionIndex: number
  optionText: string
  percentage: number
  votes: number
  rank: number
}

interface RankGroup {
  rank: number
  percentage: number
  options: RankedOption[]
}

/**
 * Service pour annoncer les résultats d'un poll dans le chat Twitch
 */
@inject()
export class PollResultsAnnouncementService {
  constructor(private pollChannelLinkRepository: PollChannelLinkRepository) {}

  /**
   * Annonce les résultats d'un poll dans tous les chats participants
   */
  async announceResults(
    pollInstance: PollInstance,
    aggregated: PollAggregatedVotes,
    isCancelled: boolean
  ): Promise<void> {
    // 1. Récupérer les participants
    const channelLinks = await this.pollChannelLinkRepository.findByPollInstance(pollInstance.id)

    if (channelLinks.length === 0) {
      logger.warn({ pollInstanceId: pollInstance.id }, 'No participants for results announcement')
      return
    }

    const streamerIds = channelLinks.map((link) => link.streamerId)

    // 2. Construire le message
    const message = this.buildResultsMessage(pollInstance, aggregated, isCancelled)

    // 3. Envoyer à tous les participants
    await this.broadcastResults(streamerIds, message, pollInstance.id)

    logger.info({
      event: 'poll_results_announced',
      pollInstanceId: pollInstance.id,
      participantsCount: streamerIds.length,
      isCancelled,
    })
  }

  /**
   * Construit le message de résultats formaté
   */
  private buildResultsMessage(
    pollInstance: PollInstance,
    aggregated: PollAggregatedVotes,
    isCancelled: boolean
  ): string {
    const lines: string[] = []

    // En-tête
    const statusText = isCancelled ? ' (Annulé)' : ''
    lines.push(`📊 RÉSULTATS DU SONDAGE${statusText}: ${pollInstance.title}`)
    lines.push('')

    // Classement
    const groups = this.groupOptionsByRank(pollInstance, aggregated)

    for (const group of groups) {
      const icon = this.getRankIcon(group.rank)

      if (group.options.length === 1) {
        // Une seule option à ce rang
        const opt = group.options[0]
        lines.push(`${icon} ${opt.optionText}: ${opt.percentage}% (${opt.votes} votes)`)
      } else {
        // Ex-aequo
        const optionNames = group.options.map((o) => o.optionText).join(' & ')
        const votes = group.options[0].votes
        lines.push(`${icon} ${optionNames} (égalité): ${group.percentage}% (${votes} votes chacun)`)
      }
    }

    // Pied
    lines.push('')
    lines.push(`Total: ${aggregated.totalVotes} votes`)

    return lines.join('\n')
  }

  /**
   * Groupe les options par rang en détectant les ex-aequo
   */
  private groupOptionsByRank(
    pollInstance: PollInstance,
    aggregated: PollAggregatedVotes
  ): RankGroup[] {
    // Créer les options classées
    const rankedOptions: RankedOption[] = pollInstance.options.map((text, index) => ({
      optionIndex: index,
      optionText: text,
      percentage: aggregated.percentages[index.toString()] || 0,
      votes: aggregated.votesByOption[index.toString()] || 0,
      rank: 0,
    }))

    // Trier par pourcentage décroissant
    rankedOptions.sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage
      }
      return a.optionIndex - b.optionIndex
    })

    // Grouper par pourcentage
    const groups: RankGroup[] = []
    let currentRank = 1
    let currentPercentage: number | null = null
    let currentGroup: RankedOption[] = []

    for (const option of rankedOptions) {
      if (currentPercentage === null || option.percentage === currentPercentage) {
        // Même pourcentage
        currentPercentage = option.percentage
        option.rank = currentRank
        currentGroup.push(option)
      } else {
        // Nouveau pourcentage
        groups.push({
          rank: currentRank,
          percentage: currentPercentage,
          options: currentGroup,
        })

        // Calculer le nouveau rang (= nombre total d'options déjà classées + 1)
        currentRank = groups.reduce((sum, g) => sum + g.options.length, 0) + 1
        currentPercentage = option.percentage
        option.rank = currentRank
        currentGroup = [option]
      }
    }

    // Ajouter le dernier groupe
    if (currentGroup.length > 0) {
      groups.push({
        rank: currentRank,
        percentage: currentPercentage!,
        options: currentGroup,
      })
    }

    return groups
  }

  /**
   * Retourne l'icône pour un rang donné
   */
  private getRankIcon(rank: number): string {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      case 4:
        return '4️⃣'
      case 5:
        return '5️⃣'
      default:
        return `${rank}️⃣`
    }
  }

  /**
   * Envoie le message à tous les streamers (3 fois chacun)
   */
  private async broadcastResults(
    streamerIds: string[],
    message: string,
    pollInstanceId: string
  ): Promise<void> {
    const startTime = Date.now()

    // Récupérer le service depuis le conteneur
    const chatService = await app.container.make('twitchChatService')

    const results = await Promise.allSettled(
      streamerIds.map(async (streamerId) => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await chatService.sendMessage(streamerId, message)

            logger.debug({
              event: 'poll_results_sent',
              pollInstanceId,
              streamerId,
              attempt,
            })

            // Délai avant le message suivant (sauf après le 3ème)
            if (attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, 2000))
            }
          } catch (error) {
            logger.error({
              event: 'poll_results_send_failed',
              pollInstanceId,
              streamerId,
              attempt,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      })
    )

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failureCount = results.filter((r) => r.status === 'rejected').length
    const duration = Date.now() - startTime

    logger.info({
      event: 'poll_results_broadcast_completed',
      pollInstanceId,
      streamersCount: streamerIds.length,
      successCount,
      failureCount,
      durationMs: duration,
    })
  }
}

export default PollResultsAnnouncementService
export { PollResultsAnnouncementService as pollResultsAnnouncementService }
