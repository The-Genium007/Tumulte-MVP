import { ref } from 'vue'
import type { GmCharacter as _GmCharacter } from './useGmCharacters'

export interface PendingDiceRoll {
  id: string
  rollFormula: string
  result: number
  diceResults: number[]
  isCritical: boolean
  criticalType: 'success' | 'failure' | null
  rollType: string | null
  skill: string | null
  ability: string | null
  rolledAt: string
  // Context from VTT
  vttCharacterName?: string
  vttCharacterId?: string
}

/**
 * Composable for managing GM dice roll attribution
 *
 * Handles pending dice rolls that need to be attributed to a character
 */
export const useGmDiceAttribution = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  const pendingRolls = ref<PendingDiceRoll[]>([])
  const loading = ref(false)
  const attributing = ref(false)

  /**
   * Fetch pending dice rolls for a campaign
   */
  const fetchPendingRolls = async (campaignId: string): Promise<void> => {
    loading.value = true
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/pending-rolls`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch pending rolls')

      const data = await response.json()
      pendingRolls.value = data.data
    } catch (error) {
      console.error('Failed to fetch pending rolls:', error)
      pendingRolls.value = []
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Attribute a pending roll to a character
   * @param characterId - The character ID to attribute to, or null to ignore
   */
  const attributeRoll = async (
    campaignId: string,
    rollId: string,
    characterId: string | null
  ): Promise<void> => {
    attributing.value = true
    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/dice-rolls/${rollId}/attribute`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to attribute roll')
      }

      // Remove from pending list
      pendingRolls.value = pendingRolls.value.filter((r) => r.id !== rollId)
    } catch (error) {
      console.error('Failed to attribute roll:', error)
      throw error
    } finally {
      attributing.value = false
    }
  }

  /**
   * Add a new pending roll (from WebSocket event)
   */
  const addPendingRoll = (roll: PendingDiceRoll): void => {
    // Avoid duplicates
    if (!pendingRolls.value.find((r) => r.id === roll.id)) {
      pendingRolls.value.push(roll)
    }
  }

  /**
   * Remove a roll from pending (when attributed elsewhere)
   */
  const removePendingRoll = (rollId: string): void => {
    pendingRolls.value = pendingRolls.value.filter((r) => r.id !== rollId)
  }

  /**
   * Check if there are any pending rolls
   */
  const hasPendingRolls = computed(() => pendingRolls.value.length > 0)

  /**
   * Get the oldest pending roll (first in queue)
   */
  const oldestPendingRoll = computed(() => pendingRolls.value[0] || null)

  return {
    // State
    pendingRolls,
    loading,
    attributing,

    // Computed
    hasPendingRolls,
    oldestPendingRoll,

    // Methods
    fetchPendingRolls,
    attributeRoll,
    addPendingRoll,
    removePendingRoll,
  }
}
