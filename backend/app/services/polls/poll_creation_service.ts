import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import PollInstance from '#models/poll_instance'
import PollChannelLink from '#models/poll_channel_link'
import Streamer from '#models/streamer'
import CampaignMembership from '#models/campaign_membership'
import TwitchPollService from '../twitch/twitch_poll_service.js'
import TwitchApiService from '../twitch/twitch_api_service.js'

/**
 * Service pour créer des polls Twitch pour tous les streamers d'une campagne
 */
@inject()
export class PollCreationService {
  constructor(
    private twitchPollService: TwitchPollService,
    private twitchApiService: TwitchApiService
  ) {}

  /**
   * Crée des polls Twitch pour tous les streamers actifs d'une campagne
   */
  async createPollsOnTwitch(pollInstance: PollInstance): Promise<void> {
    let streamers: Streamer[]

    // Si le poll a une campagne, charger les membres ACTIFS ET AUTORISÉS de la campagne
    if (pollInstance.campaignId) {
      // Récupérer d'abord tous les membres actifs pour le logging
      const allActiveMemberships = await CampaignMembership.query()
        .where('campaign_id', pollInstance.campaignId)
        .where('status', 'ACTIVE')

      // Filtrer par autorisation
      const memberships = await CampaignMembership.query()
        .where('campaign_id', pollInstance.campaignId)
        .where('status', 'ACTIVE')
        .whereNotNull('poll_authorization_expires_at')
        .where('poll_authorization_expires_at', '>', DateTime.now().toSQL())
        .preload('streamer')

      streamers = memberships.map((m) => m.streamer)

      const unauthorizedCount = allActiveMemberships.length - memberships.length

      logger.info({
        message: 'Authorization filter applied',
        campaign_id: pollInstance.campaignId,
        total_active_members: allActiveMemberships.length,
        authorized_members: memberships.length,
        unauthorized_members: unauthorizedCount,
      })

      if (unauthorizedCount > 0) {
        logger.warn(
          `${unauthorizedCount} active member(s) skipped due to missing poll authorization`
        )
      }

      logger.info(
        `Creating polls for ${streamers.length} authorized streamers in campaign ${pollInstance.campaignId}`
      )
    } else {
      // Mode legacy : charger tous les streamers actifs
      streamers = await Streamer.query().where('is_active', true)
      logger.info(`Creating polls for ${streamers.length} streamers (legacy mode)`)
    }

    await this.refreshStreamersInfo(streamers)
    logger.info({
      message: 'Streamer compatibility snapshot before poll creation',
      poll_instance_id: pollInstance.id,
      compatible_count: streamers.filter((s) => this.isStreamerCompatible(s)).length,
      incompatible_streamers: streamers
        .filter((s) => !this.isStreamerCompatible(s))
        .map((s) => ({
          streamer_id: s.id,
          display_name: s.twitchDisplayName,
          broadcaster_type: s.broadcasterType || 'UNKNOWN',
        })),
    })

    // Créer un poll pour chaque streamer compatible
    for (const streamer of streamers) {
      if (!this.isStreamerCompatible(streamer)) {
        logger.warn(
          `Skipping poll creation for ${streamer.twitchDisplayName}: broadcasterType=${streamer.broadcasterType || 'unknown'}`
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
          poll_instance_id: pollInstance.id,
          streamer_id: streamer.id,
          streamer_display_name: streamer.twitchDisplayName,
          twitch_poll_id: poll.id,
        })
      } catch (error) {
        logger.error({
          message: 'Failed to create poll for streamer',
          poll_instance_id: pollInstance.id,
          streamer_id: streamer.id,
          streamer_display_name: streamer.twitchDisplayName,
          error: error instanceof Error ? error.message : String(error),
        })

        // Désactiver le streamer si le token est invalide
        if (error instanceof Error && error.message.includes('UNAUTHORIZED')) {
          streamer.isActive = false
          await streamer.save()
          logger.warn({
            message: 'Streamer deactivated due to invalid token',
            streamer_id: streamer.id,
            streamer_display_name: streamer.twitchDisplayName,
          })
        }
      }
    }
  }

  /**
   * Termine les polls Twitch sur tous les streamers (lors d'une annulation)
   */
  async terminatePollsOnTwitch(pollInstance: PollInstance): Promise<void> {
    // Récupérer tous les channel links pour ce poll
    const channelLinks = await PollChannelLink.query()
      .where('poll_instance_id', pollInstance.id)
      .preload('streamer')

    logger.info({
      message: 'Terminating polls on Twitch',
      poll_instance_id: pollInstance.id,
      channel_links_count: channelLinks.length,
    })

    let successCount = 0
    let failureCount = 0

    // Terminer chaque poll Twitch OU déconnecter le chat IRC
    for (const link of channelLinks) {
      try {
        // Si c'est un poll Twitch officiel (streamer affilié/partenaire)
        if (link.twitchPollId) {
          const accessToken = await link.streamer.getDecryptedAccessToken()

          // Appeler l'API Twitch pour terminer le poll avec le statut TERMINATED
          await this.twitchPollService.withTokenRefresh(
            (token) =>
              this.twitchPollService.endPoll(
                link.streamer.twitchUserId,
                link.twitchPollId,
                token,
                'TERMINATED'
              ),
            async () => accessToken,
            await link.streamer.getDecryptedRefreshToken(),
            async (newAccessToken, newRefreshToken) => {
              await link.streamer.updateTokens(newAccessToken, newRefreshToken)
            }
          )

          successCount++
          logger.info({
            message: 'Poll terminated on Twitch',
            poll_instance_id: pollInstance.id,
            streamer_id: link.streamer.id,
            streamer_display_name: link.streamer.twitchDisplayName,
            twitch_poll_id: link.twitchPollId,
          })
        } else {
          // C'est un poll en mode chat (streamer non-affilié)
          // Déconnecter le client IRC
          await this.twitchChatService.disconnectFromPoll(link.streamerId, pollInstance.id)

          successCount++
          logger.info({
            message: 'Chat poll terminated (IRC disconnected)',
            poll_instance_id: pollInstance.id,
            streamer_id: link.streamer.id,
            streamer_display_name: link.streamer.twitchDisplayName,
          })
        }
      } catch (error) {
        failureCount++
        logger.error({
          message: 'Failed to terminate poll',
          poll_instance_id: pollInstance.id,
          streamer_id: link.streamer.id,
          streamer_display_name: link.streamer.twitchDisplayName,
          twitch_poll_id: link.twitchPollId || 'chat-mode',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    logger.info({
      message: 'Polls termination completed',
      poll_instance_id: pollInstance.id,
      success_count: successCount,
      failure_count: failureCount,
    })
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
   * Vérifie si le streamer est compatible (Affiliate ou Partner)
   */
  private isStreamerCompatible(streamer: Streamer): boolean {
    const type = (streamer.broadcasterType || '').toLowerCase()
    return type === 'affiliate' || type === 'partner'
  }

  /**
   * Rafraîchit les infos des streamers via l'API Twitch (broadcaster_type, profile image)
   */
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
            streamer_display_name: streamer.twitchDisplayName,
            broadcaster_type: newType || 'NONE',
          })
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ message: 'Failed to refresh streamer info before polls', error: message })
    }
  }
}

export default PollCreationService
