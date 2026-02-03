<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { PollGamificationConfig } from '~/overlay-studio/types'

interface PollData {
  pollInstanceId: string
  title: string
  options: string[]
  endsAt?: string
  totalDuration?: number
}

type PollPhase = 'hidden' | 'entering' | 'active' | 'urgent' | 'result' | 'exiting'

const props = withDefaults(
  defineProps<{
    poll: PollData | null
    percentages: Record<number, number>
    isEnding?: boolean
    gamification?: PollGamificationConfig
  }>(),
  {
    isEnding: false,
    gamification: () => ({
      timer: {
        showBadge: true,
        urgentThreshold: 10,
        urgentColor: '#ef4444',
      },
      timeBar: {
        enabled: true,
        shimmerEnabled: true,
        glowEdgeEnabled: true,
        shakeWhenUrgent: true,
        shakeIntensity: 5,
      },
      leader: {
        showCrown: true,
        pulseAnimation: true,
        changeSound: { enabled: true, volume: 0.4 },
      },
      result: {
        displayDuration: 5000,
        winnerColor: '#FFD700',
        winnerScale: 1.05,
        winnerGlow: true,
        winnerGlowColor: '#FFD700',
        loserFadeOut: true,
        loserFadeDuration: 300,
        loserFinalOpacity: 0,
      },
      tieBreaker: {
        showAllWinners: true,
        titleText: 'EX-ÆQUO !',
      },
    }),
  }
)

const emit = defineEmits<{
  complete: []
  hidden: []
}>()

// State
const phase = ref<PollPhase>('hidden')
const remainingTime = ref(0)
const totalDuration = ref(60)
const shakeIntensity = ref(0)
const previousLeaderIndex = ref<number | null>(null)

// Audio refs
const leaderChangeAudio = ref<HTMLAudioElement | null>(null)
const resultAudio = ref<HTMLAudioElement | null>(null)

// Timers
let timerInterval: ReturnType<typeof setInterval> | null = null
let shakeInterval: ReturnType<typeof setInterval> | null = null
let resultTimeout: ReturnType<typeof setTimeout> | null = null

// Computed
const config = computed(() => props.gamification)

const isUrgent = computed(() => {
  return remainingTime.value > 0 && remainingTime.value <= config.value.timer.urgentThreshold
})

const timePercent = computed(() => {
  if (totalDuration.value === 0) return 100
  return (remainingTime.value / totalDuration.value) * 100
})

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Find the current leader(s)
const leaderIndices = computed(() => {
  if (!props.poll) return []
  const maxPercent = Math.max(...Object.values(props.percentages))
  if (maxPercent === 0) return []
  return Object.entries(props.percentages)
    .filter(([, percent]) => percent === maxPercent)
    .map(([index]) => parseInt(index))
})

// Find winners (for result phase)
const winnerIndices = computed(() => {
  return leaderIndices.value
})

const hasMultipleWinners = computed(() => winnerIndices.value.length > 1)

const isWinner = (index: number) => winnerIndices.value.includes(index)

// Shake calculation
const shouldShake = computed(() => {
  return isUrgent.value && config.value.timeBar.shakeWhenUrgent && phase.value !== 'result'
})

const containerTransform = computed(() => {
  if (shakeIntensity.value === 0) return 'none'
  return `translateX(${shakeIntensity.value}px)`
})

// Update shake
const updateShake = () => {
  if (!shouldShake.value) {
    shakeIntensity.value = 0
    return
  }
  const intensity = config.value.timeBar.shakeIntensity
  shakeIntensity.value = (Math.random() - 0.5) * 2 * intensity
}

// Timer update
const updateTimer = () => {
  if (!props.poll?.endsAt) {
    remainingTime.value = 0
    return
  }

  const now = new Date().getTime()
  const end = new Date(props.poll.endsAt).getTime()
  const diff = end - now

  if (diff <= 0) {
    remainingTime.value = 0
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  } else {
    remainingTime.value = Math.floor(diff / 1000)
  }
}

// Play sounds
const playLeaderChangeSound = () => {
  if (!config.value.leader.changeSound.enabled || !leaderChangeAudio.value) return
  try {
    leaderChangeAudio.value.currentTime = 0
    leaderChangeAudio.value.play().catch(() => {})
  } catch {
    // Ignore audio errors
  }
}

const playResultSound = () => {
  if (!resultAudio.value) return
  try {
    resultAudio.value.currentTime = 0
    resultAudio.value.play().catch(() => {})
  } catch {
    // Ignore audio errors
  }
}

// Watch for leader changes
watch(
  leaderIndices,
  (newLeaders) => {
    if (phase.value === 'result' || phase.value === 'hidden') return
    if (newLeaders.length === 0) return

    const newLeader = newLeaders[0]
    if (previousLeaderIndex.value !== null && previousLeaderIndex.value !== newLeader) {
      playLeaderChangeSound()
    }
    previousLeaderIndex.value = newLeader ?? null
  },
  { deep: true }
)

