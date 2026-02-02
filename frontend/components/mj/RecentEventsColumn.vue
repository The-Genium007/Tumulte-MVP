<script setup lang="ts">
import type { CampaignEvent } from '@/types/campaign-events'
import { usePollsStore } from '~/stores/polls'

const props = defineProps<{
  campaignId: string
  maxHeight?: string
}>()

const pollsStore = usePollsStore()
const { events, loading, fetchEvents } = useCampaignEvents()

// State pour la modal de détail
const selectedEvent = ref<CampaignEvent | null>(null)
const isDetailModalOpen = ref(false)

/**
 * Ouvre la modal de détail pour un événement
 */
const openEventDetail = (event: CampaignEvent) => {
  selectedEvent.value = event
  isDetailModalOpen.value = true
}

/**
 * Charge les événements au changement de campagne
 */
watch(
  () => props.campaignId,
  async (campaignId) => {
    if (campaignId) {
      await fetchEvents(campaignId, { limit: 20 })
    }
  },
  { immediate: true }
)

/**
 * Rafraîchit quand un sondage se termine (signalé par pollsStore.lastPollEndedAt)
 */
watch(
  () => pollsStore.lastPollEndedAt,
  async (newValue) => {
    if (newValue && props.campaignId) {
      // Petit délai pour laisser le backend enregistrer les résultats
      setTimeout(async () => {
        await fetchEvents(props.campaignId, { limit: 20 })
      }, 500)
    }
  }
)

/**
 * Rafraîchit aussi quand une instance de gamification se termine
 * On écoute les événements WebSocket si disponibles
 */
// TODO: Ajouter listener WebSocket pour gamification/instance_completed
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
      v-else-if="events.length === 0"
      class="flex-1 flex flex-col items-center justify-center text-center py-12"
    >
      <UIcon name="i-lucide-history" class="size-12 text-muted mb-4" />
      <p class="text-base font-normal text-muted">Aucun événement</p>
      <p class="text-sm text-muted mt-1">
        Les résultats de vos sondages et intégrations Twitch apparaîtront ici
      </p>
    </div>

    <!-- Liste des événements -->
    <div v-else class="flex-1 space-y-2 overflow-y-auto min-h-0">
      <MjCampaignEventRow
        v-for="event in events"
        :key="event.id"
        :event="event"
        @click="openEventDetail"
      />
    </div>

    <!-- Modal de détail -->
    <MjCampaignEventDetailModal v-model:open="isDetailModalOpen" :event="selectedEvent" />
  </div>
</template>
