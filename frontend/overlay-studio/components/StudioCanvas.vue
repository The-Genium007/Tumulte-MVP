<template>
  <div ref="containerRef" class="studio-canvas-container">
    <!-- Wrapper avec ratio 16:9 fixe -->
    <div ref="wrapperRef" class="canvas-wrapper" :style="canvasWrapperStyle">
      <TresCanvas v-bind="canvasProps" @click="handleCanvasClick">
        <!-- Caméra orthographique pour vue 2D (espace 1920x1080, origine au centre) -->
        <TresOrthographicCamera
          :position="[0, 0, 10]"
          :left="-960"
          :right="960"
          :top="540"
          :bottom="-540"
          :near="0.1"
          :far="1000"
        />

        <!-- Lumière ambiante -->
        <TresAmbientLight :intensity="1" />

        <!-- Grille de référence (adaptée à 1920x1080, divisions de 100px = synchro avec magnétisme) -->
        <TresGridHelper
          v-if="showGrid"
          :args="[2000, 20, '#60584c', '#8a7d6a']"
          :rotation-x="Math.PI / 2"
        />

        <!-- Éléments de l'overlay (triés par zIndex, sélectionné en dernier) -->
        <template v-for="(element, index) in sortedVisibleElements" :key="element.id">
          <StudioElement
            :element="element"
            :is-selected="element.id === selectedElementId"
            :render-order="index"
            @select="handleSelectElement"
            @move-start="handleElementMoveStart"
            @move="(dx, dy) => handleElementMove(element.id, dx, dy)"
            @move-end="handleTransformEnd"
          />
        </template>
      </TresCanvas>

      <!-- Lignes guides de snap -->
      <div
        v-if="showSnapGuideX"
        class="snap-guide snap-guide-vertical"
        :style="{ left: snapGuideXStyle }"
      />
      <div
        v-if="showSnapGuideY"
        class="snap-guide snap-guide-horizontal"
        :style="{ top: snapGuideYStyle }"
      />

      <!-- Gizmo de transformation 2D (overlay HTML) -->
      <!-- Pour les dice, le gizmo cible le HUD avec un élément synthétique -->
      <TransformGizmo
        v-if="selectedElement"
        :element="gizmoTargetElement"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
        :container-width="wrapperWidth"
        :container-height="wrapperHeight"
        @move="handleMove"
        @resize="handleResize"
        @rotate="handleRotate"
        @transform-start="handleTransformStart"
        @transform-end="handleTransformEnd"
      />

      <!-- Overlay d'informations -->
      <div class="canvas-info">
        <span class="info-item">{{ canvasWidth }} x {{ canvasHeight }}</span>
        <span class="info-item">{{ elements.length }} éléments</span>
      </div>

      <!-- Panneau propriétés de l'élément sélectionné -->
      <div v-if="selectedElement" class="element-properties">
        <div class="property-group">
          <span class="property-label">X</span>
          <span v-if="editingProperty !== 'x'" class="property-value" @click="startEditing('x')">
            {{ Math.round(selectedElement.position.x) }}
          </span>
          <input
            v-else
            ref="propertyInputRef"
            v-model="editValue"
            type="number"
            class="property-input"
            @blur="finishEditing"
            @keydown.enter="finishEditing"
            @keydown.escape="cancelEditing"
          />
        </div>
        <div class="property-group">
          <span class="property-label">Y</span>
          <span v-if="editingProperty !== 'y'" class="property-value" @click="startEditing('y')">
            {{ Math.round(selectedElement.position.y) }}
          </span>
          <input
            v-else
            ref="propertyInputRef"
            v-model="editValue"
            type="number"
            class="property-input"
            @blur="finishEditing"
            @keydown.enter="finishEditing"
            @keydown.escape="cancelEditing"
          />
        </div>
        <div class="property-separator" />
        <div class="property-group">
          <span class="property-label">W</span>
          <span
            v-if="editingProperty !== 'scaleX'"
            class="property-value"
            @click="startEditing('scaleX')"
          >
            {{ selectedElement.scale.x.toFixed(2) }}
          </span>
          <input
            v-else
            ref="propertyInputRef"
            v-model="editValue"
            type="number"
            step="0.1"
            class="property-input"
            @blur="finishEditing"
            @keydown.enter="finishEditing"
            @keydown.escape="cancelEditing"
          />
        </div>
        <div class="property-group">
          <span class="property-label">H</span>
          <span
            v-if="editingProperty !== 'scaleY'"
            class="property-value"
            @click="startEditing('scaleY')"
          >
            {{ selectedElement.scale.y.toFixed(2) }}
          </span>
          <input
            v-else
            ref="propertyInputRef"
            v-model="editValue"
            type="number"
            step="0.1"
            class="property-input"
            @blur="finishEditing"
            @keydown.enter="finishEditing"
            @keydown.escape="cancelEditing"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import type { Object3D } from 'three'
