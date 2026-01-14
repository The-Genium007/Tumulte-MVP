<template>
  <div class="space-y-4">
    <!-- Info text above -->
    <UAlert
      color="primary"
      variant="soft"
      icon="i-lucide-info"
      class="mb-4"
    >
      <template #description>
        Autorisez Tumulte à lancer des sondages sur votre chaîne pour cette campagne pendant 12 heures.
      </template>
    </UAlert>

    <!-- Non-Authorized State -->
    <div v-if="!isAuthorized" class="flex flex-col md:flex-row rounded-lg overflow-hidden" :class="cardClass">
      <!-- Zone principale -->
      <div class="flex-1 flex items-center p-4">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-shield-off" class="size-8 text-warning-600 shrink-0" />
          <div>
            <h3 class="text-lg font-semibold text-primary">Non autorisé</h3>
            <p class="text-sm text-muted">Les sondages ne peuvent pas être lancés sur votre chaîne</p>
          </div>
        </div>
      </div>

      <!-- Zone action Autoriser -->
      <button
        class="flex items-center justify-center gap-2 px-6 py-4 md:py-0 bg-success-100 hover:bg-success-200 active:bg-success-300 text-success-600 font-medium transition-colors touch-manipulation"
        @click="$emit('authorize', campaignId)"
      >
        <UIcon name="i-lucide-shield-check" class="size-5" />
        <span>Autoriser</span>
      </button>
    </div>

    <!-- Authorized State -->
    <div v-else class="flex flex-col rounded-lg overflow-hidden" :class="cardClass">
      <!-- Zone principale (empilée sur mobile) -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
        <!-- Info autorisé -->
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-shield-check" class="size-8 text-success-600 shrink-0" />
          <div>
            <h3 class="text-lg font-semibold text-primary">Autorisé</h3>
            <p class="text-sm text-muted">Les sondages peuvent être lancés sur votre chaîne</p>
          </div>
        </div>

        <!-- Countdown Timer or Permanent Badge -->
        <div v-if="isOwner" class="bg-brand-100 px-4 sm:px-6 py-3 rounded-lg text-center sm:text-left">
          <p class="text-xs text-muted mb-1">Autorisation</p>
          <p class="text-xl sm:text-2xl font-bold text-brand-500">
            Permanent
          </p>
        </div>
        <div v-else class="bg-info-100 px-4 sm:px-6 py-3 rounded-lg text-center sm:text-left">
          <p class="text-xs text-muted mb-1">Temps restant</p>
          <p class="text-2xl sm:text-3xl font-bold text-info-500 tabular-nums">
            {{ formatTime(displaySeconds) }}
          </p>
        </div>
      </div>

      <!-- Zone action Révoquer -->
      <button
        v-if="!isOwner"
        class="flex items-center justify-center gap-2 px-6 py-4 bg-error-100 hover:bg-error-200 active:bg-error-300 text-error-600 font-medium transition-colors touch-manipulation"
        @click="showRevokeModal = true"
      >
        <UIcon name="i-lucide-shield-off" class="size-5" />
        <span>Révoquer</span>
      </button>
    </div>

    <!-- Modal de confirmation de révocation -->
    <UModal v-model:open="showRevokeModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="pt-2">
                <UIcon name="i-lucide-shield-off" class="size-6 text-error-600" />
              </div>
              <h2 class="text-xl font-semibold text-primary">Révoquer l'autorisation</h2>
            </div>
          </template>

          <p class="text-secondary">
            Êtes-vous sûr de vouloir révoquer l'autorisation de sondages pour cette campagne ?
          </p>
          <p class="text-sm text-muted mt-2">
            Le MJ ne pourra plus lancer de sondages sur votre chaîne jusqu'à ce que vous réautorisiez.
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="solid"
                label="Annuler"
                @click="showRevokeModal = false"
              />
              <UButton
                color="error"
                icon="i-lucide-shield-off"
                label="Révoquer"
                @click="confirmRevoke"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  campaignId: string
  isOwner?: boolean
  isAuthorized: boolean
  expiresAt: string | null
  remainingSeconds: number | null
}>()

const emit = defineEmits<{
  authorize: [campaignId: string]
  revoke: [campaignId: string]
}>()

// Local countdown state
const displaySeconds = ref(props.remainingSeconds || 0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

// Modal state
const showRevokeModal = ref(false)

const cardClass = computed(() => {
  if (props.isAuthorized) {
    return 'bg-success-100'
  }
  return 'bg-warning-100'
})

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const startCountdown = () => {
  if (countdownInterval) clearInterval(countdownInterval)

  countdownInterval = setInterval(() => {
    if (displaySeconds.value > 0) {
      displaySeconds.value--
    } else {
      if (countdownInterval) clearInterval(countdownInterval)
      countdownInterval = null
      // Emit event to parent to refresh status
      window.location.reload()
    }
  }, 1000)
}

const confirmRevoke = () => {
  showRevokeModal.value = false
  emit('revoke', props.campaignId)
}

// Lifecycle hooks
onMounted(() => {
  if (props.isAuthorized && props.remainingSeconds) {
    displaySeconds.value = props.remainingSeconds
    startCountdown()
  }
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

// Watch for prop changes
watch(() => props.remainingSeconds, (newVal) => {
  if (newVal !== null) {
    displaySeconds.value = newVal
    if (props.isAuthorized && !countdownInterval) {
      startCountdown()
    }
  }
})

watch(() => props.isAuthorized, (newVal) => {
  if (!newVal && countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
})
</script>