// Watch for poll changes
watch(
  () => props.poll,
  (newPoll) => {
    if (newPoll) {
      // Start new poll
      phase.value = 'entering'
      totalDuration.value = newPoll.totalDuration || 60
      previousLeaderIndex.value = null

      // Start timer
      updateTimer()
      if (timerInterval) clearInterval(timerInterval)
      timerInterval = setInterval(updateTimer, 1000)

      // Transition to active after entry animation
      setTimeout(() => {
        if (phase.value === 'entering') {
          phase.value = 'active'
        }
      }, 500)
    } else {
      phase.value = 'hidden'
    }
  },
  { immediate: true }
)

// Watch for urgent state
watch(isUrgent, (urgent) => {
  if (urgent && phase.value === 'active') {
    phase.value = 'urgent'
  }
})

// Watch for ending state (results)
watch(
  () => props.isEnding,
  (ending) => {
    if (ending && phase.value !== 'result' && phase.value !== 'hidden') {
      phase.value = 'result'
      playResultSound()
      emit('complete')

      // Auto-hide after display duration
      if (resultTimeout) clearTimeout(resultTimeout)
      resultTimeout = setTimeout(() => {
        phase.value = 'exiting'
        setTimeout(() => {
          phase.value = 'hidden'
          emit('hidden')
        }, 300)
      }, config.value.result.displayDuration)
    }
  }
)

onMounted(() => {
  // Initialize audio
  leaderChangeAudio.value = new Audio('/audio/poll/leader-change.wav')
  leaderChangeAudio.value.volume = config.value.leader.changeSound.volume

  resultAudio.value = new Audio('/audio/poll/result.wav')
  resultAudio.value.volume = 0.6

  // Start shake interval
  shakeInterval = setInterval(updateShake, 50)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (shakeInterval) clearInterval(shakeInterval)
  if (resultTimeout) clearTimeout(resultTimeout)
})
</script>

<template>
  <Transition name="poll">
    <div
      v-if="poll && phase !== 'hidden'"
      class="gamified-poll"
      :class="{
        'poll-urgent': isUrgent && phase !== 'result',
        'poll-result': phase === 'result',
        'poll-shaking': shouldShake,
      }"
      :style="{ transform: containerTransform }"
    >
      <!-- Background glow -->
      <div
        class="poll-glow"
        :class="{
          'glow-urgent': isUrgent && phase !== 'result',
          'glow-result': phase === 'result',
        }"
      />

      <!-- Main container -->
      <div class="poll-container">
        <!-- Header -->
        <div class="poll-header">
          <h2 v-if="phase !== 'result'" class="poll-title">{{ poll.title }}</h2>
          <h2 v-else class="poll-title result-title">
            {{ hasMultipleWinners ? config.tieBreaker.titleText : '🎉 RÉSULTAT 🎉' }}
          </h2>

          <!-- Timer badge -->
          <div
            v-if="config.timer.showBadge && phase !== 'result'"
            class="timer-badge"
            :class="{ 'timer-urgent': isUrgent }"
            :style="{ '--urgent-color': config.timer.urgentColor }"
          >
            ⏱ {{ formatTime(remainingTime) }}
          </div>
        </div>

        <!-- Time bar (not in result phase) -->
        <div v-if="config.timeBar.enabled && phase !== 'result'" class="time-bar-container">
          <div class="time-bar" :style="{ width: `${timePercent}%` }">
            <div v-if="config.timeBar.shimmerEnabled" class="time-bar-shimmer" />
          </div>
          <div
            v-if="config.timeBar.glowEdgeEnabled"
            class="time-bar-glow"
            :style="{ left: `${timePercent}%` }"
          />
        </div>

        <!-- Options -->
        <div class="poll-options">
          <TransitionGroup name="option">
            <div
              v-for="(option, index) in poll.options"
              :key="index"
              class="poll-option"
              :class="{
                'option-leader': leaderIndices.includes(index) && phase !== 'result',
                'option-winner': phase === 'result' && isWinner(index),
                'option-loser': phase === 'result' && !isWinner(index),
              }"
              :style="{
                '--winner-color': config.result.winnerColor,
                '--winner-glow-color': config.result.winnerGlowColor,
                '--winner-scale': config.result.winnerScale,
                '--loser-opacity': config.result.loserFinalOpacity,
                '--loser-fade-duration': `${config.result.loserFadeDuration}ms`,
              }"
            >
              <div class="option-header">
                <span class="option-label">
                  <span v-if="phase === 'result' && isWinner(index)" class="winner-trophy">🏆</span>
                  {{ option }}
                  <span
                    v-if="
                      leaderIndices.includes(index) && phase !== 'result' && config.leader.showCrown
                    "
                    class="leader-crown"
                    :class="{ 'crown-pulse': config.leader.pulseAnimation }"
                  >
                    👑
                  </span>
                </span>
                <span class="option-percentage">{{ percentages[index] || 0 }}%</span>
              </div>
              <div class="option-bar-container">
                <div
                  class="option-bar"
                  :class="{ 'bar-winner': phase === 'result' && isWinner(index) }"
                  :style="{ width: `${percentages[index] || 0}%` }"
                >
                  <div class="option-bar-shimmer" />
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.gamified-poll {
  position: relative;
  width: 500px;
  font-family: 'Inter', system-ui, sans-serif;
  transition: transform 0.05s linear;
}

