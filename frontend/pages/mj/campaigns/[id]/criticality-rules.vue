<script setup lang="ts">
import {
  useCriticalityRules,
  type CriticalityRule,
  type CreateCriticalityRuleData,
  type UpdateCriticalityRuleData,
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

// Options for selects (natural language)
const resultFieldOptions = [
  { label: 'le dé le plus haut', value: 'max_die' },
  { label: 'le dé le plus bas', value: 'min_die' },
  { label: 'le total', value: 'total' },
  { label: "n'importe quel dé", value: 'any_die' },
]

const conditionOperators = [
  { label: 'exactement', value: '==' },
  { label: 'au moins', value: '>=' },
  { label: 'au plus', value: '<=' },
  { label: 'plus de', value: '>' },
  { label: 'moins de', value: '<' },
  { label: 'différent de', value: '!=' },
]

const severityOptions = [
  { label: 'Mineure', value: 'minor' as const },
  { label: 'Majeure', value: 'major' as const },
  { label: 'Extrême', value: 'extreme' as const },
]

// Decomposed condition for natural language form
const condOperator = ref('==')
const condValue = ref(20)
const showAdvanced = ref(false)

const syncCondition = () => {
  form.value.resultCondition = `${condOperator.value} ${condValue.value}`
}
watch([condOperator, condValue], syncCondition)

const parseCondition = (condition: string) => {
  const match = condition.trim().match(/^(==|!=|<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/)
  if (match?.[1] && match[2]) {
    condOperator.value = match[1]
    condValue.value = Number(match[2])
  }
}

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
  condOperator.value = '=='
  condValue.value = 20
  showAdvanced.value = false
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
  parseCondition(rule.resultCondition)
  showAdvanced.value = rule.severity !== 'major' || rule.priority !== 0 || !!rule.description
  showModal.value = true
}

const confirmDelete = (rule: CriticalityRule) => {
  deletingRule.value = rule
  showDeleteConfirm.value = true
}

// Form validation
const isFormValid = computed(() => {
  return form.value.label.trim().length > 0 && condValue.value !== null && !isNaN(condValue.value)
})

// CRUD handlers
const isSubmitting = ref(false)

const handleSubmit = async () => {
  if (!isFormValid.value || isSubmitting.value) return
  isSubmitting.value = true

  try {
    if (editingRule.value) {
      await updateRule(
        campaignId.value,
        editingRule.value.id,
        form.value as UpdateCriticalityRuleData
      )
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
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-8 text-primary animate-spin-slow"
          />
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
    <template #header>
      <h3 class="text-xl font-bold text-primary">
        {{ editingRule ? 'Modifier la règle' : 'Nouvelle règle de criticité' }}
      </h3>
    </template>

    <template #body>
      <form id="critRuleForm" class="space-y-6" @submit.prevent="handleSubmit">
        <!-- 1. Nom -->
        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-1">Nom de la règle</label>
          <UInput
            v-model="form.label"
            placeholder="Ex: Natural 20, Fumble, Messy Critical..."
            size="lg"
            maxlength="255"
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
            }"
          />
        </div>

        <!-- 2. Type : chips visuels -->
        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-2">C'est un...</label>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all text-sm"
              :class="
                form.criticalType === 'success'
                  ? 'bg-success-100 text-success-700 ring-2 ring-success-400 dark:bg-success-900/30 dark:text-success-400 dark:ring-success-600'
                  : 'bg-elevated text-muted hover:bg-accented'
              "
              @click="form.criticalType = 'success'"
            >
              <UIcon name="i-lucide-trophy" class="size-5" />
              Réussite critique
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all text-sm"
              :class="
                form.criticalType === 'failure'
                  ? 'bg-error-100 text-error-700 ring-2 ring-error-400 dark:bg-error-900/30 dark:text-error-400 dark:ring-error-600'
                  : 'bg-elevated text-muted hover:bg-accented'
              "
              @click="form.criticalType = 'failure'"
            >
              <UIcon name="i-lucide-skull" class="size-5" />
              Échec critique
            </button>
          </div>
        </div>

        <!-- 3. Condition en phrase naturelle -->
        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-2">Déclenchement</label>
          <div class="bg-elevated rounded-lg p-4 space-y-3">
            <p class="text-sm text-muted pl-1">Quand un jet de</p>
            <UInput
              v-model="form.diceFormula"
              placeholder="n'importe quel dé (ex: d20, d100, 2d6)"
              size="lg"
              maxlength="50"
              :ui="{
                root: 'ring-0 border-0 rounded-lg overflow-hidden',
                base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
              }"
            />
            <p class="text-sm text-muted pl-1">fait</p>
            <div class="grid grid-cols-2 gap-3">
              <USelect
                v-model="condOperator"
                :items="conditionOperators"
                size="lg"
                :ui="{
                  base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) rounded-lg ring-0 border-0',
                }"
              />
              <UInput
                v-model.number="condValue"
                type="number"
                placeholder="20"
                size="lg"
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden',
                  base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
                }"
              />
            </div>
            <p class="text-sm text-muted pl-1">sur</p>
            <USelect
              v-model="form.resultField"
              :items="resultFieldOptions"
              size="lg"
              :ui="{
                base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) rounded-lg ring-0 border-0',
              }"
            />
          </div>
        </div>

        <!-- 4. Activé -->
        <div class="flex items-center gap-3 pl-2">
          <USwitch v-model="form.isEnabled" />
          <span class="text-sm text-primary">Règle active</span>
        </div>

        <!-- 5. Options avancées -->
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
            <div>
              <label class="block text-sm font-medium text-primary mb-2">Gravité</label>
              <div class="flex gap-2">
                <button
                  v-for="opt in severityOptions"
                  :key="opt.value"
                  type="button"
                  class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                  :class="
                    form.severity === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-elevated text-muted hover:bg-accented'
                  "
                  @click="form.severity = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-primary mb-1">Priorité</label>
              <p class="text-xs text-muted mb-2">
                Si plusieurs règles correspondent, la plus prioritaire gagne
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
              <label class="block text-sm font-medium text-primary mb-1">Note</label>
              <UTextarea
                v-model="form.description"
                placeholder="Note optionnelle pour vous rappeler à quoi sert cette règle..."
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
          form="critRuleForm"
          color="primary"
          :loading="isSubmitting"
          :disabled="!isFormValid || isSubmitting"
        >
          {{ editingRule ? 'Enregistrer' : 'Créer' }}
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal v-model:open="showDeleteConfirm">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="bg-error-light p-2 rounded-lg">
          <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
        </div>
        <h3 class="text-xl font-bold text-primary">Supprimer la règle</h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-primary">
          Voulez-vous vraiment supprimer la règle
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
