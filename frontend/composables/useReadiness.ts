import { ref } from 'vue'
import type { CampaignReadiness } from '@/types'
import { useStreamerReadinessStore } from '@/stores/streamerReadiness'

/**
 * Composable pour gérer les appels API liés à la readiness des streamers
 */
export const useReadiness = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase
  const store = useStreamerReadinessStore()

  const error = ref<string | null>(null)

  /**
   * Récupère l'état de readiness des streamers d'une campagne
   */
  const fetchReadiness = async (campaignId: string): Promise<CampaignReadiness> => {
    error.value = null
    store.setLoading(true)

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/dashboards/readiness`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch readiness')
      }

      const data = await response.json()
      store.setReadiness(data.data)
      return data.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error fetching readiness'
      throw err
    } finally {
      store.setLoading(false)
    }
  }

  /**
   * Notifie les streamers non prêts d'une campagne
   */
  const notifyUnready = async (
    campaignId: string
  ): Promise<{ notified: number; streamers: string[] }> => {
    error.value = null

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/notify-unready`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to notify streamers')
      }

      const data = await response.json()
      return data.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error notifying streamers'
      throw err
    }
  }

  /**
   * Lance une session et gère la réponse (succès ou waiting list)
   */
  const launchSession = async (
    campaignId: string,
    sessionId: string
  ): Promise<{ success: boolean; data?: unknown }> => {
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/sessions/${sessionId}/launch`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )

      // Si 503, c'est un health check failed - vérifier si on a les readinessDetails
      if (response.status === 503) {
        const data = await response.json()

        if (data.readinessDetails) {
          // Ouvrir la modal de waiting list
          store.openModal(campaignId, sessionId, data.readinessDetails)
          return { success: false }
        }

        // Autre erreur de health check (pas de readiness)
        throw new Error(data.error || 'Health check failed')
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to launch session')
      }

      const data = await response.json()
      return { success: true, data: data.data }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error launching session'
      throw err
    }
  }

  /**
   * Retente le lancement après que tous les streamers sont prêts
   */
  const retryLaunch = async (): Promise<{
    success: boolean
    data?: unknown
  }> => {
    if (!store.pendingCampaignId || !store.pendingSessionId) {
      throw new Error('No pending session to retry')
    }

    return launchSession(store.pendingCampaignId, store.pendingSessionId)
  }

  return {
    // State
    error,
    store,

    // Methods
    fetchReadiness,
    notifyUnready,
    launchSession,
    retryLaunch,
  }
}
