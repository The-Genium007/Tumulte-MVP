<template>
  <div class="preview-controls">
    <!-- Header -->
    <div class="controls-header">
      <h3 class="controls-title">Contrôles</h3>
    </div>

    <!-- Liste des éléments -->
    <div class="controls-section">
      <h4 class="section-title">Éléments</h4>
      <div class="elements-list">
        <div
          v-for="element in elements"
          :key="element.id"
          class="element-item"
          :class="{ selected: selectedElementId === element.id }"
          @click="$emit('selectElement', element.id)"
        >
          <UIcon
            :name="
              selectedElementId === element.id
                ? 'i-heroicons-chevron-down'
                : 'i-heroicons-chevron-right'
            "
            class="element-chevron"
          />
          <span class="element-name">{{ element.name }}</span>
          <UBadge size="xs" color="neutral" variant="subtle">
            {{ element.type }}
          </UBadge>
        </div>
      </div>
    </div>

    <!-- Contrôles pour élément DICE -->
    <template v-if="selectedElement && selectedElement.type === 'dice'">
      <!-- Configuration du lancer -->
      <div class="controls-section">
        <h4 class="section-title">Configuration du lancer</h4>

        <!-- Type de dé -->
        <div class="dice-type-selector">
          <span class="field-label">Type de dé</span>
          <div class="dice-type-buttons">
            <UButton
              v-for="dieType in standardDiceTypes"
              :key="dieType"
              :color="selectedDiceType === dieType ? 'primary' : 'neutral'"
              :variant="selectedDiceType === dieType ? 'solid' : 'soft'"
              size="sm"
              @click="selectedDiceType = dieType"
            >
              {{ dieType }}
            </UButton>
          </div>
        </div>

        <!-- Nombre de dés -->
        <div class="dice-count-selector">
          <span class="field-label">Nombre de dés</span>
          <div class="dice-count-controls">
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              square
              :disabled="diceCount <= 1"
              @click="diceCount = Math.max(1, diceCount - 1)"
            >
              <UIcon name="i-heroicons-minus" />
            </UButton>
            <span class="dice-count-value">{{ diceCount }}</span>
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              square
              :disabled="diceCount >= 10"
              @click="diceCount = Math.min(10, diceCount + 1)"
            >
              <UIcon name="i-heroicons-plus" />
            </UButton>
          </div>
        </div>

        <!-- Résultat attendu -->
        <div class="result-selector">
          <span class="field-label">
            Résultat attendu
            <span class="result-range">({{ resultMin }} - {{ resultMax }})</span>
          </span>
          <div class="result-input-group">
            <UInput
              v-model.number="expectedResult"
              type="number"
              :min="resultMin"
              :max="resultMax"
              size="sm"
              class="result-input"
            />
            <span class="result-formula">{{ diceCount }}{{ selectedDiceType }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="controls-section">
        <h4 class="section-title">Actions</h4>
        <div class="animation-actions">
          <UButton
            block
            color="primary"
            icon="i-lucide-dices"
            :disabled="isPlaying"
            @click="handleRollDice"
          >
            Lancer les dés
          </UButton>
          <UButton
            block
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-path"
            @click="$emit('reset')"
          >
            Reset
          </UButton>
        </div>

        <!-- État actuel -->
        <div class="current-state">
          <span class="state-label">État:</span>
          <UBadge :color="getStateColor(currentState)" variant="subtle" size="sm">
            {{ currentState }}
          </UBadge>
        </div>
      </div>
    </template>

    <!-- Contrôles pour élément POLL -->
    <template v-else-if="selectedElement && selectedElement.type === 'poll'">
      <div class="controls-section">
        <h4 class="section-title">Animations</h4>
        <div class="animation-buttons">
          <UButton
            color="primary"
            variant="soft"
            icon="i-heroicons-play"
            :disabled="isPlaying"
            @click="$emit('playEntry')"
          >
            Entry
          </UButton>
          <UButton
            color="primary"
            variant="soft"
            icon="i-heroicons-arrow-path"
            :disabled="currentState !== 'active'"
            @click="handleLoopToggle"
          >
            {{ isLoopPlaying ? 'Stop Loop' : 'Loop' }}
          </UButton>
          <UButton
            color="primary"
            variant="soft"
            icon="i-heroicons-trophy"
            :disabled="currentState !== 'active' && currentState !== 'result'"
            @click="$emit('playResult')"
          >
            Result
          </UButton>
          <UButton
            color="primary"
            variant="soft"
            icon="i-heroicons-arrow-right-start-on-rectangle"
            :disabled="currentState === 'hidden' || currentState === 'exiting'"
            @click="$emit('playExit')"
          >
            Exit
          </UButton>
        </div>

        <div class="animation-actions">
          <UButton
            block
            color="primary"
            icon="i-heroicons-play-circle"
            :disabled="isPlaying"
            @click="$emit('playFullSequence')"
          >
            Séquence complète
          </UButton>
          <UButton
            block
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-path"
            @click="$emit('reset')"
          >
            Reset
          </UButton>
        </div>

        <!-- État actuel -->
        <div class="current-state">
          <span class="state-label">État:</span>
          <UBadge :color="getStateColor(currentState)" variant="subtle" size="sm">
            {{ currentState }}
          </UBadge>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OverlayElement, DiceType, DiceRollEvent } from '../types'
import type { AnimationState } from '../composables/useAnimationController'

const props = defineProps<{
  elements: OverlayElement[]
  selectedElementId: string | null
  currentState: AnimationState
}>()