import { useOverlayStudioStore } from '../stores/overlayStudio'
import { useInjectedUndoRedo } from '../composables/useUndoRedo'
import type {
  PollProperties,
  DiceProperties,
  DiceReverseGoalBarProperties,
  DiceReverseImpactHudProperties,
} from '../types'
import {
  calculatePollGizmoSize,
  calculateGoalBarGizmoSize,
  calculateImpactHudGizmoSize,
  HUD_BASE_SIZE,
} from '../utils/gizmo-size'
import StudioElement from './StudioElement.vue'
import TransformGizmo, { type ActiveEdges, type ResizeHandle } from './TransformGizmo.vue'

const store = useOverlayStudioStore()

// Undo/Redo - injecter le composable fourni par le parent (studio.vue)
const undoRedo = useInjectedUndoRedo()

// Référence au conteneur pour calculer les dimensions
const containerRef = ref<HTMLElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const containerHeight = ref(0)
const wrapperWidth = ref(0)
const wrapperHeight = ref(0)

// Édition des propriétés
type EditableProperty = 'x' | 'y' | 'scaleX' | 'scaleY' | null
const editingProperty = ref<EditableProperty>(null)
const editValue = ref('')
const propertyInputRef = ref<HTMLInputElement | null>(null)

const startEditing = (property: EditableProperty) => {
  if (!selectedElement.value || !property) return

  editingProperty.value = property

  // Initialiser la valeur
  switch (property) {
    case 'x':
      editValue.value = String(Math.round(selectedElement.value.position.x))
      break
    case 'y':
      editValue.value = String(Math.round(selectedElement.value.position.y))
      break
    case 'scaleX':
      editValue.value = selectedElement.value.scale.x.toFixed(2)
      break
    case 'scaleY':
      editValue.value = selectedElement.value.scale.y.toFixed(2)
      break
  }

  // Focus l'input après le rendu
  nextTick(() => {
    propertyInputRef.value?.select()
  })
}

const finishEditing = () => {
  if (!selectedElement.value || !editingProperty.value) {
    editingProperty.value = null
    return
  }

  const value = parseFloat(editValue.value)
  if (isNaN(value)) {
    editingProperty.value = null
    return
  }

  const el = selectedElement.value

  switch (editingProperty.value) {
    case 'x':
      store.updateElementPosition(el.id, { ...el.position, x: value })
      break
    case 'y':
      store.updateElementPosition(el.id, { ...el.position, y: value })
      break
    case 'scaleX':
      store.updateElementScale(el.id, { ...el.scale, x: Math.max(0.1, value) })
      break
    case 'scaleY':
      store.updateElementScale(el.id, { ...el.scale, y: Math.max(0.1, value) })
      break
  }

  editingProperty.value = null
}

const cancelEditing = () => {
  editingProperty.value = null
}

