import { ref, readonly } from 'vue'
import type {
  Campaign,
  CampaignMembership,
  CampaignInvitation,
  StreamerSearchResult,
  LiveStatusMap,
} from '@/types'

export interface CampaignMember {
  id: string
  status: 'PENDING' | 'ACTIVE'
  isOwner: boolean
  streamer: {
    id: string
    twitchUserId: string
    twitchDisplayName: string
    twitchLogin: string
    profileImageUrl?: string
    broadcasterType?: string
  }
  invitedAt: string
  acceptedAt: string | null
  pollAuthorizationGrantedAt: string | null
  pollAuthorizationExpiresAt: string | null
  isPollAuthorized: boolean
  authorizationRemainingSeconds: number | null
}

export const useCampaigns = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  const campaigns = ref<Campaign[]>([])
  const selectedCampaign = ref<Campaign | null>(null)
  const loading = ref<boolean>(false)

  // ========== MJ Functions ==========

  /**
   * Récupère toutes les campagnes du MJ
   */
  const fetchCampaigns = async (): Promise<void> => {
    loading.value = true
    try {
      const response = await fetch(`${API_URL}/mj/campaigns`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      const data = await response.json()
      campaigns.value = data.data
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Crée une nouvelle campagne
   */
  const createCampaign = async (data: {
    name: string
    description?: string
  }): Promise<Campaign> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create campaign')
      const result = await response.json()
      campaigns.value.unshift(result.data)
      return result.data
    } catch (error) {
      console.error('Failed to create campaign:', error)
      throw error
    }
  }

  /**
   * Met à jour une campagne
   */
  const updateCampaign = async (
    id: string,
    data: { name?: string; description?: string }
  ): Promise<Campaign> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update campaign')
      const result = await response.json()
      const index = campaigns.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        campaigns.value[index] = result.data
      }
      return result.data
    } catch (error) {
      console.error('Failed to update campaign:', error)
      throw error
    }
  }

  /**
   * Supprime une campagne
   */
  const deleteCampaign = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to delete campaign')
      campaigns.value = campaigns.value.filter((c) => c.id !== id)
      if (selectedCampaign.value?.id === id) {
        selectedCampaign.value = null
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error)
      throw error
    }
  }

  /**
   * Récupère les membres d'une campagne
   */
  const getCampaignMembers = async (id: string): Promise<CampaignMember[]> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${id}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch campaign members')
      const data = await response.json()
      return data.data.members
    } catch (error) {
      console.error('Failed to fetch campaign members:', error)
      throw error
    }
  }

  /**
   * Récupère les détails complets d'une campagne avec ses membres
   */
  const getCampaignDetails = async (
    id: string
  ): Promise<{ campaign: Campaign; members: CampaignMembership[] }> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${id}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch campaign details')
      const data = await response.json()
      return {
        campaign: {
          id: data.data.id,
          name: data.data.name,
          description: data.data.description,
          memberCount: data.data.memberCount,
          activeMemberCount: data.data.activeMemberCount,
          createdAt: data.data.createdAt,
          vttConnection: data.data.vttConnection || null,
        },
        members: data.data.members,
      }
    } catch (error) {
      console.error('Failed to fetch campaign details:', error)
      throw error
    }
  }

  /**
   * Invite un streamer à rejoindre une campagne
   */
  const inviteStreamer = async (
    campaignId: string,
    payload: // eslint-disable-next-line @typescript-eslint/naming-convention
      | { streamer_id: string }
      | {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          twitch_user_id: string
          // eslint-disable-next-line @typescript-eslint/naming-convention
          twitch_login: string
          // eslint-disable-next-line @typescript-eslint/naming-convention
          twitch_display_name: string
          // eslint-disable-next-line @typescript-eslint/naming-convention
          profile_image_url?: string
        }
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Failed to invite streamer')
    } catch (error) {
      console.error('Failed to invite streamer:', error)
      throw error
    }
  }

  /**
   * Retire un membre d'une campagne
   */
  const removeMember = async (campaignId: string, memberId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to remove member')
    } catch (error) {
      console.error('Failed to remove member:', error)
      throw error
    }
  }

  /**
   * Recherche des streamers via Twitch API
   */
  const searchTwitchStreamers = async (query: string): Promise<StreamerSearchResult[]> => {
    const response = await fetch(`${API_URL}/mj/dashboards/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to search streamers')
    const data = await response.json()
    return data.data.map(
      (user: {
        twitchUserId: string
        twitchUsername: string
        twitchDisplayName: string
        profileImageUrl: string
      }) => ({
        id: user.twitchUserId,
        login: user.twitchUsername,
        displayName: user.twitchDisplayName,
        profileImageUrl: user.profileImageUrl,
      })
    )
  }

  // ========== Streamer Functions ==========

  /**
   * Récupère les invitations en attente pour le streamer
   */
  const fetchInvitations = async (): Promise<CampaignInvitation[]> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/invitations`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch invitations')
      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
      throw error
    }
  }

  /**
   * Accepte une invitation
   */
  const acceptInvitation = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/invitations/${id}/accept`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to accept invitation')
    } catch (error) {
      console.error('Failed to accept invitation:', error)
      throw error
    }
  }

  /**
   * Refuse une invitation
   */
  const declineInvitation = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/invitations/${id}/decline`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to decline invitation')
    } catch (error) {
      console.error('Failed to decline invitation:', error)
      throw error
    }
  }

  /**
   * Récupère les campagnes actives du streamer
   */
  const fetchActiveCampaigns = async (): Promise<Campaign[]> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch active campaigns')
      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Failed to fetch active campaigns:', error)
      throw error
    }
  }

  /**
   * Quitte une campagne
   */
  const leaveCampaign = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/${id}/leave`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to leave campaign')
    } catch (error) {
      console.error('Failed to leave campaign:', error)
      throw error
    }
  }

  // ========== Authorization Methods ==========

  /**
   * Accorde l'autorisation pour 12 heures
   */
  const grantAuthorization = async (
    campaignId: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
  ): Promise<{ expires_at: string; remaining_seconds: number }> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/${campaignId}/authorize`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to grant authorization')
      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Failed to grant authorization:', error)
      throw error
    }
  }

  /**
   * Révoque l'autorisation
   */
  const revokeAuthorization = async (campaignId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/${campaignId}/authorize`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to revoke authorization')
    } catch (error) {
      console.error('Failed to revoke authorization:', error)
      throw error
    }
  }

  /**
   * Récupère le statut live des membres d'une campagne
   */
  const getLiveStatus = async (campaignId: string): Promise<LiveStatusMap> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/live-status`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch live status')
      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Failed to fetch live status:', error)
      throw error
    }
  }

  /**
   * Récupère le statut d'autorisation pour toutes les campagnes
   */
  const getAuthorizationStatus = async (): Promise<
    {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      campaign_id: string
      // eslint-disable-next-line @typescript-eslint/naming-convention
      campaign_name: string
      // eslint-disable-next-line @typescript-eslint/naming-convention
      is_owner: boolean
      // eslint-disable-next-line @typescript-eslint/naming-convention
      is_authorized: boolean
      // eslint-disable-next-line @typescript-eslint/naming-convention
      expires_at: string | null
      // eslint-disable-next-line @typescript-eslint/naming-convention
      remaining_seconds: number | null
    }[]
  > => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/authorization-status`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch authorization status')
      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Failed to fetch authorization status:', error)
      throw error
    }
  }

  return {
    // State
    campaigns: readonly(campaigns),
    selectedCampaign,
    loading: readonly(loading),

    // MJ Methods
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaignMembers,
    getCampaignDetails,
    inviteStreamer,
    removeMember,
    searchTwitchStreamers,

    // Streamer Methods
    fetchInvitations,
    acceptInvitation,
    declineInvitation,
    fetchActiveCampaigns,
    leaveCampaign,

    // Authorization Methods
    grantAuthorization,
    revokeAuthorization,
    getAuthorizationStatus,

    // Live Status
    getLiveStatus,
  }
}