const emit = defineEmits<{
  (e: 'selectElement', id: string): void
  (e: 'toggleVisibility', id: string): void
  (e: 'playEntry'): void
  (e: 'playLoop'): void
  (e: 'stopLoop'): void
  (e: 'playResult'): void
  (e: 'playExit'): void
  (e: 'playFullSequence'): void
  (e: 'reset'): void
  (e: 'rollDice', data: DiceRollEvent): void
}>()

// Types de dés disponibles
const standardDiceTypes: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20']

// État pour les contrôles de poll
const isLoopPlaying = ref(false)

// État pour les contrôles de dés
const selectedDiceType = ref<DiceType>('d20')
const diceCount = ref(1)
const expectedResult = ref(10)

// Élément sélectionné
const selectedElement = computed(() => {
  if (!props.selectedElementId) return null
  return props.elements.find((el) => el.id === props.selectedElementId) || null
})

const isPlaying = computed(() => {
  return props.currentState === 'entering' || props.currentState === 'exiting'
})

// Calcul des bornes min/max pour le résultat
const getDiceMaxValue = (diceType: DiceType): number => {
  const match = diceType.match(/d(\d+)/)
  return match ? parseInt(match[1] || '20', 10) : 20
}

const resultMin = computed(() => diceCount.value)
const resultMax = computed(() => diceCount.value * getDiceMaxValue(selectedDiceType.value))

// Réajuster le résultat attendu si hors limites
watch([selectedDiceType, diceCount], () => {
  const min = resultMin.value
  const max = resultMax.value
  if (expectedResult.value < min) {
    expectedResult.value = min
  } else if (expectedResult.value > max) {
    expectedResult.value = max
  }
})

// Distribuer le total sur plusieurs dés
const distributeTotal = (total: number, count: number, maxPerDie: number): number[] => {
  const values: number[] = []
  let remaining = total

  for (let i = 0; i < count; i++) {
    const diceLeft = count - i
    // Minimum requis pour les dés restants (chacun doit avoir au moins 1)
    const minForRest = diceLeft - 1
    // Maximum possible pour les dés restants
    const maxForRest = (diceLeft - 1) * maxPerDie

    // Ce dé doit avoir au moins (remaining - maxForRest) et au plus (remaining - minForRest)
    const minThisDie = Math.max(1, remaining - maxForRest)
    const maxThisDie = Math.min(maxPerDie, remaining - minForRest)

    // Choisir une valeur aléatoire dans l'intervalle
    const value = Math.floor(Math.random() * (maxThisDie - minThisDie + 1)) + minThisDie
    values.push(value)
    remaining -= value
  }

  return values
}

// Lancer les dés
const handleRollDice = () => {
  const maxPerDie = getDiceMaxValue(selectedDiceType.value)
  const diceResults = distributeTotal(expectedResult.value, diceCount.value, maxPerDie)

  // Détection critique
  const isCriticalSuccess = diceResults.every((v) => v === maxPerDie)
  const isCriticalFailure = diceResults.every((v) => v === 1)

  const diceRollEvent: DiceRollEvent = {
    id: `preview-${Date.now()}`,
    characterId: 'preview',
    characterName: 'Preview',
    characterAvatar: null,
    rollFormula: `${diceCount.value}${selectedDiceType.value}`,
    result: expectedResult.value,
    diceResults,
    rollType: 'preview',
    rolledAt: new Date().toISOString(),
    isCritical: isCriticalSuccess || isCriticalFailure,
    criticalType: isCriticalSuccess ? 'success' : isCriticalFailure ? 'failure' : null,
    isHidden: false,
    // Enriched flavor data (preview mode - no real parsing)
    skill: null,
    skillRaw: null,
    ability: null,
    abilityRaw: null,
    modifiers: null,
  }

  emit('rollDice', diceRollEvent)
}

// Toggle loop pour les polls
const handleLoopToggle = () => {
  if (isLoopPlaying.value) {
    emit('stopLoop')
    isLoopPlaying.value = false
  } else {
    emit('playLoop')
    isLoopPlaying.value = true
  }
}

const getStateColor = (
  state: AnimationState
): 'neutral' | 'primary' | 'success' | 'warning' | 'error' => {
  switch (state) {
    case 'hidden':
      return 'neutral'
    case 'entering':
      return 'primary'
    case 'active':
      return 'success'
    case 'result':
      return 'warning'
    case 'exiting':
      return 'error'
    default:
      return 'neutral'
  }
}
</script>

<style scoped>
.preview-controls {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.controls-header {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-neutral-200);
}

.controls-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin: 0;
}

.elements-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.element-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: var(--color-bg-page);
  border: 1px solid var(--color-neutral-200);
  cursor: pointer;
  transition: all 0.15s;
}

.element-item:hover {
  background: var(--color-neutral-100);
  border-color: var(--color-primary-400);
}

.element-item.selected {
  background: var(--color-primary-100);
  border-color: var(--color-primary-400);
}

.element-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.element-chevron {
  color: var(--color-text-muted);
  transition: transform 0.2s;
}

/* Dice controls styles */
.dice-type-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.dice-type-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.dice-type-buttons.exotic {
  padding-top: 0.25rem;
}

.exotic-toggle {
  align-self: flex-start;
  margin-top: 0.25rem;
}

.dice-count-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dice-count-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dice-count-value {
  font-size: 1.25rem;
  font-weight: 600;
  min-width: 2rem;
  text-align: center;
  color: var(--color-text-primary);
}

.result-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-range {
  font-weight: 400;
  color: var(--color-text-muted);
}

.result-input-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.result-input {
  width: 80px;
}

.result-formula {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

/* Poll controls styles */
.animation-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.animation-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.current-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-page);
  border-radius: 8px;
  border: 1px solid var(--color-neutral-200);
}

.state-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