/* Glow effect */
.poll-glow {
  position: absolute;
  inset: -25px;
  border-radius: 35px;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  filter: blur(35px);
  opacity: 0.3;
  transition: all 0.3s ease;
  animation: glow-pulse 2s ease-in-out infinite;
}

.glow-urgent {
  background: linear-gradient(135deg, #ef4444, #f97316);
  opacity: 0.4;
  animation: glow-pulse-fast 0.5s ease-in-out infinite;
}

.glow-result {
  background: linear-gradient(135deg, #ffd700, #f59e0b);
  opacity: 0.5;
}

@keyframes glow-pulse {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.03);
  }
}

@keyframes glow-pulse-fast {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(1.05);
  }
}

/* Container */
.poll-container {
  position: relative;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(35, 35, 55, 0.98));
  border: 2px solid rgba(147, 51, 234, 0.5);
  border-radius: 20px;
  padding: 24px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.poll-result .poll-container {
  border-color: rgba(255, 215, 0, 0.6);
}

/* Header */
.poll-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.poll-title {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  margin: 0;
  flex: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.result-title {
  text-align: center;
  font-size: 28px;
  background: linear-gradient(135deg, #ffd700, #f59e0b);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: result-title-glow 1s ease-in-out infinite alternate;
}

@keyframes result-title-glow {
  from {
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
  }
  to {
    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8));
  }
}

/* Timer badge */
.timer-badge {
  background: rgba(147, 51, 234, 0.3);
  border: 2px solid rgba(147, 51, 234, 0.5);
  color: #fff;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 80px;
  text-align: center;
  transition: all 0.3s ease;
}

.timer-urgent {
  background: rgba(239, 68, 68, 0.3);
  border-color: var(--urgent-color);
  color: var(--urgent-color);
  animation: timer-pulse 0.5s ease-in-out infinite;
}

@keyframes timer-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* Time bar */
.time-bar-container {
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-bottom: 20px;
  overflow: hidden;
}

.time-bar {
  height: 100%;
  background: linear-gradient(90deg, #9333ea, #ec4899);
  border-radius: 4px;
  transition: width 0.3s ease-out;
  position: relative;
  overflow: hidden;
}

.poll-urgent .time-bar {
  background: linear-gradient(90deg, #ef4444, #f97316);
}

.time-bar-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s linear infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.time-bar-glow {
  position: absolute;
  top: 50%;
  width: 20px;
  height: 30px;
  background: #fff;
  filter: blur(12px);
  transform: translate(-50%, -50%);
  transition: left 0.3s ease-out;
  opacity: 0.6;
  pointer-events: none;
}

/* Options */
.poll-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.poll-option {
  transition: all 0.3s ease;
}

.option-leader {
  transform: scale(1.02);
}

.option-winner {
  transform: scale(var(--winner-scale, 1.05));
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.option-loser {
  opacity: var(--loser-opacity, 0);
  transform: scale(0.95);
  transition: all var(--loser-fade-duration, 300ms) ease;
  pointer-events: none;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.option-label {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.winner-trophy {
  font-size: 24px;
  animation: trophy-bounce 0.5s ease-out;
}

@keyframes trophy-bounce {
  0% {
    transform: scale(0) rotate(-20deg);
  }
  50% {
    transform: scale(1.3) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

.leader-crown {
  font-size: 16px;
  display: inline-block;
}

.crown-pulse {
  animation: crown-pulse 1s ease-in-out infinite;
}

@keyframes crown-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.option-percentage {
  font-size: 20px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
}

.option-winner .option-percentage {
  color: var(--winner-color);
}

/* Option bar */
.option-bar-container {
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.option-bar {
  height: 100%;
  background: linear-gradient(90deg, #9333ea, #ec4899);
  border-radius: 12px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.bar-winner {
  background: linear-gradient(90deg, var(--winner-color), #f59e0b) !important;
  box-shadow: 0 0 20px var(--winner-glow-color);
}

.option-bar-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  animation: shimmer 2.5s linear infinite;
}

/* Transitions */
.poll-enter-active {
  animation: poll-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.poll-leave-active {
  animation: poll-out 0.3s ease-in;
}

@keyframes poll-in {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes poll-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
}

/* Option transitions */
.option-enter-active,
.option-leave-active {
  transition: all 0.3s ease;
}

.option-leave-active {
  position: absolute;
}

.option-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.option-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
