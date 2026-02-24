<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { GamificationInstanceEvent } from '@/types'

const props = defineProps<{
  instance: GamificationInstanceEvent | null
  visible: boolean
  // Customization props (from Overlay Studio)
  customStyles?: {
    container?: {
      backgroundColor?: string
      borderColor?: string
      borderWidth?: number
      borderRadius?: number
      opacity?: number
    }
    progressBar?: {
      height?: number
      backgroundColor?: string
      fillColor?: string
      fillGradientEnabled?: boolean
      fillGradientStart?: string
      fillGradientEnd?: string
      glowColor?: string
    }
    shakeStartPercent?: number
    shakeMaxIntensity?: number
  }
}>()

const emit = defineEmits<{
  complete: []
  expired: []
  hidden: []
}>()

// Local state
const timeRemaining = ref(0)
const showSuccessAnimation = ref(false)
const shakeIntensity = ref(0)

// Audio refs
const progressAudio = ref<HTMLAudioElement | null>(null)
const successAudio = ref<HTMLAudioElement | null>(null)

// Timer
let timerInterval: ReturnType<typeof setInterval> | null = null
let shakeInterval: ReturnType<typeof setInterval> | null = null

// Customization defaults
const shakeStartPercent = computed(() => props.customStyles?.shakeStartPercent ?? 70)
const shakeMaxIntensity = computed(() => props.customStyles?.shakeMaxIntensity ?? 8)

// Computed
const progressPercentage = computed(() => {
  if (!props.instance) return 0
  return Math.min(100, props.instance.progressPercentage)
})

const isComplete = computed(() => props.instance?.isObjectiveReached ?? false)

const eventName = computed(() => {
  if (!props.instance) return ''
  const trigger = props.instance.triggerData?.diceRoll
  if (trigger) {
    const emoji = trigger.criticalType === 'success' ? '🎲' : '💀'
    return `${emoji} Critique de ${trigger.characterName}!`
  }
  return props.instance.event?.name ?? 'Événement'
})

const eventColor = computed(() => props.instance?.event?.rewardColor ?? '#9146FF')

// Progress bar styles
const progressBarStyle = computed(() => {
  const custom = props.customStyles?.progressBar
  const fillColor = custom?.fillColor ?? eventColor.value

  if (custom?.fillGradientEnabled) {
    const start = custom.fillGradientStart ?? eventColor.value
    const end = custom.fillGradientEnd ?? '#ff6b9d'
    return {
      width: `${progressPercentage.value}%`,
      background: `linear-gradient(90deg, ${start}, ${end})`,
    }
  }

  return {
    width: `${progressPercentage.value}%`,
    backgroundColor: isComplete.value ? '#22c55e' : fillColor,
  }
})

// Shake calculation based on progress
const shouldShake = computed(() => {
  return progressPercentage.value >= shakeStartPercent.value && !isComplete.value
})

const currentShakeIntensity = computed(() => {
  if (!shouldShake.value) return 0
  // Scale from 0 to max intensity based on progress from shakeStartPercent to 100
  const progressInShakeRange =
    (progressPercentage.value - shakeStartPercent.value) / (100 - shakeStartPercent.value)
  return Math.min(shakeMaxIntensity.value, progressInShakeRange * shakeMaxIntensity.value)
})

const containerTransform = computed(() => {
  if (shakeIntensity.value === 0) return 'none'
  return `translateX(${shakeIntensity.value}px)`
})

// Format time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Update timer
const updateTimeRemaining = () => {
  if (!props.instance) {
    timeRemaining.value = 0
    return
  }

  const now = new Date().getTime()
  const expires = new Date(props.instance.expiresAt).getTime()
  timeRemaining.value = Math.max(0, Math.floor((expires - now) / 1000))

  if (timeRemaining.value === 0 && !isComplete.value) {
    emit('expired')
  }
}

// Shake animation loop
const updateShake = () => {
  if (!shouldShake.value) {
    shakeIntensity.value = 0
    return
  }

  const intensity = currentShakeIntensity.value
  // Random shake within intensity range
  shakeIntensity.value = (Math.random() - 0.5) * 2 * intensity
}

