import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { campaignsRepository } from "~/api/repositories/campaigns_repository";
import type {
  Campaign,
  CampaignDetail,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from "~/types/api";

/**
 * Store Pinia pour la gestion des campagnes (MJ)
 */
export const useCampaignsStore = defineStore("campaigns", () => {
  // State
  const campaigns = ref<Campaign[]>([]);
  const selectedCampaign = ref<CampaignDetail | null>(null);
  const loading = ref(false);
  const _error = ref<string | null>(null);

  // Getters
  const activeCampaigns = computed(() => {
    return campaigns.value.filter((c) => c.activeMemberCount > 0);
  });

  const hasCampaigns = computed(() => campaigns.value.length > 0);

  const error = computed(() => _error.value);

  // Actions
  async function fetchCampaigns() {
    loading.value = true;
    _error.value = null;

    try {
      campaigns.value = await campaignsRepository.list();
    } catch (err) {
      _error.value =
        err instanceof Error ? err.message : "Failed to fetch campaigns";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCampaign(id: string) {
    loading.value = true;
    _error.value = null;

    try {
      selectedCampaign.value = await campaignsRepository.get(id);
      return selectedCampaign.value;
    } catch (err) {
      _error.value =
        err instanceof Error ? err.message : "Failed to fetch campaign";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createCampaign(data: CreateCampaignRequest) {
    loading.value = true;
    _error.value = null;

    try {
      const newCampaign = await campaignsRepository.create(data);
      campaigns.value.unshift(newCampaign);
      return newCampaign;
    } catch (err) {
      _error.value =
        err instanceof Error ? err.message : "Failed to create campaign";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateCampaign(id: string, data: UpdateCampaignRequest) {
    loading.value = true;
    _error.value = null;

    try {
      const updatedCampaign = await campaignsRepository.update(id, data);

      // Mettre à jour dans la liste
      const index = campaigns.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        campaigns.value[index] = updatedCampaign;
      }

      // Mettre à jour la campagne sélectionnée si c'est la même
      if (selectedCampaign.value?.id === id) {
        selectedCampaign.value = {
          ...selectedCampaign.value,
          ...updatedCampaign,
        };
      }

      return updatedCampaign;
    } catch (err) {
      _error.value =
        err instanceof Error ? err.message : "Failed to update campaign";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteCampaign(id: string) {
    loading.value = true;
    _error.value = null;

    try {
      await campaignsRepository.delete(id);

      // Retirer de la liste
      campaigns.value = campaigns.value.filter((c) => c.id !== id);

      // Retirer la sélection si c'est la même
      if (selectedCampaign.value?.id === id) {
        selectedCampaign.value = null;
      }
    } catch (err) {
      _error.value =
        err instanceof Error ? err.message : "Failed to delete campaign";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function inviteStreamer(campaignId: string, streamerId: string) {
    loading.value = true;
    _error.value = null;

    try {
      const member = await campaignsRepository.inviteStreamer(campaignId, {
        streamerId,
      });

      // Ajouter le membre à la campagne sélectionnée si c'est la même
      if (selectedCampaign.value?.id === campaignId) {
        if (!selectedCampaign.value.members) {
          selectedCampaign.value.members = [];
        }
        selectedCampaign.value.members.push(member);
      }

      return member;
    } catch (err) {
      _error.value =
        err instanceof Error ? err.message : "Failed to invite streamer";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function removeMember(campaignId: string, memberId: string) {
    loading.value = true;
    _error.value = null;

    try {
      await campaignsRepository.removeMember(campaignId, memberId);

      // Retirer le membre de la campagne sélectionnée si c'est la même
      if (
        selectedCampaign.value?.id === campaignId &&
        selectedCampaign.value.members
      ) {
        selectedCampaign.value.members = selectedCampaign.value.members.filter(
          (m) => m.id !== memberId,
        );
      }
    } catch (err) {
      _error.value =
        err instanceof Error ? err.message : "Failed to remove member";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    _error.value = null;
  }

  function clearSelection() {
    selectedCampaign.value = null;
  }

  return {
    // State
    campaigns,
    selectedCampaign,
    loading,
    error,

    // Getters
    activeCampaigns,
    hasCampaigns,

    // Actions
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    inviteStreamer,
    removeMember,
    clearError,
    clearSelection,
  };
});
