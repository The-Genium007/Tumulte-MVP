<script setup lang="ts">
import type {
  CriticalityRule,
  CreateCriticalityRuleData,
  UpdateCriticalityRuleData,
} from '~/composables/useCriticalityRules'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { rules, loading, fetchRules, createRule, updateRule, deleteRule, toggleRule } =
  useCriticalityRules()

const campaignId = computed(() => route.params.id as string)

// Modal state
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingRule = ref<CriticalityRule | null>(null)
const deletingRule = ref<CriticalityRule | null>(null)

// Form state
const defaultForm: CreateCriticalityRuleData = {
  diceFormula: null,
  resultCondition: '== 20',
  resultField: 'max_die',
  criticalType: 'success',
  severity: 'major',
  label: '',
  description: null,
  priority: 0,
  isEnabled: true,
}

const form = ref<CreateCriticalityRuleData>({ ...defaultForm })

// Options for selects
const resultFieldOptions = [
  { label: 'Dé le plus haut', value: 'max_die' },
  { label: 'Dé le plus bas', value: 'min_die' },
  { label: 'Total', value: 'total' },
  { label: "N'importe quel dé", value: 'any_die' },
]

const criticalTypeOptions = [
  { label: 'Réussite critique', value: 'success' },
  { label: 'Échec critique', value: 'failure' },
]

const severityOptions = [
  { label: 'Mineure', value: 'minor' },
  { label: 'Majeure', value: 'major' },
  { label: 'Extrême', value: 'extreme' },
]

// Severity badge colors
const severityColor = (severity: string) => {
  switch (severity) {
    case 'minor':
      return 'info'
    case 'major':
      return 'warning'
    case 'extreme':
      return 'error'
    default:
      return 'neutral'
  }
}

const severityLabel = (severity: string) => {
  switch (severity) {
    case 'minor':
      return 'Mineure'
    case 'major':
      return 'Majeure'
    case 'extreme':
      return 'Extrême'
    default:
      return severity
  }
}

const criticalTypeLabel = (type: string) => {
  return type === 'success' ? 'Réussite' : 'Échec'
}

const criticalTypeIcon = (type: string) => {
  return type === 'success' ? 'i-lucide-trophy' : 'i-lucide-skull'
}

const resultFieldLabel = (field: string) => {
  return resultFieldOptions.find((o) => o.value === field)?.label ?? field
}

// Load rules
onMounted(async () => {
  try {
    await fetchRules(campaignId.value)
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger les règles de criticité',
      color: 'error',
    })
  }
})

// Modal actions
const openCreateModal = () => {
  editingRule.value = null
  form.value = { ...defaultForm }
  showModal.value = true
}

const openEditModal = (rule: CriticalityRule) => {
  editingRule.value = rule
  form.value = {
    diceFormula: rule.diceFormula,
    resultCondition: rule.resultCondition,
    resultField: rule.resultField,
    criticalType: rule.criticalType,
    severity: rule.severity,
    label: rule.label,
    description: rule.description,
    priority: rule.priority,
    isEnabled: rule.isEnabled,
  }
  showModal.value = true
}

const confirmDelete = (rule: CriticalityRule) => {
  deletingRule.value = rule
  showDeleteConfirm.value = true
}

// Form validation
const isFormValid = computed(() => {
  return (
    form.value.resultCondition.trim().length > 0 &&
    form.value.label.trim().length > 0 &&
    /^(==|!=|<=|>=|<|>)\s*-?\d+(\.\d+)?$/.test(form.value.resultCondition.trim())
  )
})

// CRUD handlers
const isSubmitting = ref(false)

const handleSubmit = async () => {
  if (!isFormValid.value || isSubmitting.value) return
  isSubmitting.value = true

  try {
    if (editingRule.value) {
      await updateRule(campaignId.value, editingRule.value.id, form.value as UpdateCriticalityRuleData)
      toast.add({
        title: 'Règle mise à jour',
        description: `La règle "${form.value.label}" a été modifiée.`,
        color: 'success',
      })
    } else {
      await createRule(campaignId.value, form.value)
      toast.add({
        title: 'Règle créée',
        description: `La règle "${form.value.label}" a été ajoutée.`,
        color: 'success',
      })
    }
    showModal.value = false
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
      title: 'Règle supprimée',
      description: `La règle "${deletingRule.value.label}" a été supprimée.`,
      color: 'success',
    })
    showDeleteConfirm.value = false
    deletingRule.value = null
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