// Snap guides
const showSnapGuideX = ref(false)
const showSnapGuideY = ref(false)
const snapGuideXPosition = ref(0) // Position X du guide vertical en coordonnées canvas
const snapGuideYPosition = ref(0) // Position Y du guide horizontal en coordonnées canvas
const SNAP_THRESHOLD = 15 // Distance en pixels canvas pour activer le snap sur les axes centraux
const SNAP_THRESHOLD_GRID = 4 // Distance réduite pour les autres lignes de grille
const GRID_SPACING = 100 // Espacement de la grille en pixels canvas (synchro avec TresGridHelper)

// Ratio 16:9 fixe
const ASPECT_RATIO = 16 / 9

// Calcul des dimensions du canvas wrapper avec ratio 16:9
const canvasWrapperStyle = computed(() => {
  if (containerWidth.value === 0 || containerHeight.value === 0) {
    return { width: '100%', height: '100%' }
  }

  const availableWidth = containerWidth.value
  const availableHeight = containerHeight.value

  // Calculer les dimensions qui respectent le ratio 16:9
  let width: number
  let height: number

  if (availableWidth / availableHeight > ASPECT_RATIO) {
    // Le conteneur est plus large que 16:9, on se base sur la hauteur
    height = availableHeight
    width = height * ASPECT_RATIO
  } else {
    // Le conteneur est plus haut que 16:9, on se base sur la largeur
    width = availableWidth
    height = width / ASPECT_RATIO
  }

  return {
    width: `${width}px`,
    height: `${height}px`,
  }
})

