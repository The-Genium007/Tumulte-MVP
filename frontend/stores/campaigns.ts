import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { campaignsRepository } from '~/api/repositories/campaigns_repository'
import type {
  Campaign,
  CampaignDetail,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '~/types/api'
import {
  storeCampaigns,
  getStoredCampaigns,
  storeCampaignDetail,
  getStoredCampaignDetail,
} from '@/utils/offline-storage'
import { useAnalytics } from '@/composables/useAnalytics'

/**
 * Store Pinia pour la gestion des campagnes (MJ)
 */
export const useCampaignsStore = defineStore('campaigns', () => {
  // Analytics
  const { track, setUserPropertiesOnce } = useAnalytics()

  // State
  const campaigns = ref<Campaign[]>([])
  const selectedCampaign = ref<CampaignDetail | null>(null)
  const loading = ref(false)
  const _error = ref<string | null>(null)
  const isOfflineData = ref(false)

  // Getters
  const activeCampaigns = computed(() => {
    return campaigns.value.filter((c) => c.activeMemberCount > 0)
  })

  const hasCampaigns = computed(() => campaigns.value.length > 0)

  const error = computed(() => _error.value)

  // Actions
  async function fetchCampaigns() {
    loading.value = true
    _error.value = null

    // Load from offline storage first for instant display
    try {
      const storedCampaigns = await getStoredCampaigns()
      if (storedCampaigns && campaigns.value.length === 0) {
        campaigns.value = storedCampaigns
        isOfflineData.value = true
      }
    } catch (offlineErr) {
      console.warn('[CampaignsStore] Failed to load from offline storage:', offlineErr)
    }

    try {
      const freshCampaigns = await campaignsRepository.list()
      campaigns.value = freshCampaigns
      isOfflineData.value = false

      // Persist to offline storage
      await storeCampaigns(freshCampaigns)
    } catch (err) {
      // Keep offline data if available
      if (!isOfflineData.value) {
        _error.value = err instanceof Error ? err.message : 'Failed to fetch campaigns'
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchCampaign(id: string) {
    loading.value = true
    _error.value = null

    // Load from offline storage first
    try {
      const storedCampaign = await getStoredCampaignDetail(id)
      if (storedCampaign && !selectedCampaign.value) {
        selectedCampaign.value = storedCampaign
        isOfflineData.value = true
      }
    } catch (offlineErr) {
      console.warn('[CampaignsStore] Failed to load campaign from offline storage:', offlineErr)
    }

    try {
      const freshCampaign = await campaignsRepository.get(id)
      selectedCampaign.value = freshCampaign
      isOfflineData.value = false

      // Persist to offline storage
      await storeCampaignDetail(freshCampaign)

      return selectedCampaign.value
    } catch (err) {
      // Keep offline data if available
      if (!isOfflineData.value) {
        _error.value = err instanceof Error ? err.message : 'Failed to fetch campaign'
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createCampaign(data: CreateCampaignRequest) {
    loading.value = true
    _error.value = null

    try {
      // Vérifier si c'est la première campagne AVANT la création
      const isFirstCampaign = campaigns.value.length === 0

      const newCampaign = await campaignsRepository.create(data)
      campaigns.value.unshift(newCampaign)

      // Track la création de campagne
      track('campaign_created', {
        campaign_id: newCampaign.id,
        campaign_name: newCampaign.name, // eslint-disable-line camelcase
        is_first_campaign: isFirstCampaign, // eslint-disable-line camelcase
      })

      // Marquer "first_campaign_at" une seule fois (ne change jamais après)
      if (isFirstCampaign) {
        // eslint-disable-next-line camelcase
        setUserPropertiesOnce({ first_campaign_at: new Date().toISOString() })
      }

      return newCampaign
    } catch (err) {
      _error.value = err instanceof Error ? err.message : 'Failed to create campaign'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateCampaign(id: string, data: UpdateCampaignRequest) {
    loading.value = true
    _error.value = null

    try {
      const updatedCampaign = await campaignsRepository.update(id, data)

      // Mettre à jour dans la liste
      const index = campaigns.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        campaigns.value[index] = updatedCampaign
      }

      // Mettre à jour la campagne sélectionnée si c'est la même
      if (selectedCampaign.value?.id === id) {
        selectedCampaign.value = {
          ...selectedCampaign.value,
          ...updatedCampaign,
        }
      }

      return updatedCampaign
    } catch (err) {
      _error.value = err instanceof Error ? err.message : 'Failed to update campaign'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteCampaign(id: string) {
    loading.value = true
    _error.value = null

    try {
      await campaignsRepository.delete(id)

      // Retirer de la liste
      campaigns.value = campaigns.value.filter((c) => c.id !== id)

      // Retirer la sélection si c'est la même
      if (selectedCampaign.value?.id === id) {
        selectedCampaign.value = null
      }
    } catch (err) {
      _error.value = err instanceof Error ? err.message : 'Failed to delete campaign'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function inviteStreamer(campaignId: string, streamerId: string) {
    loading.value = true
    _error.value = null

    try {
      const member = await campaignsRepository.inviteStreamer(campaignId, {
        streamerId,
      })

      // Ajouter le membre à la campagne sélectionnée si c'est la même
      if (selectedCampaign.value?.id === campaignId) {
        if (!selectedCampaign.value.members) {
          selectedCampaign.value.members = []
        }
        selectedCampaign.value.members.push(member)
      }

      // Track l'invitation du streamer
      track('streamer_invited', {
        campaign_id: campaignId,
        campaign_name: selectedCampaign.value?.name, // eslint-disable-line camelcase
        member_count: selectedCampaign.value?.members?.length ?? 1, // eslint-disable-line camelcase
      })

      return member
    } catch (err) {
      _error.value = err instanceof Error ? err.message : 'Failed to invite streamer'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeMember(campaignId: string, memberId: string) {
    loading.value = true
    _error.value = null

    try {
      await campaignsRepository.removeMember(campaignId, memberId)

      // Retirer le membre de la campagne sélectionnée si c'est la même
      if (selectedCampaign.value?.id === campaignId && selectedCampaign.value.members) {
        selectedCampaign.value.members = selectedCampaign.value.members.filter(
          (m) => m.id !== memberId
        )
      }
    } catch (err) {
      _error.value = err instanceof Error ? err.message : 'Failed to remove member'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    _error.value = null
  }

  function clearSelection() {
    selectedCampaign.value = null
  }

  return {
    // State
    campaigns,
    selectedCampaign,
    loading,
    error,
    isOfflineData,

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
  }
})
