import { ref } from 'vue'
import type { CampaignEvent } from '@/types/campaign-events'

/**
 * Composable pour la gestion des événements unifiés de campagne
 *
 * Permet de récupérer tous les types d'événements (sondages, gamification, etc.)
 * dans un format unifié pour l'affichage dans "Événements récents".
 */
export const useCampaignEvents = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  // State
  const events = ref<CampaignEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Récupère les événements unifiés d'une campagne
   *
   * @param campaignId - ID de la campagne
   * @param options - Options de filtrage
   */
  const fetchEvents = async (
    campaignId: string,
    options?: { limit?: number }
  ): Promise<CampaignEvent[]> => {
    if (!campaignId) return []

    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      if (options?.limit) {
        params.set('limit', String(options.limit))
      }

      const url = `${API_URL}/mj/campaigns/${campaignId}/events${params.toString() ? `?${params}` : ''}`

      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch campaign events')
      }

      const data = await response.json()
      events.value = data.data || []
      return events.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch events'
      events.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Rafraîchit les événements avec un délai optionnel
   * Utile après qu'un sondage ou une instance de gamification se termine
   */
  const refreshEvents = async (campaignId: string, delayMs: number = 500): Promise<void> => {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    await fetchEvents(campaignId)
  }

  /**
   * Formate une date ISO en format relatif français
   */
  const formatRelativeDate = (dateStr: string): string => {
    if (!dateStr) return ''

    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Format relatif pour les récents
    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`

    // Format date pour les plus anciens
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Efface les erreurs
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * Réinitialise le state
   */
  const reset = () => {
    events.value = []
    error.value = null
    loading.value = false
  }

  return {
    // State (writable refs for component compatibility)
    events,
    loading,
    error,

    // Methods
    fetchEvents,
    refreshEvents,
    formatRelativeDate,
    clearError,
    reset,
  }
}