// Observer les changements de taille du conteneur
const updateContainerSize = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight
  }
  if (wrapperRef.value) {
    wrapperWidth.value = wrapperRef.value.clientWidth
    wrapperHeight.value = wrapperRef.value.clientHeight
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateContainerSize()

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(updateContainerSize)
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// Détection du thème pour adapter la couleur du canvas Three.js
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// Props du canvas
const canvasProps = computed(() => ({
  alpha: true,
  clearColor: isDark.value ? '#1e1e1e' : '#b5aa99', // Adapté au thème
  shadows: false,
  windowSize: false,
}))

// État du store
const elements = computed(() => store.elements)
const sortedVisibleElements = computed(() => store.sortedVisibleElements)
const selectedElementId = computed(() => store.selectedElementId)
const selectedElement = computed(() => store.selectedElement)
const showGrid = computed(() => store.showGrid)
const canvasWidth = computed(() => store.canvasWidth)
const canvasHeight = computed(() => store.canvasHeight)

// Élément cible pour le gizmo
// Pour les dice, on crée un élément synthétique basé sur hudTransform
const gizmoTargetElement = computed(() => {
  if (!selectedElement.value) return null

  if (selectedElement.value.type === 'dice') {
    const diceProps = selectedElement.value.properties as DiceProperties
    const hudTransform = diceProps.hudTransform || {
      position: { x: 0, y: -300 },
      scale: 1,
    }

    // Retourner un élément synthétique pour le gizmo
    return {
      ...selectedElement.value,
      position: { x: hudTransform.position.x, y: hudTransform.position.y, z: 0 },
      scale: { x: hudTransform.scale, y: hudTransform.scale, z: 1 },
      rotation: { x: 0, y: 0, z: 0 }, // Pas de rotation pour le HUD
    }
  }

  return selectedElement.value
})

// Clic sur le canvas (désélectionner)
const handleCanvasClick = (event: MouseEvent) => {
  // Ne désélectionner que si on clique directement sur le canvas, pas sur un élément
  const target = event.target as HTMLElement
  if (target.tagName === 'CANVAS') {
    store.deselectElement()
  }
}

// Sélection d'un élément
const handleSelectElement = (id: string, _meshRef: Object3D) => {
  store.selectElement(id)
}

// Facteur de conversion écran -> canvas
const scaleFactor = computed(() => {
  if (wrapperWidth.value === 0) return 1
  return wrapperWidth.value / canvasWidth.value
})

// Styles des guides de snap (position dynamique basée sur la grille)
const snapGuideXStyle = computed(() => {
  // Convertir la position canvas en pourcentage du wrapper
  // Canvas X va de -960 à +960, on convertit en 0% à 100%
  const percent = ((snapGuideXPosition.value + canvasWidth.value / 2) / canvasWidth.value) * 100
  return `${percent}%`
})

const snapGuideYStyle = computed(() => {
  // Convertir la position canvas en pourcentage du wrapper
  // Canvas Y va de -540 à +540 (mais inversé: +540 = haut = 0%)
  const percent = ((canvasHeight.value / 2 - snapGuideYPosition.value) / canvasHeight.value) * 100
  return `${percent}%`
})

// Gestion du déplacement depuis l'élément (pixels écran)
const handleElementMove = (elementId: string, deltaScreenX: number, deltaScreenY: number) => {
  const element = elements.value.find((el) => el.id === elementId)
  if (!element) return

  const scale = scaleFactor.value
  // Convertir les pixels écran en coordonnées canvas
  const deltaCanvasX = deltaScreenX / scale
  const deltaCanvasY = -deltaScreenY / scale // Inverser Y car canvas Y est inversé

  let newX = element.position.x + deltaCanvasX
  let newY = element.position.y + deltaCanvasY

  // Snap au centre vertical (X = 0)
  if (Math.abs(newX) < SNAP_THRESHOLD) {
    newX = 0
    showSnapGuideX.value = true
  } else {
    showSnapGuideX.value = false
  }

  // Snap au centre horizontal (Y = 0)
  if (Math.abs(newY) < SNAP_THRESHOLD) {
    newY = 0
    showSnapGuideY.value = true
  } else {
    showSnapGuideY.value = false
  }

  store.updateElementPosition(element.id, {
    x: newX,
    y: newY,
    z: 0,
  })
}

// Trouver la ligne de grille la plus proche d'une position
const findNearestGridLine = (position: number): number => {
  return Math.round(position / GRID_SPACING) * GRID_SPACING
}

// Calculer la demi-taille de l'élément en coordonnées canvas
// Utilise les utilitaires centralisés de utils/gizmo-size.ts
// Pour les dice, utilise HUD_BASE_SIZE car le gizmo cible le HUD, pas le canvas entier
const getElementHalfSize = (element: typeof gizmoTargetElement.value) => {
  if (!element) return { halfWidth: 0, halfHeight: 0 }

  let baseWidth = 100
  let baseHeight = 100

  if (element.type === 'poll') {
    const pollProps = element.properties as PollProperties
    const gizmoSize = calculatePollGizmoSize(pollProps)
    baseWidth = gizmoSize.width
    baseHeight = gizmoSize.height
  } else if (element.type === 'dice') {
    // Pour les dice, le gizmo cible le HUD, pas le canvas entier
    baseWidth = HUD_BASE_SIZE.width
    baseHeight = HUD_BASE_SIZE.height
  } else if (element.type === 'diceReverseGoalBar') {
    const goalBarProps = element.properties as DiceReverseGoalBarProperties
    const gizmoSize = calculateGoalBarGizmoSize(goalBarProps)
    baseWidth = gizmoSize.width
    baseHeight = gizmoSize.height
  } else if (element.type === 'diceReverseImpactHud') {
    const impactHudProps = element.properties as DiceReverseImpactHudProperties
    const gizmoSize = calculateImpactHudGizmoSize(impactHudProps)
    baseWidth = gizmoSize.width
    baseHeight = gizmoSize.height
  }

  return {
    halfWidth: (baseWidth * element.scale.x) / 2,
    halfHeight: (baseHeight * element.scale.y) / 2,
  }
}

// Gestion du déplacement avec snap basé sur les bordures actives (depuis TransformGizmo)
const handleMove = (deltaX: number, deltaY: number, activeEdges: ActiveEdges) => {
  if (!selectedElement.value || !gizmoTargetElement.value) return

  const el = selectedElement.value
  const target = gizmoTargetElement.value

  // Utiliser la position du target (qui peut être hudTransform pour les dice)
  let newX = target.position.x + deltaX
  let newY = target.position.y + deltaY

  const { halfWidth, halfHeight } = getElementHalfSize(target)
  const hasActiveEdge =
    activeEdges.top || activeEdges.bottom || activeEdges.left || activeEdges.right

  // Réinitialiser les guides
  showSnapGuideX.value = false
  showSnapGuideY.value = false

  if (hasActiveEdge) {
    // MODE BORDURE : Snap sur la grille basé sur le bord tenu

    // Magnétisme horizontal (activé quand on tient par le haut ou le bas)
    if (activeEdges.top || activeEdges.bottom) {
      // Calculer la position du bord actif
      let edgeY: number
      if (activeEdges.top) {
        edgeY = newY + halfHeight // Bord haut de l'élément
      } else {
        edgeY = newY - halfHeight // Bord bas de l'élément
      }

      // Trouver la ligne de grille la plus proche
      const nearestGridY = findNearestGridLine(edgeY)
      const distanceToGrid = Math.abs(edgeY - nearestGridY)

      // Seuil plus élevé pour l'axe central (Y=0), réduit pour les autres lignes
      const threshold = nearestGridY === 0 ? SNAP_THRESHOLD : SNAP_THRESHOLD_GRID

      // Snap si le bord est proche d'une ligne de grille
      if (distanceToGrid < threshold) {
        if (activeEdges.top) {
          newY = nearestGridY - halfHeight
        } else {
          newY = nearestGridY + halfHeight
        }
        snapGuideYPosition.value = nearestGridY
        showSnapGuideY.value = true
      }
    }

    // Magnétisme vertical (activé quand on tient par la gauche ou la droite)
    if (activeEdges.left || activeEdges.right) {
      // Calculer la position du bord actif
      let edgeX: number
      if (activeEdges.left) {
        edgeX = newX - halfWidth // Bord gauche de l'élément
      } else {
        edgeX = newX + halfWidth // Bord droit de l'élément
      }

      // Trouver la ligne de grille la plus proche
      const nearestGridX = findNearestGridLine(edgeX)
      const distanceToGrid = Math.abs(edgeX - nearestGridX)

      // Seuil plus élevé pour l'axe central (X=0), réduit pour les autres lignes
      const threshold = nearestGridX === 0 ? SNAP_THRESHOLD : SNAP_THRESHOLD_GRID

      // Snap si le bord est proche d'une ligne de grille
      if (distanceToGrid < threshold) {
        if (activeEdges.left) {
          newX = nearestGridX + halfWidth
        } else {
          newX = nearestGridX - halfWidth
        }
        snapGuideXPosition.value = nearestGridX
        showSnapGuideX.value = true
      }
    }
  } else {
    // MODE CENTRAL : Snap du centre de l'élément sur la grille (comportement par défaut)

    // Snap vertical (centre X sur la grille)
    const nearestGridX = findNearestGridLine(newX)
    const thresholdX = nearestGridX === 0 ? SNAP_THRESHOLD : SNAP_THRESHOLD_GRID
    if (Math.abs(newX - nearestGridX) < thresholdX) {
      newX = nearestGridX
      snapGuideXPosition.value = nearestGridX
      showSnapGuideX.value = true
    }

    // Snap horizontal (centre Y sur la grille)
    const nearestGridY = findNearestGridLine(newY)
    const thresholdY = nearestGridY === 0 ? SNAP_THRESHOLD : SNAP_THRESHOLD_GRID
    if (Math.abs(newY - nearestGridY) < thresholdY) {
      newY = nearestGridY
      snapGuideYPosition.value = nearestGridY
      showSnapGuideY.value = true
    }
  }

  // Contrainte : empêcher l'élément de sortir du canvas (1920x1080, origine au centre)
  const canvasHalfWidth = 960
  const canvasHalfHeight = 540

  // Limiter X pour que le bord de l'élément ne dépasse pas
  const minX = -canvasHalfWidth + halfWidth
  const maxX = canvasHalfWidth - halfWidth
  newX = Math.max(minX, Math.min(maxX, newX))

  // Limiter Y pour que le bord de l'élément ne dépasse pas
  const minY = -canvasHalfHeight + halfHeight
  const maxY = canvasHalfHeight - halfHeight
  newY = Math.max(minY, Math.min(maxY, newY))

  // Router vers la bonne action selon le type d'élément
  if (el.type === 'dice') {
    // Pour les dice, mettre à jour hudTransform
    store.updateDiceHudTransform(el.id, {
      position: { x: newX, y: newY },
    })
  } else {
    // Pour les autres éléments, mettre à jour la position normale
    store.updateElementPosition(el.id, {
      x: newX,
      y: newY,
      z: 0,
    })
  }
}

// Gestion du redimensionnement avec snap magnétique sur la grille
const handleResize = (
  deltaWidth: number,
  deltaHeight: number,
  deltaX: number,
  deltaY: number,
  proportional: boolean,
  handle: ResizeHandle
) => {
  if (!selectedElement.value || !gizmoTargetElement.value) return

  const el = selectedElement.value
  const target = gizmoTargetElement.value

  // Calculer la taille de base selon le type d'élément
  // Utilise les utilitaires centralisés de utils/gizmo-size.ts
  let baseWidth = 100
  let baseHeight = 100

  if (el.type === 'poll') {
    const pollProps = el.properties as PollProperties
    const gizmoSize = calculatePollGizmoSize(pollProps)
    baseWidth = gizmoSize.width
    baseHeight = gizmoSize.height
  } else if (el.type === 'dice') {
    // Pour les dice, le gizmo cible le HUD
    baseWidth = HUD_BASE_SIZE.width
    baseHeight = HUD_BASE_SIZE.height
  } else if (el.type === 'diceReverseGoalBar') {
    const goalBarProps = el.properties as DiceReverseGoalBarProperties
    const gizmoSize = calculateGoalBarGizmoSize(goalBarProps)
    baseWidth = gizmoSize.width
    baseHeight = gizmoSize.height
  } else if (el.type === 'diceReverseImpactHud') {
    const impactHudProps = el.properties as DiceReverseImpactHudProperties
    const gizmoSize = calculateImpactHudGizmoSize(impactHudProps)
    baseWidth = gizmoSize.width
    baseHeight = gizmoSize.height
  }

  // Calculer les nouveaux facteurs d'échelle (basé sur le scale du target)
  let newScaleX = target.scale.x + deltaWidth / baseWidth
  let newScaleY = target.scale.y + deltaHeight / baseHeight

  // Si proportionnel, garder le ratio (avant snap)
  if (proportional) {
    const avgDelta = (deltaWidth / baseWidth + deltaHeight / baseHeight) / 2
    newScaleX = target.scale.x + avgDelta
    newScaleY = target.scale.y + avgDelta
  }

  // Limiter le scale minimum
  newScaleX = Math.max(0.1, newScaleX)
  newScaleY = Math.max(0.1, newScaleY)

  // Variables pour le snap (peuvent être modifiées par la logique de snap)
  let finalDeltaX = deltaX
  let finalDeltaY = deltaY

  // Réinitialiser les guides de snap
  showSnapGuideX.value = false
  showSnapGuideY.value = false

  // Position du centre après les deltas de position
  const newCenterX = target.position.x + deltaX
  const newCenterY = target.position.y + deltaY

  // Demi-dimensions après scale
  let newHalfWidth = (baseWidth * newScaleX) / 2
  let newHalfHeight = (baseHeight * newScaleY) / 2

  // Helper pour vérifier si un bord doit snapper
  const checkEdgeSnap = (edgePosition: number): { snapped: boolean; gridLine: number } => {
    const nearest = findNearestGridLine(edgePosition)
    const threshold = nearest === 0 ? SNAP_THRESHOLD : SNAP_THRESHOLD_GRID
    if (Math.abs(edgePosition - nearest) < threshold) {
      return { snapped: true, gridLine: nearest }
    }
    return { snapped: false, gridLine: nearest }
  }

  // Snap bord droit (handles: e, ne, se)
  if (handle.includes('e')) {
    const rightEdge = newCenterX + newHalfWidth
    const { snapped, gridLine } = checkEdgeSnap(rightEdge)
    if (snapped) {
      // Ajuster la largeur pour que le bord droit soit sur la grille
      newHalfWidth = gridLine - newCenterX
      newScaleX = Math.max(0.1, (newHalfWidth * 2) / baseWidth)
      snapGuideXPosition.value = gridLine
      showSnapGuideX.value = true
    }
  }

  // Snap bord gauche (handles: w, nw, sw)
  if (handle.includes('w')) {
    const leftEdge = newCenterX - newHalfWidth
    const { snapped, gridLine } = checkEdgeSnap(leftEdge)
    if (snapped) {
      // Le bord droit reste fixe, on ajuste la largeur et le centre
      const rightEdge = newCenterX + newHalfWidth
      const newWidth = rightEdge - gridLine
      newScaleX = Math.max(0.1, newWidth / baseWidth)
      newHalfWidth = newWidth / 2
      // Nouveau centre = milieu entre gridLine et rightEdge
      finalDeltaX = (gridLine + rightEdge) / 2 - target.position.x
      snapGuideXPosition.value = gridLine
      showSnapGuideX.value = true
    }
  }

  // Snap bord haut (handles: n, nw, ne)
  if (handle.includes('n')) {
    const topEdge = newCenterY + newHalfHeight
    const { snapped, gridLine } = checkEdgeSnap(topEdge)
    if (snapped) {
      // Le bord bas reste fixe, on ajuste la hauteur et le centre
      const bottomEdge = newCenterY - newHalfHeight
      const newHeight = gridLine - bottomEdge
      newScaleY = Math.max(0.1, newHeight / baseHeight)
      newHalfHeight = newHeight / 2
      // Nouveau centre = milieu entre bottomEdge et gridLine
      finalDeltaY = (bottomEdge + gridLine) / 2 - target.position.y
      snapGuideYPosition.value = gridLine
      showSnapGuideY.value = true
    }
  }

  // Snap bord bas (handles: s, sw, se)
  if (handle.includes('s')) {
    const bottomEdge = newCenterY - newHalfHeight
    const { snapped, gridLine } = checkEdgeSnap(bottomEdge)
    if (snapped) {
      // Ajuster la hauteur pour que le bord bas soit sur la grille
      newHalfHeight = newCenterY - gridLine
      newScaleY = Math.max(0.1, (newHalfHeight * 2) / baseHeight)
      snapGuideYPosition.value = gridLine
      showSnapGuideY.value = true
    }
  }

  // Router vers la bonne action selon le type d'élément
  if (el.type === 'dice') {
    // Pour les dice, mettre à jour hudTransform avec scale uniforme
    const uniformScale = (newScaleX + newScaleY) / 2 // Moyenne pour uniformité
    store.updateDiceHudTransform(el.id, {
      scale: uniformScale,
      // Ajuster la position si nécessaire
      ...(finalDeltaX !== 0 || finalDeltaY !== 0
        ? { position: { x: target.position.x + finalDeltaX, y: target.position.y + finalDeltaY } }
        : {}),
    })
  } else {
    // Pour les autres éléments, mettre à jour le scale normal
    store.updateElementScale(el.id, {
      x: newScaleX,
      y: newScaleY,
      z: 1,
    })

    // Ajuster la position si nécessaire (pour les handles qui déplacent le centre)
    if (finalDeltaX !== 0 || finalDeltaY !== 0) {
      store.updateElementPosition(el.id, {
        x: el.position.x + finalDeltaX,
        y: el.position.y + finalDeltaY,
        z: 0,
      })
    }
  }
}

// Seuil de snap angulaire en radians (~2 degrés)
const ROTATION_SNAP_THRESHOLD = (2 * Math.PI) / 180
// Angles de snap (0°, 90°, 180°, 270°, 360°)
const ROTATION_SNAP_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI]

