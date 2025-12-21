import { ref, readonly } from "vue";
import type {
  Campaign,
  CampaignMembership,
  CampaignInvitation,
  StreamerSearchResult,
} from "@/types";

const API_URL = import.meta.env.VITE_API_URL;

export interface CampaignMember {
  id: string;
  status: "PENDING" | "ACTIVE";
  is_owner?: boolean;
  streamer: {
    id: string;
    twitch_display_name: string;
    twitch_login: string;
  };
  invited_at: string;
  accepted_at?: string;
}

export const useCampaigns = () => {
  const campaigns = ref<Campaign[]>([]);
  const selectedCampaign = ref<Campaign | null>(null);
  const loading = ref<boolean>(false);

  // ========== MJ Functions ==========

  /**
   * Récupère toutes les campagnes du MJ
   */
  const fetchCampaigns = async (): Promise<void> => {
    loading.value = true;
    try {
      const response = await fetch(`${API_URL}/mj/campaigns`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const data = await response.json();
      campaigns.value = data.data;
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Crée une nouvelle campagne
   */
  const createCampaign = async (data: {
    name: string;
    description?: string;
  }): Promise<Campaign> => {
    const response = await fetch(`${API_URL}/mj/campaigns`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create campaign");
    const result = await response.json();
    campaigns.value.unshift(result.data);
    return result.data;
  };

  /**
   * Met à jour une campagne
   */
  const updateCampaign = async (
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Campaign> => {
    const response = await fetch(`${API_URL}/mj/campaigns/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update campaign");
    const result = await response.json();
    const index = campaigns.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      campaigns.value[index] = result.data;
    }
    return result.data;
  };

  /**
   * Supprime une campagne
   */
  const deleteCampaign = async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/mj/campaigns/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to delete campaign");
    campaigns.value = campaigns.value.filter((c) => c.id !== id);
    if (selectedCampaign.value?.id === id) {
      selectedCampaign.value = null;
    }
  };

  /**
   * Récupère les membres d'une campagne
   */
  const getCampaignMembers = async (id: string): Promise<CampaignMember[]> => {
    const response = await fetch(`${API_URL}/mj/campaigns/${id}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch campaign members");
    const data = await response.json();
    console.log("📊 Campaign members from API:", data.data.members);
    return data.data.members;
  };

  /**
   * Récupère les détails complets d'une campagne avec ses membres
   */
  const getCampaignDetails = async (
    id: string,
  ): Promise<{ campaign: Campaign; members: CampaignMembership[] }> => {
    const response = await fetch(`${API_URL}/mj/campaigns/${id}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch campaign details");
    const data = await response.json();
    return {
      campaign: {
        id: data.data.id,
        name: data.data.name,
        description: data.data.description,
        created_at: data.data.created_at,
      },
      members: data.data.members,
    };
  };

  /**
   * Invite un streamer à rejoindre une campagne
   */
  const inviteStreamer = async (
    campaignId: string,
    payload:
      | { streamer_id: string }
      | {
          twitch_user_id: string;
          twitch_login: string;
          twitch_display_name: string;
          profile_image_url?: string;
        },
  ): Promise<void> => {
    const response = await fetch(
      `${API_URL}/mj/campaigns/${campaignId}/invite`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) throw new Error("Failed to invite streamer");
  };

  /**
   * Retire un membre d'une campagne
   */
  const removeMember = async (
    campaignId: string,
    memberId: string,
  ): Promise<void> => {
    const response = await fetch(
      `${API_URL}/mj/campaigns/${campaignId}/members/${memberId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to remove member");
  };

  /**
   * Recherche des streamers via Twitch API
   */
  const searchTwitchStreamers = async (
    query: string,
  ): Promise<StreamerSearchResult[]> => {
    const response = await fetch(
      `${API_URL}/mj/twitch/search-streamers?q=${encodeURIComponent(query)}`,
      { credentials: "include" },
    );
    if (!response.ok) throw new Error("Failed to search streamers");
    const data = await response.json();
    return data.data;
  };

  // ========== Streamer Functions ==========

  /**
   * Récupère les invitations en attente pour le streamer
   */
  const fetchInvitations = async (): Promise<CampaignInvitation[]> => {
    const response = await fetch(`${API_URL}/streamer/campaigns/invitations`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch invitations");
    const data = await response.json();
    return data.data;
  };

  /**
   * Accepte une invitation
   */
  const acceptInvitation = async (id: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/streamer/campaigns/invitations/${id}/accept`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to accept invitation");
  };

  /**
   * Refuse une invitation
   */
  const declineInvitation = async (id: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/streamer/campaigns/invitations/${id}/decline`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to decline invitation");
  };

  /**
   * Récupère les campagnes actives du streamer
   */
  const fetchActiveCampaigns = async (): Promise<Campaign[]> => {
    const response = await fetch(`${API_URL}/streamer/campaigns`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch active campaigns");
    const data = await response.json();
    return data.data;
  };

  /**
   * Quitte une campagne
   */
  const leaveCampaign = async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/streamer/campaigns/${id}/leave`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to leave campaign");
  };

  // ========== Authorization Methods ==========

  /**
   * Accorde l'autorisation pour 12 heures
   */
  const grantAuthorization = async (
    campaignId: string,
  ): Promise<{ expires_at: string; remaining_seconds: number }> => {
    const response = await fetch(
      `${API_URL}/api/v2/streamer/campaigns/${campaignId}/authorize`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to grant authorization");
    const data = await response.json();
    return data.data;
  };

  /**
   * Révoque l'autorisation
   */
  const revokeAuthorization = async (campaignId: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/api/v2/streamer/campaigns/${campaignId}/authorize`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to revoke authorization");
  };

  /**
   * Récupère le statut d'autorisation pour toutes les campagnes
   */
  const getAuthorizationStatus = async (): Promise<any[]> => {
    const response = await fetch(
      `${API_URL}/api/v2/streamer/campaigns/authorization-status`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to fetch authorization status");
    const data = await response.json();
    return data.data;
  };

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
  };
};
