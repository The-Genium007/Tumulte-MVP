<template>
  <TresGroup
    ref="groupRef"
    :position="[element.position.x, element.position.y, isSelected ? 5 : element.position.z]"
    :rotation="[element.rotation.x, element.rotation.y, element.rotation.z]"
    :scale="[element.scale.x, element.scale.y, element.scale.z]"
    :render-order="renderOrder"
  >
    <!-- Rendu HTML via Html de @tresjs/cientos -->
    <Html
      :center="true"
      :transform="true"
      :scale="50"
      :occlude="false"
      :sprite="false"
      :z-index-range="
        isSelected ? [50000, 49000] : [10000 + renderOrder * 1000, 10000 + renderOrder * 1000 + 999]
      "
      :wrapper-class="isSelected ? 'html-wrapper-selected' : 'html-wrapper-normal'"
    >
      <div class="dice-reverse-preview" @pointerdown.stop="handlePointerDown">
        <!-- Goal Bar Preview -->
        <div class="goal-bar-preview" :style="goalBarContainerStyle">
          <!-- Glow effect -->
          <div class="goal-glow" :style="goalGlowStyle" />

          <!-- Main container -->
          <div class="goal-container" :style="goalContainerInnerStyle">
            <!-- Header row -->
            <div class="goal-header">
              <div class="goal-title" :style="goalTitleStyle">
                {{ mockData.eventName }}
              </div>
              <div class="goal-stats">
                <span class="goal-progress-text">
                  {{ mockData.currentProgress }}/{{ mockData.objectiveTarget }}
                  <span class="goal-percentage">({{ progressPercentage }}%)</span>
                </span>
                <span class="goal-timer">{{ formattedTime }}</span>
              </div>
            </div>

            <!-- Progress bar -->
            <div class="goal-progress-container" :style="progressContainerStyle">
              <div class="goal-progress-bar" :style="progressBarStyle">
                <div class="progress-shimmer" />
              </div>
            </div>
          </div>
        </div>

        <!-- Impact HUD Preview (smaller, positioned below) -->
        <div class="impact-hud-preview" :style="impactContainerStyle">
          <div class="impact-glow" :style="impactGlowStyle" />
          <div class="impact-container" :style="impactContainerInnerStyle">
            <div class="impact-title" :style="impactTitleStyle">🎲 INVERSION DE DÉ !</div>
            <div class="impact-detail">20 → 1</div>
          </div>
        </div>
      </div>
    </Html>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Html } from '@tresjs/cientos'
import type { Object3D } from 'three'
import type { OverlayElement, DiceReverseProperties } from '../types'

const props = defineProps<{
  element: OverlayElement
  isSelected: boolean
  renderOrder: number
}>()

const emit = defineEmits<{
  select: [id: string, meshRef: Object3D]
  moveStart: []
  move: [deltaX: number, deltaY: number]
  moveEnd: []
}>()

const groupRef = ref<Object3D | null>(null)

// Drag state
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

// Extract properties
const diceReverseProps = computed(() => props.element.properties as DiceReverseProperties)
const mockData = computed(() => diceReverseProps.value.mockData)
const goalBarProps = computed(() => diceReverseProps.value.goalBar)
const impactHudProps = computed(() => diceReverseProps.value.impactHud)

// Progress percentage
const progressPercentage = computed(() => {
  const target = mockData.value.objectiveTarget
  const current = mockData.value.currentProgress
  if (target === 0) return 0
  return Math.round((current / target) * 100)
})

