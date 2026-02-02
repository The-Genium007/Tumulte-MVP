<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { GamificationInstanceEvent } from '@/types'

/**
 * Données de consommation (quand un critique consomme l'instance armée)
 */
interface ConsumedData {
  characterName: string
  formula: string
  result: number
  criticalType: 'success' | 'failure'
}

const props = defineProps<{
  instance: GamificationInstanceEvent | null
  visible: boolean
  /** Données de l'action consommée (quand instance_consumed est reçu) */
  consumedData?: ConsumedData | null
}>()

const emit = defineEmits<{
  complete: []
  expired: []
  hidden: []
  armed: []
  consumed: []
}>()

// Local state
const timeRemaining = ref(0)
const isAnimating = ref(false)
const showSuccessAnimation = ref(false)
const showArmedState = ref(false)
const showConsumedAnimation = ref(false)

// Timer
let timerInterval: ReturnType<typeof setInterval> | null = null

// Computed
const progressPercentage = computed(() => {
  if (!props.instance) return 0
  return Math.min(100, props.instance.progressPercentage)
})

const isComplete = computed(() => props.instance?.isObjectiveReached ?? false)

const isArmed = computed(() => props.instance?.status === 'armed')

const eventName = computed(() => props.instance?.event?.name ?? 'Événement')

const eventColor = computed(() => props.instance?.event?.rewardColor ?? '#9146FF')

const eventType = computed(() => props.instance?.type ?? 'individual')

