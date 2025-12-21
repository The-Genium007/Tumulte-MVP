<template>
  <div class="space-y-4">
    <!-- Info text above -->
    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-info"
      class="mb-4"
    >
      <template #description>
        Autorisez Tumulte à lancer des sondages sur votre chaîne pour cette campagne pendant 12 heures.
      </template>
    </UAlert>

    <!-- Non-Authorized State -->
    <div v-if="!isAuthorized" class="flex items-center justify-between p-4 rounded-lg" :class="cardClass">
      <UButton
        color="primary"
        size="lg"
        icon="i-lucide-shield-check"
        label="Autoriser pour 12 heures"
        @click="$emit('authorize', campaignId)"
      />
    </div>

    <!-- Authorized State -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between p-4 rounded-lg" :class="cardClass">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-shield-check" class="size-8 text-green-500" />
          <div>
            <h3 class="text-lg font-semibold text-white">Autorisé</h3>
            <p class="text-sm text-gray-400">Les sondages peuvent être lancés sur votre chaîne</p>
          </div>
        </div>

        <!-- Countdown Timer -->
        <div class="bg-blue-500/10 px-6 py-3 rounded-lg border border-blue-500/30">
          <p class="text-xs text-gray-400 mb-1">Temps restant</p>
          <p class="text-3xl font-bold text-blue-500 tabular-nums">
            {{ formatTime(displaySeconds) }}
          </p>
        </div>
      </div>

      <UButton
        color="error"
        variant="soft"
        icon="i-lucide-shield-off"
        label="Révoquer l'autorisation"
        @click="handleRevokeClick"
        block
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  campaignId: string
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

const cardClass = computed(() => {
  if (props.isAuthorized) {
    return 'bg-green-500/5 border border-green-500/20'
  }
  return 'bg-yellow-500/5 border border-yellow-500/20'
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

const handleRevokeClick = () => {
  if (confirm('Êtes-vous sûr de vouloir révoquer l\'autorisation ?')) {
    emit('revoke', props.campaignId)
  }
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
