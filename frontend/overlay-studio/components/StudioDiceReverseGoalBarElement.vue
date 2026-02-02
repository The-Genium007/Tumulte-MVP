<template>
  <TresGroup
    ref="groupRef"
    :position="[element.position.x, element.position.y, isSelected ? 5 : element.position.z]"
    :rotation="[element.rotation.x, element.rotation.y, element.rotation.z]"
    :scale="[element.scale.x, element.scale.y, element.scale.z]"
    :render-order="renderOrder"
  >
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
      <div class="goal-bar-element" :style="containerStyle" @pointerdown.stop="handlePointerDown">
        <!-- Glow effect -->
        <div class="goal-glow" :style="glowStyle" />

        <!-- Main container -->
        <div class="goal-container" :style="innerContainerStyle">
          <!-- Header row -->
          <div class="goal-header">
            <div class="goal-title" :style="titleStyle">
              {{ mockData.eventName }}
            </div>
            <div class="goal-stats">
              <span class="goal-progress-text" :style="progressTextStyle">
                {{ mockData.currentProgress }}/{{ mockData.objectiveTarget }}
                <span class="goal-percentage">({{ progressPercentage }}%)</span>
              </span>
              <span class="goal-timer" :style="timerStyle">{{ formattedTime }}</span>
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
    </Html>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Html } from '@tresjs/cientos'
import type { Object3D } from 'three'
import type { OverlayElement, DiceReverseGoalBarProperties } from '../types'

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
const elementProps = computed(() => props.element.properties as DiceReverseGoalBarProperties)
const mockData = computed(() => elementProps.value.mockData)

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

// ===== Styles =====

const containerStyle = computed(() => ({
  width: `${elementProps.value.width}px`,
  position: 'relative' as const,
  zIndex: props.isSelected ? 100000 : 'auto',
}))

const glowStyle = computed(() => ({
  backgroundColor: elementProps.value.progressBar.fillColor,
  opacity: 0.3,
}))

const innerContainerStyle = computed(() => {
  const container = elementProps.value.container
  return {
    backgroundColor: container.backgroundColor,
    borderColor: container.borderColor,
    borderWidth: `${container.borderWidth}px`,
    borderRadius: `${container.borderRadius}px`,
    borderStyle: 'solid',
    opacity: container.opacity,
  }
})

const titleStyle = computed(() => {
  const title = elementProps.value.typography.title
  return {
    fontFamily: title.fontFamily,
    fontSize: `${title.fontSize}px`,
    fontWeight: title.fontWeight,
    color: title.color,
  }
})

const progressTextStyle = computed(() => {
  const progress = elementProps.value.typography.progress
  return {
    fontFamily: progress.fontFamily,
    fontSize: `${progress.fontSize}px`,
    fontWeight: progress.fontWeight,
    color: progress.color,
  }
})

const timerStyle = computed(() => {
  const timer = elementProps.value.typography.timer
  return {
    fontFamily: timer.fontFamily,
    fontSize: `${timer.fontSize}px`,
    fontWeight: timer.fontWeight,
    color: timer.color,
  }
})

const progressContainerStyle = computed(() => {
  const pb = elementProps.value.progressBar
  return {
    height: `${pb.height}px`,
    backgroundColor: pb.backgroundColor,
    borderRadius: '14px',
  }
})

const progressBarStyle = computed(() => {
  const pb = elementProps.value.progressBar

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

// ===== Drag Handling =====

const handlePointerDown = (event: PointerEvent) => {
  event.stopPropagation()

  if (groupRef.value) {
    emit('select', props.element.id, groupRef.value)
  }

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
.goal-bar-element {
  font-family: 'Inter', system-ui, sans-serif;
  cursor: move;
  user-select: none;
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
</style>