const triggerInfo = computed(() => {
  if (!props.instance?.triggerData?.diceRoll) return null
  const { characterName, criticalType, result } = props.instance.triggerData.diceRoll
  return {
    characterName,
    criticalType,
    result,
  }
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

// Watch for instance changes
watch(
  () => props.instance,
  (newInstance, oldInstance) => {
    if (newInstance && !oldInstance) {
      // New instance started
      isAnimating.value = true
      showSuccessAnimation.value = false
      updateTimeRemaining()
    } else if (!newInstance && oldInstance) {
      // Instance ended
      isAnimating.value = false
    }
  }
)

// Watch for armed state (objectif atteint via Channel Points)
watch(
  () => isArmed.value,
  (armed) => {
    if (armed) {
      showArmedState.value = true
      emit('armed')
    }
  }
)

// Watch for consumed data (quand un critique consomme l'instance armed)
watch(
  () => props.consumedData,
  (data) => {
    if (data) {
      showConsumedAnimation.value = true
      emit('consumed')

      // Hide after celebration
      setTimeout(() => {
        showConsumedAnimation.value = false
        showArmedState.value = false
        emit('hidden')
      }, 5000)
    }
  }
)

// Watch for completion (ancien comportement - garder pour compatibilité)
watch(
  () => isComplete.value,
  (completed) => {
    if (completed && !isArmed.value) {
      // Ancien comportement: complétion immédiate (sans état armed)
      showSuccessAnimation.value = true
      emit('complete')

      // Hide after celebration
      setTimeout(() => {
        showSuccessAnimation.value = false
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
      emit('hidden')
    }
  }
)

onMounted(() => {
  updateTimeRemaining()
  timerInterval = setInterval(updateTimeRemaining, 1000)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<template>
  <Transition name="gauge">
    <div
      v-if="visible && instance"
      class="dice-reverse-gauge"
      :class="{
        'gauge-complete': isComplete,
        'gauge-armed': isArmed,
        'gauge-urgent': timeRemaining <= 10 && !isArmed,
      }"
    >
      <!-- Background glow effect -->
      <div class="gauge-glow" :style="{ backgroundColor: eventColor }" />

      <!-- Main container -->
      <div class="gauge-container">
        <!-- Header -->
        <div class="gauge-header">
          <div class="gauge-title">
            <span class="gauge-icon" :style="{ color: eventColor }">
              {{ eventType === 'group' ? '👥' : '🎲' }}
            </span>
            <span class="gauge-name">{{ eventName }}</span>
          </div>
          <div class="gauge-timer" :class="{ 'timer-urgent': timeRemaining <= 10 }">
            {{ formatTime(timeRemaining) }}
          </div>
        </div>

        <!-- Trigger info (dice roll) -->
        <div v-if="triggerInfo" class="gauge-trigger">
          <span class="trigger-character">{{ triggerInfo.characterName }}</span>
          <span class="trigger-result" :class="`trigger-${triggerInfo.criticalType}`">
            {{ triggerInfo.criticalType === 'success' ? '🎯 Critique !' : '💀 Échec critique !' }}
          </span>
        </div>

        <!-- Progress bar -->
        <div class="gauge-progress-container">
          <div
            class="gauge-progress-bar"
            :style="{
              width: `${progressPercentage}%`,
              backgroundColor: isComplete ? '#22c55e' : eventColor,
            }"
          />
          <div class="gauge-progress-glow" :style="{ left: `${progressPercentage}%` }" />
        </div>

        <!-- Stats -->
        <div class="gauge-stats">
          <div class="gauge-stat">
            <span class="stat-value">{{ instance.currentProgress }}</span>
            <span class="stat-separator">/</span>
            <span class="stat-target">{{ instance.objectiveTarget }}</span>
            <span class="stat-label">clics</span>
          </div>
          <div class="gauge-percentage">{{ Math.round(progressPercentage) }}%</div>
        </div>

        <!-- Armed state overlay (jauge remplie, en attente de critique) -->
        <Transition name="armed">
          <div v-if="showArmedState && !showConsumedAnimation" class="gauge-armed-overlay">
            <div class="armed-icon">⚡</div>
            <div class="armed-text">PRÊT !</div>
            <div class="armed-subtitle">En attente d'un jet critique...</div>
            <div class="armed-pulse" />
          </div>
        </Transition>

        <!-- Consumed animation overlay (critique a déclenché l'action) -->
        <Transition name="consumed">
          <div v-if="showConsumedAnimation" class="gauge-consumed-overlay">
            <div class="consumed-icon">🎯</div>
            <div class="consumed-text">INVERSÉ !</div>
            <div v-if="consumedData" class="consumed-details">
              <span class="consumed-character">{{ consumedData.characterName }}</span>
              <span class="consumed-result">
                {{ consumedData.criticalType === 'success' ? '20 → 1' : '1 → 20' }}
              </span>
            </div>
            <div class="consumed-particles" />
          </div>
        </Transition>

        <!-- Success animation overlay (ancien comportement) -->
        <Transition name="success">
          <div v-if="showSuccessAnimation" class="gauge-success-overlay">
            <div class="success-icon">🎉</div>
            <div class="success-text">SUCCÈS !</div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dice-reverse-gauge {
  position: relative;
  width: 400px;
  font-family: 'Inter', system-ui, sans-serif;
}

.gauge-glow {
  position: absolute;
  inset: -20px;
  border-radius: 30px;
  opacity: 0.3;
  filter: blur(30px);
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.05);
  }
}

.gauge-container {
  position: relative;
  background: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(30, 30, 45, 0.95));
  border-radius: 16px;
  padding: 16px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.gauge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.gauge-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gauge-icon {
  font-size: 24px;
}

.gauge-name {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.gauge-timer {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.timer-urgent {
  color: #ef4444;
  animation: timer-pulse 0.5s ease-in-out infinite;
}

@keyframes timer-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.gauge-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.trigger-character {
  color: #a78bfa;
  font-weight: 600;
}

.trigger-result {
  font-weight: 700;
}

.trigger-success {
  color: #fbbf24;
}

.trigger-failure {
  color: #ef4444;
}

.gauge-progress-container {
  position: relative;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.gauge-progress-bar {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s ease-out;
  position: relative;
}

.gauge-progress-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3) 50%, transparent);
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

.gauge-progress-glow {
  position: absolute;
  top: 50%;
  width: 20px;
  height: 40px;
  background: #fff;
  filter: blur(15px);
  opacity: 0.5;
  transform: translate(-50%, -50%);
  transition: left 0.3s ease-out;
}

.gauge-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gauge-stat {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.stat-separator {
  color: rgba(255, 255, 255, 0.4);
}

.stat-target {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 4px;
}

.gauge-percentage {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Success overlay */
.gauge-success-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(21, 128, 61, 0.95));
  border-radius: 16px;
}

.success-icon {
  font-size: 48px;
  animation: bounce 0.5s ease-out;
}

.success-text {
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: scale-in 0.3s ease-out 0.2s both;
}

@keyframes bounce {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
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
.gauge-urgent .gauge-container {
  border-color: rgba(239, 68, 68, 0.5);
}

.gauge-urgent .gauge-glow {
  background-color: #ef4444 !important;
}

/* Complete state */
.gauge-complete .gauge-container {
  border-color: rgba(34, 197, 94, 0.5);
}

.gauge-complete .gauge-glow {
  background-color: #22c55e !important;
}

/* Transitions */
.gauge-enter-active {
  animation: gauge-in 0.5s ease-out;
}

.gauge-leave-active {
  animation: gauge-out 0.3s ease-in;
}

@keyframes gauge-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes gauge-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
}

.success-enter-active {
  animation: success-in 0.3s ease-out;
}

.success-leave-active {
  animation: success-out 0.3s ease-in;
}

@keyframes success-in {
  from {
    opacity: 0;
    transform: scale(0.8);
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
    transform: scale(0.8);
  }
}

/* Armed state overlay */
.gauge-armed-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.95), rgba(109, 40, 217, 0.95));
  border-radius: 16px;
  overflow: hidden;
}

.armed-icon {
  font-size: 40px;
  animation: armed-pulse-icon 1s ease-in-out infinite;
}

.armed-text {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-top: 4px;
}

.armed-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8px;
  animation: armed-blink 2s ease-in-out infinite;
}