// Stop all audio
const stopAllAudio = () => {
  try {
    if (progressAudio.value) {
      progressAudio.value.pause()
      progressAudio.value.currentTime = 0
    }
    if (successAudio.value) {
      successAudio.value.pause()
      successAudio.value.currentTime = 0
    }
  } catch {
    // Ignore audio errors
  }
}

// Play sound
const playSound = (type: 'progress' | 'success') => {
  try {
    if (type === 'progress' && progressAudio.value) {
      progressAudio.value.currentTime = 0
      progressAudio.value.play().catch(() => {})
    } else if (type === 'success' && successAudio.value) {
      // Stop progress sound before playing success
      if (progressAudio.value) {
        progressAudio.value.pause()
        progressAudio.value.currentTime = 0
      }
      successAudio.value.currentTime = 0
      successAudio.value.play().catch(() => {})
    }
  } catch {
    // Ignore audio errors
  }
}

// Watch for progress changes to play sound
let lastProgress = 0
watch(
  () => props.instance?.currentProgress,
  (newProgress) => {
    if (newProgress && newProgress > lastProgress) {
      playSound('progress')
    }
    lastProgress = newProgress ?? 0
  }
)

// Watch for instance changes
watch(
  () => props.instance,
  (newInstance, oldInstance) => {
    if (newInstance && !oldInstance) {
      // New instance started
      showSuccessAnimation.value = false
      lastProgress = newInstance.currentProgress
      updateTimeRemaining()
    }
  }
)

// Watch for completion
watch(
  () => isComplete.value,
  (completed) => {
    if (completed) {
      showSuccessAnimation.value = true
      playSound('success')
      emit('complete')

      // Hide after celebration
      setTimeout(() => {
        showSuccessAnimation.value = false
        stopAllAudio()
        emit('hidden')
      }, 3000)
    }
  }
)

// Watch for visibility
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      stopAllAudio()
      emit('hidden')
    }
  }
)

onMounted(() => {
  updateTimeRemaining()
  timerInterval = setInterval(updateTimeRemaining, 1000)
  shakeInterval = setInterval(updateShake, 50) // 20fps shake

  // Initialize audio elements
  progressAudio.value = new Audio('/audio/dice-reverse/progress.wav')
  progressAudio.value.volume = 0.3
  successAudio.value = new Audio('/audio/dice-reverse/succes.wav')
  successAudio.value.volume = 0.5
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (shakeInterval) clearInterval(shakeInterval)
  stopAllAudio()
})
</script>

<template>
  <Transition name="goal-bar">
    <div
      v-if="visible && instance"
      class="dice-reverse-goal-bar"
      :class="{
        'goal-complete': isComplete,
        'goal-urgent': timeRemaining <= 10,
        'goal-shaking': shouldShake,
      }"
      :style="{ transform: containerTransform }"
    >
      <!-- Background glow effect -->
      <div
        class="goal-glow"
        :style="{
          backgroundColor: isComplete ? '#22c55e' : eventColor,
          opacity: shouldShake ? 0.4 + (currentShakeIntensity / shakeMaxIntensity) * 0.3 : 0.3,
        }"
      />

      <!-- Main container -->
      <div
        class="goal-container"
        :style="{
          borderColor: customStyles?.container?.borderColor ?? eventColor,
          borderWidth: `${customStyles?.container?.borderWidth ?? 2}px`,
          borderRadius: `${customStyles?.container?.borderRadius ?? 16}px`,
          opacity: customStyles?.container?.opacity ?? 1,
        }"
      >
        <!-- Header row -->
        <div class="goal-header">
          <div class="goal-title">{{ eventName }}</div>
          <div class="goal-stats">
            <span class="goal-progress-text">
              {{ instance.currentProgress }}/{{ instance.objectiveTarget }}
              <span class="goal-percentage">({{ Math.round(progressPercentage) }}%)</span>
            </span>
            <span class="goal-timer" :class="{ 'timer-urgent': timeRemaining <= 10 }">
              {{ formatTime(timeRemaining) }}
            </span>
          </div>
        </div>

        <!-- Progress bar -->
        <div
          class="goal-progress-container"
          :style="{
            height: `${customStyles?.progressBar?.height ?? 28}px`,
            backgroundColor:
              customStyles?.progressBar?.backgroundColor ?? 'rgba(255, 255, 255, 0.1)',
          }"
        >
          <div class="goal-progress-bar" :style="progressBarStyle">
            <!-- Shimmer effect -->
            <div class="progress-shimmer" />
          </div>

          <!-- Glow at progress edge -->
          <div
            class="goal-progress-glow"
            :style="{
              left: `${progressPercentage}%`,
              backgroundColor: customStyles?.progressBar?.glowColor ?? '#fff',
              opacity: shouldShake ? 0.6 + (currentShakeIntensity / shakeMaxIntensity) * 0.4 : 0.5,
            }"
          />
        </div>

        <!-- Success animation overlay -->
        <Transition name="success">
          <div v-if="showSuccessAnimation" class="goal-success-overlay">
            <div class="success-content">
              <span class="success-icon">🎉</span>
              <span class="success-text">SUCCÈS !</span>
              <span class="success-icon">🎉</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dice-reverse-goal-bar {
  position: relative;
  width: 500px;
  font-family:
    'Inter', system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
  transition: transform 0.05s linear;
}

