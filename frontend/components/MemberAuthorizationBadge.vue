<template>
  <div class="flex items-center gap-2">
    <!-- Authorized with countdown (same for owner and regular members) -->
    <div
      v-if="isPollAuthorized && remainingSeconds !== null && remainingSeconds > 0"
      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
      :class="urgencyClass"
    >
      <UIcon name="i-lucide-shield-check" class="size-3.5" />
      <span class="tabular-nums">{{ formatDurationCompact(displaySeconds) }}</span>
    </div>

    <!-- Not authorized (solid neutral) -->
    <div
      v-else-if="!isPollAuthorized"
      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-neutral-500 text-white"
    >
      <UIcon name="i-lucide-shield-off" class="size-3.5" />
      <span>Non autorisé</span>
    </div>

    <!-- Expired (was authorized but time ran out) -->
    <div
      v-else
      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-warning-light text-warning-500 border border-warning-light"
    >
      <UIcon name="i-lucide-clock" class="size-3.5" />
      <span>Expiré</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  isPollAuthorized: boolean
  remainingSeconds: number | null
  isOwner?: boolean
}>()

const emit = defineEmits<{
  expired: []
}>()

// Local countdown state
const displaySeconds = ref(props.remainingSeconds || 0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

const { formatDurationCompact } = useTimeFormat()

// Dynamic class based on urgency (solid variant)
const urgencyClass = computed(() => {
  if (displaySeconds.value <= 300) {
    // Less than 5 minutes - red/urgent
    return 'bg-error-500 text-white'
  } else if (displaySeconds.value <= 1800) {
    // Less than 30 minutes - amber/warning
    return 'bg-warning-500 text-white'
  } else {
    // More than 30 minutes - green/safe
    return 'bg-success-500 text-white'
  }
})

const startCountdown = () => {
  if (countdownInterval) clearInterval(countdownInterval)

  countdownInterval = setInterval(() => {
    if (displaySeconds.value > 0) {
      displaySeconds.value--
    } else {
      if (countdownInterval) clearInterval(countdownInterval)
      countdownInterval = null
      emit('expired')
    }
  }, 1000)
}

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

// Lifecycle hooks
onMounted(() => {
  if (props.isPollAuthorized && props.remainingSeconds && props.remainingSeconds > 0) {
    displaySeconds.value = props.remainingSeconds
    startCountdown()
  }
})

onUnmounted(() => {
  stopCountdown()
})

// Watch for prop changes
watch(
  () => props.remainingSeconds,
  (newVal) => {
    if (newVal !== null && newVal > 0) {
      displaySeconds.value = newVal
      if (props.isPollAuthorized && !countdownInterval) {
        startCountdown()
      }
    }
  }
)

watch(
  () => props.isPollAuthorized,
  (newVal) => {
    if (!newVal) {
      stopCountdown()
    } else if (props.remainingSeconds && props.remainingSeconds > 0) {
      displaySeconds.value = props.remainingSeconds
      startCountdown()
    }
  }
)
</script>