// Format time (seconds to mm:ss)
const formattedTime = computed(() => {
  const seconds = mockData.value.timeRemaining
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

// ===== Goal Bar Styles =====

const goalBarContainerStyle = computed(() => ({
  position: 'relative' as const,
  width: '500px',
  zIndex: props.isSelected ? 100000 : 'auto',
}))

const goalGlowStyle = computed(() => ({
  backgroundColor: goalBarProps.value.progressBar.fillColor,
  opacity: 0.3,
}))

const goalContainerInnerStyle = computed(() => {
  const container = goalBarProps.value.container
  return {
    backgroundColor: container.backgroundColor,
    borderColor: container.borderColor,
    borderWidth: `${container.borderWidth}px`,
    borderRadius: `${container.borderRadius}px`,
    borderStyle: 'solid',
    opacity: container.opacity,
  }
})

const goalTitleStyle = computed(() => {
  const title = goalBarProps.value.typography.title
  return {
    fontFamily: title.fontFamily,
    fontSize: `${title.fontSize}px`,
    fontWeight: title.fontWeight,
    color: title.color,
  }
})

const progressContainerStyle = computed(() => {
  const pb = goalBarProps.value.progressBar
  return {
    height: `${pb.height}px`,
    backgroundColor: pb.backgroundColor,
    borderRadius: '14px', // Fixed border radius for progress bar
  }
})

const progressBarStyle = computed(() => {
  const pb = goalBarProps.value.progressBar

  const background = pb.fillGradientEnabled
    ? `linear-gradient(90deg, ${pb.fillGradientStart}, ${pb.fillGradientEnd})`
    : pb.fillColor

  return {
    width: `${progressPercentage.value}%`,
    background,
    borderRadius: '14px',
    height: '100%',
  }
})

// ===== Impact HUD Styles =====

const impactContainerStyle = computed(() => ({
  position: 'relative' as const,
  marginTop: '20px',
  transform: 'scale(0.8)',
  transformOrigin: 'top center',
}))

const impactGlowStyle = computed(() => ({
  backgroundColor: impactHudProps.value.container.borderColor,
  opacity: 0.4,
}))

const impactContainerInnerStyle = computed(() => {
  const container = impactHudProps.value.container
  return {
    backgroundColor: container.backgroundColor,
    borderColor: container.borderColor,
    borderWidth: `${container.borderWidth}px`,
    borderRadius: `${container.borderRadius}px`,
    borderStyle: 'solid',
  }
})

const impactTitleStyle = computed(() => {
  const title = impactHudProps.value.typography.title
  return {
    fontFamily: title.fontFamily,
    fontSize: `${title.fontSize}px`,
    fontWeight: title.fontWeight,
    color: title.color,
  }
})

// ===== Drag Handling =====

const handlePointerDown = (event: PointerEvent) => {
  event.stopPropagation()

  // Select element
  if (groupRef.value) {
    emit('select', props.element.id, groupRef.value)
  }

  // Start drag
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY

  emit('moveStart')
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return

  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value

  emit('move', deltaX, deltaY)

  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
}

const handlePointerUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    emit('moveEnd')
  }

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
}
</script>

<style scoped>
.dice-reverse-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: move;
  user-select: none;
}

/* ===== Goal Bar Styles ===== */

.goal-bar-preview {
  font-family: 'Inter', system-ui, sans-serif;
}

.goal-glow {
  position: absolute;
  inset: -25px;
  border-radius: 35px;
  filter: blur(35px);
  animation: glow-pulse 2s ease-in-out infinite;
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

.goal-container {
  position: relative;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(35, 35, 55, 0.98));
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

.goal-progress-container {
  position: relative;
  overflow: hidden;
}

.goal-progress-bar {
  position: relative;
  overflow: hidden;
  transition: width 0.3s ease-out;
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

/* ===== Impact HUD Styles ===== */

.impact-hud-preview {
  font-family: 'Inter', system-ui, sans-serif;
}

.impact-glow {
  position: absolute;
  inset: -30px;
  border-radius: 40px;
  filter: blur(40px);
  opacity: 0.4;
}

.impact-container {
  position: relative;
  padding: 16px 24px;
  text-align: center;
  box-shadow:
    0 15px 50px rgba(0, 0, 0, 0.6),
    0 0 30px rgba(255, 215, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.impact-title {
  text-shadow:
    0 2px 10px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(255, 215, 0, 0.3);
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.impact-detail {
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  text-shadow: 0 3px 15px rgba(0, 0, 0, 0.5);
  letter-spacing: 4px;
}
</style>
