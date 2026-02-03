<template>
  <div
    v-if="state !== 'hidden'"
    class="preview-poll-container"
    :class="[`state-${state}`, animationClass, { 'is-shaking': shouldShake }]"
    :style="containerStyle"
  >
    <div class="poll-content" :style="contentStyle">
      <!-- Question -->
      <div class="poll-question" :style="questionStyle">
        {{ mockData.question }}
      </div>

      <!-- Options -->
      <div class="poll-options" :style="{ gap: `${config.optionSpacing}px` }">
        <div
          v-for="(option, index) in mockData.options"
          :key="index"
          class="poll-option"
          :class="{
            'is-winner': state === 'result' && isWinner(index),
            'is-loser': state === 'result' && !isWinner(index),
            'is-leader': state !== 'result' && isLeader(index),
          }"
          :style="getOptionStyle(index)"
        >
          <div class="option-content">
            <span class="option-text" :style="optionTextStyle">
              <!-- Crown icon for leader -->
              <span v-if="gamification.leader.showCrown && isLeader(index)" class="leader-crown">
                👑
              </span>
              {{ option }}
            </span>
            <span class="option-percentage" :style="optionPercentageStyle">
              {{ mockData.percentages[index] || 0 }}%
            </span>
          </div>
          <div class="option-bar-container">
            <div class="option-bar" :style="getBarStyle(index)" />
          </div>
        </div>
      </div>

      <!-- Gamified Time Bar -->
      <div v-if="gamification.timeBar.enabled" class="gamified-time-bar">
        <!-- Timer Badge -->
        <div
          v-if="gamification.timer.showBadge"
          class="timer-badge"
          :class="{ 'is-urgent': isUrgent }"
          :style="timerBadgeStyle"
        >
          {{ formatTime(mockData.timeRemaining) }}
        </div>

        <!-- Time Progress Bar -->
        <div class="time-bar-container" :style="timeBarContainerStyle">
          <div class="time-bar-fill" :style="timeBarFillStyle">
            <!-- Shimmer effect -->
            <div v-if="gamification.timeBar.shimmerEnabled" class="time-bar-shimmer" />
          </div>
          <!-- Glow edge -->
          <div
            v-if="gamification.timeBar.glowEdgeEnabled"
            class="time-bar-glow"
            :style="timeBarGlowStyle"
          />
        </div>
      </div>

      <!-- Fallback: Classic progress bar if gamification disabled -->
      <div v-else class="poll-progress" :style="progressContainerStyle">
        <div class="progress-bar" :style="progressBarStyle">
          <div class="progress-fill" :style="progressFillStyle" />
        </div>
        <span v-if="config.progressBar.showTimeText" class="progress-time" :style="timeTextStyle">
          {{ mockData.timeRemaining }}s
        </span>
      </div>
    </div>

    <!-- Debug info -->
    <div v-if="showDebug" class="debug-info">State: {{ state }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { PollProperties, OverlayElement, PollMockData, PollGamificationConfig } from '../types'
import { useAnimationController, type AnimationState } from '../composables/useAnimationController'

// Default gamification config
const DEFAULT_GAMIFICATION: PollGamificationConfig = {
  timer: { showBadge: true, urgentThreshold: 10, urgentColor: '#ef4444' },
  timeBar: {
    enabled: true,
    shimmerEnabled: true,
    glowEdgeEnabled: true,
    shakeWhenUrgent: true,
    shakeIntensity: 5,
  },
  leader: { showCrown: true, pulseAnimation: true, changeSound: { enabled: true, volume: 0.4 } },
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
  tieBreaker: { showAllWinners: true, titleText: 'EX-ÆQUO !' },
}

const props = defineProps<{
  element: OverlayElement
  externalState?: AnimationState
  showDebug?: boolean
}>()

// Configuration du poll
const config = computed(() => props.element.properties as PollProperties)

// Mock data depuis la config
const mockData = computed<PollMockData>(() => config.value.mockData)

// Gamification config with defaults
const gamification = computed<PollGamificationConfig>(() => ({
  ...DEFAULT_GAMIFICATION,
  ...config.value.gamification,
}))

// Animation controller
const controller = useAnimationController(toRef(() => config.value))

// État: utiliser l'état externe si fourni, sinon l'état interne du controller
const state = computed(() => props.externalState ?? controller.state.value)

// Exposer les méthodes du controller
defineExpose({
  playEntry: controller.playEntry,
  playLoop: controller.playLoop,
  stopLoop: controller.stopLoop,
  playResult: controller.playResult,
  playExit: controller.playExit,
  reset: controller.reset,
  playFullSequence: controller.playFullSequence,
  state: controller.state,
  audioEnabled: controller.audioEnabled,
})

// Calcul des rankings avec gestion des ex-aequo
const rankings = computed(() => {
  const percs = mockData.value.percentages
  if (percs.length === 0) return {}

  const sorted = percs
    .map((p, i) => ({ percentage: p, index: i }))
    .sort((a, b) => b.percentage - a.percentage)

  const ranks: Record<number, number> = {}
  let currentRank = 1

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    const previous = sorted[i - 1]
    if (current && i > 0 && previous && current.percentage < previous.percentage) {
      currentRank = i + 1
    }
    if (current) {
      ranks[current.index] = currentRank
    }
  }

  return ranks
})