.goal-glow {
  position: absolute;
  inset: -25px;
  border-radius: 35px;
  filter: blur(35px);
  transition: opacity 0.3s ease;
  animation: glow-pulse 2s ease-in-out infinite;
}

.goal-shaking .goal-glow {
  animation: glow-pulse-fast 0.5s ease-in-out infinite;
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

.goal-container {
  position: relative;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(35, 35, 55, 0.98));
  border-style: solid;
  padding: 16px 20px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 16px;
}

.goal-title {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.goal-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.goal-progress-text {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.goal-percentage {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  margin-left: 4px;
}

.goal-timer {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  min-width: 60px;
  text-align: center;
}

.timer-urgent {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
  animation: timer-pulse 0.5s ease-in-out infinite;
}

@keyframes timer-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

.goal-progress-container {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
}

.goal-progress-bar {
  height: 100%;
  border-radius: 14px;
  transition:
    width 0.3s ease-out,
    background-color 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.25) 50%,
    transparent 100%
  );
  animation: shimmer 2.5s linear infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.goal-progress-glow {
  position: absolute;
  top: 50%;
  width: 30px;
  height: 50px;
  filter: blur(18px);
  transform: translate(-50%, -50%);
  transition:
    left 0.3s ease-out,
    opacity 0.3s ease;
  pointer-events: none;
}

/* Success overlay */
.goal-success-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.97), rgba(21, 128, 61, 0.97));
  border-radius: inherit;
}

.success-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.success-icon {
  font-size: 40px;
  animation: bounce 0.6s ease-out infinite;
}

.success-icon:last-child {
  animation-delay: 0.1s;
}

.success-text {
  font-size: 36px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;
  animation: scale-in 0.4s ease-out;
}

@keyframes bounce {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.1) rotate(-5deg);
  }
  50% {
    transform: scale(1) rotate(0deg);
  }
  75% {
    transform: scale(1.1) rotate(5deg);
  }
}

@keyframes scale-in {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Urgent state */
.goal-urgent .goal-container {
  border-color: rgba(239, 68, 68, 0.6) !important;
}

.goal-urgent .goal-glow {
  background-color: #ef4444 !important;
}

/* Complete state */
.goal-complete .goal-container {
  border-color: rgba(34, 197, 94, 0.6) !important;
}

/* Entry/Exit transitions */
.goal-bar-enter-active {
  animation: goal-bar-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.goal-bar-leave-active {
  animation: goal-bar-out 0.35s ease-in;
}

@keyframes goal-bar-in {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes goal-bar-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
}

.success-enter-active {
  animation: success-in 0.35s ease-out;
}

.success-leave-active {
  animation: success-out 0.3s ease-in;
}

@keyframes success-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes success-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}
</style>
