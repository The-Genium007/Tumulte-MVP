import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { CampaignService } from '#services/campaigns/campaign_service'
import { MembershipService } from '#services/campaigns/membership_service'
import { ReadinessService } from '#services/campaigns/readiness_service'
import { StreamerRepository } from '#repositories/streamer_repository'
import { TwitchApiService } from '#services/twitch/twitch_api_service'
import { PushNotificationService } from '#services/notifications/push_notification_service'
import VttImportService from '#services/vtt/vtt_import_service'
import VttConnection from '#models/vtt_connection'
import { campaign as Campaign } from '#models/campaign'
import { CampaignDto } from '#dtos/campaigns/campaign_dto'
import { CampaignDetailDto } from '#dtos/campaigns/campaign_detail_dto'
import { CampaignInvitationDto } from '#dtos/campaigns/campaign_invitation_dto'
import { validateRequest } from '#middleware/validate_middleware'
import {
  createCampaignSchema,
  updateCampaignSchema,
} from '#validators/campaigns/create_campaign_validator'
import { inviteStreamerSchema } from '#validators/campaigns/invite_streamer_validator'
import { importCampaignValidator } from '#validators/campaigns/import_campaign_validator'

/**
 * Contrôleur pour la gestion des campagnes (MJ)
 */
@inject()
export default class CampaignsController {
  constructor(
    private campaignService: CampaignService,
    private membershipService: MembershipService,
    private readinessService: ReadinessService,
    private streamerRepository: StreamerRepository,
    private twitchApiService: TwitchApiService,
    private vttImportService: VttImportService
  ) {}

  /**
   * Liste toutes les campagnes du MJ
   * GET /api/v2/mj/campaigns
   */
  async index({ auth, response }: HttpContext) {
    const userId = auth.user!.id
    const campaigns = await this.campaignService.listUserCampaigns(userId)

    return response.ok({
      data: CampaignDto.fromModelArray(campaigns),
    })
  }

  /**
   * Récupère une campagne avec ses membres
   * GET /api/v2/mj/campaigns/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const campaign = await this.campaignService.getCampaignWithMembers(params.id, userId)

    return response.ok({
      data: CampaignDetailDto.fromModel(campaign),
    })
  }

  /**
   * Crée une nouvelle campagne
   * POST /api/v2/mj/campaigns
   */
  async store({ auth, request, response }: HttpContext) {
    await validateRequest(createCampaignSchema)(
      { request, response } as HttpContext,
      async () => {}
    )

    const userId = auth.user!.id
    const data = request.only(['name', 'description'])

    const campaign = await this.campaignService.createCampaign(userId, data)

    return response.created({
      data: CampaignDto.fromModel(campaign),
    })
  }

