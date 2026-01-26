<template>
  <UCard class="border-2 border-brand-light bg-brand-light">
    <div class="flex items-center justify-between gap-6">
      <!-- Partie gauche: Compteur + Question + Chrono + Actions -->
      <div class="flex items-center gap-4 flex-1">
        <!-- Compteur de questions -->
        <UBadge
          :label="`${currentIndex + 1}/${totalPolls}`"
          color="primary"
          size="lg"
          variant="soft"
        />

        <!-- Question -->
        <h3 class="heading-card flex-1">{{ poll?.question }}</h3>

        <!-- Chrono (si en cours) -->
        <div
          v-if="(status === 'sending' || status === 'running') && countdown > 0"
          class="flex items-center gap-2 px-4 py-2 bg-primary-light rounded-lg border border-primary-light"
        >
          <UIcon name="i-lucide-clock" class="size-5 text-primary-500" />
          <span class="text-2xl font-bold text-primary-500 tabular-nums">
            {{ Math.floor(countdown / 60) }}:{{ String(countdown % 60).padStart(2, '0') }}
          </span>
        </div>

        <!-- Bouton Envoyer -->
        <UButton
          v-if="status === 'idle'"
          color="primary"
          icon="i-lucide-send"
          label="Envoyer"
          size="lg"
          :loading="props.sendLoading"
          :disabled="props.sendLoading"
          @click="$emit('send')"
        />

        <!-- Bouton Relancer (pour polls annulés) -->
        <UButton
          v-if="status === 'cancelled'"
          color="primary"
          icon="i-lucide-refresh-cw"
          label="Relancer"
          size="lg"
          :loading="props.sendLoading"
          :disabled="props.sendLoading"
          @click="$emit('send')"
        />
      </div>

      <!-- Partie droite: Navigation + Badges + Fermer -->
      <div class="flex items-center gap-3">
        <!-- Flèches de navigation (avec bordures) -->
        <div class="flex flex-col gap-1">
          <UButton
            color="primary"
            variant="solid"
            icon="i-lucide-chevron-up"
            size="sm"
            square
            class="border border-primary-500"
            :disabled="currentIndex === 0"
            @click="$emit('previous')"
          />
          <UButton
            color="primary"
            variant="solid"
            icon="i-lucide-chevron-down"
            size="sm"
            square
            class="border border-primary-500"
            :disabled="currentIndex === totalPolls - 1"
            @click="$emit('next')"
          />
        </div>

        <!-- Badge d'état -->
        <UBadge
          v-if="status === 'sending' || status === 'running'"
          label="En cours"
          color="warning"
          variant="soft"
          size="lg"
        />
        <UBadge
          v-else-if="status === 'sent'"
          label="Envoyé"
          color="success"
          variant="soft"
          size="lg"
        />
        <UBadge
          v-else-if="status === 'cancelled'"
          label="Annulé"
          color="error"
          variant="soft"
          size="lg"
        />

        <!-- Bouton fermer/annuler intelligent -->
        <UButton
          :color="status === 'sending' || status === 'running' ? 'error' : 'neutral'"
          variant="solid"
          icon="i-lucide-x"
          size="sm"
          square
          :loading="props.closeLoading"
          :disabled="props.closeLoading"
          :class="
            status === 'sending' || status === 'running'
              ? 'border-2 border-error-500'
              : 'border border-neutral-300'
          "
          @click="$emit('close')"
        />
      </div>
    </div>

    <!-- Options et Résultats -->
    <div
      v-if="
        (status === 'sending' || status === 'running' || status === 'pending' || results) &&
        status !== 'cancelled'
      "
      class="mt-6 pt-6 border-t border-default"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="(option, index) in allOptions"
          :key="index"
          :class="[
            'p-3 rounded-lg border transition-all duration-300',
            isWinningOption(option)
              ? 'bg-linear-to-br from-warning-400 to-warning-200 border-warning-300 shadow-lg shadow-warning-500/20'
              : 'bg-neutral-100 border-default',
          ]"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'font-medium text-sm',
                  isWinningOption(option) ? 'text-warning-600' : 'text-primary',
                ]"
              >
                {{ option.label }}
              </span>
              <!-- Badge Gagnant ou Ex-aequo -->
              <UBadge
                v-if="isWinningOption(option)"
                :color="hasMultipleWinners ? 'warning' : 'success'"
                variant="soft"
                size="xs"
              >
                <div class="flex items-center gap-1">
                  <UIcon
                    :name="hasMultipleWinners ? 'i-lucide-equal' : 'i-lucide-crown'"
                    class="size-3"
                  />
                  <span class="font-semibold">{{
                    hasMultipleWinners ? 'Ex-aequo' : 'Gagnant'
                  }}</span>
                </div>
              </UBadge>
            </div>
            <span
              :class="[
                'font-bold',
                isWinningOption(option) ? 'text-warning-600 text-lg' : 'text-brand-500',
              ]"
            >
              {{ option.votes }}
            </span>
          </div>
          <div class="w-full bg-neutral-200 rounded-full h-2">
            <div
              :class="[
                'h-2 rounded-full transition-all duration-500',
                isWinningOption(option)
                  ? 'bg-linear-to-r from-warning-500 to-warning-400'
                  : 'bg-brand-500',
              ]"
              :style="{ width: `${option.percentage}%` }"
            ></div>
          </div>
        </div>
      </div>
      <p v-if="totalVotes > 0" class="text-caption text-center mt-3">
        Total: {{ totalVotes }} votes
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Simplified poll type - only what this component needs
interface SimplePoll {
  id: string
  question: string
  options: string[]
}

interface PollResult {
  option: string
  votes: number
}

interface PollResultsData {
  results: PollResult[]
  totalVotes: number
}

interface Props {
  poll: SimplePoll | null
  currentIndex: number
  totalPolls: number
  status: 'idle' | 'pending' | 'sending' | 'running' | 'sent' | 'cancelled'
  countdown: number
  results?: PollResultsData | null
  sendLoading?: boolean
  closeLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  results: null,
  sendLoading: false,
  closeLoading: false,
})

defineEmits<{
  send: []
  previous: []
  next: []
  close: []
}>()

// Computed: Toutes les options avec leurs votes
const allOptions = computed(() => {
  if (!props.poll) return []

  return props.poll.options.map((optionLabel) => {
    const resultForOption = props.results?.results.find((r) => r.option === optionLabel)
    const votes = resultForOption?.votes || 0
    const percentage =
      props.results && props.results.totalVotes > 0 ? (votes / props.results.totalVotes) * 100 : 0

    return {
      label: optionLabel,
      votes,
      percentage,
    }
  })
})

// Computed: Total des votes
const totalVotes = computed(() => props.results?.totalVotes || 0)

// Computed: Score maximum (pour déterminer les gagnants)
const maxVotes = computed(() => {
  if (!props.results || !props.results.results.length) return 0
  return Math.max(...props.results.results.map((r) => r.votes))
})

// Function: Vérifier si une option est gagnante
const isWinningOption = (option: { label: string; votes: number }) => {
  return option.votes > 0 && option.votes === maxVotes.value
}

// Computed: Détecter s'il y a plusieurs gagnants (ex-aequo)
const hasMultipleWinners = computed(() => {
  if (!props.results || !props.results.results.length) return false
  const winnersCount = props.results.results.filter((r) => r.votes === maxVotes.value).length
  return winnersCount > 1
})
</script>