const handleToggle = async (rule: CriticalityRule) => {
  try {
    await toggleRule(campaignId.value, rule)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  }
}

const goBack = () => {
  router.push(`/mj/campaigns/${campaignId.value}`)
}
</script>

<template>
  <div class="min-h-screen">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
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
              <h1 class="text-xl sm:text-3xl font-bold text-primary">Règles de criticité</h1>
              <p class="text-sm text-muted">
                Définissez quand un jet de dé est considéré comme critique
              </p>
            </div>
          </div>

          <UButton
            color="primary"
            icon="i-lucide-plus"
            size="lg"
            class="w-full sm:w-auto"
            @click="openCreateModal"
          >
            Nouvelle règle
          </UButton>
        </div>
      </UCard>

      <!-- Info Card -->
      <UCard class="mb-8">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-info" class="size-5 text-primary shrink-0 mt-0.5" />
          <div class="text-sm text-muted space-y-1">
            <p>
              Les règles de criticité personnalisées vous permettent de définir ce qui constitue une
              réussite ou un échec critique pour votre système de jeu.
            </p>
            <p>
              Les règles sont évaluées par ordre de priorité (la plus haute en premier). La première
              règle qui correspond est utilisée.
            </p>
          </div>
        </div>
      </UCard>

      <!-- Rules List -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-primary">
              Règles configurées
              <span v-if="rules.length > 0" class="text-muted font-normal text-sm">
                ({{ rules.length }})
              </span>
            </h2>
          </div>
        </template>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
          <UIcon name="i-game-icons-dice-twenty-faces-twenty" class="size-8 text-primary animate-spin-slow" />
        </div>

        <!-- Empty State -->
        <div v-else-if="rules.length === 0" class="text-center py-12 space-y-4">
          <UIcon name="i-lucide-dice-5" class="size-12 text-muted mx-auto" />
          <div>
            <p class="text-primary font-medium">Aucune règle configurée</p>
            <p class="text-sm text-muted mt-1">
              Les systèmes courants (D&amp;D 5e, Pathfinder, etc.) sont détectés automatiquement.
              <br />
              Ajoutez des règles personnalisées pour les systèmes custom ou homebrew.
            </p>
          </div>
          <UButton color="primary" icon="i-lucide-plus" @click="openCreateModal">
            Créer une règle
          </UButton>
        </div>

        <!-- Rules Rows -->
        <div v-else class="space-y-3">
          <div
            v-for="rule in rules"
            :key="rule.id"
            class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-elevated"
            :class="{ 'opacity-50': !rule.isEnabled }"
          >
            <!-- Left: Info -->
            <div class="flex-1 min-w-0 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <UIcon :name="criticalTypeIcon(rule.criticalType)" class="size-4 shrink-0" />
                <span class="font-medium text-primary truncate">{{ rule.label }}</span>
                <UBadge :color="severityColor(rule.severity)" variant="subtle" size="sm">
                  {{ severityLabel(rule.severity) }}
                </UBadge>
                <UBadge
                  :color="rule.criticalType === 'success' ? 'success' : 'error'"
                  variant="subtle"
                  size="sm"
                >
                  {{ criticalTypeLabel(rule.criticalType) }}
                </UBadge>
                <UBadge v-if="!rule.isEnabled" color="neutral" variant="subtle" size="sm">
                  Désactivée
                </UBadge>
              </div>
              <p class="text-xs text-muted">
                <span v-if="rule.diceFormula" class="font-mono">{{ rule.diceFormula }}</span>
                <span v-else>Tout dé</span>
                &middot;
                {{ resultFieldLabel(rule.resultField) }}
                <span class="font-mono">{{ rule.resultCondition }}</span>
                <span v-if="rule.priority > 0"> &middot; Priorité {{ rule.priority }}</span>
              </p>
              <p v-if="rule.description" class="text-xs text-muted italic">
                {{ rule.description }}
              </p>
            </div>

            <!-- Right: Actions -->
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

  <!-- Create/Edit Modal -->
  <UModal v-model:open="showModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-primary">
              {{ editingRule ? 'Modifier la règle' : 'Nouvelle règle de criticité' }}
            </h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              @click="showModal = false"
            />
          </div>
        </template>

        <form class="space-y-5" @submit.prevent="handleSubmit">
          <!-- Label -->
          <div>
            <label class="block text-sm font-medium text-primary mb-1">Label *</label>
            <UInput
              v-model="form.label"
              placeholder="Ex: Natural 20, Fumble cosmique..."
              maxlength="255"
            />
          </div>

          <!-- Critical Type -->
          <div>
            <label class="block text-sm font-medium text-primary mb-1">Type de critique *</label>
            <USelect v-model="form.criticalType" :items="criticalTypeOptions" />
          </div>

          <!-- Severity -->
          <div>
            <label class="block text-sm font-medium text-primary mb-1">Gravité</label>
            <USelect v-model="form.severity" :items="severityOptions" />
          </div>

          <!-- Dice Formula -->
          <div>
            <label class="block text-sm font-medium text-primary mb-1">Formule de dé</label>
            <UInput
              v-model="form.diceFormula"
              placeholder="Ex: d20, d100, 2d6... (vide = tout dé)"
              maxlength="50"
            />
            <p class="text-xs text-muted mt-1">Laissez vide pour appliquer à tous les dés</p>
          </div>

          <!-- Result Field -->
          <div>
            <label class="block text-sm font-medium text-primary mb-1">Valeur évaluée</label>
            <USelect v-model="form.resultField" :items="resultFieldOptions" />
          </div>

          <!-- Result Condition -->
          <div>
            <label class="block text-sm font-medium text-primary mb-1">Condition *</label>
            <UInput
              v-model="form.resultCondition"
              placeholder="Ex: == 20, <= 1, >= 96"
              maxlength="100"
            />
            <p class="text-xs text-muted mt-1">
              Opérateurs : == (égal), != (différent), &lt;= (inférieur ou égal), &gt;= (supérieur
              ou égal), &lt; (inférieur), &gt; (supérieur)
            </p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-primary mb-1">Description</label>
            <UTextarea
              v-model="form.description"
              placeholder="Explication optionnelle de la règle..."
              :rows="2"
              maxlength="1000"
            />
          </div>

          <!-- Priority -->
          <div>
            <label class="block text-sm font-medium text-primary mb-1">Priorité</label>
            <UInput v-model.number="form.priority" type="number" :min="0" :max="1000" />
            <p class="text-xs text-muted mt-1">Plus la valeur est haute, plus la règle est prioritaire</p>
          </div>

          <!-- Enabled -->
          <div class="flex items-center gap-3">
            <USwitch v-model="form.isEnabled" />
            <span class="text-sm text-primary">Règle active</span>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4">
            <UButton color="neutral" variant="soft" @click="showModal = false"> Annuler </UButton>
            <UButton
              type="submit"
              color="primary"
              :loading="isSubmitting"
              :disabled="!isFormValid || isSubmitting"
            >
              {{ editingRule ? 'Enregistrer' : 'Créer' }}
            </UButton>
          </div>
        </form>
      </UCard>
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal v-model:open="showDeleteConfirm">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-error-500">Supprimer la règle</h3>
        </template>

        <p class="text-primary">
          Voulez-vous vraiment supprimer la règle
          <strong>"{{ deletingRule?.label }}"</strong> ?
        </p>
        <p class="text-sm text-muted mt-2">Cette action est irréversible.</p>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="soft" @click="showDeleteConfirm = false">
              Annuler
            </UButton>
            <UButton color="error" :loading="isSubmitting" @click="handleDelete">
              Supprimer
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
