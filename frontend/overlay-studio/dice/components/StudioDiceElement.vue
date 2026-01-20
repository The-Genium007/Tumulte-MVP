<template>
  <!-- Zone 3D des dés - fixe au centre, couvre le canvas -->
  <!-- renderOrder bas pour que la zone 3D soit en dessous du HUD -->
  <TresGroup ref="diceZoneRef" :position="[0, 0, isSelected ? 5 : 0]" :render-order="renderOrder">
    <Html
      :center="true"
      :transform="true"
      :scale="50"
      :occlude="false"
      :sprite="false"
      :z-index-range="
        isSelected ? [50000, 49000] : [10000 + renderOrder * 1000, 10000 + renderOrder * 1000 + 499]
      "
      :wrapper-class="isSelected ? 'html-wrapper-selected' : 'html-wrapper-normal'"
    >
      <div
        class="dice-3d-zone"
        :style="{ position: 'relative', zIndex: isSelected ? 100000 : 'auto' }"
      >
        <div class="dice-3d-container">
          <ClientOnly>
            <DiceBox
              ref="diceBoxRef"
              :custom-colorset="diceCustomColorset"
              :texture="diceTexture"
              :material="diceMaterial"
              :light-intensity="diceLightIntensity"
              :sounds="false"
              @ready="onDiceBoxReady"
            />
          </ClientOnly>
        </div>
      </div>
    </Html>
  </TresGroup>

  <!-- HUD - positionnable et redimensionnable indépendamment -->
  <!-- renderOrder légèrement plus haut pour que le HUD soit au-dessus de la zone 3D -->
  <TresGroup
    ref="hudGroupRef"
    :position="[hudPosition.x, hudPosition.y, isSelected ? 6 : 1]"
    :scale="[hudScale, hudScale, 1]"
    :render-order="renderOrder + 1"
  >
    <Html
      :center="true"
      :transform="true"
      :scale="50"
      :occlude="false"
      :sprite="false"
      :z-index-range="
        isSelected
          ? [50500, 49500]
          : [10000 + renderOrder * 1000 + 500, 10000 + renderOrder * 1000 + 999]
      "
      :wrapper-class="isSelected ? 'html-wrapper-selected' : 'html-wrapper-normal'"
    >
      <div
        class="hud-zone"
        :style="{ position: 'relative', zIndex: isSelected ? 100001 : 'auto' }"
        @pointerdown.stop="handleHudPointerDown"
        @click.stop
      >
        <DiceRollOverlay
          :dice-roll="mockDiceRollEvent"
          :visible="true"
          :hud-config="diceProperties.hud"
          :critical-colors="diceProperties.colors"
        />
      </div>
    </Html>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Html } from '@tresjs/cientos'
import type { Object3D } from 'three'
import type { OverlayElement, DiceProperties } from '../../types'
import type { DiceRollEvent } from '~/types'
import DiceRollOverlay from '~/components/overlay/DiceRollOverlay.vue'
import DiceBox from '~/components/DiceBox.client.vue'

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

const diceZoneRef = ref<Object3D | null>(null)
const hudGroupRef = ref<Object3D | null>(null)
const diceBoxRef = ref<InstanceType<typeof DiceBox> | null>(null)

// Propriétés typées du Dice
const diceProperties = computed(() => props.element.properties as DiceProperties)

// Position du HUD depuis hudTransform
const hudPosition = computed(() => {
  const transform = diceProperties.value.hudTransform
  return transform?.position ?? { x: 0, y: -300 }
})

// Scale du HUD depuis hudTransform
const hudScale = computed(() => {
  const transform = diceProperties.value.hudTransform
  return transform?.scale ?? 1
})

// Configuration custom colorset pour le DiceBox
const diceCustomColorset = computed(() => {
  const { colors } = diceProperties.value.diceBox
  return {
    foreground: colors.foreground,
    background: colors.background,
    outline: colors.outline,
  }
})

// Texture du dé
const diceTexture = computed(() => diceProperties.value.diceBox.texture)

// Matériau du dé
const diceMaterial = computed(() => diceProperties.value.diceBox.material)

// Intensité lumineuse de la scène 3D
const diceLightIntensity = computed(() => diceProperties.value.diceBox.lightIntensity)

// Quand le DiceBox est prêt, lancer un dé statique pour l'aperçu
const onDiceBoxReady = async () => {
  if (diceBoxRef.value) {
    const formula = diceProperties.value.mockData.rollFormula || '1d20'
    await diceBoxRef.value.roll(formula)
  }
}

// Fonction debounced pour relancer le dé après modification des propriétés visuelles
const debouncedReroll = useDebounceFn(async () => {
  if (diceBoxRef.value) {
    const formula = diceProperties.value.mockData.rollFormula || '1d20'
    await diceBoxRef.value.roll(formula)
  }
}, 500)

// Watcher sur les propriétés visuelles du dé (couleurs, texture, matériau)
// Relance automatiquement le dé après 500ms d'inactivité pour voir les changements
watch(
  () => diceProperties.value.diceBox,
  () => {
    debouncedReroll()
  },
  { deep: true }
)

// Création d'un DiceRollEvent mocké basé sur les mockData
const mockDiceRollEvent = computed<DiceRollEvent>(() => {
  const mock = diceProperties.value.mockData
  const totalResult = mock.diceValues.reduce((sum, val) => sum + val, 0)

  return {
    id: 'mock-preview',
    characterId: 'mock-char',
    characterName: 'Prévisualisation',
    characterAvatar: null,
    rollFormula: mock.rollFormula,
    result: totalResult,
    diceResults: mock.diceValues,
    isCritical: mock.isCritical,
    criticalType: mock.criticalType,
    isHidden: false,
    rollType: 'skill',
    rolledAt: new Date().toISOString(),
    isOwnCharacter: false,
    skill: null,
    skillRaw: null,
    ability: null,
    abilityRaw: null,
    modifiers: null,
  }
})

// État du drag pour le HUD
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

// Gestion du pointerdown sur le HUD - sélection + début du drag
const handleHudPointerDown = (event: PointerEvent) => {
  event.stopPropagation()

  // Sélectionner l'élément
  if (hudGroupRef.value) {
    emit('select', props.element.id, hudGroupRef.value)
  }

  // Démarrer le drag
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY

  emit('moveStart')
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

// Gestion du déplacement
const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return

  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value

  // Émettre le delta en pixels écran (sera converti par le parent)
  emit('move', deltaX, deltaY)

  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
}

// Fin du drag
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
.dice-3d-zone {
  width: 1920px;
  height: 1080px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  cursor: default;
  user-select: none;
}

.dice-3d-container {
  width: 500px;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
}

.hud-zone {
  cursor: move;
  user-select: none;
}

/* Override le positionnement fixed du DiceRollOverlay pour l'afficher inline */
.hud-zone :deep(.dice-roll-container) {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
}
</style>
