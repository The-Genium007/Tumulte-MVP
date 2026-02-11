<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  GamificationEvent,
  CampaignGamificationConfig,
  UpdateGamificationConfigRequest,
} from '@/types/api'

const props = defineProps<{
  event: GamificationEvent
  config?: CampaignGamificationConfig
  loading?: boolean
  // Test mode props (DEV/STAGING only)
  isDev?: boolean
  campaignId?: string
  ownerId?: string
  ownerName?: string
}>()

const emit = defineEmits<{
  toggle: [eventId: string, enabled: boolean]
  update: [eventId: string, updates: UpdateGamificationConfigRequest]
  triggerTest: [eventId: string, diceValue: number]
  simulateRedemption: [eventId: string]
}>()

// Difficulty levels with their coefficients
type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'custom'

const DIFFICULTY_COEFFICIENTS: Record<Exclude<DifficultyLevel, 'custom'>, number> = {
  easy: 0.15,
  medium: 0.3,
  hard: 0.5,
}

const difficultyOptions = [
  { value: 'easy', label: 'Facile', description: '~15% des viewers doivent cliquer' },
  { value: 'medium', label: 'Moyen', description: '~30% des viewers doivent cliquer' },
  { value: 'hard', label: 'Difficile', description: '~50% des viewers doivent cliquer' },
  { value: 'custom', label: 'Personnalisé', description: 'Définir un coefficient précis' },
]

// Local form state
const isEnabled = ref(props.config?.isEnabled ?? false)
const showSettings = ref(false)

// Form fields
const cost = ref<number | null>(null)
const difficulty = ref<DifficultyLevel>('medium')
const customCoefficient = ref<number | null>(null)
const minimumObjective = ref<number | null>(null)
const duration = ref<number | null>(null)

// Cooldown fields (split into hours, minutes, seconds)
const cooldownHours = ref<number>(0)
const cooldownMinutes = ref<number>(30)
const cooldownSeconds = ref<number>(0)

// Computed cooldown in seconds
const cooldownTotalSeconds = computed(() => {
  return (
    (cooldownHours.value || 0) * 3600 +
    (cooldownMinutes.value || 0) * 60 +
    (cooldownSeconds.value || 0)
  )
})

// Convert seconds to h/m/s
const secondsToHMS = (
  totalSeconds: number
): { hours: number; minutes: number; seconds: number } => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { hours, minutes, seconds }
}

// Determine difficulty level from coefficient
const getDifficultyFromCoefficient = (coef: number | null): DifficultyLevel => {
  if (coef === null) return 'medium'
  if (Math.abs(coef - 0.15) < 0.01) return 'easy'
  if (Math.abs(coef - 0.3) < 0.01) return 'medium'
  if (Math.abs(coef - 0.5) < 0.01) return 'hard'
  return 'custom'
}

// Initialize form from config or defaults
const initializeForm = () => {
  if (props.config) {
    cost.value = props.config.cost
    minimumObjective.value = props.config.minimumObjective
    duration.value = props.config.duration

    // Convert cooldown seconds to h/m/s
    if (props.config.cooldown !== null && props.config.cooldown !== undefined) {
      const hms = secondsToHMS(props.config.cooldown)
      cooldownHours.value = hms.hours
      cooldownMinutes.value = hms.minutes
      cooldownSeconds.value = hms.seconds
    } else {
      // Default: 30 minutes
      cooldownHours.value = 0
      cooldownMinutes.value = 30
      cooldownSeconds.value = 0
    }

    // Determine difficulty from coefficient
    const coef = props.config.objectiveCoefficient
    difficulty.value = getDifficultyFromCoefficient(coef)
    if (difficulty.value === 'custom') {
      customCoefficient.value = coef
    } else {
      customCoefficient.value = null
    }
  } else {
    cost.value = null
    minimumObjective.value = null
    duration.value = null
    // Default: 30 minutes
    cooldownHours.value = 0
    cooldownMinutes.value = 30
    cooldownSeconds.value = 0
    difficulty.value = 'medium'
    customCoefficient.value = null
  }
}

// Watch for config changes
watch(
  () => props.config,
  () => {
    isEnabled.value = props.config?.isEnabled ?? false
    initializeForm()
  },
  { immediate: true }
)

