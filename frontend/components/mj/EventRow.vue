<script setup lang="ts">
import type { Poll } from '~/types'

const props = defineProps<{
  poll: Poll
  isActive: boolean
  isLastLaunched: boolean
  launching?: boolean
  cancelling?: boolean
}>()

const emit = defineEmits<{
  launch: [pollId: string]
  cancel: []
  delete: [pollId: string]
}>()

/**
 * Format duration in human readable format
 */
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m${secs}s` : `${mins}m`
}

/**
 * Row background class based on state
 */
const rowClass = computed(() => {
  if (props.isActive) return 'bg-brand-light border-brand-light'
  if (props.isLastLaunched) return 'bg-elevated border-default'
  return 'bg-(--theme-card-bg) border-(--theme-border-muted)'
})
</script>

<template>
  <div
    class="flex items-stretch rounded-lg border transition-colors overflow-hidden h-12 sm:h-14"
    :class="rowClass"
  >
    <!-- Play/Cancel button - full height square -->
    <button
      v-if="isActive"
      class="flex items-center justify-center w-12 sm:w-14 bg-error-500 hover:bg-error-600 text-white transition-colors shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
      :disabled="cancelling"
      aria-label="Annuler le sondage"
      @click="emit('cancel')"
    >
      <UIcon
        v-if="cancelling"
        name="i-game-icons-dice-twenty-faces-twenty"
        class="size-4 sm:size-5 animate-spin-slow"
      />
      <UIcon v-else name="i-lucide-x" class="size-4 sm:size-5" />
    </button>
    <button
      v-else
      class="flex items-center justify-center w-12 sm:w-14 bg-primary hover:bg-primary-600 text-white transition-colors shrink-0"
      :disabled="launching"
      aria-label="Lancer le sondage"
      @click="emit('launch', poll.id)"
    >
      <UIcon
        v-if="launching"
        name="i-game-icons-dice-twenty-faces-twenty"
        class="size-4 sm:size-5 animate-spin-slow"
      />
      <UIcon v-else name="i-lucide-play" class="size-4 sm:size-5" />
    </button>

    <!-- Poll info -->
    <div class="flex-1 min-w-0 px-3 sm:px-4 py-1 sm:py-2 flex items-center gap-2 overflow-hidden">
      <UIcon name="i-lucide-bar-chart-2" class="size-4 text-primary shrink-0" />
      <div class="flex flex-col justify-center min-w-0">
        <p
          class="font-medium text-primary truncate text-sm sm:text-base leading-tight first-letter:capitalize"
        >
          {{ poll.question }}
        </p>
        <div class="flex items-center gap-2 text-caption shrink-0">
          <span class="shrink-0">{{ formatDuration(poll.durationSeconds) }}</span>
          <span v-if="poll.channelPointsEnabled" class="flex items-center gap-1 shrink-0">
            <UIcon name="i-lucide-coins" class="size-3" />
            {{ poll.channelPointsPerVote }}
          </span>
        </div>
      </div>
    </div>

    <!-- Active indicator -->
    <div v-if="isActive" class="flex items-center px-2 sm:px-3">
      <UBadge color="success" variant="soft" size="xs">
        <div class="flex items-center gap-1">
          <span class="size-2 bg-success-500 rounded-full animate-pulse" />
          <span class="hidden sm:inline">En cours</span>
        </div>
      </UBadge>
    </div>

    <!-- Actions button - full height square -->
    <div
      class="flex items-center justify-center w-12 sm:w-14 bg-elevated hover:bg-muted transition-colors shrink-0"
      :class="{ 'opacity-50': isActive }"
    >
      <MjEventActionsDropdown
        :poll-id="poll.id"
        :campaign-id="poll.campaignId"
        :disabled="isActive"
        @delete="emit('delete', poll.id)"
      />
    </div>
  </div>
</template>
