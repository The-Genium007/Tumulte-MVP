<template>
  <transition
    enter-active-class="transition-all duration-500 ease-out"
    leave-active-class="transition-all duration-300 ease-in"
    enter-from-class="opacity-0 translate-y-8"
    enter-to-class="opacity-100 translate-y-0"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-8"
  >
    <div v-if="poll" class="poll-card">
      <div class="poll-header">
        <h2 class="poll-title">{{ poll.title }}</h2>
        <div class="poll-timer">{{ remainingTime }}s</div>
      </div>

      <div class="poll-options">
        <div
          v-for="(option, index) in poll.options"
          :key="index"
          class="poll-option"
        >
          <div class="option-header">
            <span class="option-label">{{ option }}</span>
            <span class="option-percentage"
              >{{ percentages[index as number] || 0 }}%</span
            >
          </div>
          <div class="option-bar-container">
            <div
              class="option-bar"
              :style="{ width: `${percentages[index as number] || 0}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";

interface PollData {
  pollInstanceId: string;
  title: string;
  options: string[];
  endsAt?: string;
}

const props = defineProps<{
  poll: PollData | null;
  percentages: Record<number, number>;
}>();

const remainingTime = ref(0);
let timerInterval: ReturnType<typeof setInterval> | null = null;

const startTimer = (endsAt: string | undefined) => {
  if (!endsAt) return;
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  const updateTimer = () => {
    const now = new Date().getTime();
    const end = new Date(endsAt).getTime();
    const diff = end - now;

    if (diff <= 0) {
      remainingTime.value = 0;
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    } else {
      remainingTime.value = Math.floor(diff / 1000);
    }
  };

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
};

watch(
  () => props.poll,
  (newPoll) => {
    if (newPoll?.endsAt) {
      startTimer(newPoll.endsAt);
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>

<style scoped>
.poll-card {
  background: linear-gradient(
    145deg,
    var(--color-overlay-bg-dark),
    var(--color-overlay-bg-dark-alt)
  );
  /* Fallback pour Safari et navigateurs anciens */
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  padding: 2.5rem;
  min-width: 450px;
  max-width: 550px;
  border: 2px solid transparent;
  background-image:
    linear-gradient(145deg, var(--color-overlay-bg-dark), var(--color-overlay-bg-dark-alt)),
    linear-gradient(145deg, var(--color-gradient-brand-start), var(--color-gradient-brand-end));
  background-origin: border-box;
  background-clip: padding-box, border-box;
  box-shadow:
    0 20px 60px var(--color-overlay-shadow-brand),
    0 0 80px var(--color-overlay-shadow-brand-soft),
    inset 0 1px 0 var(--color-overlay-highlight);
}

.poll-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(90deg, transparent, var(--color-overlay-shadow-brand), transparent)
    1;
}

.poll-title {
  color: white;
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0;
  flex: 1;
  text-shadow: 0 2px 10px var(--color-overlay-shadow-brand);
  background: linear-gradient(135deg, #ffffff 0%, var(--color-overlay-text-light) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.poll-timer {
  background: linear-gradient(135deg, var(--color-gradient-brand-start) 0%, var(--color-gradient-brand-end) 100%);
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-size: 1.5rem;
  font-weight: 900;
  min-width: 70px;
  text-align: center;
  box-shadow:
    0 4px 15px var(--color-overlay-shadow-brand),
    inset 0 1px 0 var(--color-overlay-highlight-soft);
  text-shadow: 0 2px 4px var(--color-overlay-backdrop);
}

.poll-options {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.poll-option {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.25rem;
}

.option-label {
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  text-shadow: 0 1px 3px var(--color-overlay-backdrop);
}

.option-percentage {
  color: var(--color-overlay-text-light);
  font-size: 1.375rem;
  font-weight: 800;
  text-shadow: 0 2px 8px var(--color-overlay-shadow-brand);
}

.option-bar-container {
  background: linear-gradient(
    90deg,
    var(--color-overlay-border-brand-soft),
    var(--color-overlay-border-brand-soft)
  );
  border-radius: 9999px;
  height: 28px;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--color-overlay-border-brand);
  box-shadow: inset 0 2px 4px var(--color-overlay-backdrop);
}

.option-bar {
  background: linear-gradient(90deg, var(--color-gradient-brand-start) 0%, var(--color-gradient-brand-middle) 50%, var(--color-gradient-brand-end) 100%);
  height: 100%;
  border-radius: 9999px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 0 20px var(--color-overlay-shadow-brand),
    inset 0 1px 0 var(--color-overlay-highlight-soft);
  position: relative;
}

.option-bar::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, var(--color-overlay-highlight-strong), transparent);
  border-radius: 9999px 9999px 0 0;
}
</style>