// Get effective coefficient based on difficulty
const effectiveCoefficientValue = computed(() => {
  if (difficulty.value === 'custom') {
    return customCoefficient.value ?? props.event.defaultObjectiveCoefficient
  }
  return DIFFICULTY_COEFFICIENTS[difficulty.value]
})

// Computed values for display
const effectiveCost = computed(
  () => props.config?.effectiveCost ?? cost.value ?? props.event.defaultCost
)
const effectiveCoefficient = computed(
  () => props.config?.effectiveObjectiveCoefficient ?? effectiveCoefficientValue.value
)
const effectiveMinimum = computed(
  () =>
    props.config?.effectiveMinimumObjective ??
    minimumObjective.value ??
    props.event.defaultMinimumObjective ??
    3
)
const effectiveDuration = computed(
  () => props.config?.effectiveDuration ?? duration.value ?? props.event.defaultDuration
)

// Difficulty badge for quick stats
const difficultyBadge = computed(() => {
  const coef = effectiveCoefficient.value
  if (coef <= 0.2) return { label: 'Facile', color: 'success' as const }
  if (coef <= 0.35) return { label: 'Moyen', color: 'warning' as const }
  return { label: 'Difficile', color: 'error' as const }
})

// Preview calculations for different viewer counts
const previewCalculations = computed(() => {
  const coef = effectiveCoefficientValue.value ?? 0.3 // Default to medium difficulty
  const min = minimumObjective.value ?? props.event.defaultMinimumObjective ?? 3

  return [
    { viewers: 30, clicks: Math.max(min, Math.ceil(30 * coef)) },
    { viewers: 100, clicks: Math.max(min, Math.ceil(100 * coef)) },
    { viewers: 500, clicks: Math.max(min, Math.ceil(500 * coef)) },
  ]
})

// Event type badge
const eventTypeBadge = computed(() => {
  return props.event.type === 'individual'
    ? { label: 'Individuel', color: 'info' as const, icon: 'i-lucide-user' }
    : { label: 'Groupe', color: 'warning' as const, icon: 'i-lucide-users' }
})

// Action type description
const actionDescription = computed(() => {
  switch (props.event.actionType) {
    case 'dice_invert':
      return 'Inverse le résultat du dé critique'
    case 'chat_message':
      return 'Envoie un message dans le chat Foundry'
    case 'stat_modify':
      return 'Modifie les statistiques du personnage'
    default:
      return 'Action personnalisée'
  }
})

// Format duration for display
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

