<template>
  <!-- Poll (sondage) -->
  <StudioPollElement
    v-if="element.type === 'poll'"
    :element="element"
    :is-selected="isSelected"
    :render-order="renderOrder"
    @select="handleSelect"
    @move-start="handleMoveStart"
    @move="handleMove"
    @move-end="handleMoveEnd"
  />

  <!-- Dice (dés 3D) -->
  <StudioDiceElement
    v-else-if="element.type === 'dice'"
    :element="element"
    :is-selected="isSelected"
    :render-order="renderOrder"
    @select="handleSelect"
    @move-start="handleMoveStart"
    @move="handleMove"
    @move-end="handleMoveEnd"
  />

  <!-- Dice Reverse Goal Bar -->
  <StudioDiceReverseGoalBarElement
    v-else-if="element.type === 'diceReverseGoalBar'"
    :element="element"
    :is-selected="isSelected"
    :render-order="renderOrder"
    @select="handleSelect"
    @move-start="handleMoveStart"
    @move="handleMove"
    @move-end="handleMoveEnd"
  />

  <!-- Dice Reverse Impact HUD -->
  <StudioDiceReverseImpactHudElement
    v-else-if="element.type === 'diceReverseImpactHud'"
    :element="element"
    :is-selected="isSelected"
    :render-order="renderOrder"
    @select="handleSelect"
    @move-start="handleMoveStart"
    @move="handleMove"
    @move-end="handleMoveEnd"
  />

  <!-- Legacy: Dice Reverse combined (backward compatibility) -->
  <StudioDiceReverseElement
    v-else-if="element.type === 'diceReverse'"
    :element="element"
    :is-selected="isSelected"
    :render-order="renderOrder"
    @select="handleSelect"
    @move-start="handleMoveStart"
    @move="handleMove"
    @move-end="handleMoveEnd"
  />

  <!-- Spell Goal Bar -->
  <StudioSpellGoalBarElement
    v-else-if="element.type === 'spellGoalBar'"
    :element="element"
    :is-selected="isSelected"
    :render-order="renderOrder"
    @select="handleSelect"
    @move-start="handleMoveStart"
    @move="handleMove"
    @move-end="handleMoveEnd"
  />

  <!-- Spell Impact HUD -->
  <StudioSpellImpactHudElement
    v-else-if="element.type === 'spellImpactHud'"
    :element="element"
    :is-selected="isSelected"
    :render-order="renderOrder"
    @select="handleSelect"
    @move-start="handleMoveStart"
    @move="handleMove"
    @move-end="handleMoveEnd"
  />

  <!-- Monster Goal Bar -->
  <StudioMonsterGoalBarElement
    v-else-if="element.type === 'monsterGoalBar'"
    :element="element"
    :is-selected="isSelected"
    :render-order="renderOrder"
    @select="handleSelect"
    @move-start="handleMoveStart"
    @move="handleMove"
    @move-end="handleMoveEnd"
  />

  <!-- Monster Impact HUD -->
  <StudioMonsterImpactHudElement
    v-else-if="element.type === 'monsterImpactHud'"
    :element="element"
    :is-selected="isSelected"
    :render-order="renderOrder"
    @select="handleSelect"
    @move-start="handleMoveStart"
    @move="handleMove"
    @move-end="handleMoveEnd"
  />
</template>

<script setup lang="ts">
import type { Object3D } from 'three'
import type { OverlayElement } from '../types'
import StudioPollElement from './StudioPollElement.vue'
import StudioDiceReverseElement from './StudioDiceReverseElement.vue'
import StudioDiceReverseGoalBarElement from './StudioDiceReverseGoalBarElement.vue'
import StudioDiceReverseImpactHudElement from './StudioDiceReverseImpactHudElement.vue'
import StudioSpellGoalBarElement from './StudioSpellGoalBarElement.vue'
import StudioSpellImpactHudElement from './StudioSpellImpactHudElement.vue'
import StudioMonsterGoalBarElement from './StudioMonsterGoalBarElement.vue'
import StudioMonsterImpactHudElement from './StudioMonsterImpactHudElement.vue'
import { StudioDiceElement } from '../dice/components'

defineProps<{
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

// Gestion de la sélection
const handleSelect = (id: string, meshRef: Object3D) => {
  emit('select', id, meshRef)
}

// Propagation du déplacement
const handleMoveStart = () => {
  emit('moveStart')
}

const handleMove = (deltaX: number, deltaY: number) => {
  emit('move', deltaX, deltaY)
}

const handleMoveEnd = () => {
  emit('moveEnd')
}
</script>
