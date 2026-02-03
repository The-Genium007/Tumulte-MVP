<script setup lang="ts">
/**
 * Dice Fallback Renderer
 * Elegant 2D rendering for exotic dice that can't be displayed in 3D
 * Includes sound effects and animations
 */

import type { MappedDie, MappedDieResult, SymbolResult } from '~/types/dice'
import { SYMBOL_SETS } from '~/lib/dicebox/DiceMapper'

// =============================================================================
// PROPS & EMITS
// =============================================================================

interface Props {
  /** Mapped dice to render */
  dice: MappedDie[]
  /** Symbol results (for narrative dice) */
  symbols?: SymbolResult[]
  /** Symbol set ID for narrative dice */
  symbolSetId?: string
  /** Whether to play sounds */
  playSound?: boolean
  /** Sound volume (0-100) */
  volume?: number
  /** Animation duration in ms */
  animationDuration?: number
  /** Whether to show dropped dice */
  showDropped?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  symbols: undefined,
  symbolSetId: undefined,
  playSound: true,
  volume: 50,
  animationDuration: 800,
  showDropped: true,
})

const emit = defineEmits<{
  /** Emitted when animation completes */
  complete: []
}>()

// =============================================================================
// STATE
// =============================================================================

const isAnimating = ref(true)
const visibleDice = ref<Set<number>>(new Set())
const audioContext = ref<AudioContext | null>(null)

// =============================================================================
// COMPUTED
// =============================================================================

/** Get symbol set for narrative dice */
const symbolSet = computed(() => {
  if (!props.symbolSetId) return null
  return SYMBOL_SETS[props.symbolSetId] || null
})

/** Total value of all active dice */
const totalValue = computed(() => {
  return props.dice.reduce((sum, die) => sum + die.total, 0)
})

/** Check if any die has critical results */
const _hasCritical = computed(() => {
  return props.dice.some((die) => die.results.some((r) => r.active && r.isCritical))
})

/** Get critical type if any */
const criticalType = computed(() => {
  for (const die of props.dice) {
    for (const result of die.results) {
      if (result.active && result.isCritical) {
        return result.criticalType
      }
    }
  }
  return null
})

// =============================================================================
// METHODS
// =============================================================================

/** Play dice rolling sound */
function playRollSound() {
  if (!props.playSound || props.volume === 0) return

  // Use Web Audio API for better control
  if (!audioContext.value) {
    audioContext.value = new AudioContext()
  }

  // Play a simple click sound using oscillator
  const ctx = audioContext.value
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.frequency.value = 800 + Math.random() * 400
  oscillator.type = 'sine'

  const volume = (props.volume / 100) * 0.3
  gainNode.gain.setValueAtTime(volume, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.1)
}

/** Get CSS class for a die result */
function getResultClass(result: MappedDieResult): string {
  const classes = ['die-result']

  if (!result.active) {
    classes.push('dropped')
  } else if (result.isCritical) {
    classes.push(result.criticalType === 'success' ? 'critical-success' : 'critical-failure')
  }

  if (result.styleClass) {
    classes.push(result.styleClass)
  }

  return classes.join(' ')
}

/** Get icon for die type based on faces */
function getDieIcon(faces: number | undefined): string {
  const icons: Record<number, string> = {
    2: '🪙',
    3: '🎲',
    4: '🔺',
    5: '⬠',
    6: '🎲',
    7: '⬡',
    8: '💎',
    10: '🔷',
    12: '⬡',
    14: '🔶',
    16: '⬢',
    20: '🔮',
    100: '💯',
  }

  return icons[faces || 6] || '🎲'
}

/** Get symbol icon from symbol set */
function getSymbolIcon(symbolType: string): string {
  if (symbolSet.value?.symbols[symbolType]) {
    return symbolSet.value.symbols[symbolType].icon
  }
  return '?'
}

/** Get symbol CSS class */
function getSymbolClass(symbolType: string): string {
  if (symbolSet.value?.symbols[symbolType]) {
    return symbolSet.value.symbols[symbolType].cssClass
  }
  return ''
}

/** Check if symbol is positive */
function isPositiveSymbol(symbolType: string): boolean {
  if (symbolSet.value?.symbols[symbolType]) {
    return symbolSet.value.symbols[symbolType].isPositive
  }
  return true
}

// =============================================================================
// LIFECYCLE
// =============================================================================

onMounted(() => {
  // Animate dice appearing one by one
  let index = 0
  const interval = props.animationDuration / (props.dice.length + 1)

  const showNext = () => {
    if (index < props.dice.length) {
      visibleDice.value.add(index)
      playRollSound()
      index++
      setTimeout(showNext, interval)
    } else {
      // Animation complete
      setTimeout(() => {
        isAnimating.value = false
        emit('complete')
      }, 200)
    }
  }

  // Start animation
  setTimeout(showNext, 100)
})

onUnmounted(() => {
  if (audioContext.value) {
    audioContext.value.close()
  }
})
</script>