// Format cooldown for display
const formatCooldown = (seconds: number): string => {
  if (seconds === 0) return 'Aucun'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`
}

// Handlers
const handleToggle = () => {
  const newState = !isEnabled.value
  isEnabled.value = newState
  emit('toggle', props.event.id, newState)
}

const handleSaveSettings = () => {
  // Calculate coefficient from difficulty
  const objectiveCoefficient =
    difficulty.value === 'custom'
      ? customCoefficient.value
      : DIFFICULTY_COEFFICIENTS[difficulty.value]

  const updates: UpdateGamificationConfigRequest = {
    cost: cost.value,
    objectiveCoefficient,
    minimumObjective: minimumObjective.value,
    duration: duration.value,
    cooldown: cooldownTotalSeconds.value,
    maxClicksPerUserPerSession: 0, // Always unlimited
  }
  emit('update', props.event.id, updates)
  showSettings.value = false
}

const handleResetToDefaults = () => {
  cost.value = null
  minimumObjective.value = null
  duration.value = null
  // Default: 30 minutes
  cooldownHours.value = 0
  cooldownMinutes.value = 30
  cooldownSeconds.value = 0
  difficulty.value = 'medium'
  customCoefficient.value = null
}
</script>

<template>
  <div
    :class="[
      'rounded-xl p-4 sm:p-5 transition-all duration-200',
      isEnabled
        ? 'bg-primary-50 dark:bg-primary-950/30 ring-2 ring-primary shadow-md'
        : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800/80',
    ]"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3 min-w-0">
        <!-- Icon -->
        <div class="size-10 sm:size-12 flex items-center justify-center shrink-0">
          <UIcon
            :name="event.actionType === 'dice_invert' ? 'i-lucide-dice-6' : 'i-lucide-sparkles'"
            class="size-7 sm:size-8"
            :style="{ color: event.rewardColor }"
          />
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              {{ event.name }}
            </h3>
            <UBadge :color="eventTypeBadge.color" variant="soft" size="xs">
              <UIcon :name="eventTypeBadge.icon" class="size-3 mr-1" />
              {{ eventTypeBadge.label }}
            </UBadge>
          </div>
          <p
            v-if="event.description"
            class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1"
          >
            {{ event.description }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {{ actionDescription }}
          </p>
        </div>
      </div>

      <!-- Toggle Switch -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          role="switch"
          :aria-checked="isEnabled"
          :disabled="loading"
          :class="[
            'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
            isEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
          ]"
          @click="handleToggle"
        >
          <span
            :class="[
              'pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              isEnabled ? 'translate-x-5' : 'translate-x-0',
            ]"
          >
            <UIcon
              v-if="loading"
              name="i-game-icons-dice-twenty-faces-twenty"
              class="size-3.5 animate-spin text-gray-400"
            />
          </span>
        </button>
      </div>
    </div>

    <!-- Quick Stats (when enabled) -->
    <div v-if="isEnabled" class="mt-4 pt-4 border-t border-primary/20 dark:border-primary/30">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <!-- Cost -->
        <div
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col"
        >
          <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <UIcon name="i-lucide-coins" class="size-3 shrink-0" />
            <span>Coût Twitch</span>
          </div>
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-auto">
            {{ effectiveCost }} pts
          </p>
        </div>

        <!-- Duration -->
        <div
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col"
        >
          <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <UIcon name="i-lucide-timer" class="size-3 shrink-0" />
            <span>Durée</span>
          </div>
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-auto">
            {{ formatDuration(effectiveDuration) }}
          </p>
        </div>

        <!-- Difficulty -->
        <div
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col"
        >
          <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <UIcon name="i-lucide-gauge" class="size-3 shrink-0" />
            <span>Difficulté</span>
          </div>
          <p
            class="text-sm font-semibold mt-auto"
            :class="[
              difficultyBadge.color === 'success' ? 'text-success-600 dark:text-success-400' : '',
              difficultyBadge.color === 'warning' ? 'text-warning-600 dark:text-warning-400' : '',
              difficultyBadge.color === 'error' ? 'text-error-600 dark:text-error-400' : '',
            ]"
          >
            {{ difficultyBadge.label }}
          </p>
        </div>

        <!-- Minimum -->
        <div
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col"
        >
          <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <UIcon name="i-lucide-shield" class="size-3 shrink-0" />
            <span>Minimum</span>
          </div>
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-auto">
            {{ effectiveMinimum }} clics
          </p>
        </div>
      </div>

      <!-- Settings & Test Buttons -->
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <!-- Test Buttons (DEV/STAGING only) -->
        <template v-if="isDev && event.triggerType === 'dice_critical'">
          <UButton
            icon="i-lucide-flask-conical"
            label="Simuler 20"
            color="warning"
            variant="soft"
            size="sm"
            :loading="loading"
            @click="emit('triggerTest', event.id, 20)"
          />
          <UButton
            icon="i-lucide-flask-conical"
            label="Simuler 1"
            color="warning"
            variant="soft"
            size="sm"
            :loading="loading"
            @click="emit('triggerTest', event.id, 1)"
          />
        </template>
        <!-- Simulate Channel Points Redemption (DEV/STAGING only, any event type) -->
        <UButton
          v-if="isDev && config"
          icon="i-lucide-zap"
          label="Simuler redemption"
          color="info"
          variant="soft"
          size="sm"
          :loading="loading"
          @click="emit('simulateRedemption', event.id)"
        />
        <UButton
          icon="i-lucide-settings"
          label="Paramètres"
          color="primary"
          variant="soft"
          size="sm"
          @click="showSettings = true"
        />
      </div>
    </div>

    <!-- Settings Modal -->
    <UModal v-model:open="showSettings" :ui="{ content: 'modal-scrollbar' }">
      <template #header>
        <div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ event.name }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Configuration de l'événement</p>
        </div>
      </template>

      <template #body>
        <div class="space-y-5">
          <!-- Cost -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Coût en points de chaîne
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Points Twitch totaux nécessaires pour participer à l'événement.
            </p>
            <div class="flex items-stretch h-10">
              <button
                type="button"
                class="flex items-center justify-center w-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-l-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click="cost = Math.max(1, (cost || 100) - 10)"
              >
                <UIcon name="i-lucide-minus" class="size-4" />
              </button>
              <input
                v-model.number="cost"
                type="number"
                inputmode="numeric"
                placeholder="100"
                min="1"
                max="1000000"
                class="flex-1 h-full px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center border-y border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span
                class="flex items-center px-2 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 border-y border-gray-300 dark:border-gray-600"
                >pts</span
              >
              <button
                type="button"
                class="flex items-center justify-center w-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click="cost = Math.min(1000000, (cost || 100) + 10)"
              >
                <UIcon name="i-lucide-plus" class="size-4" />
              </button>
            </div>
          </div>

          <!-- Duration -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Durée de l'événement
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400">Temps pour atteindre l'objectif.</p>
            <div class="flex items-stretch h-10">
              <button
                type="button"
                class="flex items-center justify-center w-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-l-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click="duration = Math.max(10, (duration || 60) - 10)"
              >
                <UIcon name="i-lucide-minus" class="size-4" />
              </button>
              <input
                v-model.number="duration"
                type="number"
                inputmode="numeric"
                placeholder="60"
                min="10"
                max="600"
                class="flex-1 h-full px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center border-y border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span
                class="flex items-center px-2 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 border-y border-gray-300 dark:border-gray-600"
                >sec</span
              >
              <button
                type="button"
                class="flex items-center justify-center w-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click="duration = Math.min(600, (duration || 60) + 10)"
              >
                <UIcon name="i-lucide-plus" class="size-4" />
              </button>
            </div>
          </div>

          <!-- Difficulty -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Difficulté
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Pourcentage de viewers qui doivent participer.
            </p>

            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in difficultyOptions"
                :key="option.value"
                type="button"
                :class="[
                  'p-3 rounded-lg border text-left transition-all',
                  difficulty === option.value
                    ? 'border-primary bg-primary/10 dark:bg-primary/20 ring-1 ring-primary'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800',
                ]"
                @click="difficulty = option.value as DifficultyLevel"
              >
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ option.label }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ option.description }}
                </p>
              </button>
            </div>

            <!-- Custom coefficient input -->
            <div
              v-if="difficulty === 'custom'"
              class="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Coefficient personnalisé
              </label>
              <input
                v-model.number="customCoefficient"
                type="number"
                inputmode="decimal"
                step="0.01"
                :placeholder="`${event.defaultObjectiveCoefficient}`"
                min="0.01"
                max="1"
                class="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                Objectif = viewers × coefficient
              </p>
            </div>

            <!-- Preview -->
            <div
              class="mt-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20"
            >
              <p class="text-xs font-medium text-primary mb-2">Aperçu selon l'audience</p>
              <div class="space-y-1.5">
                <div
                  v-for="preview in previewCalculations"
                  :key="preview.viewers"
                  class="flex items-center justify-between text-xs"
                >
                  <span class="text-gray-600 dark:text-gray-400">
                    {{ preview.viewers }} viewers
                  </span>
                  <span class="font-semibold text-gray-900 dark:text-gray-100">
                    {{ preview.clicks }} clics
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Minimum Objective -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Objectif minimum
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Nombre minimum de clics requis pour valider l'événement, quel que soit le nombre de
              viewers.
            </p>
            <div class="flex items-stretch h-10">
              <button
                type="button"
                class="flex items-center justify-center w-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-l-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click="minimumObjective = Math.max(1, (minimumObjective || 3) - 1)"
              >
                <UIcon name="i-lucide-minus" class="size-4" />
              </button>
              <input
                v-model.number="minimumObjective"
                type="number"
                inputmode="numeric"
                placeholder="3"
                min="1"
                max="1000"
                class="flex-1 h-full px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center border-y border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span
                class="flex items-center px-2 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 border-y border-gray-300 dark:border-gray-600"
                >clics</span
              >
              <button
                type="button"
                class="flex items-center justify-center w-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click="minimumObjective = Math.min(1000, (minimumObjective || 3) + 1)"
              >
                <UIcon name="i-lucide-plus" class="size-4" />
              </button>
            </div>
          </div>

          <!-- Cooldown -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Cooldown après succès
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Temps d'attente après un succès. Aucun cooldown si l'événement échoue.
            </p>
            <div class="grid grid-cols-3 gap-2">
              <!-- Hours -->
              <div class="flex items-stretch h-10">
                <button
                  type="button"
                  class="flex items-center justify-center w-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-l-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  @click="cooldownHours = Math.max(0, (cooldownHours || 0) - 1)"
                >
                  <UIcon name="i-lucide-minus" class="size-3" />
                </button>
                <input
                  v-model.number="cooldownHours"
                  type="number"
                  inputmode="numeric"
                  placeholder="0"
                  min="0"
                  max="23"
                  class="flex-1 min-w-0 h-full px-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center border-y border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span
                  class="flex items-center px-1.5 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 border-y border-gray-300 dark:border-gray-600"
                  >h</span
                >
                <button
                  type="button"
                  class="flex items-center justify-center w-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  @click="cooldownHours = Math.min(23, (cooldownHours || 0) + 1)"
                >
                  <UIcon name="i-lucide-plus" class="size-3" />
                </button>
              </div>
              <!-- Minutes -->
              <div class="flex items-stretch h-10">
                <button
                  type="button"
                  class="flex items-center justify-center w-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-l-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  @click="cooldownMinutes = Math.max(0, (cooldownMinutes || 0) - 5)"
                >
                  <UIcon name="i-lucide-minus" class="size-3" />
                </button>
                <input
                  v-model.number="cooldownMinutes"
                  type="number"
                  inputmode="numeric"
                  placeholder="30"
                  min="0"
                  max="59"
                  class="flex-1 min-w-0 h-full px-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center border-y border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span
                  class="flex items-center px-1 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 border-y border-gray-300 dark:border-gray-600"
                  >min</span
                >
                <button
                  type="button"
                  class="flex items-center justify-center w-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  @click="cooldownMinutes = Math.min(59, (cooldownMinutes || 0) + 5)"
                >
                  <UIcon name="i-lucide-plus" class="size-3" />
                </button>
              </div>
              <!-- Seconds -->
              <div class="flex items-stretch h-10">
                <button
                  type="button"
                  class="flex items-center justify-center w-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-l-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  @click="cooldownSeconds = Math.max(0, (cooldownSeconds || 0) - 5)"
                >
                  <UIcon name="i-lucide-minus" class="size-3" />
                </button>
                <input
                  v-model.number="cooldownSeconds"
                  type="number"
                  inputmode="numeric"
                  placeholder="0"
                  min="0"
                  max="59"
                  class="flex-1 min-w-0 h-full px-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center border-y border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span
                  class="flex items-center px-1 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 border-y border-gray-300 dark:border-gray-600"
                  >sec</span
                >
                <button
                  type="button"
                  class="flex items-center justify-center w-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  @click="cooldownSeconds = Math.min(59, (cooldownSeconds || 0) + 5)"
                >
                  <UIcon name="i-lucide-plus" class="size-3" />
                </button>
              </div>
            </div>
            <p v-if="cooldownTotalSeconds > 0" class="text-xs text-primary font-medium">
              = {{ formatCooldown(cooldownTotalSeconds) }}
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <UButton
            color="neutral"
            variant="ghost"
            label="Réinitialiser"
            size="sm"
            @click="handleResetToDefaults"
          />
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="outline"
              label="Annuler"
              @click="showSettings = false"
            />
            <UButton
              color="primary"
              label="Enregistrer"
              :loading="loading"
              @click="handleSaveSettings"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* Custom scrollbar for modal */
:deep(.modal-scrollbar) {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--color-gray-400)) transparent;
}

:deep(.modal-scrollbar::-webkit-scrollbar) {
  width: 6px;
}

:deep(.modal-scrollbar::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.modal-scrollbar::-webkit-scrollbar-thumb) {
  background-color: rgb(var(--color-gray-400));
  border-radius: 3px;
}

:deep(.modal-scrollbar::-webkit-scrollbar-thumb:hover) {
  background-color: rgb(var(--color-gray-500));
}

/* Dark mode scrollbar */
:root.dark :deep(.modal-scrollbar) {
  scrollbar-color: rgb(var(--color-gray-600)) transparent;
}

:root.dark :deep(.modal-scrollbar::-webkit-scrollbar-thumb) {
  background-color: rgb(var(--color-gray-600));
}

:root.dark :deep(.modal-scrollbar::-webkit-scrollbar-thumb:hover) {
  background-color: rgb(var(--color-gray-500));
}
</style>
