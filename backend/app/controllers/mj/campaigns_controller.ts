import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { CampaignService } from '#services/campaigns/campaign_service'
import { MembershipService } from '#services/campaigns/membership_service'
import { StreamerRepository } from '#repositories/streamer_repository'
import { CampaignDto } from '#dtos/campaigns/campaign_dto'
import { CampaignDetailDto } from '#dtos/campaigns/campaign_detail_dto'
import { CampaignInvitationDto } from '#dtos/campaigns/campaign_invitation_dto'
import { validateRequest } from '#middleware/validate_middleware'
import {
  createCampaignSchema,
  updateCampaignSchema,
} from '#validators/campaigns/create_campaign_validator'
import { inviteStreamerSchema } from '#validators/campaigns/invite_streamer_validator'

/**
 * Contrôleur pour la gestion des campagnes (MJ)
 */
@inject()
export default class CampaignsController {
  constructor(
    private campaignService: CampaignService,
    private membershipService: MembershipService,
    private streamerRepository: StreamerRepository
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
    await validateRequest(inviteStreamerSchema)(
      { request, response } as HttpContext,
      async () => {}
    )

    const data = request.only([
      'twitchUserId',
      'twitchLogin',
      'twitchDisplayName',
      'profileImageUrl',
    ])

    // Trouver ou créer le streamer
    let streamer = await this.streamerRepository.findByTwitchUserId(data.twitchUserId)

    if (!streamer) {
      // Créer un "streamer fantôme" (pas encore inscrit)
      const { streamer: streamerModel } = await import('#models/streamer')
      streamer = await streamerModel.create({
        userId: null,
        twitchUserId: data.twitchUserId,
        twitchLogin: data.twitchLogin,
        twitchDisplayName: data.twitchDisplayName,
        profileImageUrl: data.profileImageUrl || null,
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
}
