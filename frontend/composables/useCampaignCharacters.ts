import { ref } from 'vue'
import type { Character, CampaignSettings } from '@/types'

export const useCampaignCharacters = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  const characters = ref<Character[]>([])
  const currentCharacterId = ref<string | null>(null)
  const loading = ref(false)

  /**
   * Récupère les personnages disponibles pour une campagne
   */
  const fetchCharacters = async (campaignId: string): Promise<void> => {
    loading.value = true
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/${campaignId}/characters`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch characters')

      const data = await response.json()
      characters.value = data.characters
      currentCharacterId.value = data.currentAssignment?.character?.id || null
    } catch (error) {
      console.error('Failed to fetch characters:', error)
      characters.value = []
      currentCharacterId.value = null
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Accepte une invitation avec choix optionnel de personnage
   */
  const acceptInvitationWithCharacter = async (
    invitationId: string,
    characterId?: string | null
  ): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/dashboard/campaigns/invitations/${invitationId}/accept`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(characterId ? { characterId } : {}),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error)
      throw error
    }
  }

  /**
   * Récupère les paramètres de campagne (personnage assigné, etc.)
   */
  const getCampaignSettings = async (campaignId: string): Promise<CampaignSettings> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/${campaignId}/settings`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch campaign settings')

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch campaign settings:', error)
      throw error
    }
  }

  /**
   * Met à jour le personnage assigné pour une campagne
   */
  const updateCharacter = async (campaignId: string, characterId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/${campaignId}/character`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update character')
      }
    } catch (error) {
      console.error('Failed to update character:', error)
      throw error
    }
  }

  /**
   * Met à jour l'overlay sélectionné pour une campagne
   * @param overlayConfigId - null pour l'overlay système par défaut, ou l'ID d'un overlay personnalisé
   */
  const updateOverlay = async (
    campaignId: string,
    overlayConfigId: string | null
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/campaigns/${campaignId}/overlay`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overlayConfigId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update overlay')
      }
    } catch (error) {
      console.error('Failed to update overlay:', error)
      throw error
    }
  }

  return {
    // State
    characters,
    currentCharacterId,
    loading,

    // Methods
    fetchCharacters,
    acceptInvitationWithCharacter,
    getCampaignSettings,
    updateCharacter,
    updateOverlay,
  }
}
