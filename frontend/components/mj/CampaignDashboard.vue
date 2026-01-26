<script setup lang="ts">
import type { PollInstance } from '~/types/api'
import type { Campaign, CampaignMembership, LiveStatusMap } from '~/types'

defineProps<{
  campaign: Campaign
  members: CampaignMembership[]
  liveStatus: LiveStatusMap
  membersLoading?: boolean
}>()

// État de la modale des résultats
const showResultsModal = ref(false)
const selectedPoll = ref<PollInstance | null>(null)

/**
 * Ouvre la modale des résultats pour un sondage
 */
const openResultsModal = (poll: PollInstance) => {
  selectedPoll.value = poll
  showResultsModal.value = true
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="size-3 rounded-full bg-brand-500 shrink-0" />
          <h2 class="heading-card">{{ campaign.name }}</h2>
        </div>
        <UButton
          color="primary"
          variant="solid"
          icon="i-lucide-settings"
          label="Réglages"
          :to="`/mj/campaigns/${campaign.id}`"
        />
      </div>
    </template>

    <!-- Layout 2 colonnes: 7fr / 3fr (proportionnel avec gap) -->
    <div class="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
      <!-- Colonne gauche: Événements récents -->
      <MjRecentEventsColumn
        :campaign-id="campaign.id"
        max-height="420px"
        @view-results="openResultsModal"
      />

      <!-- Colonne droite: Joueurs -->
      <MjPlayersColumn
        :members="members"
        :live-status="liveStatus"
        :loading="membersLoading"
        :campaign-id="campaign.id"
        max-height="420px"
      />
    </div>

    <!-- Modale des résultats -->
    <MjPollResultsModal v-model="showResultsModal" :poll="selectedPoll" />
  </UCard>
</template>
