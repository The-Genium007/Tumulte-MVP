<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { GamificationInstanceEvent } from '@/types'

const props = defineProps<{
  instance: GamificationInstanceEvent | null
  visible: boolean
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

// Determine monster action type from the event
const monsterActionType = computed(() => {
  const actionType = props.instance?.event?.actionType ?? ''
  if (actionType === 'monster_buff') return 'buff'
  if (actionType === 'monster_debuff') return 'debuff'
  return 'buff' // fallback
})

const eventName = computed(() => {
  if (!props.instance) return ''
  const name = props.instance.event?.name
  if (name) return name
  switch (monsterActionType.value) {
    case 'buff':
      return '⚔️ Rage Bestiale'
    case 'debuff':
      return '💀 Vulnérabilité'
    default:
      return '⚔️ Influence de Combat'
  }
})

// Colors per action type
const themeColor = computed(() => {
  if (props.instance?.event?.rewardColor) return props.instance.event.rewardColor
  switch (monsterActionType.value) {
    case 'buff':
      return '#10B981' // green
    case 'debuff':
      return '#EF4444' // red
    default:
      return '#10B981'
  }
})

// Progress bar styles
const progressBarStyle = computed(() => {
  const custom = props.customStyles?.progressBar
  const fillColor = custom?.fillColor ?? themeColor.value

  if (custom?.fillGradientEnabled) {
    const start = custom.fillGradientStart ?? themeColor.value
    const end = custom.fillGradientEnd ?? '#fff'
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

// Shake calculation
const shouldShake = computed(() => {
  return progressPercentage.value >= shakeStartPercent.value && !isComplete.value
})

const currentShakeIntensity = computed(() => {
  if (!shouldShake.value) return 0
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
  shakeIntensity.value = (Math.random() - 0.5) * 2 * intensity
}

// Audio
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

const playSound = (type: 'progress' | 'success') => {
  try {
    if (type === 'progress' && progressAudio.value) {
      progressAudio.value.currentTime = 0
      progressAudio.value.play().catch(() => {})
    } else if (type === 'success' && successAudio.value) {
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
      showSuccessAnimation.value = false
      lastProgress = newInstance.currentProgress
      updateTimeRemaining()
    }
  }
)

// Watch for completion — immediate execution (no ARMED phase for monsters, same as spells)
watch(
  () => isComplete.value,
  (completed) => {
    if (completed) {
      showSuccessAnimation.value = true
      playSound('success')
      emit('complete')

      setTimeout(() => {
        showSuccessAnimation.value = false
        stopAllAudio()
        emit('hidden')
      }, 3000)
    }
  }
)

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
  shakeInterval = setInterval(updateShake, 50)

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
  <Transition name="monster-bar">
    <div
      v-if="visible && instance"
      class="monster-goal-bar"
      :class="{
        'monster-complete': isComplete,
        'monster-urgent': timeRemaining <= 10,
        'monster-shaking': shouldShake,
        [`monster-type-${monsterActionType}`]: true,
      }"
      :style="{ transform: containerTransform }"
    >
      <!-- Background glow -->
      <div
        class="monster-glow"
        :style="{
          backgroundColor: isComplete ? '#22c55e' : themeColor,
          opacity: shouldShake ? 0.4 + (currentShakeIntensity / shakeMaxIntensity) * 0.3 : 0.3,
        }"
      />

      <!-- Main container -->
      <div
        class="monster-container"
        :style="{
          borderColor: customStyles?.container?.borderColor ?? themeColor,
          borderWidth: `${customStyles?.container?.borderWidth ?? 2}px`,
          borderRadius: `${customStyles?.container?.borderRadius ?? 16}px`,
          opacity: customStyles?.container?.opacity ?? 1,
        }"
      >
        <!-- Header -->
        <div class="monster-header">
          <div class="monster-title">{{ eventName }}</div>
          <div class="monster-stats">
            <span class="monster-progress-text">
              {{ instance.currentProgress }}/{{ instance.objectiveTarget }}
              <span class="monster-percentage">({{ Math.round(progressPercentage) }}%)</span>
            </span>
            <span class="monster-timer" :class="{ 'timer-urgent': timeRemaining <= 10 }">
              {{ formatTime(timeRemaining) }}
            </span>
          </div>
        </div>

        <!-- Progress bar -->
        <div
          class="monster-progress-container"
          :style="{
            height: `${customStyles?.progressBar?.height ?? 28}px`,
            backgroundColor:
              customStyles?.progressBar?.backgroundColor ?? 'rgba(255, 255, 255, 0.1)',
          }"
        >
          <div class="monster-progress-bar" :style="progressBarStyle">
            <div class="progress-shimmer" />
          </div>

          <div
            class="monster-progress-glow"
            :style="{
              left: `${progressPercentage}%`,
              backgroundColor: customStyles?.progressBar?.glowColor ?? '#fff',
              opacity: shouldShake ? 0.6 + (currentShakeIntensity / shakeMaxIntensity) * 0.4 : 0.5,
            }"
          />
        </div>

        <!-- Success overlay -->
        <Transition name="success">
          <div v-if="showSuccessAnimation" class="monster-success-overlay">
            <div class="success-content">
              <span class="success-icon">⚔️</span>
              <span class="success-text">COMBAT INFLUENCÉ !</span>
              <span class="success-icon">⚔️</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.monster-goal-bar {
  position: relative;
  width: 500px;
  font-family:
    'Inter', system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
  transition: transform 0.05s linear;
}

.monster-glow {
  position: absolute;
  inset: -25px;
  border-radius: 35px;
  filter: blur(35px);
  transition: opacity 0.3s ease;
  animation: monster-glow-pulse 2s ease-in-out infinite;
}

.monster-shaking .monster-glow {
  animation: monster-glow-pulse-fast 0.5s ease-in-out infinite;
}

@keyframes monster-glow-pulse {
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

@keyframes monster-glow-pulse-fast {
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

.monster-container {
  position: relative;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(35, 35, 55, 0.98));
  border-style: solid;
  padding: 16px 20px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.monster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 16px;
}

.monster-title {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.monster-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.monster-progress-text {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.monster-percentage {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  margin-left: 4px;
}

.monster-timer {
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

.monster-progress-container {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
}

.monster-progress-bar {
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

.monster-progress-glow {
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
.monster-success-overlay {
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
  gap: 12px;
  padding: 0 16px;
}

.success-icon {
  font-size: 32px;
  line-height: 1;
  animation: bounce 0.6s ease-out infinite;
  flex-shrink: 0;
}

.success-icon:last-child {
  animation-delay: 0.1s;
}

.success-text {
  font-size: 24px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
  animation: scale-in 0.4s ease-out;
  white-space: nowrap;
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
.monster-urgent .monster-container {
  border-color: rgba(239, 68, 68, 0.6) !important;
}

.monster-urgent .monster-glow {
  background-color: #ef4444 !important;
}

/* Complete state */
.monster-complete .monster-container {
  border-color: rgba(34, 197, 94, 0.6) !important;
}

/* Entry/Exit transitions */
.monster-bar-enter-active {
  animation: monster-bar-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.monster-bar-leave-active {
  animation: monster-bar-out 0.35s ease-in;
}

@keyframes monster-bar-in {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes monster-bar-out {
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
