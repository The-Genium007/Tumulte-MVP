import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { pollChannelLink as PollChannelLink } from '#models/poll_channel_link'
import { streamer as Streamer } from '#models/streamer'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { twitchPollService as TwitchPollService } from './twitch_poll_service.js'
import { webSocketService as WebSocketService } from './websocket_service.js'
import { twitchApiService as TwitchApiService } from './twitch_api_service.js'

export interface PollAggregatedVotes {
  pollInstanceId: string
  votesByOption: Record<string, number>
  totalVotes: number
  percentages: Record<string, number>
}

class PollService {
  private readonly twitchPollService: TwitchPollService
  private readonly webSocketService: WebSocketService
  private readonly twitchApiService: TwitchApiService
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.twitchPollService = new TwitchPollService()
    this.webSocketService = new WebSocketService()
    this.twitchApiService = new TwitchApiService()
  }

  /**
   * Crée des polls Twitch pour tous les streamers actifs d'une campagne
   */
  async createPollsOnTwitch(pollInstance: PollInstance): Promise<void> {
    let streamers: Streamer[]

    // Si le poll a une campagne, charger les membres ACTIFS de la campagne
    if (pollInstance.campaignId) {
      const memberships = await CampaignMembership.query()
        .where('campaign_id', pollInstance.campaignId)
        .where('status', 'ACTIVE')
        .preload('streamer')

      streamers = memberships.map((m) => m.streamer)
      logger.info(
        `Creating polls for ${streamers.length} streamers in campaign ${pollInstance.campaignId}`
      )
    } else {
      // Mode legacy : charger tous les streamers actifs
      streamers = await Streamer.query().where('is_active', true)
      logger.info(`Creating polls for ${streamers.length} streamers (legacy mode)`)
    }

    await this.refreshStreamersInfo(streamers)
    logger.info({
      message: 'Streamer compatibility snapshot before poll creation',
      pollInstanceId: pollInstance.id,
      compatibleCount: streamers.filter((s) => this.isStreamerCompatible(s)).length,
      incompatibleStreamers: streamers
        .filter((s) => !this.isStreamerCompatible(s))
        .map((s) => ({
          streamer_id: s.id,
          displayName: s.twitchDisplayName,

          broadcaster_type: s.broadcasterType || 'UNKNOWN',
        })),
    })

    // Créer un poll pour chaque streamer compatible
    for (const streamer of streamers) {
      if (!this.isStreamerCompatible(streamer)) {
        logger.warn(
          `Skipping poll creation for ${streamer.twitchDisplayName}: broadcasterType=${
            streamer.broadcasterType || 'unknown'
          }`
        )
        continue
      }

      try {
        const accessToken = await streamer.getDecryptedAccessToken()

        // Créer le poll via l'API Twitch
        const poll = await this.twitchPollService.withTokenRefresh(
          (token) =>
            this.twitchPollService.createPoll(
              streamer.twitchUserId,
              token,
              pollInstance.title,
              pollInstance.options,
              pollInstance.durationSeconds
            ),
          async () => accessToken,
          await streamer.getDecryptedRefreshToken(),
          async (newAccessToken, newRefreshToken) => {
            await streamer.updateTokens(newAccessToken, newRefreshToken)
          }
        )

        // Créer le lien en base
        await PollChannelLink.create({
          pollInstanceId: pollInstance.id,
          streamerId: streamer.id,
          twitchPollId: poll.id,
          status: 'CREATED',
          totalVotes: 0,
          votesByOption: {},
        })

        logger.info({
          message: 'Poll created for streamer',
          pollInstanceId: pollInstance.id,
          streamer_id: streamer.id,
          streamerDisplayName: streamer.twitchDisplayName,
          twitchPollId: poll.id,
        })
      } catch (error) {
        logger.error({
          message: 'Failed to create poll for streamer',
          pollInstanceId: pollInstance.id,
          streamer_id: streamer.id,
          streamerDisplayName: streamer.twitchDisplayName,
          error: error instanceof Error ? error.message : String(error),
        })

        // Désactiver le streamer si le token est invalide
        if (error instanceof Error && error.message.includes('UNAUTHORIZED')) {
          streamer.isActive = false
          await streamer.save()
          logger.warn({
            message: 'Streamer deactivated due to invalid token',
            streamer_id: streamer.id,
            streamerDisplayName: streamer.twitchDisplayName,
          })
        }
      }
    }
  }

  private isStreamerCompatible(streamer: Streamer): boolean {
    const type = (streamer.broadcasterType || '').toLowerCase()
    return type === 'affiliate' || type === 'partner'
  }

  private async refreshStreamersInfo(streamers: Streamer[]): Promise<void> {
    if (streamers.length === 0) {
      return
    }

    try {
      const accessToken = await this.twitchApiService.getAppAccessToken()
      const users = await this.twitchApiService.getUsersByIds(
        streamers.map((s) => s.twitchUserId),
        accessToken
      )
      const userMap = new Map(users.map((user) => [user.id, user]))

      for (const streamer of streamers) {
        const userInfo = userMap.get(streamer.twitchUserId)
        if (!userInfo) continue

        let dirty = false
        const newType = userInfo.broadcaster_type || ''
        if ((streamer.broadcasterType || '') !== newType) {
          streamer.broadcasterType = newType
          dirty = true
        }

        if ((streamer.profileImageUrl || '') !== userInfo.profile_image_url) {
          streamer.profileImageUrl = userInfo.profile_image_url
          dirty = true
        }

        if (dirty) {
          await streamer.save()
          logger.info({
            message: 'Streamer info refreshed before polls',
            streamer_id: streamer.id,
            streamerDisplayName: streamer.twitchDisplayName,

            broadcaster_type: newType || 'NONE',
          })
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ message: 'Failed to refresh streamer info before polls', error: message })
    }
  }

  /**
   * Retire un streamer de tous les polls en cours d'une campagne
   */
  async removeStreamerFromCampaignPolls(streamerId: string, campaignId: string): Promise<void> {
    // Trouver tous les polls en cours pour cette campagne
    const runningPolls = await PollInstance.query()
      .where('campaign_id', campaignId)
      .where('status', 'RUNNING')

    logger.info(
      `Removing streamer ${streamerId} from ${runningPolls.length} running polls in campaign ${campaignId}`
    )

    // Supprimer les channel links pour ce streamer
    for (const poll of runningPolls) {
      await PollChannelLink.query()
        .where('poll_instance_id', poll.id)
        .where('streamer_id', streamerId)
        .delete()
    }

    logger.info(`Streamer ${streamerId} removed from ${runningPolls.length} active polls`)
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
      pollInstanceId: pollId,
      title: pollInstance.title,
      options: pollInstance.options,
      durationSeconds: pollInstance.durationSeconds,

      started_at: pollInstance.startedAt!.toISO()!,
      endsAt: endsAt.toISO()!,
    })

    // Fonction de polling
    const poll = async () => {
      try {
        // Vérifier si le poll est terminé
        if (DateTime.now() >= endsAt) {
          logger.info(`Poll instance ${pollId} has ended`)
          await this.endPolling(pollInstance)
          return
        }

        // Récupérer tous les channel links pour ce poll
        const channelLinks = await PollChannelLink.query()
          .where('poll_instance_id', pollId)
          .preload('streamer')

        // Mettre à jour chaque channel link
        for (const link of channelLinks) {
          try {
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

            // Mettre à jour le link
            link.votesByOption = votesByOption
            link.totalVotes = totalVotes
            link.status = this.mapTwitchStatusToLinkStatus(pollData.status)
            await link.save()
          } catch (error) {
            logger.error(
              `Failed to update poll for streamer ${link.streamer.twitchDisplayName}: ${error.message}`
            )
          }
        }

        // Agréger les résultats et émettre via WebSocket
        const aggregated = await this.getAggregatedVotes(pollId)
        this.webSocketService.emitPollUpdate(pollId, aggregated)

        logger.debug(`Poll instance ${pollId} updated: ${aggregated.totalVotes} total votes`)
      } catch (error) {
        logger.error(`Error during polling for poll instance ${pollId}: ${error.message}`)
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
   * Termine le polling et met à jour le statut
   */
  private async endPolling(pollInstance: PollInstance): Promise<void> {
    this.stopPolling(pollInstance.id)

    pollInstance.status = 'ENDED'
    pollInstance.endedAt = DateTime.now()
    await pollInstance.save()

    // Récupérer les résultats finaux
    const aggregated = await this.getAggregatedVotes(pollInstance.id)

    // Émettre l'événement WebSocket de fin
    this.webSocketService.emitPollEnd(pollInstance.id, aggregated)

    logger.info(`Poll instance ${pollInstance.id} ended with ${aggregated.totalVotes} total votes`)
  }

  /**
   * Agrège les votes de tous les channel links
   */
  async getAggregatedVotes(pollInstanceId: string): Promise<PollAggregatedVotes> {
    const channelLinks = await PollChannelLink.query().where('poll_instance_id', pollInstanceId)

    const votesByOption: Record<string, number> = {}
    let totalVotes = 0

    // Agréger les votes
    for (const link of channelLinks) {
      for (const [optionIndex, votes] of Object.entries(link.votesByOption)) {
        votesByOption[optionIndex] = (votesByOption[optionIndex] || 0) + votes
        totalVotes += votes
      }
    }

    // Calculer les pourcentages
    const percentages: Record<string, number> = {}
    for (const [optionIndex, votes] of Object.entries(votesByOption)) {
      percentages[optionIndex] =
        totalVotes > 0 ? Math.round((votes / totalVotes) * 100 * 10) / 10 : 0
    }

    return {
      pollInstanceId,
      votesByOption,
      totalVotes,
      percentages,
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

export { PollService as pollService }
