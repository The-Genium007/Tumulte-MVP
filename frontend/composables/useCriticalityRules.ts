import { ref, readonly } from 'vue'

export interface CriticalityRule {
  id: string
  campaignId: string
  diceFormula: string | null
  resultCondition: string
  resultField: 'max_die' | 'min_die' | 'total' | 'any_die'
  criticalType: 'success' | 'failure'
  severity: 'minor' | 'major' | 'extreme'
  label: string
  description: string | null
  priority: number
  isEnabled: boolean
  isSystemPreset: boolean
  presetKey: string | null
  createdAt: string
  updatedAt: string
}

export interface SystemInfo {
  gameSystemId: string | null
  systemName: string | null
  isKnownSystem: boolean
  capabilities: {
    hasSpells: boolean
    hasTraditionalCriticals: boolean
    hasDicePool: boolean
    hasPercentile: boolean
    hasFudgeDice: boolean
    hasNarrativeDice: boolean
    primaryDie: string | null
  } | null
  recommendedEvents: string[]
  availableWithWarning: string[]
  presetRulesCount: number
  presetRulesActive: number
}

export interface CreateCriticalityRuleData {
  diceFormula?: string | null
  resultCondition: string
  resultField?: 'max_die' | 'min_die' | 'total' | 'any_die'
  criticalType: 'success' | 'failure'
  severity?: 'minor' | 'major' | 'extreme'
  label: string
  description?: string | null
  priority?: number
  isEnabled?: boolean
}

export interface UpdateCriticalityRuleData {
  diceFormula?: string | null
  resultCondition?: string
  resultField?: 'max_die' | 'min_die' | 'total' | 'any_die'
  criticalType?: 'success' | 'failure'
  severity?: 'minor' | 'major' | 'extreme'
  label?: string
  description?: string | null
  priority?: number
  isEnabled?: boolean
}

/**
 * Composable pour la gestion des règles de criticité custom par campagne
 */
export const useCriticalityRules = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  const rules = ref<CriticalityRule[]>([])
  const systemInfo = ref<SystemInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Récupère les règles d'une campagne
   */
  const fetchRules = async (campaignId: string): Promise<CriticalityRule[]> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/criticality-rules`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Échec de la récupération des règles')
      const data = await response.json()
      rules.value = Array.isArray(data) ? data : (data.data ?? [])
      return rules.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Crée une nouvelle règle
   */
  const createRule = async (
    campaignId: string,
    data: CreateCriticalityRuleData
  ): Promise<CriticalityRule> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/criticality-rules`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Échec de la création de la règle')
      }
      const result = await response.json()
      const rule = result.data ?? result
      rules.value.push(rule)
      return rule
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Met à jour une règle existante
   */
  const updateRule = async (
    campaignId: string,
    ruleId: string,
    data: UpdateCriticalityRuleData
  ): Promise<CriticalityRule> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/criticality-rules/${ruleId}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Échec de la mise à jour de la règle')
      }
      const result = await response.json()
      const updated = result.data ?? result

      const index = rules.value.findIndex((r) => r.id === ruleId)
      if (index !== -1) {
        rules.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Supprime une règle
   */
  const deleteRule = async (campaignId: string, ruleId: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/criticality-rules/${ruleId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
      if (!response.ok) throw new Error('Échec de la suppression de la règle')
      rules.value = rules.value.filter((r) => r.id !== ruleId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle l'activation d'une règle
   */
  const toggleRule = async (campaignId: string, rule: CriticalityRule): Promise<void> => {
    await updateRule(campaignId, rule.id, { isEnabled: !rule.isEnabled })
  }

  /**
   * Récupère les infos système (presets, capabilities, recommandations)
   */
  const fetchSystemInfo = async (campaignId: string): Promise<SystemInfo | null> => {
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/system-info`, {
        credentials: 'include',
      })
      if (!response.ok) return null
      const data = await response.json()
      systemInfo.value = data
      return data
    } catch {
      return null
    }
  }

  return {
    rules: readonly(rules),
    systemInfo: readonly(systemInfo),
    loading: readonly(loading),
    error: readonly(error),
    fetchRules,
    fetchSystemInfo,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  }
}