  /**
   * Met à jour une campagne
   * PUT /api/v2/mj/campaigns/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    await validateRequest(updateCampaignSchema)(
      { request, response } as HttpContext,
      async () => {}
    )

    const userId = auth.user!.id
    const data = request.only(['name', 'description'])

    const campaign = await this.campaignService.updateCampaign(params.id, userId, data)

    return response.ok({
      data: CampaignDto.fromModel(campaign),
    })
  }

  /**
   * Supprime une campagne
   * DELETE /api/v2/mj/campaigns/:id
   */
  async destroy({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    await this.campaignService.deleteCampaign(params.id, userId)

    return response.noContent()
  }

  /**
   * Invite un streamer à rejoindre la campagne
   * POST /api/v2/mj/campaigns/:id/invite
   */
  async invite({ params, request, response }: HttpContext) {
    const data = inviteStreamerSchema.parse(request.all())

    // Trouver ou créer le streamer
    let streamer = await this.streamerRepository.findByTwitchUserId(data.twitch_user_id)

    if (!streamer) {
      // Créer un "streamer fantôme" (pas encore inscrit)
      const { streamer: streamerModel } = await import('#models/streamer')
      streamer = await streamerModel.create({
        userId: null,
        twitchUserId: data.twitch_user_id,
        twitchLogin: data.twitch_login,
        twitchDisplayName: data.twitch_display_name,
        profileImageUrl: data.profile_image_url || null,
        broadcasterType: '',
        scopes: [],
        isActive: false,
      })
    }

    const membership = await this.membershipService.inviteStreamer(params.id, streamer.id)

    return response.created({
      data: CampaignInvitationDto.fromModel(membership),
    })
  }

  /**
   * Retire un membre de la campagne
   * DELETE /api/v2/mj/campaigns/:id/members/:memberId
   */
  async removeMember({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    await this.membershipService.removeMember(params.id, params.memberId, userId)

    return response.noContent()
  }

  /**
   * Liste les membres actifs d'une campagne
   * GET /api/v2/mj/campaigns/:id/members
   */
  async listMembers({ params, response }: HttpContext) {
    const members = await this.membershipService.getActiveMembers(params.id)

    return response.ok({
      data: members.map((m) => ({
        id: m.id,
        streamerId: m.streamerId,
        status: m.status,
        invitedAt: m.invitedAt?.toISO(),
        acceptedAt: m.acceptedAt?.toISO(),
        streamer: m.streamer
          ? {
              id: m.streamer.id,
              twitchDisplayName: m.streamer.twitchDisplayName,
              twitchUserId: m.streamer.twitchUserId,
              profileImageUrl: m.streamer.profileImageUrl,
            }
          : null,
      })),
    })
  }

  /**
   * Récupère le statut live des membres d'une campagne
   * GET /api/v2/mj/campaigns/:id/live-status
   */
  async liveStatus({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    // Vérifier que l'utilisateur a accès à cette campagne
    const campaign = await this.campaignService.getCampaignWithMembers(params.id, userId)

    // Extraire les twitchUserId des membres actifs
    const twitchUserIds =
      campaign.memberships
        ?.filter((m) => m.status === 'ACTIVE' && m.streamer?.twitchUserId)
        .map((m) => m.streamer.twitchUserId) || []

    logger.info({
      event: 'live_status_request',
      campaignId: params.id,
      twitchUserIds,
      memberCount: campaign.memberships?.length || 0,
    })

    if (twitchUserIds.length === 0) {
      return response.ok({ data: {} })
    }

    try {
      // Récupérer un app token pour l'API Twitch
      const accessToken = await this.twitchApiService.getAppAccessToken()

      logger.info({
        event: 'twitch_app_token_obtained',
        tokenPrefix: accessToken.substring(0, 10) + '...',
      })

      // Récupérer les streams en cours
      const liveStreams = await this.twitchApiService.getStreamsByUserIds(
        twitchUserIds,
        accessToken
      )

      logger.info({
        event: 'twitch_streams_response',
        liveStreamCount: liveStreams.size,
        liveUserIds: Array.from(liveStreams.keys()),
      })

      // Construire la réponse: map twitchUserId -> live info (snake_case for API response)
      interface LiveStatusEntry {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        is_live: boolean
        // eslint-disable-next-line @typescript-eslint/naming-convention
        game_name?: string
        title?: string
        // eslint-disable-next-line @typescript-eslint/naming-convention
        viewer_count?: number
        // eslint-disable-next-line @typescript-eslint/naming-convention
        started_at?: string
      }

      const liveStatus: Record<string, LiveStatusEntry> = {}

      for (const twitchUserId of twitchUserIds) {
        const stream = liveStreams.get(twitchUserId)
        if (stream) {
          liveStatus[twitchUserId] = {
            // eslint-disable-next-line camelcase
            is_live: true,
            // eslint-disable-next-line camelcase
            game_name: stream.game_name,
            title: stream.title,
            // eslint-disable-next-line camelcase
            viewer_count: stream.viewer_count,

            started_at: stream.started_at,
          }
        } else {
          // eslint-disable-next-line camelcase
          liveStatus[twitchUserId] = { is_live: false }
        }
      }

      return response.ok({ data: liveStatus })
    } catch (error) {
      logger.error({
        event: 'live_status_fetch_failed',
        campaignId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // En cas d'erreur, retourner un objet vide plutôt qu'échouer
      return response.ok({ data: {} })
    }
  }

  /**
   * Récupère l'état de readiness des streamers d'une campagne
   * GET /api/v2/mj/campaigns/:id/streamers/readiness
   */
  async streamersReadiness({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    // Vérifier que l'utilisateur a accès à cette campagne
    try {
      await this.campaignService.getCampaignWithMembers(params.id, userId)
    } catch {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const readiness = await this.readinessService.getCampaignReadiness(params.id)

    return response.ok({
      data: readiness,
    })
  }

  /**
   * Notifie les streamers non prêts d'une campagne
   * POST /api/v2/mj/campaigns/:id/notify-unready
   */
  async notifyUnready({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    // Vérifier que l'utilisateur a accès à cette campagne
    let campaign
    try {
      campaign = await this.campaignService.getCampaignWithMembers(params.id, userId)
    } catch {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    // Récupérer la readiness pour identifier les streamers non prêts
    const readiness = await this.readinessService.getCampaignReadiness(params.id)
    const unreadyStreamers = readiness.streamers.filter((s) => !s.isReady)

    if (unreadyStreamers.length === 0) {
      return response.ok({
        data: {
          notified: 0,
          streamers: [],
          message: 'All streamers are ready',
        },
      })
    }

    // Récupérer les userIds des streamers non prêts
    const userIds: string[] = []
    for (const streamer of unreadyStreamers) {
      const streamerModel = await this.streamerRepository.findById(streamer.streamerId)
      if (streamerModel?.userId) {
        userIds.push(streamerModel.userId)
      }
    }

    // Envoyer les notifications
    if (userIds.length > 0) {
      const pushService = new PushNotificationService()
      await pushService.sendToUsers(userIds, 'session:start_blocked', {
        title: 'Session de sondage en attente',
        body: `Le MJ de "${campaign.name}" souhaite lancer une session. Veuillez autoriser votre chaîne.`,
        data: {
          url: '/streamer',
          campaignId: params.id,
        },
        actions: [
          { action: 'authorize', title: 'Autoriser' },
          { action: 'dismiss', title: 'Plus tard' },
        ],
      })

      logger.info({
        event: 'notify_unready_streamers',
        campaignId: params.id,
        notifiedCount: userIds.length,
        streamers: unreadyStreamers.map((s) => s.streamerName),
      })
    }

    return response.ok({
      data: {
        notified: userIds.length,
        streamers: unreadyStreamers.map((s) => s.streamerName),
      },
    })
  }

  /**
   * Importe une campagne depuis un VTT
   * POST /api/v2/mj/campaigns/import
   */
  async importFromVtt({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(importCampaignValidator)

    const userId = auth.user!.id

    // Valider que la connexion VTT appartient au GM
    const connection = await VttConnection.query()
      .where('id', data.vttConnectionId)
      .where('user_id', userId)
      .first()

    if (!connection) {
      return response.notFound({ error: 'VTT connection not found' })
    }

    // Vérifier que la campagne n'existe pas déjà
    const existing = await Campaign.query()
      .where('vtt_connection_id', data.vttConnectionId)
      .where('vtt_campaign_id', data.vttCampaignId)
      .first()

    if (existing) {
      return response.badRequest({ error: 'Campaign already imported' })
    }

    // Import via service
    const campaign = await this.vttImportService.importCampaign({
      userId,
      vttConnectionId: data.vttConnectionId,
      vttCampaignId: data.vttCampaignId,
      name: data.name,
      description: data.description,
    })

    return response.created({
      data: CampaignDto.fromModel(campaign),
    })
  }
}
