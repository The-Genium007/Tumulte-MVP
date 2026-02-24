import { ref, computed } from 'vue'

export interface GmCharacterAssignment {
  streamerId: string
  streamerName: string
}

export interface GmCharacter {
  id: string
  name: string
  avatarUrl: string | null
  characterType: 'pc' | 'npc' | 'monster'
  characterTypeOverride: boolean
  vttCharacterId: string
  stats: Record<string, unknown> | null
  lastSyncAt: string | null
  assignedToStreamer: GmCharacterAssignment | null
}

/**
 * Composable for managing GM character incarnation
 *
 * Allows the GM to:
 * - List all characters in a campaign (PCs and NPCs)
 * - Set/unset the currently active character they are incarnating
 */
export const useGmCharacters = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  const characters = ref<GmCharacter[]>([])
  const activeCharacter = ref<GmCharacter | null>(null)
  const loading = ref(false)
  const updating = ref(false)

  // Computed: separate PCs and NPCs
  const playerCharacters = computed(() => characters.value.filter((c) => c.characterType === 'pc'))

  const nonPlayerCharacters = computed(() =>
    characters.value.filter((c) => c.characterType === 'npc')
  )

  const monsterCharacters = computed(() =>
    characters.value.filter((c) => c.characterType === 'monster')
  )

  /**
   * Fetch all characters available for GM incarnation
   */
  const fetchCharacters = async (campaignId: string): Promise<void> => {
    loading.value = true
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/characters`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch characters')

      const data = await response.json()
      characters.value = data.data
    } catch (error) {
      console.error('Failed to fetch GM characters:', error)
      characters.value = []
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch the currently active character for the GM
   */
  const fetchActiveCharacter = async (campaignId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/active-character`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch active character')

      const data = await response.json()
      activeCharacter.value = data.data
    } catch (error) {
      console.error('Failed to fetch active character:', error)
      activeCharacter.value = null
      throw error
    }
  }

  /**
   * Set the active character for the GM
   * @param characterId - The character ID to set as active, or null to clear
   */
  const setActiveCharacter = async (
    campaignId: string,
    characterId: string | null
  ): Promise<void> => {
    updating.value = true
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/active-character`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set active character')
      }

      const data = await response.json()
      activeCharacter.value = data.data
    } catch (error) {
      console.error('Failed to set active character:', error)
      throw error
    } finally {
      updating.value = false
    }
  }

  /**
   * Clear the active character (convenience method)
   */
  const clearActiveCharacter = async (campaignId: string): Promise<void> => {
    await setActiveCharacter(campaignId, null)
  }

  /**
   * Toggle a character's type between NPC and Monster
   */
  const toggleCharacterType = async (
    campaignId: string,
    characterId: string,
    newType: 'npc' | 'monster'
  ): Promise<void> => {
    const response = await fetch(
      `${API_URL}/mj/campaigns/${campaignId}/characters/${characterId}/type`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterType: newType }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to toggle character type')
    }

    const data = await response.json()

    // Update local state
    const index = characters.value.findIndex((c) => c.id === characterId)
    const char = characters.value[index]
    if (char) {
      char.characterType = data.data.characterType
      char.characterTypeOverride = data.data.characterTypeOverride
    }

    // Also update activeCharacter if it's the one being toggled
    if (activeCharacter.value?.id === characterId) {
      activeCharacter.value.characterType = data.data.characterType
      activeCharacter.value.characterTypeOverride = data.data.characterTypeOverride
    }
  }

  /**
   * Initialize: fetch both characters list and active character
   */
  const initialize = async (campaignId: string): Promise<void> => {
    await Promise.all([fetchCharacters(campaignId), fetchActiveCharacter(campaignId)])
  }

  return {
    // State
    characters,
    activeCharacter,
    loading,
    updating,

    // Computed
    playerCharacters,
    nonPlayerCharacters,
    monsterCharacters,

    // Methods
    fetchCharacters,
    fetchActiveCharacter,
    setActiveCharacter,
    clearActiveCharacter,
    toggleCharacterType,
    initialize,
  }
}
