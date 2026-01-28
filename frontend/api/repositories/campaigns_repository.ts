import httpClient from '../http_client'
import type {
  Campaign,
  CampaignDetail,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  InviteStreamerRequest,
  ApiResponse,
  CampaignMember,
  CampaignInvitation,
} from '~/types/api'

/**
 * Repository pour les campagnes (MJ)
 */
export class CampaignsRepository {
  private basePath = '/mj/campaigns'

  /**
   * Liste toutes les campagnes du MJ
   */
  async list(): Promise<Campaign[]> {
    const response = await httpClient.get<ApiResponse<Campaign[]>>(this.basePath)
    return response.data
  }

  /**
   * Récupère une campagne avec ses détails
   */
  async get(id: string): Promise<CampaignDetail> {
    const response = await httpClient.get<ApiResponse<CampaignDetail>>(`${this.basePath}/${id}`)
    return response.data
  }

  /**
   * Crée une nouvelle campagne
   */
  async create(data: CreateCampaignRequest): Promise<Campaign> {
    const response = await httpClient.post<ApiResponse<Campaign>>(this.basePath, data)
    return response.data
  }

  /**
   * Met à jour une campagne
   */
  async update(id: string, data: UpdateCampaignRequest): Promise<Campaign> {
    const response = await httpClient.put<ApiResponse<Campaign>>(`${this.basePath}/${id}`, data)
    return response.data
  }

  /**
   * Supprime une campagne
   */
  async delete(id: string): Promise<void> {
    await httpClient.delete(`${this.basePath}/${id}`)
  }

  /**
   * Invite un streamer à rejoindre la campagne
   */
  async inviteStreamer(campaignId: string, data: InviteStreamerRequest): Promise<CampaignMember> {
    const response = await httpClient.post<ApiResponse<CampaignMember>>(
      `${this.basePath}/${campaignId}/invite`,
      data
    )
    return response.data
  }

  /**
   * Liste les membres d'une campagne
   */
  async listMembers(campaignId: string): Promise<CampaignMember[]> {
    const response = await httpClient.get<ApiResponse<CampaignMember[]>>(
      `${this.basePath}/${campaignId}/members`
    )
    return response.data
  }

  /**
   * Retire un membre de la campagne
   */
  async removeMember(campaignId: string, memberId: string): Promise<void> {
    await httpClient.delete(`${this.basePath}/${campaignId}/members/${memberId}`)
  }
}

/**
 * Repository pour les campagnes (Streamer)
 */
export class StreamerCampaignsRepository {
  private basePath = '/dashboard'

  /**
   * Liste les invitations en attente
   */
  async listInvitations(): Promise<CampaignInvitation[]> {
    const response = await httpClient.get<ApiResponse<CampaignInvitation[]>>(
      `${this.basePath}/invitations`
    )
    return response.data
  }

  /**
   * Accepte une invitation
   */
  async acceptInvitation(invitationId: string): Promise<void> {
    await httpClient.post(`${this.basePath}/invitations/${invitationId}/accept`)
  }

  /**
   * Refuse une invitation
   */
  async declineInvitation(invitationId: string): Promise<void> {
    await httpClient.post(`${this.basePath}/invitations/${invitationId}/decline`)
  }

  /**
   * Liste les campagnes actives du streamer
   */
  async listActiveCampaigns(): Promise<Campaign[]> {
    const response = await httpClient.get<ApiResponse<Campaign[]>>(`${this.basePath}/campaigns`)
    return response.data
  }

  /**
   * Quitte une campagne
   */
  async leaveCampaign(campaignId: string): Promise<void> {
    await httpClient.post(`${this.basePath}/campaigns/${campaignId}/leave`)
  }
}

// Export des instances singleton
export const campaignsRepository = new CampaignsRepository()
export const streamerCampaignsRepository = new StreamerCampaignsRepository()