.armed-pulse {
  position: absolute;
  inset: 0;
  border: 3px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  animation: armed-border-pulse 1.5s ease-in-out infinite;
}

@keyframes armed-pulse-icon {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes armed-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes armed-border-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}

.armed-enter-active {
  animation: armed-in 0.4s ease-out;
}

.armed-leave-active {
  animation: armed-out 0.3s ease-in;
}

@keyframes armed-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes armed-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.1);
  }
}

/* Consumed state overlay */
.gauge-consumed-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.95), rgba(202, 138, 4, 0.95));
  border-radius: 16px;
  overflow: hidden;
}

.consumed-icon {
  font-size: 56px;
  animation: consumed-icon-pop 0.5s ease-out;
}

.consumed-text {
  font-size: 36px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  animation: consumed-text-slide 0.4s ease-out 0.1s both;
}

.consumed-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  animation: consumed-details-fade 0.4s ease-out 0.3s both;
}

.consumed-character {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.consumed-result {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.consumed-particles {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.4) 1px, transparent 1px),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.3) 2px, transparent 2px),
    radial-gradient(circle at 40% 70%, rgba(255, 255, 255, 0.5) 1px, transparent 1px),
    radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.4) 2px, transparent 2px),
    radial-gradient(circle at 10% 90%, rgba(255, 255, 255, 0.3) 1px, transparent 1px);
  animation: consumed-particles-float 3s ease-in-out infinite;
}

@keyframes consumed-icon-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes consumed-text-slide {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes consumed-details-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes consumed-particles-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.consumed-enter-active {
  animation: consumed-in 0.5s ease-out;
}

.consumed-leave-active {
  animation: consumed-out 0.4s ease-in;
}

@keyframes consumed-in {
  from {
    opacity: 0;
    transform: scale(0.8) rotate(-5deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes consumed-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.2);
  }
}

/* Armed state modifier for container */
.gauge-armed .gauge-container {
  border-color: rgba(168, 85, 247, 0.5);
}

.gauge-armed .gauge-glow {
  background-color: #a855f7 !important;
}
</style>
