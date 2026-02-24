import { ref, readonly } from 'vue'

// ─── Types ───────────────────────────────────────────────────

export interface ItemIntrospectionTree {
  sources: ItemSource[]
  systemId: string | null
}

export interface ItemSource {
  key: 'spells' | 'features' | 'inventory'
  label: string
  icon: string
  totalCount: number
  groups: ItemGroup[]
}

export interface ItemGroup {
  groupKey: string
  groupLabel: string
  groupProperty: string
  count: number
  samples: ItemSample[]
  suggestedRule: SuggestedRuleData
  existingRule: {
    id: string
    category: string
    label: string
    isEnabled: boolean
  } | null
}

export interface ItemSample {
  name: string
  properties: Record<string, string | number | boolean | null>
}

export interface SuggestedRuleData {
  category: 'spell' | 'feature' | 'inventory'
  subcategory: string
  itemType: string
  matchField: string | null
  matchValue: string | null
  label: string
  icon: string | null
  color: string | null
  isTargetable: boolean
  weight: number
  priority: number
}

// ─── Composable ──────────────────────────────────────────────

export const useItemIntrospection = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  const tree = ref<ItemIntrospectionTree | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchTree = async (campaignId: string): Promise<ItemIntrospectionTree> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/item-introspection`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error("Échec de la récupération de l'arbre d'items")
      const data = await response.json()
      tree.value = data
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    tree: readonly(tree),
    loading: readonly(loading),
    error: readonly(error),
    fetchTree,
  }
}
