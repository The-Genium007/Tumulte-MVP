import { ref, readonly, computed } from 'vue'
import type {
  GamificationEvent,
  CampaignGamificationConfig,
  GamificationInstance,
  UpdateGamificationConfigRequest,
  GamificationCooldownStatus,
} from '@/types/api'

/**
 * Composable pour la gestion de la gamification
 *
 * Permet au MJ de configurer les événements de gamification par campagne
 * et de suivre les instances actives.
 */
export const useGamification = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  // State
  const events = ref<GamificationEvent[]>([])
  const configs = ref<CampaignGamificationConfig[]>([])
  const activeInstance = ref<GamificationInstance | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const enabledConfigs = computed(() => configs.value.filter((c) => c.isEnabled))

  const hasEnabledEvents = computed(() => enabledConfigs.value.length > 0)

  // ========== Events (System) ==========

  /**
   * Récupère tous les événements système disponibles
   */
  const fetchEvents = async (): Promise<GamificationEvent[]> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/mj/gamification/events`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch gamification events')
      const data = await response.json()
      events.value = data.data
      return events.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch events'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ========== Campaign Config ==========

  /**
   * Récupère la configuration gamification d'une campagne
   */
  const fetchCampaignConfigs = async (
    campaignId: string
  ): Promise<CampaignGamificationConfig[]> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/gamification`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch gamification config')
      const data = await response.json()
      configs.value = data.data
      return configs.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch config'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Active un événement pour une campagne (crée la config)
   */
  const enableEvent = async (
    campaignId: string,
    eventId: string
  ): Promise<CampaignGamificationConfig> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/gamification/events/${eventId}/enable`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to enable event')
      }
      const data = await response.json()
      const newConfig = data.data

      // Ajouter ou mettre à jour dans la liste locale
      const existingIndex = configs.value.findIndex((c) => c.eventId === eventId)
      if (existingIndex !== -1) {
        configs.value[existingIndex] = newConfig
      } else {
        configs.value.push(newConfig)
      }

      return newConfig
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to enable event'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Met à jour la configuration d'un événement pour une campagne
   */
  const updateConfig = async (
    campaignId: string,
    eventId: string,
    updates: UpdateGamificationConfigRequest
  ): Promise<CampaignGamificationConfig> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/gamification/events/${eventId}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update config')
      }
      const data = await response.json()
      const updatedConfig = data.data

      // Mettre à jour dans la liste locale
      const index = configs.value.findIndex((c) => c.eventId === eventId)
      if (index !== -1) {
        configs.value[index] = updatedConfig
      }

      return updatedConfig
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update config'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Désactive un événement pour une campagne
   */
  const disableEvent = async (campaignId: string, eventId: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/gamification/events/${eventId}/disable`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      if (!response.ok) throw new Error('Failed to disable event')

      // Retirer de la liste locale
      configs.value = configs.value.filter((c) => c.eventId !== eventId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disable event'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ========== Instances (Active Events) ==========

  /**
   * Récupère les instances actives d'une campagne
   */
  const fetchActiveInstances = async (campaignId: string): Promise<GamificationInstance[]> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/gamification/instances`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch active instances')
      const data = await response.json()
      return data.data
    } catch (err) {
      console.error('Failed to fetch active instances:', err)
      throw err
    }
  }

  /**
   * Annule une instance active
   */
  const cancelInstance = async (campaignId: string, instanceId: string): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/gamification/instances/${instanceId}/cancel`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      if (!response.ok) throw new Error('Failed to cancel instance')

      if (activeInstance.value?.id === instanceId) {
        activeInstance.value = null
      }
    } catch (err) {
      console.error('Failed to cancel instance:', err)
      throw err
    }
  }

  /**
   * Déclenche manuellement un événement (pour les événements de type 'manual')
   */
  const triggerEvent = async (
    campaignId: string,
    eventId: string,
    data?: { streamerId?: string; viewerCount?: number; customData?: Record<string, unknown> }
  ): Promise<GamificationInstance> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/gamification/trigger`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ...data }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to trigger event')
      }
      const result = await response.json()
      activeInstance.value = result.data
      return activeInstance.value!
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to trigger event'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ========== Cooldown ==========

  /**
   * Vérifie le statut de cooldown d'un événement
   */
  const checkCooldown = async (
    campaignId: string,
    eventId: string,
    streamerId?: string
  ): Promise<GamificationCooldownStatus> => {
    try {
      let url = `${API_URL}/mj/campaigns/${campaignId}/gamification/events/${eventId}/cooldown`
      if (streamerId) {
        url += `?streamerId=${streamerId}`
      }

      const response = await fetch(url, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to check cooldown')
      const data = await response.json()
      return data.data
    } catch (err) {
      console.error('Failed to check cooldown:', err)
      throw err
    }
  }

  /**
   * Réinitialise les cooldowns d'une campagne
   * Note: Cette fonctionnalité n'est pas encore implémentée côté backend
   */
  const resetCooldowns = async (_campaignId: string): Promise<{ count: number }> => {
    // TODO: Implémenter la route backend pour reset cooldowns
    console.warn('resetCooldowns: Route not implemented yet')
    return { count: 0 }
  }

  // ========== Test Functions (DEV/STAGING only) ==========

  /**
   * Force la complétion d'une instance (DEV/STAGING seulement)
   * Simule l'atteinte de l'objectif et exécute l'action immédiatement
   */
  const forceCompleteInstance = async (
    campaignId: string,
    instanceId: string
  ): Promise<GamificationInstance> => {
    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/gamification/instances/${instanceId}/force-complete`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to force complete instance')
      }
      const data = await response.json()
      return data.data
    } catch (err) {
      console.error('Failed to force complete instance:', err)
      throw err
    }
  }

  // ========== Helpers ==========

  /**
   * Efface les erreurs
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * Récupère la config d'un événement spécifique
   */
  const getConfigForEvent = (eventId: string): CampaignGamificationConfig | undefined => {
    return configs.value.find((c) => c.eventId === eventId)
  }

  return {
    // State
    events: readonly(events),
    configs: readonly(configs),
    activeInstance: readonly(activeInstance),
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    enabledConfigs,
    hasEnabledEvents,

    // Events
    fetchEvents,

    // Config
    fetchCampaignConfigs,
    enableEvent,
    updateConfig,
    disableEvent,
    getConfigForEvent,

    // Instances
    fetchActiveInstances,
    cancelInstance,
    triggerEvent,

    // Cooldown
    checkCooldown,
    resetCooldowns,

    // Test (DEV/STAGING only)
    forceCompleteInstance,

    // Helpers
    clearError,
  }
}
