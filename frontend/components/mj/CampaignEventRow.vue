<script setup lang="ts">
import type { CampaignEvent } from '@/types/campaign-events'
import { CAMPAIGN_EVENT_TYPE_CONFIG, isPollMetadata } from '@/types/campaign-events'

const props = defineProps<{
  event: CampaignEvent
}>()

const emit = defineEmits<{
  click: [event: CampaignEvent]
}>()

const { formatRelativeDate } = useCampaignEvents()

/**
 * Configuration d'affichage pour ce type d'événement
 */
const typeConfig = computed(() => {
  return CAMPAIGN_EVENT_TYPE_CONFIG[props.event.type] || CAMPAIGN_EVENT_TYPE_CONFIG.poll
})

/**
 * Texte du résultat avec mention ex-æquo si nécessaire
 */
const resultText = computed(() => {
  const { text, isExAequo } = props.event.primaryResult
  return isExAequo ? `${text} (ex-æquo)` : text
})

/**
 * Classe de couleur pour l'icône de résultat (✅ ou ❌)
 */
const resultIconClass = computed(() => {
  return props.event.primaryResult.success ? 'text-success-500' : 'text-error-500'
})

/**
 * Icône de résultat
 */
const resultIcon = computed(() => {
  return props.event.primaryResult.success ? 'i-lucide-check-circle' : 'i-lucide-x-circle'
})

/**
 * Sondage annulé — on masque l'icône succès/échec (l'emoji ❌ suffit)
 */
const isCancelled = computed(() => {
  return (
    props.event.type === 'poll' &&
    isPollMetadata(props.event.metadata) &&
    props.event.metadata.isCancelled
  )
})
</script>

<template>
  <div
    class="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/75 transition-colors group"
    @click="emit('click', event)"
  >
    <!-- Icône du type d'événement -->
    <div
      class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
      :class="[event.type === 'poll' ? 'bg-success-light' : 'bg-orange-100 dark:bg-orange-900/30']"
    >
      <UIcon :name="typeConfig.icon" class="size-5" :class="typeConfig.iconColor" />
    </div>

    <!-- Contenu principal -->
    <div class="flex-1 min-w-0">
      <!-- Nom de l'événement -->
      <p class="font-medium text-primary text-sm truncate">
        {{ event.name }}
      </p>

      <!-- Date -->
      <p class="text-xs text-muted">
        {{ formatRelativeDate(event.completedAt) }}
      </p>
    </div>

    <!-- Résultat principal -->
    <div
      class="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md bg-default border border-default"
    >
      <!-- Emoji du résultat -->
      <span v-if="event.primaryResult.emoji" class="text-sm">
        {{ event.primaryResult.emoji }}
      </span>

      <!-- Texte du résultat (tronqué si trop long) -->
      <span class="text-xs font-medium text-primary max-w-40 truncate">
        {{ resultText }}
      </span>

      <!-- Icône succès/échec (masquée si annulé — l'emoji ❌ suffit) -->
      <UIcon
        v-if="!isCancelled"
        :name="resultIcon"
        class="size-4 shrink-0"
        :class="resultIconClass"
      />
    </div>

    <!-- Chevron pour indiquer qu'on peut cliquer -->
    <UIcon
      name="i-lucide-chevron-right"
      class="size-5 text-muted group-hover:text-primary transition-colors shrink-0"
    />
  </div>
</template>
