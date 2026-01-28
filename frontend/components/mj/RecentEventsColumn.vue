<script setup lang="ts">
import type { PollInstance } from '~/types/api'
import { usePollsStore } from '~/stores/polls'

const props = defineProps<{
  campaignId: string
  maxHeight?: string
}>()

const emit = defineEmits<{
  viewResults: [poll: PollInstance]
}>()

const config = useRuntimeConfig()
const API_URL = config.public.apiBase
const pollsStore = usePollsStore()

const loading = ref(false)
const finishedPolls = ref<PollInstance[]>([])

/**
 * Récupère les sondages terminés de la campagne
 */
const fetchFinishedPolls = async () => {
  if (!props.campaignId) return

  loading.value = true
  try {
    const response = await fetch(
      `${API_URL}/mj/campaigns/${props.campaignId}/polls/instances?status=COMPLETED`,
      { credentials: 'include' }
    )

    if (!response.ok) throw new Error('Failed to fetch polls')

    const data = await response.json()

    // Filtrer uniquement les sondages terminés et trier par date de fin
    finishedPolls.value = (data.data || [])
      .filter((poll: PollInstance) => poll.status === 'ENDED' && poll.endedAt)
      .sort(
        (a: PollInstance, b: PollInstance) =>
          new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime()
      )
      .slice(0, 20) // Limiter à 20 derniers
  } catch (error) {
    console.error('Failed to fetch finished polls:', error)
    finishedPolls.value = []
  } finally {
    loading.value = false
  }
}

/**
 * Formate la date d'un sondage terminé
 */
const formatPollDate = (dateStr: string | null): string => {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  // Format relatif pour les récents
  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`

  // Format date pour les plus anciens
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Charger les sondages au changement de campagne
watch(() => props.campaignId, fetchFinishedPolls, { immediate: true })

// Rafraîchir quand un sondage se termine (signalé par pollsStore.lastPollEndedAt)
watch(
  () => pollsStore.lastPollEndedAt,
  (newValue) => {
    if (newValue) {
      // Petit délai pour laisser le backend enregistrer les résultats
      setTimeout(() => {
        fetchFinishedPolls()
      }, 500)
    }
  }
)
</script>

<template>
  <div
    class="flex flex-col bg-subtle border border-default rounded-lg p-4"
    :style="{ maxHeight: maxHeight || 'none' }"
  >
    <!-- Header -->
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-primary">Événements récents</h3>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon
        name="i-game-icons-dice-twenty-faces-twenty"
        class="size-8 text-primary animate-spin-slow"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="finishedPolls.length === 0"
      class="flex-1 flex flex-col items-center justify-center text-center py-12"
    >
      <UIcon name="i-lucide-history" class="size-12 text-muted mb-4" />
      <p class="text-base font-normal text-muted">Aucun sondage terminé</p>
      <p class="text-sm text-muted mt-1">Les résultats de vos sondages apparaîtront ici</p>
    </div>

    <!-- Liste des sondages terminés -->
    <div v-else class="flex-1 space-y-2 overflow-y-auto min-h-0">
      <div
        v-for="poll in finishedPolls"
        :key="poll.id"
        class="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/75 transition-colors group"
        @click="emit('viewResults', poll)"
      >
        <!-- Icône -->
        <div
          class="shrink-0 w-10 h-10 rounded-lg bg-success-light flex items-center justify-center"
        >
          <UIcon name="i-lucide-bar-chart-2" class="size-5 text-success-600" />
        </div>

        <!-- Contenu -->
        <div class="flex-1 min-w-0">
          <p class="font-medium text-primary text-sm truncate capitalize">
            {{ poll.title }}
          </p>
          <p class="text-xs text-muted">
            {{ formatPollDate(poll.endedAt) }}
          </p>
        </div>

        <!-- Chevron -->
        <UIcon
          name="i-lucide-chevron-right"
          class="size-5 text-muted group-hover:text-primary transition-colors shrink-0"
        />
      </div>
    </div>
  </div>
</template>