<template>
  <div class="dice-fallback-container">
    <!-- Regular dice results -->
    <div v-if="dice.length > 0" class="dice-results-grid">
      <TransitionGroup name="dice-roll">
        <div
          v-for="(die, dieIndex) in dice"
          v-show="visibleDice.has(dieIndex)"
          :key="`die-${dieIndex}`"
          class="die-group"
        >
          <!-- Die type indicator -->
          <div class="die-type">
            <span class="die-icon">{{ getDieIcon(die.term.faces) }}</span>
            <span class="die-faces">d{{ die.term.faces }}</span>
          </div>

          <!-- Individual results -->
          <div class="die-results">
            <template v-for="(result, resultIndex) in die.results" :key="`result-${resultIndex}`">
              <span v-if="result.active || showDropped" :class="getResultClass(result)">
                {{ result.label }}
              </span>
            </template>
          </div>

          <!-- Subtotal for this die group -->
          <div v-if="die.activeCount > 1" class="die-subtotal">= {{ die.total }}</div>

          <!-- Dropped indicator -->
          <div v-if="die.droppedCount > 0" class="dropped-indicator">
            <span class="dropped-count">-{{ die.droppedCount }}</span>
            <span class="dropped-label">dropped</span>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Symbol results (for narrative dice) -->
    <div v-if="symbols && symbols.length > 0" class="symbols-container">
      <TransitionGroup name="symbol-pop">
        <div
          v-for="(symbol, index) in symbols"
          :key="`symbol-${symbol.type}`"
          class="symbol-result"
          :class="[getSymbolClass(symbol.type), { positive: isPositiveSymbol(symbol.type) }]"
          :style="{ animationDelay: `${index * 100}ms` }"
        >
          <span class="symbol-icon">{{ getSymbolIcon(symbol.type) }}</span>
          <span v-if="symbol.count > 1" class="symbol-count">×{{ symbol.count }}</span>
        </div>
      </TransitionGroup>
    </div>

    <!-- Total display -->
    <Transition name="total-reveal">
      <div
        v-if="!isAnimating && dice.length > 0"
        class="total-display"
        :class="{
          'critical-success': criticalType === 'success',
          'critical-failure': criticalType === 'failure',
        }"
      >
        <span class="total-label">Total</span>
        <span class="total-value">{{ totalValue }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dice-fallback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

/* Dice Results Grid */
.dice-results-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
}

.die-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 80px;
}

.die-type {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.die-icon {
  font-size: 1rem;
}

.die-faces {
  font-weight: 600;
}

.die-results {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.die-result {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  border-radius: 8px;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.die-result.dropped {
  opacity: 0.4;
  text-decoration: line-through;
  background: linear-gradient(135deg, #718096 0%, #4a5568 100%);
  transform: scale(0.9);
}

.die-result.critical-success {
  background: linear-gradient(135deg, #48bb78 0%, #276749 100%);
  box-shadow:
    0 0 20px rgba(72, 187, 120, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.3);
  animation: pulse-success 1s ease-in-out infinite;
}

.die-result.critical-failure {
  background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
  box-shadow:
    0 0 20px rgba(245, 101, 101, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.3);
  animation: pulse-failure 1s ease-in-out infinite;
}

.die-result.exploded {
  background: linear-gradient(135deg, #ed8936 0%, #c05621 100%);
  box-shadow: 0 0 15px rgba(237, 137, 54, 0.4);
}

.die-subtotal {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.dropped-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
}

.dropped-count {
  color: #f56565;
  font-weight: 600;
}

/* Symbols Container */
.symbols-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.5rem;
}

.symbol-result {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.symbol-result.positive {
  border-color: rgba(72, 187, 120, 0.5);
  background: rgba(72, 187, 120, 0.2);
}

.symbol-result:not(.positive) {
  border-color: rgba(245, 101, 101, 0.5);
  background: rgba(245, 101, 101, 0.2);
}

.symbol-icon {
  font-size: 1.5rem;
}

.symbol-count {
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
}

/* Symbol-specific classes */
.symbol-success {
  --symbol-color: #48bb78;
}

.symbol-failure {
  --symbol-color: #f56565;
}

.symbol-advantage {
  --symbol-color: #4299e1;
}

.symbol-threat {
  --symbol-color: #9f7aea;
}

.symbol-triumph {
  --symbol-color: #ecc94b;
}

.symbol-despair {
  --symbol-color: #1a202c;
}

/* Total Display */
.total-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1.5rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.total-display.critical-success {
  border-color: #48bb78;
  box-shadow: 0 0 30px rgba(72, 187, 120, 0.4);
}

.total-display.critical-failure {
  border-color: #f56565;
  box-shadow: 0 0 30px rgba(245, 101, 101, 0.4);
}

.total-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.6);
}

.total-value {
  font-size: 2rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Animations */
@keyframes pulse-success {
  0%,
  100% {
    box-shadow:
      0 0 20px rgba(72, 187, 120, 0.5),
      0 2px 4px rgba(0, 0, 0, 0.3);
  }
  50% {
    box-shadow:
      0 0 30px rgba(72, 187, 120, 0.8),
      0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

@keyframes pulse-failure {
  0%,
  100% {
    box-shadow:
      0 0 20px rgba(245, 101, 101, 0.5),
      0 2px 4px rgba(0, 0, 0, 0.3);
  }
  50% {
    box-shadow:
      0 0 30px rgba(245, 101, 101, 0.8),
      0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

/* Transition: Dice Roll */
.dice-roll-enter-active {
  animation: dice-roll-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dice-roll-leave-active {
  animation: dice-roll-out 0.3s ease-in;
}

@keyframes dice-roll-in {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-180deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes dice-roll-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.5);
  }
}

/* Transition: Symbol Pop */
.symbol-pop-enter-active {
  animation: symbol-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.symbol-pop-leave-active {
  animation: symbol-pop-out 0.2s ease-in;
}

@keyframes symbol-pop-in {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes symbol-pop-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0);
  }
}

/* Transition: Total Reveal */
.total-reveal-enter-active {
  animation: total-reveal-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.total-reveal-leave-active {
  animation: total-reveal-out 0.3s ease-in;
}

@keyframes total-reveal-in {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes total-reveal-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px) scale(0.8);
  }
}
</style>
