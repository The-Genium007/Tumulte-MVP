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
  createdAt: string
  updatedAt: string
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

  return {
    rules: readonly(rules),
    loading: readonly(loading),
    error: readonly(error),
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  }
}
