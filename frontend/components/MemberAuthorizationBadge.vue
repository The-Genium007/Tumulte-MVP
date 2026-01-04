<template>
  <div class="flex items-center gap-2">
    <!-- Owner: Permanent authorization -->
    <div
      v-if="isOwner"
      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20"
    >
      <UIcon name="i-lucide-infinity" class="size-3.5" />
      <span>Permanent</span>
    </div>

    <!-- Authorized with countdown -->
    <div
      v-else-if="isPollAuthorized && remainingSeconds !== null && remainingSeconds > 0"
      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
      :class="urgencyClass"
    >
      <UIcon name="i-lucide-shield-check" class="size-3.5" />
      <span class="tabular-nums">{{ formatTime(displaySeconds) }}</span>
    </div>

    <!-- Not authorized -->
    <div
      v-else-if="!isPollAuthorized"
      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20"
    >
      <UIcon name="i-lucide-shield-off" class="size-3.5" />
      <span>Non autorisé</span>
    </div>

    <!-- Expired (was authorized but time ran out) -->
    <div
      v-else
      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
    >
      <UIcon name="i-lucide-clock" class="size-3.5" />
      <span>Expiré</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

const props = defineProps<{
  isPollAuthorized: boolean;
  remainingSeconds: number | null;
  isOwner?: boolean;
}>();

const emit = defineEmits<{
  expired: [];
}>();

// Local countdown state
const displaySeconds = ref(props.remainingSeconds || 0);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

// Dynamic class based on urgency
const urgencyClass = computed(() => {
  if (displaySeconds.value <= 300) {
    // Less than 5 minutes - red/urgent
    return "bg-red-500/10 text-red-400 border border-red-500/20";
  } else if (displaySeconds.value <= 1800) {
    // Less than 30 minutes - amber/warning
    return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  } else {
    // More than 30 minutes - green/safe
    return "bg-green-500/10 text-green-400 border border-green-500/20";
  }
});

const formatTime = (seconds: number): string => {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h${String(mins).padStart(2, "0")}`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const startCountdown = () => {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    if (displaySeconds.value > 0) {
      displaySeconds.value--;
    } else {
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = null;
      emit("expired");
    }
  }, 1000);
};

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
};

// Lifecycle hooks
onMounted(() => {
  if (props.isPollAuthorized && props.remainingSeconds && props.remainingSeconds > 0) {
    displaySeconds.value = props.remainingSeconds;
    startCountdown();
  }
});

onUnmounted(() => {
  stopCountdown();
});

// Watch for prop changes
watch(
  () => props.remainingSeconds,
  (newVal) => {
    if (newVal !== null && newVal > 0) {
      displaySeconds.value = newVal;
      if (props.isPollAuthorized && !countdownInterval) {
        startCountdown();
      }
    }
  }
);

watch(
  () => props.isPollAuthorized,
  (newVal) => {
    if (!newVal) {
      stopCountdown();
    } else if (props.remainingSeconds && props.remainingSeconds > 0) {
      displaySeconds.value = props.remainingSeconds;
      startCountdown();
    }
  }
);
</script>
