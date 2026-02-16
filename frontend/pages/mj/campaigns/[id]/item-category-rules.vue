<script setup lang="ts">
import {
  useItemCategoryRules,
  type ItemCategoryRule,
  type CreateItemCategoryRuleData,
  type UpdateItemCategoryRuleData,
} from '~/composables/useItemCategoryRules'
import { useItemIntrospection, type ItemGroup } from '~/composables/useItemIntrospection'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const campaignId = computed(() => route.params.id as string)

// ─── Composables ──────────────────────────────────────────

const {
  rules,
  loading: rulesLoading,
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  detectCategories,
  syncCategories,
} = useItemCategoryRules()

const { tree, loading: treeLoading, fetchTree } = useItemIntrospection()

// ─── Explorer state ───────────────────────────────────────

const expandedSources = ref<Set<string>>(new Set(['spells', 'features', 'inventory']))
const selectedGroup = ref<ItemGroup | null>(null)
const selectedSourceKey = ref<string | null>(null)

const toggleSource = (key: string) => {
  if (expandedSources.value.has(key)) {
    expandedSources.value.delete(key)
  } else {
    expandedSources.value.add(key)
  }
  // Force reactivity
  expandedSources.value = new Set(expandedSources.value)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectGroup = (group: any, sourceKey: string) => {
  // Deep clone to break DeepReadonly constraint from composable readonly()
  selectedGroup.value = JSON.parse(JSON.stringify(group)) as ItemGroup
  selectedSourceKey.value = sourceKey
}

const sourceIcon = (key: string): string => {
  const icons: Record<string, string> = {
    spells: 'i-lucide-sparkles',
    features: 'i-lucide-swords',
    inventory: 'i-lucide-backpack',
  }
  return icons[key] ?? 'i-lucide-box'
}

// ─── Rules list state ─────────────────────────────────────

const activeTab = ref<'spell' | 'feature' | 'inventory'>('spell')
const tabs = [
  { key: 'spell', label: 'Sorts', icon: 'i-lucide-sparkles' },
  { key: 'feature', label: 'Capacités', icon: 'i-lucide-swords' },
  { key: 'inventory', label: 'Inventaire', icon: 'i-lucide-backpack' },
]

const filteredRules = computed(() => rules.value.filter((r) => r.category === activeTab.value))

const ruleCounts = computed(() => ({
  spell: rules.value.filter((r) => r.category === 'spell').length,
  feature: rules.value.filter((r) => r.category === 'feature').length,
  inventory: rules.value.filter((r) => r.category === 'inventory').length,
}))

// ─── Modal state ──────────────────────────────────────────

const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingRule = ref<ItemCategoryRule | null>(null)
const deletingRule = ref<ItemCategoryRule | null>(null)

const defaultForm: CreateItemCategoryRuleData = {
  category: 'spell',
  subcategory: '',
  itemType: '',
  matchField: null,
  matchValue: null,
  label: '',
  description: null,
  icon: null,
  color: null,
  isTargetable: true,
  weight: 1,
  priority: 0,
  isEnabled: true,
}

const form = ref<CreateItemCategoryRuleData>({ ...defaultForm })
const showAdvanced = ref(false)

// ─── Modal actions ────────────────────────────────────────

const openCreateFromGroup = (group: ItemGroup) => {
  editingRule.value = null
  const s = group.suggestedRule
  form.value = {
    category: s.category,
    subcategory: s.subcategory,
    itemType: s.itemType,
    matchField: s.matchField,
    matchValue: s.matchValue,
    label: s.label,
    description: null,
    icon: s.icon,
    color: s.color,
    isTargetable: s.isTargetable,
    weight: s.weight,
    priority: s.priority,
    isEnabled: true,
  }
  showAdvanced.value = !!s.matchField
  showModal.value = true
}

const openEditModal = (rule: ItemCategoryRule) => {
  editingRule.value = rule
  form.value = {
    category: rule.category,
    subcategory: rule.subcategory,
    itemType: rule.itemType,
    matchField: rule.matchField,
    matchValue: rule.matchValue,
    label: rule.label,
    description: rule.description,
    icon: rule.icon,
    color: rule.color,
    isTargetable: rule.isTargetable,
    weight: rule.weight,
    priority: rule.priority,
    isEnabled: rule.isEnabled,
  }
  showAdvanced.value = !!rule.matchField || !!rule.description || rule.priority !== 0
  showModal.value = true
}

const confirmDelete = (rule: ItemCategoryRule) => {
  deletingRule.value = rule
  showDeleteConfirm.value = true
}

const isFormValid = computed(() => {
  return (
    form.value.label.trim().length > 0 &&
    form.value.subcategory.trim().length > 0 &&
    form.value.itemType.trim().length > 0
  )
})

// ─── CRUD handlers ────────────────────────────────────────

const isSubmitting = ref(false)
const isDetecting = ref(false)
const isSyncing = ref(false)

const handleSubmit = async () => {
  if (!isFormValid.value || isSubmitting.value) return
  isSubmitting.value = true

  try {
    if (editingRule.value) {
      await updateRule(
        campaignId.value,
        editingRule.value.id,
        form.value as UpdateItemCategoryRuleData
      )
      toast.add({
        title: 'Catégorie mise à jour',
        description: `La catégorie "${form.value.label}" a été modifiée.`,
        color: 'success',
      })
    } else {
      await createRule(campaignId.value, form.value)
      toast.add({
        title: 'Catégorie créée',
        description: `La catégorie "${form.value.label}" a été ajoutée.`,
        color: 'success',
      })
    }
    showModal.value = false
    // Refresh both tree and rules
    await Promise.all([fetchTree(campaignId.value), fetchRules(campaignId.value)])
    // Clear selection so detail panel refreshes
    selectedGroup.value = null
    selectedSourceKey.value = null
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = async () => {
  if (!deletingRule.value) return
  isSubmitting.value = true

  try {
    await deleteRule(campaignId.value, deletingRule.value.id)
    toast.add({
      title: 'Catégorie supprimée',
      description: `La catégorie "${deletingRule.value.label}" a été supprimée.`,
      color: 'success',
    })
    showDeleteConfirm.value = false
    deletingRule.value = null
    await fetchTree(campaignId.value)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

const handleToggle = async (rule: ItemCategoryRule) => {
  try {
    await toggleRule(campaignId.value, rule)
    await fetchTree(campaignId.value)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  }
}

const handleDetect = async () => {
  isDetecting.value = true
  try {
    const detected = await detectCategories(campaignId.value)
    if (detected.length > 0) {
      toast.add({
        title: 'Catégories détectées',
        description: `${detected.length} catégories ont été ajoutées automatiquement.`,
        color: 'success',
      })
      await fetchTree(campaignId.value)
    } else {
      toast.add({
        title: 'Aucune catégorie détectée',
        description: 'Les catégories existent déjà ou le système RPG est inconnu.',
        color: 'warning',
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  } finally {
    isDetecting.value = false
  }
}

const handleSync = async () => {
  isSyncing.value = true
  try {
    const result = await syncCategories(campaignId.value)
    toast.add({
      title: 'Synchronisation terminée',
      description: `${result.changed} personnage(s) mis à jour sur ${result.synchronized}.`,
      color: 'success',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  } finally {
    isSyncing.value = false
  }
}

const goBack = () => {
  router.push(`/mj/campaigns/${campaignId.value}`)
}

// ─── Category options for modal ───────────────────────────

const categoryOptions = [
  { label: 'Sorts', value: 'spell' },
  { label: 'Capacités', value: 'feature' },
  { label: 'Inventaire', value: 'inventory' },
]

// ─── Helpers ──────────────────────────────────────────────

const formatProperty = (key: string, value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  return String(value)
}

const propertyLabel = (key: string): string => {
  const labels: Record<string, string> = {
    level: 'Niv.',
    school: 'École',
    type: 'Type',
    subtype: 'Sous-type',
    prepared: 'Préparé',
    quantity: 'Qté',
    equipped: 'Équipé',
  }
  return labels[key] ?? key
}

const hasNonEmptyGroups = computed(() => {
  if (!tree.value) return false
  return tree.value.sources.some((s) => s.groups.length > 0)
})

// ─── Load data ────────────────────────────────────────────

onMounted(async () => {
  try {
    await Promise.all([fetchTree(campaignId.value), fetchRules(campaignId.value)])
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger les données',
      color: 'error',
    })
  }
})
</script>

<template>
  <div class="min-h-screen">
    <div class="max-w-7xl mx-auto">
      <!-- ═══ Header ═══ -->
      <UCard class="mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <UButton
              color="neutral"
              variant="soft"
              size="xl"
              square
              class="group shrink-0"
              @click="goBack"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-6 sm:size-8 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
            <div>
              <h1 class="text-xl sm:text-3xl font-bold text-primary">Catégories d'items</h1>
              <p class="text-sm text-muted">
                Explorez les données de vos personnages et associez-les aux catégories de
                gamification
              </p>
            </div>
          </div>

          <div class="flex gap-2 w-full sm:w-auto">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-scan-search"
              size="lg"
              class="flex-1 sm:flex-none"
              :loading="isDetecting"
              @click="handleDetect"
            >
              Auto-détecter
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-refresh-cw"
              size="lg"
              class="flex-1 sm:flex-none"
              :loading="isSyncing"
              @click="handleSync"
            >
              Synchroniser
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- ═══ Info Card ═══ -->
      <UCard class="mb-8">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-info" class="size-5 text-primary shrink-0 mt-0.5" />
          <div class="text-sm text-muted space-y-1">
            <p>
              L'arbre ci-dessous affiche les items de vos personnages, regroupés par propriété.
              Cliquez sur un groupe pour voir des exemples, puis
              <strong>renseignez la catégorie</strong> pour l'associer à la gamification.
            </p>
            <p>
              Utilisez <strong>Auto-détecter</strong> pour pré-configurer automatiquement les
              catégories si votre système de jeu est reconnu.
            </p>
          </div>
        </div>
      </UCard>

      <!-- ═══ Explorer: Tree + Detail Panel ═══ -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- LEFT: Tree Explorer (2/3) -->
        <div class="lg:col-span-2">
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-git-branch" class="size-5 text-primary" />
                <h2 class="text-lg font-semibold text-primary">Données des personnages</h2>
                <UBadge v-if="tree?.systemId" color="primary" variant="subtle" size="sm">
                  {{ tree.systemId }}
                </UBadge>
              </div>
            </template>

            <!-- Loading -->
            <div v-if="treeLoading" class="flex justify-center py-12">
              <UIcon
                name="i-game-icons-dice-twenty-faces-twenty"
                class="size-8 text-primary animate-spin-slow"
              />
            </div>

            <!-- Empty state: no character data -->
            <div v-else-if="!hasNonEmptyGroups" class="text-center py-12 space-y-4">
              <UIcon name="i-lucide-users" class="size-12 text-muted mx-auto" />
              <div>
                <p class="text-primary font-medium">Aucune donnée de personnage</p>
                <p class="text-sm text-muted mt-1">
                  Connectez Foundry VTT et synchronisez des personnages pour explorer leurs items.
                </p>
              </div>
            </div>

            <!-- Tree sources -->
            <div v-else class="space-y-2">
              <div v-for="source in tree?.sources" :key="source.key">
                <!-- Source header (collapsible) -->
                <button
                  class="flex items-center gap-2 w-full p-3 rounded-lg transition-colors hover:bg-accented"
                  @click="toggleSource(source.key)"
                >
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="size-4 text-muted transition-transform duration-200 shrink-0"
                    :class="{ 'rotate-90': expandedSources.has(source.key) }"
                  />
                  <UIcon :name="source.icon" class="size-4 text-primary shrink-0" />
                  <span class="font-medium text-primary">{{ source.label }}</span>
                  <span class="text-xs text-muted ml-1">({{ source.totalCount }})</span>
                  <span class="flex-1" />
                  <!-- Count of configured groups -->
                  <span
                    v-if="source.groups.filter((g) => g.existingRule).length > 0"
                    class="text-xs text-success-500"
                  >
                    {{ source.groups.filter((g) => g.existingRule).length }}/{{
                      source.groups.length
                    }}
                    configurés
                  </span>
                </button>

                <!-- Group rows -->
                <div v-if="expandedSources.has(source.key)" class="pl-6 space-y-1">
                  <div
                    v-if="source.groups.length === 0"
                    class="py-3 pl-4 text-sm text-muted italic"
                  >
                    Aucun item dans cette catégorie
                  </div>
                  <button
                    v-for="group in source.groups"
                    :key="group.groupKey"
                    class="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left transition-colors"
                    :class="
                      selectedGroup?.groupKey === group.groupKey && selectedSourceKey === source.key
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-accented'
                    "
                    @click="selectGroup(group, source.key)"
                  >
                    <!-- Color dot from suggested rule -->
                    <span
                      v-if="group.suggestedRule.color"
                      class="size-2.5 rounded-full shrink-0"
                      :style="{ backgroundColor: group.suggestedRule.color }"
                    />
                    <span v-else class="size-2.5 rounded-full bg-gray-300 shrink-0" />

                    <span class="text-sm text-primary truncate">{{ group.groupLabel }}</span>
                    <span class="text-xs text-muted">({{ group.count }})</span>

                    <span class="flex-1" />

                    <!-- Status badge -->
                    <UBadge v-if="group.existingRule" color="success" variant="subtle" size="xs">
                      <UIcon name="i-lucide-check" class="size-3 mr-0.5" />
                      Configuré
                    </UBadge>
                    <UBadge v-else color="neutral" variant="subtle" size="xs">
                      Non configuré
                    </UBadge>
                  </button>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- RIGHT: Detail Panel (1/3) -->
        <div>
          <UCard v-if="selectedGroup" class="sticky top-4">
            <template #header>
              <div class="flex items-center gap-2">
                <span
                  v-if="selectedGroup.suggestedRule.color"
                  class="size-3 rounded-full shrink-0"
                  :style="{ backgroundColor: selectedGroup.suggestedRule.color }"
                />
                <h3 class="font-semibold text-primary truncate">
                  {{ selectedGroup.groupLabel }}
                </h3>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ selectedGroup.count }} item{{ selectedGroup.count > 1 ? 's' : '' }}
                </UBadge>
              </div>
            </template>

            <div class="space-y-4">
              <!-- Group metadata -->
              <div class="text-xs text-muted space-y-1">
                <p>
                  Propriété : <span class="font-mono">{{ selectedGroup.groupProperty }}</span> =
                  <span class="font-mono">{{ selectedGroup.groupKey }}</span>
                </p>
                <p v-if="selectedSourceKey">
                  Source : <UIcon :name="sourceIcon(selectedSourceKey)" class="size-3 inline" />
                  {{ tree?.sources.find((s) => s.key === selectedSourceKey)?.label }}
                </p>
              </div>

              <!-- Separator -->
              <div class="border-t border-dashed" />

              <!-- Sample items -->
              <div>
                <p class="text-xs font-medium text-muted mb-2 uppercase tracking-wide">
                  Exemples d'items
                </p>
                <div class="space-y-2">
                  <div
                    v-for="(sample, idx) in selectedGroup.samples"
                    :key="idx"
                    class="flex items-start gap-2 p-2 rounded bg-elevated"
                  >
                    <UIcon
                      :name="sourceIcon(selectedSourceKey ?? 'spells')"
                      class="size-4 text-muted shrink-0 mt-0.5"
                    />
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-primary truncate">{{ sample.name }}</p>
                      <div class="flex flex-wrap gap-1 mt-1">
                        <template v-for="(value, key) in sample.properties" :key="key">
                          <span
                            v-if="value !== null && value !== undefined && value !== ''"
                            class="text-xs px-1.5 py-0.5 rounded bg-accented text-muted"
                          >
                            {{ propertyLabel(String(key)) }}:
                            {{ formatProperty(String(key), value) }}
                          </span>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Separator -->
              <div class="border-t border-dashed" />

              <!-- Action -->
              <div>
                <div v-if="selectedGroup.existingRule" class="space-y-2">
                  <div
                    class="flex items-center gap-2 p-3 rounded-lg bg-success-50 dark:bg-success-950/20"
                  >
                    <UIcon name="i-lucide-check-circle" class="size-5 text-success-500 shrink-0" />
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-success-700 dark:text-success-400">
                        Déjà configuré
                      </p>
                      <p class="text-xs text-success-600 dark:text-success-500 truncate">
                        Règle : {{ selectedGroup.existingRule.label }}
                      </p>
                    </div>
                  </div>
                </div>
                <UButton
                  v-else
                  color="primary"
                  icon="i-lucide-link"
                  size="lg"
                  block
                  @click="openCreateFromGroup(selectedGroup)"
                >
                  Renseigner catégorie
                </UButton>
              </div>
            </div>
          </UCard>

          <!-- Empty detail panel -->
          <UCard v-else class="sticky top-4">
            <div class="text-center py-8 space-y-3">
              <UIcon name="i-lucide-mouse-pointer-click" class="size-10 text-muted mx-auto" />
              <div>
                <p class="text-sm font-medium text-muted">Sélectionnez un groupe</p>
                <p class="text-xs text-muted mt-1">
                  Cliquez sur un élément dans l'arbre pour voir les exemples et renseigner la
                  catégorie
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- ═══ Configured Rules List ═══ -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold text-primary">Règles configurées</h2>
        </template>

        <!-- Tabs -->
        <div class="flex gap-2 mb-4">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            :class="
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-elevated text-muted hover:bg-accented'
            "
            @click="activeTab = tab.key as 'spell' | 'feature' | 'inventory'"
          >
            <UIcon :name="tab.icon" class="size-4" />
            {{ tab.label }}
            <span
              v-if="ruleCounts[tab.key as keyof typeof ruleCounts] > 0"
              class="text-xs px-1.5 py-0.5 rounded-full"
              :class="activeTab === tab.key ? 'bg-white/20' : 'bg-accented'"
            >
              {{ ruleCounts[tab.key as keyof typeof ruleCounts] }}
            </span>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="rulesLoading && rules.length === 0" class="flex justify-center py-8">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-6 text-primary animate-spin-slow"
          />
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredRules.length === 0" class="text-center py-8 space-y-3">
          <UIcon
            :name="tabs.find((t) => t.key === activeTab)?.icon ?? 'i-lucide-box'"
            class="size-10 text-muted mx-auto"
          />
          <p class="text-sm text-muted">
            Aucune règle dans cette catégorie. Utilisez l'explorateur ci-dessus pour en créer.
          </p>
        </div>

        <!-- Rules Rows -->
        <div v-else class="space-y-2">
          <div
            v-for="rule in filteredRules"
            :key="rule.id"
            class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-elevated"
            :class="{ 'opacity-50': !rule.isEnabled }"
          >
            <div class="flex-1 min-w-0 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  v-if="rule.color"
                  class="size-3 rounded-full shrink-0"
                  :style="{ backgroundColor: rule.color }"
                />
                <span class="font-medium text-primary truncate">{{ rule.label }}</span>
                <UBadge v-if="rule.isTargetable" color="success" variant="subtle" size="sm">
                  Ciblable
                </UBadge>
                <UBadge v-else color="neutral" variant="subtle" size="sm"> Non ciblable </UBadge>
                <UBadge v-if="!rule.isEnabled" color="neutral" variant="subtle" size="sm">
                  Désactivée
                </UBadge>
              </div>
              <p class="text-xs text-muted">
                Type: <span class="font-mono">{{ rule.itemType }}</span>
                <span v-if="rule.matchField">
                  &middot; {{ rule.matchField }} =
                  <span class="font-mono">{{ rule.matchValue }}</span>
                </span>
                <span v-if="rule.weight !== 1"> &middot; Poids {{ rule.weight }}</span>
                <span v-if="rule.priority > 0"> &middot; Priorité {{ rule.priority }}</span>
              </p>
              <p v-if="rule.description" class="text-xs text-muted italic">
                {{ rule.description }}
              </p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <UButton
                :icon="rule.isEnabled ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                color="neutral"
                variant="ghost"
                size="sm"
                square
                :title="rule.isEnabled ? 'Désactiver' : 'Activer'"
                @click="handleToggle(rule)"
              />
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                square
                title="Modifier"
                @click="openEditModal(rule)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                square
                title="Supprimer"
                @click="confirmDelete(rule)"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>

  <!-- ═══ Create/Edit Modal ═══ -->
  <UModal v-model:open="showModal">
    <template #header>
      <h3 class="text-xl font-bold text-primary">
        {{ editingRule ? 'Modifier la catégorie' : 'Renseigner catégorie' }}
      </h3>
    </template>

    <template #body>
      <form id="categoryRuleForm" class="space-y-6" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-1">Catégorie</label>
          <USelect
            v-model="form.category"
            :items="categoryOptions"
            size="lg"
            :ui="{
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) rounded-lg ring-0 border-0',
            }"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-1">Nom</label>
          <UInput
            v-model="form.label"
            placeholder="Ex: Évocation, Dons, Armes..."
            size="lg"
            maxlength="255"
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
            }"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-1"
            >Sous-catégorie (identifiant)</label
          >
          <UInput
            v-model="form.subcategory"
            placeholder="Ex: evocation, feat, weapon..."
            size="lg"
            maxlength="100"
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
            }"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-1"
            >Type d'item Foundry VTT</label
          >
          <UInput
            v-model="form.itemType"
            placeholder="Ex: spell, feat, weapon..."
            size="lg"
            maxlength="50"
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
            }"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex items-center gap-3 pl-2">
            <USwitch v-model="form.isTargetable" />
            <span class="text-sm text-primary">Ciblable par la gamification</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-primary pl-2 mb-1">Poids</label>
            <UInput
              v-model.number="form.weight"
              type="number"
              :min="0"
              :max="100"
              placeholder="1"
              size="lg"
              :ui="{
                root: 'ring-0 border-0 rounded-lg overflow-hidden',
                base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
              }"
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            class="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors pl-2"
            @click="showAdvanced = !showAdvanced"
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4 transition-transform duration-200"
              :class="{ 'rotate-90': showAdvanced }"
            />
            Options avancées
          </button>
          <div v-if="showAdvanced" class="mt-3 space-y-4 pl-2">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-primary mb-1"
                  >Champ de correspondance</label
                >
                <UInput
                  v-model="form.matchField"
                  placeholder="Ex: system.school"
                  size="lg"
                  maxlength="200"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
                  }"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-primary mb-1">Valeur attendue</label>
                <UInput
                  v-model="form.matchValue"
                  placeholder="Ex: evo"
                  size="lg"
                  maxlength="200"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
                  }"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-primary mb-1">Icône (Lucide)</label>
                <UInput
                  v-model="form.icon"
                  placeholder="Ex: flame, shield..."
                  size="lg"
                  maxlength="100"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
                  }"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-primary mb-1">Couleur</label>
                <UInput
                  v-model="form.color"
                  type="color"
                  size="lg"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) rounded-lg h-11',
                  }"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-primary mb-1">Priorité</label>
              <p class="text-xs text-muted mb-2">
                Ordre d'évaluation (plus haut = évalué en premier)
              </p>
              <UInput
                v-model.number="form.priority"
                type="number"
                :min="0"
                :max="1000"
                placeholder="0"
                size="lg"
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden',
                  base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
                }"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-primary mb-1">Description</label>
              <UTextarea
                v-model="form.description"
                placeholder="Note optionnelle..."
                :rows="2"
                maxlength="1000"
                size="lg"
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden',
                  base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
                }"
              />
            </div>
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton color="neutral" variant="soft" @click="showModal = false"> Annuler </UButton>
        <UButton
          type="submit"
          form="categoryRuleForm"
          color="primary"
          :loading="isSubmitting"
          :disabled="!isFormValid || isSubmitting"
        >
          {{ editingRule ? 'Enregistrer' : 'Créer' }}
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- ═══ Delete Confirmation Modal ═══ -->
  <UModal v-model:open="showDeleteConfirm">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="bg-error-light p-2 rounded-lg">
          <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
        </div>
        <h3 class="text-xl font-bold text-primary">Supprimer la catégorie</h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-primary">
          Voulez-vous vraiment supprimer la catégorie
          <strong class="text-primary">"{{ deletingRule?.label }}"</strong> ?
        </p>
        <div class="bg-error-light border border-error-light rounded-lg p-4">
          <p class="text-sm text-error-500">Cette action est irréversible.</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton color="neutral" variant="soft" @click="showDeleteConfirm = false">
          Annuler
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          :loading="isSubmitting"
          @click="handleDelete"
        >
          Supprimer
        </UButton>
      </div>
    </template>
  </UModal>
</template>
