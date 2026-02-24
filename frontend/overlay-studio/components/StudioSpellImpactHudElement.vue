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
      <div class="impact-hud-element" :style="containerStyle" @pointerdown.stop="handlePointerDown">
        <!-- Glow effect -->
        <div class="impact-glow" :style="glowStyle" />

        <!-- Main container -->
        <div class="impact-container" :style="innerContainerStyle">
          <div class="impact-title" :style="titleStyle">✨ SORT ACTIVÉ !</div>
          <div class="impact-detail" :style="detailStyle">Boule de feu</div>
        </div>
      </div>
    </Html>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Html } from '@tresjs/cientos'
import type { Object3D } from 'three'
import type { OverlayElement, SpellImpactHudProperties } from '../types'

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
const elementProps = computed(() => props.element.properties as SpellImpactHudProperties)

// ===== Styles =====

const containerStyle = computed(() => ({
  width: `${elementProps.value.width}px`,
  position: 'relative' as const,
  zIndex: props.isSelected ? 100000 : 'auto',
}))

const glowStyle = computed(() => ({
  backgroundColor: elementProps.value.container.borderColor,
  opacity: 0.4,
}))

const innerContainerStyle = computed(() => {
  const container = elementProps.value.container
  return {
    backgroundColor: container.backgroundColor,
    borderColor: container.borderColor,
    borderWidth: `${container.borderWidth}px`,
    borderRadius: `${container.borderRadius}px`,
    borderStyle: 'solid',
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

const detailStyle = computed(() => {
  const detail = elementProps.value.typography.detail
  return {
    fontFamily: detail.fontFamily,
    fontSize: `${detail.fontSize}px`,
    fontWeight: detail.fontWeight,
    color: detail.color,
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
.impact-hud-element {
  font-family:
    'Inter', system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
  cursor: move;
  user-select: none;
}

.impact-glow {
  position: absolute;
  inset: -30px;
  border-radius: 40px;
  filter: blur(40px);
}

.impact-container {
  position: relative;
  padding: 20px 32px;
  text-align: center;
  box-shadow:
    0 15px 50px rgba(0, 0, 0, 0.6),
    0 0 30px rgba(59, 130, 246, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.impact-title {
  text-shadow:
    0 2px 10px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(59, 130, 246, 0.3);
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.impact-detail {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  text-shadow: 0 3px 15px rgba(0, 0, 0, 0.5);
  letter-spacing: 4px;
}
</style>