// Vérifier si une option est gagnante (rang 1)
const isWinner = (index: number): boolean => {
  return rankings.value[index] === 1
}

// Vérifier si une option est le leader (rang 1 pendant le vote)
const isLeader = (index: number): boolean => {
  return rankings.value[index] === 1
}

// Indices des leaders (peut être multiple en cas d'égalité)
// Reserved for future use (tie-breaker display)
const _leaderIndices = computed(() => {
  const indices: number[] = []
  for (const [idx, rank] of Object.entries(rankings.value)) {
    if (rank === 1) indices.push(parseInt(idx))
  }
  return indices
})

// Vérifier si le temps est urgent
const isUrgent = computed(() => {
  return mockData.value.timeRemaining <= gamification.value.timer.urgentThreshold
})

// Calculer si on doit shaker
const shouldShake = computed(() => {
  return gamification.value.timeBar.shakeWhenUrgent && isUrgent.value
})

// Formater le temps (mm:ss ou ss)
const formatTime = (seconds: number): string => {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return `${seconds}s`
}

// Calculer le pourcentage de temps restant
const timePercent = computed(() => {
  const total = mockData.value.totalDuration || 60
  return (mockData.value.timeRemaining / total) * 100
})

// Obtenir la couleur de médaille selon le rang
const getMedalColor = (rank: number): string => {
  const colors = config.value.medalColors
  switch (rank) {
    case 1:
      return colors.gold
    case 2:
      return colors.silver
    case 3:
      return colors.bronze
    default:
      return colors.base
  }
}