// Gestion de la rotation avec magnétisme sur les angles cardinaux
const handleRotate = (deltaAngle: number) => {
  if (!selectedElement.value) return

  const el = selectedElement.value
  let newRotation = el.rotation.z + deltaAngle

  // Normaliser l'angle entre 0 et 2π
  while (newRotation < 0) newRotation += 2 * Math.PI
  while (newRotation >= 2 * Math.PI) newRotation -= 2 * Math.PI

  // Snap sur les angles cardinaux si proche
  for (const snapAngle of ROTATION_SNAP_ANGLES) {
    const diff = Math.abs(newRotation - snapAngle)
    if (diff < ROTATION_SNAP_THRESHOLD || diff > 2 * Math.PI - ROTATION_SNAP_THRESHOLD) {
      newRotation = snapAngle === 2 * Math.PI ? 0 : snapAngle
      break
    }
  }

  store.updateElementRotation(el.id, {
    x: 0,
    y: 0,
    z: newRotation,
  })
}

// Labels des transformations pour l'historique
const transformLabels: Record<string, string> = {
  move: 'Déplacer élément',
  resize: 'Redimensionner élément',
  rotate: 'Pivoter élément',
}

// Début de transformation (depuis TransformGizmo)
const handleTransformStart = (mode: 'move' | 'resize' | 'rotate') => {
  undoRedo.startGroup(transformLabels[mode] || 'Transformer')
}

