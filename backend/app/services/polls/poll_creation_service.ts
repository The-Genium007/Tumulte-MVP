import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { pollChannelLink as PollChannelLink } from '#models/poll_channel_link'
import { streamer as Streamer } from '#models/streamer'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { twitchPollService as TwitchPollService } from '../twitch/twitch_poll_service.js'
import { twitchApiService as TwitchApiService } from '../twitch/twitch_api_service.js'

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
    const startTime = Date.now()
    let streamers: Streamer[]

    logger.info({
      event: 'poll_creation_started',
      pollInstanceId: pollInstance.id,
      campaignId: pollInstance.campaignId,
      title: pollInstance.title,
      durationSeconds: pollInstance.durationSeconds,
    })

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
      const unauthorizedStreamers = allActiveMemberships
        .filter((am) => !memberships.find((m) => m.streamerId === am.streamerId))
        .map((m) => m.streamerId)

      logger.info({
        event: 'streamers_loaded',
        pollInstanceId: pollInstance.id,
        campaign_id: pollInstance.campaignId,
        totalActiveMembers: allActiveMemberships.length,
        authorizedMembers: memberships.length,
        unauthorizedMembers: unauthorizedCount,
        unauthorizedStreamerIds: unauthorizedStreamers,
      })

      if (unauthorizedCount > 0) {
        logger.warn({
          event: 'streamers_skipped_unauthorized',
          pollInstanceId: pollInstance.id,
          campaign_id: pollInstance.campaignId,
          count: unauthorizedCount,
          streamerIds: unauthorizedStreamers,
        })
      }
    } else {
      // Mode legacy : charger tous les streamers actifs
      streamers = await Streamer.query().where('is_active', true)
      logger.info({
        event: 'streamers_loaded_legacy',
        pollInstanceId: pollInstance.id,
        count: streamers.length,
      })
    }

    await this.refreshStreamersInfo(streamers)

    const compatibleStreamers = streamers.filter((s) => this.isStreamerCompatible(s))
    const incompatibleStreamers = streamers.filter((s) => !this.isStreamerCompatible(s))

    logger.info({
      event: 'streamer_compatibility_check',
      pollInstanceId: pollInstance.id,
      totalStreamers: streamers.length,
      compatibleCount: compatibleStreamers.length,
      incompatibleCount: incompatibleStreamers.length,
      incompatibleDetails: incompatibleStreamers.map((s) => ({
        streamer_id: s.id,
        displayName: s.twitchDisplayName,
        broadcaster_type: s.broadcasterType || 'UNKNOWN',
      })),
    })

    // Métriques de création
    let apiPollsCreated = 0
    let chatPollsCreated = 0
    let pollCreationErrors = 0

    // Créer un poll pour chaque streamer compatible
    for (const streamer of streamers) {
      if (!this.isStreamerCompatible(streamer)) {
        logger.warn({
          event: 'streamer_skipped_incompatible',
          pollInstanceId: pollInstance.id,
          streamer_id: streamer.id,
          displayName: streamer.twitchDisplayName,
          broadcaster_type: streamer.broadcasterType || 'unknown',
        })
        continue
      }

      try {
        const pollCreateStartTime = Date.now()

        // Vérifier si le streamer peut utiliser l'API officielle des polls
        if (this.canUseOfficialPolls(streamer)) {
          // Affiliate ou Partner: utiliser l'API Twitch Polls
          logger.info({
            event: 'poll_creation_api_started',
            pollInstanceId: pollInstance.id,
            streamer_id: streamer.id,
            displayName: streamer.twitchDisplayName,
            broadcasterType: streamer.broadcasterType,
          })

          const accessToken = await streamer.getDecryptedAccessToken()

          const poll = await this.twitchPollService.withTokenRefresh(
            (token) =>
              this.twitchPollService.createPoll(
                streamer.twitchUserId,
                token,
                pollInstance.title,
                pollInstance.options,
                pollInstance.durationSeconds,
                pollInstance.channelPointsEnabled,
                pollInstance.channelPointsAmount
              ),
            async () => accessToken,
            await streamer.getDecryptedRefreshToken(),
            async (newAccessToken, newRefreshToken) => {
              await streamer.updateTokens(newAccessToken, newRefreshToken)
            }
          )

          // Créer le lien en base avec twitchPollId
          await PollChannelLink.create({
            pollInstanceId: pollInstance.id,
            streamerId: streamer.id,
            twitchPollId: poll.id,
            status: 'CREATED',
            totalVotes: 0,
            votesByOption: {},
          })

          apiPollsCreated++

          const duration = Date.now() - pollCreateStartTime
          logger.info({
            event: 'poll_created_api_success',
            pollInstanceId: pollInstance.id,
            streamer_id: streamer.id,
            streamerDisplayName: streamer.twitchDisplayName,
            twitchPollId: poll.id,
            durationMs: duration,
          })
        } else {
          // Non-affilié: utiliser le chat IRC
          logger.info({
            event: 'poll_creation_chat_started',
            pollInstanceId: pollInstance.id,
            streamer_id: streamer.id,
            displayName: streamer.twitchDisplayName,
            broadcasterType: streamer.broadcasterType || 'none',
          })

          const twitchChatService = await app.container.make('twitchChatService')
          await twitchChatService.startChatPoll(
            streamer.id,
            pollInstance.id,
            pollInstance.title,
            pollInstance.options,
            pollInstance.durationSeconds,
            pollInstance.type
          )

          // Créer le lien en base SANS twitchPollId (mode chat)
          await PollChannelLink.create({
            pollInstanceId: pollInstance.id,
            streamerId: streamer.id,
            twitchPollId: null, // Pas de poll Twitch officiel
            status: 'CREATED',
            totalVotes: 0,
            votesByOption: {},
          })

          chatPollsCreated++

          const duration = Date.now() - pollCreateStartTime
          logger.info({
            event: 'poll_created_chat_success',
            pollInstanceId: pollInstance.id,
            streamer_id: streamer.id,
            streamerDisplayName: streamer.twitchDisplayName,
            durationMs: duration,
          })
        }
      } catch (error) {
        pollCreationErrors++

        logger.error({
          event: 'poll_creation_failed',
          pollInstanceId: pollInstance.id,
          streamer_id: streamer.id,
          streamerDisplayName: streamer.twitchDisplayName,
          broadcasterType: streamer.broadcasterType,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })

        // Désactiver le streamer si le token est invalide
        if (error instanceof Error && error.message.includes('UNAUTHORIZED')) {
          streamer.isActive = false
          await streamer.save()
          logger.warn({
            event: 'streamer_deactivated',
            streamer_id: streamer.id,
            streamerDisplayName: streamer.twitchDisplayName,
            reason: 'Invalid or expired token (UNAUTHORIZED)',
          })
        }
      }
    }

    const totalDuration = Date.now() - startTime

    // Log récapitulatif final
    logger.info({
      event: 'poll_creation_completed',
      pollInstanceId: pollInstance.id,
      campaignId: pollInstance.campaignId,
      totalStreamers: streamers.length,
      compatibleStreamers: compatibleStreamers.length,
      apiPollsCreated,
      chatPollsCreated,
      totalPollsCreated: apiPollsCreated + chatPollsCreated,
      errors: pollCreationErrors,
      successRate: `${(((apiPollsCreated + chatPollsCreated) / compatibleStreamers.length) * 100).toFixed(1)}%`,
      totalDurationMs: totalDuration,
    })
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
      pollInstanceId: pollInstance.id,
      channelLinksCount: channelLinks.length,
    })

    let successCount = 0
    let failureCount = 0

    // Terminer chaque poll Twitch OU déconnecter le chat IRC
    for (const link of channelLinks) {
      try {
        // Si c'est un poll Twitch officiel (streamer affilié/partenaire)
        if (link.twitchPollId) {
          const accessToken = await link.streamer.getDecryptedAccessToken()
          const twitchPollId = link.twitchPollId // Non-null à ce point grâce au if

          // Appeler l'API Twitch pour terminer le poll avec le statut TERMINATED
          await this.twitchPollService.withTokenRefresh(
            (token) =>
              this.twitchPollService.endPoll(
                link.streamer.twitchUserId,
                twitchPollId,
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
            pollInstanceId: pollInstance.id,
            streamer_id: link.streamer.id,
            streamerDisplayName: link.streamer.twitchDisplayName,
            twitchPollId: link.twitchPollId,
          })
        } else {
          // C'est un poll en mode chat (streamer non-affilié)
          // Déconnecter le client IRC
          const twitchChatService = await app.container.make('twitchChatService')
          await twitchChatService.disconnectFromPoll(link.streamerId, pollInstance.id)

          successCount++
          logger.info({
            message: 'Chat poll terminated (IRC disconnected)',
            pollInstanceId: pollInstance.id,
            streamer_id: link.streamer.id,
            streamerDisplayName: link.streamer.twitchDisplayName,
          })
        }
      } catch (error) {
        failureCount++
        logger.error({
          message: 'Failed to terminate poll',
          pollInstanceId: pollInstance.id,
          streamer_id: link.streamer.id,
          streamerDisplayName: link.streamer.twitchDisplayName,
          twitchPollId: link.twitchPollId || 'chat-mode',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    logger.info({
      message: 'Polls termination completed',
      pollInstanceId: pollInstance.id,
      successCount: successCount,
      failureCount: failureCount,
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
   * Vérifie si le streamer est compatible (tous les types sont supportés)
   * - Affiliate/Partner: via l'API Twitch Polls
   * - Non-affilié (vide ou autre): via le chat IRC
   */
  private isStreamerCompatible(_streamer: Streamer): boolean {
    // Tous les streamers sont compatibles maintenant
    return true
  }

  /**
   * Vérifie si le streamer peut utiliser l'API Twitch Polls (Affiliate ou Partner)
   */
  private canUseOfficialPolls(streamer: Streamer): boolean {
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
}

export default PollCreationService
export { PollCreationService as pollCreationService }