// Styles calculés
const containerStyle = computed(() => {
  const el = props.element
  // Position en pourcentage du canvas 1920x1080
  const left = ((el.position.x + 960) / 1920) * 100
  const top = ((540 - el.position.y) / 1080) * 100
  const rotation = -(el.rotation.z * 180) / Math.PI

  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${el.scale.x}, ${el.scale.y})`,
  }
})

// Helper to convert borderRadius to CSS string
const getBorderRadiusStyle = (
  br:
    | number
    | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }
    | undefined
): string => {
  if (br === undefined) return '0px'
  if (typeof br === 'number') return `${br}px`
  return `${br.topLeft}px ${br.topRight}px ${br.bottomRight}px ${br.bottomLeft}px`
}

// Content style applies questionBoxStyle to the entire card
const contentStyle = computed(() => {
  const qbs = config.value.questionBoxStyle

  return {
    width: `${config.value.layout.maxWidth}px`,
    // Card background and border from questionBoxStyle
    backgroundColor: qbs?.backgroundColor ?? 'rgba(17, 17, 17, 0.9)',
    borderColor: qbs?.borderColor ?? 'transparent',
    borderWidth: `${qbs?.borderWidth ?? 0}px`,
    borderStyle: (qbs?.borderWidth ?? 0) > 0 ? 'solid' : 'none',
    borderRadius: getBorderRadiusStyle(qbs?.borderRadius ?? 24),
    padding: qbs?.padding
      ? `${qbs.padding.top}px ${qbs.padding.right}px ${qbs.padding.bottom}px ${qbs.padding.left}px`
      : '32px',
  }
})

// Question style is now typography only
const questionStyle = computed(() => {
  const qs = config.value.questionStyle

  return {
    fontFamily: qs.fontFamily,
    fontSize: `${qs.fontSize}px`,
    fontWeight: qs.fontWeight,
    color: qs.color,
    textShadow: qs.textShadow?.enabled
      ? `${qs.textShadow.offsetX}px ${qs.textShadow.offsetY}px ${qs.textShadow.blur}px ${qs.textShadow.color}`
      : 'none',
  }
})

const optionTextStyle = computed(() => {
  const ts = config.value.optionTextStyle
  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight: ts.fontWeight,
    color: ts.color,
  }
})

const optionPercentageStyle = computed(() => {
  const ps = config.value.optionPercentageStyle
  return {
    fontFamily: ps.fontFamily,
    fontSize: `${ps.fontSize}px`,
    fontWeight: ps.fontWeight,
    color: ps.color,
  }
})

const getOptionStyle = (index: number) => {
  const box = config.value.optionBoxStyle
  const rank = rankings.value[index] || 4
  const medalColor = getMedalColor(rank)

  const baseStyle = {
    backgroundColor: box.backgroundColor,
    borderColor: medalColor,
    borderWidth: `${box.borderWidth}px`,
    borderRadius: getBorderRadiusStyle(box.borderRadius),
    borderStyle: 'solid',
    opacity: box.opacity,
    padding: `${box.padding.top}px ${box.padding.right}px ${box.padding.bottom}px ${box.padding.left}px`,
  }

  // Animation de résultat
  if (state.value === 'result') {
    const resultAnim = config.value.animations.result
    if (isWinner(index)) {
      return {
        ...baseStyle,
        transform: `scale(${resultAnim.winnerEnlarge.scale})`,
        transition: `transform ${resultAnim.winnerEnlarge.duration}s ease-out`,
      }
    } else {
      return {
        ...baseStyle,
        opacity: resultAnim.loserFadeOut.opacity,
        transition: `opacity ${resultAnim.loserFadeOut.duration}s ease-out`,
      }
    }
  }

  return baseStyle
}

const getBarStyle = (index: number) => {
  const rank = rankings.value[index] || 4
  const medalColor = getMedalColor(rank)
  const percentage = mockData.value.percentages[index] || 0

  return {
    width: `${percentage}%`,
    backgroundColor: medalColor,
  }
}

const progressContainerStyle = computed(() => ({
  flexDirection:
    config.value.progressBar.position === 'top' ? ('column-reverse' as const) : ('column' as const),
}))

const progressBarStyle = computed(() => {
  const pb = config.value.progressBar
  return {
    height: `${pb.height}px`,
    backgroundColor: pb.backgroundColor,
    borderRadius: `${pb.borderRadius}px`,
  }
})

const progressFillStyle = computed(() => {
  const pb = config.value.progressBar
  const totalDuration = mockData.value.totalDuration || 60
  const fillPercent = (mockData.value.timeRemaining / totalDuration) * 100

  const background = pb.fillGradient?.enabled
    ? `linear-gradient(90deg, ${pb.fillGradient.startColor}, ${pb.fillGradient.endColor})`
    : pb.fillColor

  return {
    width: `${fillPercent}%`,
    background,
    borderRadius: `${pb.borderRadius}px`,
    height: '100%',
  }
})

const timeTextStyle = computed(() => {
  const ts = config.value.progressBar.timeTextStyle
  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight: ts.fontWeight,
    color: ts.color,
  }
})

// ===== Gamification Styles =====

const timerBadgeStyle = computed(() => ({
  backgroundColor: isUrgent.value ? gamification.value.timer.urgentColor : 'rgba(0, 0, 0, 0.6)',
}))

const timeBarContainerStyle = computed(() => ({
  backgroundColor: config.value.progressBar.backgroundColor,
  height: `${config.value.progressBar.height}px`,
  borderRadius: `${config.value.progressBar.borderRadius}px`,
}))

const timeBarFillStyle = computed(() => {
  const pb = config.value.progressBar
  const background = pb.fillGradient?.enabled
    ? `linear-gradient(90deg, ${pb.fillGradient.startColor}, ${pb.fillGradient.endColor})`
    : pb.fillColor

  return {
    width: `${timePercent.value}%`,
    background,
    borderRadius: `${pb.borderRadius}px`,
  }
})

const timeBarGlowStyle = computed(() => ({
  left: `${timePercent.value}%`,
  backgroundColor:
    config.value.progressBar.fillGradient?.endColor || config.value.progressBar.fillColor,
}))

// Classe d'animation selon l'état et la direction
const animationClass = computed(() => {
  if (state.value === 'entering') {
    const dir = config.value.animations.entry.slideDirection
    return `entering-from-${dir}`
  }
  if (state.value === 'exiting') {
    return 'exiting-fade'
  }
  return ''
})
</script>

<style scoped>
.preview-poll-container {
  position: absolute;
  transform-origin: center center;
  pointer-events: none;
}

.poll-content {
  /* background, border-radius, padding sont maintenant gérés par contentStyle via inline styles */
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 60px var(--color-overlay-shadow-brand);
}

.poll-question {
  text-align: center;
  margin-bottom: 24px;
}

.poll-options {
  display: flex;
  flex-direction: column;
}

.poll-option {
  transition: all 0.3s ease;
}

.poll-option.is-winner {
  z-index: 1;
}

.option-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.option-bar-container {
  height: 6px;
  background: var(--color-overlay-highlight);
  border-radius: 3px;
  overflow: hidden;
}

.option-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.poll-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.progress-bar {
  flex: 1;
  overflow: hidden;
}

.progress-fill {
  transition: width 1s linear;
}

.progress-time {
  min-width: 50px;
  text-align: right;
}

/* Debug info */
.debug-info {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-overlay-backdrop-solid);
  color: var(--color-success-500);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;
}

/* Animations d'entrée */
.state-entering {
  animation-fill-mode: forwards;
}

.entering-from-up {
  animation: slideInFromUp 0.5s ease-out forwards;
}

.entering-from-down {
  animation: slideInFromDown 0.5s ease-out forwards;
}

.entering-from-left {
  animation: slideInFromLeft 0.5s ease-out forwards;
}

.entering-from-right {
  animation: slideInFromRight 0.5s ease-out forwards;
}

@keyframes slideInFromUp {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0);
  }
}

@keyframes slideInFromDown {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(50px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0);
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateX(0);
  }
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateX(50px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateX(0);
  }
}

/* Animation de sortie */
.exiting-fade {
  animation: fadeOut 0.5s ease-in forwards;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* ===== Gamification Styles ===== */

/* Leader option */
.poll-option.is-leader {
  position: relative;
}

.leader-crown {
  margin-right: 6px;
  animation: crownPulse 1.5s ease-in-out infinite;
}

@keyframes crownPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

/* Shake animation */
.is-shaking {
  animation: shake 0.15s ease-in-out infinite;
}

@keyframes shake {
  0%,
  100% {
    transform: translate(-50%, -50%) translateX(0);
  }
  25% {
    transform: translate(-50%, -50%) translateX(-3px);
  }
  75% {
    transform: translate(-50%, -50%) translateX(3px);
  }
}

/* Gamified Time Bar */
.gamified-time-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.timer-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 6px 12px;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: white;
  transition: background-color 0.3s ease;
}

.timer-badge.is-urgent {
  animation: urgentPulse 0.5s ease-in-out infinite;
}

@keyframes urgentPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.time-bar-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.time-bar-fill {
  height: 100%;
  position: relative;
  transition: width 1s linear;
  overflow: hidden;
}

/* Shimmer effect */
.time-bar-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Glow edge */
.time-bar-glow {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  filter: blur(6px);
  opacity: 0.8;
  animation: glowPulse 1s ease-in-out infinite;
}

@keyframes glowPulse {
  0%,
  100% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.3);
  }
}

/* Winner styles with gamification */
.poll-option.is-winner {
  border-color: #ffd700 !important;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

/* Loser styles with gamification */
.poll-option.is-loser {
  opacity: 0.3;
  transform: scale(0.98);
}
</style>