// Début de déplacement depuis l'élément (depuis StudioElement/StudioPollElement)
const handleElementMoveStart = () => {
  undoRedo.startGroup('Déplacer élément')
}

// Fin de transformation - cacher les guides et enregistrer l'historique
const handleTransformEnd = () => {
  showSnapGuideX.value = false
  showSnapGuideY.value = false
  undoRedo.endGroup()
}
</script>

<style scoped>
.studio-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-bg-muted);
}

.canvas-wrapper {
  position: relative;
  background: var(--ui-bg);
  border-radius: 8px;
  overflow: visible; /* Important pour le gizmo */
  box-shadow:
    0 0 0 1px var(--ui-border),
    0 4px 24px rgba(0, 0, 0, 0.15);
}

.canvas-info {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--ui-text-muted);
  z-index: 10;
}

.info-item {
  background: var(--ui-bg);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--ui-border);
}

/* Snap guides */
.snap-guide {
  position: absolute;
  pointer-events: none;
  z-index: 100;
}

.snap-guide-vertical {
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--color-primary-500);
  box-shadow: 0 0 4px var(--color-primary-400);
}

.snap-guide-horizontal {
  left: 0;
  right: 0;
  height: 1px;
  background: var(--color-primary-500);
  box-shadow: 0 0 4px var(--color-primary-400);
}

