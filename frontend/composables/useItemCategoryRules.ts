import { ref, readonly } from 'vue'

export interface ItemCategoryRule {
  id: string
  campaignId: string
  category: 'spell' | 'feature' | 'inventory'
  subcategory: string
  itemType: string
  matchField: string | null
  matchValue: string | null
  label: string
  description: string | null
  icon: string | null
  color: string | null
  isTargetable: boolean
  weight: number
  priority: number
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateItemCategoryRuleData {
  category: 'spell' | 'feature' | 'inventory'
  subcategory: string
  itemType: string
  matchField?: string | null
  matchValue?: string | null
  label: string
  description?: string | null
  icon?: string | null
  color?: string | null
  isTargetable?: boolean
  weight?: number
  priority?: number
  isEnabled?: boolean
}

export interface UpdateItemCategoryRuleData {
  category?: 'spell' | 'feature' | 'inventory'
  subcategory?: string
  itemType?: string
  matchField?: string | null
  matchValue?: string | null
  label?: string
  description?: string | null
  icon?: string | null
  color?: string | null
  isTargetable?: boolean
  weight?: number
  priority?: number
  isEnabled?: boolean
}

export const useItemCategoryRules = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  const rules = ref<ItemCategoryRule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchRules = async (campaignId: string): Promise<ItemCategoryRule[]> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/item-category-rules`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Échec de la récupération des catégories')
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

  const createRule = async (
    campaignId: string,
    data: CreateItemCategoryRuleData
  ): Promise<ItemCategoryRule> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/item-category-rules`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Échec de la création de la catégorie')
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

  const updateRule = async (
    campaignId: string,
    ruleId: string,
    data: UpdateItemCategoryRuleData
  ): Promise<ItemCategoryRule> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/item-category-rules/${ruleId}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Échec de la mise à jour de la catégorie')
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

  const deleteRule = async (campaignId: string, ruleId: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/item-category-rules/${ruleId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
      if (!response.ok) throw new Error('Échec de la suppression de la catégorie')
      rules.value = rules.value.filter((r) => r.id !== ruleId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    } finally {
      loading.value = false
    }
  }

  const toggleRule = async (campaignId: string, rule: ItemCategoryRule): Promise<void> => {
    await updateRule(campaignId, rule.id, { isEnabled: !rule.isEnabled })
  }

  const syncCategories = async (
    campaignId: string
  ): Promise<{ synchronized: number; changed: number }> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/item-category-rules/sync`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Échec de la synchronisation')
      }
      return await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    } finally {
      loading.value = false
    }
  }

  const detectCategories = async (campaignId: string): Promise<ItemCategoryRule[]> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/item-category-rules/detect`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || "Échec de l'auto-détection")
      }
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

  return {
    rules: readonly(rules),
    loading: readonly(loading),
    error: readonly(error),
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    detectCategories,
    syncCategories,
  }
}
