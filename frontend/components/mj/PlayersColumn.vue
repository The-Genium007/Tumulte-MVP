<script setup lang="ts">
import type { CampaignMembership, LiveStatusMap } from '~/types'

const props = defineProps<{
  members: CampaignMembership[]
  liveStatus: LiveStatusMap
  loading?: boolean
  campaignId?: string | null
  maxHeight?: string
}>()

// Filtrer uniquement les membres actifs
const activeMembers = computed(() => props.members.filter((member) => member.status === 'ACTIVE'))

/**
 * Formate le temps d'autorisation restant
 */
const formatAuthTime = (seconds: number | null): string => {
  if (!seconds) return 'Non autorisé'

  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hours}h${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
</script>

<template>
  <div
    class="bg-subtle border border-default rounded-lg p-4 flex flex-col"
    :style="{ maxHeight: maxHeight || 'none' }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-primary">Joueurs</h3>
        <p v-if="activeMembers.length > 0" class="text-xs text-muted">
          {{ activeMembers.length }} joueur(s) actif(s)
        </p>
      </div>
      <UButton
        v-if="campaignId"
        color="primary"
        variant="solid"
        icon="i-lucide-user-plus"
        size="xs"
        :to="`/mj/campaigns/${campaignId}`"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <UIcon
        name="i-game-icons-dice-twenty-faces-twenty"
        class="size-8 text-primary animate-spin-slow mb-3"
      />
      <p class="text-muted text-sm">Chargement...</p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="activeMembers.length === 0"
      class="flex flex-col items-center justify-center text-center py-12"
    >
      <UIcon name="i-lucide-user-plus" class="size-12 text-muted mb-4" />
      <p class="text-base font-normal text-muted">Aucun joueur dans cette campagne</p>
    </div>

    <!-- Liste des joueurs -->
    <div v-else class="flex-1 space-y-2 overflow-y-auto min-h-0">
      <div
        v-for="member in activeMembers"
        :key="member.id"
        class="flex items-center justify-between p-3 bg-(--theme-card-bg) rounded-lg"
      >
        <!-- Avatar + Nom -->
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <div class="relative shrink-0">
            <TwitchAvatar
              :image-url="member.streamer.profileImageUrl"
              :display-name="member.streamer.twitchDisplayName"
              size="sm"
            />
            <LiveBadge :live-status="liveStatus[member.streamer.twitchUserId]" />
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-primary text-sm truncate">
              {{ member.streamer.twitchDisplayName }}
            </p>
            <a
              :href="`https://www.twitch.tv/${member.streamer.twitchLogin}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-muted hover:text-brand-500 transition-colors truncate block"
            >
              @{{ member.streamer.twitchLogin }}
            </a>
          </div>
        </div>

        <!-- Badges -->
        <div class="flex items-center gap-1 shrink-0 ml-2">
          <!-- Badge type broadcaster -->
          <UBadge
            v-if="member.streamer.broadcasterType === 'partner'"
            label="Partenaire"
            color="primary"
            variant="soft"
            size="xs"
          />
          <UBadge
            v-else-if="member.streamer.broadcasterType === 'affiliate'"
            label="Affilié"
            color="primary"
            variant="soft"
            size="xs"
          />
          <UBadge v-else label="Non affilié" color="info" variant="soft" size="xs" />

          <!-- Badge autorisation (same logic for owner and members) -->
          <UBadge v-if="member.isPollAuthorized" color="success" variant="soft" size="xs">
            <div class="flex items-center gap-1">
              <UIcon name="i-lucide-shield-check" class="size-3" />
              <span>{{ formatAuthTime(member.authorizationRemainingSeconds) }}</span>
            </div>
          </UBadge>
          <UBadge v-else label="Non autorisé" color="warning" variant="soft" size="xs" />
        </div>
      </div>
    </div>
  </div>
</template>