/* Panneau propriétés élément */
.element-properties {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--ui-text-muted);
  z-index: 10;
  align-items: center;
}

.property-group {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--ui-bg);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--ui-border);
}

.property-label {
  color: var(--ui-text-muted);
  font-weight: 500;
  min-width: 12px;
}

.property-value {
  color: var(--ui-text);
  cursor: pointer;
  min-width: 40px;
  text-align: right;
  padding: 2px 4px;
  border-radius: 2px;
  transition: background-color 0.15s;
}

.property-value:hover {
  background: var(--ui-bg-accented);
  color: var(--ui-text);
}

.property-input {
  width: 50px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-primary);
  border-radius: 2px;
  color: var(--ui-text);
  font-size: 12px;
  padding: 2px 4px;
  text-align: right;
  outline: none;
}

.property-input:focus {
  background: var(--ui-bg-accented);
  border-color: var(--ui-primary);
}

.property-separator {
  width: 1px;
  height: 16px;
  background: var(--ui-border);
}
</style>

<!-- Styles globaux pour les wrappers Html de TresJS -->
<!-- Ces classes sont appliquées via la prop wrapper-class du composant Html -->
<!-- IMPORTANT: Toujours passer une classe (jamais undefined) car Html ne retire pas la classe précédente -->
<style>
.html-wrapper-selected {
  z-index: 100000 !important;
}

.html-wrapper-normal {
  z-index: auto !important;
}
</style>
