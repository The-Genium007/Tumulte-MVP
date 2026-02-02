import type { Ref } from 'vue'

/**
 * Configuration d'un événement gamification vue par le streamer
 */
export interface StreamerGamificationEvent {
  eventId: string
  eventName: string
  eventSlug: string
  eventDescription: string | null
  actionType: string
  rewardColor: string

  // État MJ
  isEnabledByCampaign: boolean

  // État Streamer
  isEnabledByStreamer: boolean
  twitchRewardId: string | null
  twitchRewardStatus: 'not_created' | 'active' | 'paused' | 'error'

  // Coûts
  recommendedCost: number
  streamerCostOverride: number | null
  effectiveCost: number

  // Explications
  difficultyExplanation: string
}

interface GamificationListResponse {
  data: {
    events: StreamerGamificationEvent[]
    hasAnyEnabled: boolean
    canUseChannelPoints: boolean
  }
}

interface EnableEventResponse {
  data: {
    eventId: string
    isEnabledByStreamer: boolean
    twitchRewardId: string | null
    twitchRewardStatus: string
    effectiveCost: number
  }
  message: string
}

interface UpdateCostResponse {
  data: {
    eventId: string
    streamerCostOverride: number | null
    effectiveCost: number
  }
  message: string
}

/**
 * Composable pour gérer la gamification côté streamer
 *
 * Permet aux streamers de :
 * - Voir les événements activés par le MJ
 * - Activer/désactiver les rewards sur leur chaîne
 * - Personnaliser le coût en points de chaîne
 */
export function useStreamerGamification(campaignId: Ref<string> | string) {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase
  const toast = useToast()

  const events = ref<StreamerGamificationEvent[]>([])
  const hasAnyEnabled = ref(false)
  const canUseChannelPoints = ref(true) // Par défaut true, mis à jour après fetch
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // États de chargement individuels par événement
  const loadingStates = ref<Record<string, boolean>>({})

  const getCampaignId = () => (typeof campaignId === 'string' ? campaignId : campaignId.value)

  /**
   * Récupère la liste des événements gamification disponibles
   */
  async function fetchEvents() {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/dashboard/campaigns/${getCampaignId()}/gamification`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: GamificationListResponse = await response.json()
      events.value = data.data.events
      hasAnyEnabled.value = data.data.hasAnyEnabled
      canUseChannelPoints.value = data.data.canUseChannelPoints
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors du chargement'
      console.error('[useStreamerGamification] fetchEvents error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Active un événement sur la chaîne du streamer
   */
  async function enableEvent(eventId: string, costOverride?: number) {
    loadingStates.value[eventId] = true

    try {
      const payload: Record<string, number> = {}
      if (costOverride !== undefined) {
        payload.costOverride = costOverride
      }

      const response = await fetch(
        `${API_URL}/dashboard/campaigns/${getCampaignId()}/gamification/events/${eventId}/enable`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: EnableEventResponse = await response.json()

      // Mettre à jour l'événement local
      const eventIndex = events.value.findIndex((e) => e.eventId === eventId)
      if (eventIndex !== -1 && events.value[eventIndex]) {
        events.value[eventIndex].isEnabledByStreamer = data.data.isEnabledByStreamer
        events.value[eventIndex].twitchRewardId = data.data.twitchRewardId
        events.value[eventIndex].twitchRewardStatus = data.data
          .twitchRewardStatus as StreamerGamificationEvent['twitchRewardStatus']
        events.value[eventIndex].effectiveCost = data.data.effectiveCost
      }

      hasAnyEnabled.value = events.value.some((e) => e.isEnabledByStreamer)

      toast.add({
        title: 'Récompense activée',
        description: data.message,
        color: 'success',
      })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'activer la récompense"
      toast.add({
        title: 'Erreur',
        description: message,
        color: 'error',
      })
      return false
    } finally {
      loadingStates.value[eventId] = false
    }
  }

  /**
   * Désactive un événement sur la chaîne du streamer
   */
  async function disableEvent(eventId: string) {
    loadingStates.value[eventId] = true

    try {
      const response = await fetch(
        `${API_URL}/dashboard/campaigns/${getCampaignId()}/gamification/events/${eventId}/disable`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Mettre à jour l'événement local
      const eventIndex = events.value.findIndex((e) => e.eventId === eventId)
      if (eventIndex !== -1 && events.value[eventIndex]) {
        events.value[eventIndex].isEnabledByStreamer = false
        events.value[eventIndex].twitchRewardId = null
        events.value[eventIndex].twitchRewardStatus = 'not_created'
      }

      hasAnyEnabled.value = events.value.some((e) => e.isEnabledByStreamer)

      toast.add({
        title: 'Récompense désactivée',
        description: 'La récompense a été retirée de votre chaîne',
        color: 'success',
      })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de désactiver la récompense'
      toast.add({
        title: 'Erreur',
        description: message,
        color: 'error',
      })
      return false
    } finally {
      loadingStates.value[eventId] = false
    }
  }

  /**
   * Met à jour le coût personnalisé d'un événement
   */
  async function updateCost(eventId: string, cost: number) {
    loadingStates.value[eventId] = true

    try {
      const response = await fetch(
        `${API_URL}/dashboard/campaigns/${getCampaignId()}/gamification/events/${eventId}/cost`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cost }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: UpdateCostResponse = await response.json()

      // Mettre à jour l'événement local
      const eventIndex = events.value.findIndex((e) => e.eventId === eventId)
      if (eventIndex !== -1 && events.value[eventIndex]) {
        events.value[eventIndex].streamerCostOverride = data.data.streamerCostOverride
        events.value[eventIndex].effectiveCost = data.data.effectiveCost
      }

      toast.add({
        title: 'Coût mis à jour',
        description: data.message,
        color: 'success',
      })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de mettre à jour le coût'
      toast.add({
        title: 'Erreur',
        description: message,
        color: 'error',
      })
      return false
    } finally {
      loadingStates.value[eventId] = false
    }
  }

  /**
   * Toggle l'état d'activation d'un événement
   */
  async function toggleEvent(eventId: string) {
    const event = events.value.find((e) => e.eventId === eventId)
    if (!event) return false

    if (event.isEnabledByStreamer) {
      return disableEvent(eventId)
    } else {
      return enableEvent(eventId)
    }
  }

  /**
   * Vérifie si un événement est en cours de chargement
   */
  function isEventLoading(eventId: string) {
    return loadingStates.value[eventId] ?? false
  }

  return {
    // State
    events,
    hasAnyEnabled,
    canUseChannelPoints,
    isLoading,
    error,

    // Actions
    fetchEvents,
    enableEvent,
    disableEvent,
    updateCost,
    toggleEvent,
    isEventLoading,
  }
}
