<script setup lang="ts">
import type { CampaignEvent } from '@/types/campaign-events'
import {
  CAMPAIGN_EVENT_TYPE_CONFIG,
  isPollMetadata,
  isGamificationMetadata,
} from '@/types/campaign-events'

const props = defineProps<{
  event: CampaignEvent | null
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { formatRelativeDate } = useCampaignEvents()

/**
 * Configuration d'affichage pour ce type d'événement
 */
const typeConfig = computed(() => {
  if (!props.event) return CAMPAIGN_EVENT_TYPE_CONFIG.poll
  return CAMPAIGN_EVENT_TYPE_CONFIG[props.event.type] || CAMPAIGN_EVENT_TYPE_CONFIG.poll
})

/**
 * Vérifie si c'est un sondage
 */
const isPoll = computed(() => {
  return props.event && isPollMetadata(props.event.metadata)
})

/**
 * Vérifie si c'est une gamification
 */
const isGamification = computed(() => {
  return props.event && isGamificationMetadata(props.event.metadata)
})

/**
 * Sondage annulé
 */
const isCancelled = computed(() => {
  return props.event && isPollMetadata(props.event.metadata) && props.event.metadata.isCancelled
})

/**
 * Sondage sans votes (non annulé)
 */
const hasNoVotes = computed(() => {
  return (
    !isCancelled.value &&
    props.event &&
    isPollMetadata(props.event.metadata) &&
    props.event.metadata.totalVotes === 0
  )
})

/**
 * Calcule le pourcentage pour une option de sondage
 */
const getOptionPercentage = (option: string): number => {
  if (!props.event || !isPollMetadata(props.event.metadata)) return 0
  const { totalVotes, votesByOption } = props.event.metadata
  if (totalVotes === 0) return 0
  return Math.round(((votesByOption[option] || 0) / totalVotes) * 100)
}

/**
 * Vérifie si une option est gagnante (jamais vrai quand annulé)
 */
const isWinningOption = (option: string): boolean => {
  if (isCancelled.value) return false
  if (!props.event || !isPollMetadata(props.event.metadata)) return false
  return props.event.metadata.winningOptions.includes(option)
}

/**
 * Classe CSS pour la barre de progression d'une option
 */
const getBarClass = (option: string): string => {
  if (isCancelled.value) return 'bg-muted-foreground/30'
  if (isWinningOption(option)) return 'bg-success-500'
  return 'bg-primary/30'
}
</script>

<template>
  <UModal v-model:open="isOpen" class="w-full max-w-lg mx-4">
    <!-- Header avec icône type + nom + sous-texte -->
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          :class="[
            event?.type === 'poll' ? 'bg-success-light' : 'bg-orange-100 dark:bg-orange-900/30',
          ]"
        >
          <UIcon :name="typeConfig.icon" class="size-5" :class="typeConfig.iconColor" />
        </div>
        <div class="min-w-0">
          <h3 class="text-lg font-semibold text-primary truncate">{{ event?.name }}</h3>
          <p class="text-sm text-muted">
            {{ typeConfig.label }} • {{ event ? formatRelativeDate(event.completedAt) : '' }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="event" class="space-y-6">
        <!-- Encart résultat conditionnel -->
        <div
          class="p-4 rounded-lg"
          :class="[
            isCancelled ? 'bg-error-50 dark:bg-error-900/20' : hasNoVotes ? 'bg-muted' : 'bg-muted',
          ]"
        >
          <div class="flex items-center gap-3">
            <span v-if="event.primaryResult.emoji" class="text-2xl">
              {{ event.primaryResult.emoji }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted">Résultat</p>
              <p class="font-semibold text-primary">
                {{ event.primaryResult.text }}
                <span v-if="event.primaryResult.isExAequo" class="text-muted font-normal">
                  (ex-æquo)
                </span>
              </p>
            </div>
            <UIcon
              v-if="!isCancelled"
              :name="event.primaryResult.success ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
              class="size-6 shrink-0"
              :class="event.primaryResult.success ? 'text-success-500' : 'text-error-500'"
            />
          </div>
        </div>

        <!-- Détails spécifiques aux sondages -->
        <template v-if="isPoll && isPollMetadata(event.metadata)">
          <div class="space-y-3">
            <h4 class="font-medium text-primary text-sm">
              Résultats ({{ event.metadata.totalVotes }}
              {{ event.metadata.totalVotes <= 1 ? 'vote' : 'votes' }})
            </h4>

            <!-- Options avec barres de progression -->
            <div v-for="option in event.metadata.options" :key="option" class="space-y-1.5">
              <div class="flex justify-between text-sm">
                <span
                  :class="[isWinningOption(option) ? 'font-semibold text-primary' : 'text-muted']"
                >
                  {{ option }}
                  <UIcon
                    v-if="isWinningOption(option)"
                    name="i-lucide-trophy"
                    class="size-3.5 inline ml-1 text-warning-500"
                  />
                </span>
                <span class="text-muted tabular-nums">
                  {{ event.metadata.votesByOption[option] || 0 }}
                  ({{ getOptionPercentage(option) }}%)
                </span>
              </div>
              <div class="h-2 bg-default rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="getBarClass(option)"
                  :style="{ width: `${getOptionPercentage(option)}%` }"
                />
              </div>
            </div>

            <!-- Résultats par chaîne (si disponibles) -->
            <div
              v-if="event.metadata.channelResults && event.metadata.channelResults.length > 1"
              class="pt-4 border-t border-default"
            >
              <h4 class="text-sm font-medium text-muted mb-3">Par chaîne</h4>
              <div class="space-y-2">
                <div
                  v-for="channel in event.metadata.channelResults"
                  :key="channel.streamerName"
                  class="flex items-center justify-between text-sm p-2 bg-muted rounded"
                >
                  <span class="font-medium text-primary">{{ channel.streamerName }}</span>
                  <span class="text-muted">{{ channel.totalVotes }} vote(s)</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Détails spécifiques à la gamification -->
        <template v-if="isGamification && isGamificationMetadata(event.metadata)">
          <!-- Progression -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted">Progression</span>
              <span class="font-medium text-primary">
                {{ event.metadata.currentProgress }} / {{ event.metadata.objectiveTarget }} ({{
                  event.metadata.progressPercentage
                }}%)
              </span>
            </div>
            <div class="h-3 bg-default rounded-full overflow-hidden">
              <div
                class="h-full bg-orange-500 rounded-full transition-all"
                :style="{ width: `${event.metadata.progressPercentage}%` }"
              />
            </div>
          </div>

          <!-- Données du déclencheur -->
          <div v-if="event.metadata.triggerData" class="space-y-2">
            <h4 class="font-medium text-primary text-sm">Déclencheur</h4>
            <div class="p-3 rounded-lg bg-muted text-sm space-y-1">
              <p v-if="event.metadata.triggerData.characterName">
                <span class="text-muted">Personnage :</span>
                <span class="font-medium ml-1">{{ event.metadata.triggerData.characterName }}</span>
              </p>
              <p v-if="event.metadata.triggerData.formula">
                <span class="text-muted">Formule :</span>
                <span class="font-mono ml-1">{{ event.metadata.triggerData.formula }}</span>
              </p>
              <p v-if="event.metadata.triggerData.result !== undefined">
                <span class="text-muted">Résultat :</span>
                <span class="font-semibold ml-1">{{ event.metadata.triggerData.result }}</span>
                <span
                  v-if="event.metadata.triggerData.criticalType"
                  class="ml-2 text-xs px-1.5 py-0.5 rounded"
                  :class="[
                    event.metadata.triggerData.criticalType === 'success'
                      ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                      : 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400',
                  ]"
                >
                  {{
                    event.metadata.triggerData.criticalType === 'success' ? 'Critique !' : 'Fumble'
                  }}
                </span>
              </p>
            </div>
          </div>

          <!-- Résultat de l'action -->
          <div v-if="event.metadata.resultData" class="space-y-2">
            <h4 class="font-medium text-primary text-sm">Action exécutée</h4>
            <div
              class="p-3 rounded-lg text-sm"
              :class="[
                event.metadata.resultData.success
                  ? 'bg-success-50 dark:bg-success-900/20'
                  : 'bg-error-50 dark:bg-error-900/20',
              ]"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  :name="event.metadata.resultData.success ? 'i-lucide-check' : 'i-lucide-x'"
                  class="size-4"
                  :class="[
                    event.metadata.resultData.success ? 'text-success-600' : 'text-error-600',
                  ]"
                />
                <span
                  :class="[
                    event.metadata.resultData.success
                      ? 'text-success-700 dark:text-success-400'
                      : 'text-error-700 dark:text-error-400',
                  ]"
                >
                  {{
                    event.metadata.resultData.message ||
                    (event.metadata.resultData.success ? 'Action réussie' : 'Action échouée')
                  }}
                </span>
              </div>
            </div>
          </div>

          <!-- Top contributeurs -->
          <div
            v-if="event.metadata.topContributors && event.metadata.topContributors.length > 0"
            class="space-y-2"
          >
            <h4 class="font-medium text-primary text-sm">Top contributeurs</h4>
            <div class="space-y-1">
              <div
                v-for="(contributor, index) in event.metadata.topContributors.slice(0, 5)"
                :key="contributor.twitchUsername"
                class="flex items-center gap-2 text-sm p-2 rounded bg-muted"
              >
                <span class="text-muted w-5 text-center">{{ index + 1 }}.</span>
                <UIcon name="i-lucide-twitch" class="size-4 text-purple-500" />
                <span class="font-medium text-primary">{{ contributor.twitchUsername }}</span>
                <span class="ml-auto text-muted">{{ contributor.amount }} pts</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          color="primary"
          variant="solid"
          label="Fermer"
          class="w-full sm:w-auto"
          @click="isOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>
