<script setup lang="ts">
/**
 * Dice Symbol Display
 * Displays narrative dice symbols (Genesys, L5R, etc.) with animations
 */

import type { SymbolResult } from '~/types/dice'
import { SYMBOL_SETS, getDiceMapper } from '~/lib/dicebox/DiceMapper'

// =============================================================================
// PROPS
// =============================================================================

interface Props {
  /** Raw symbol results */
  symbols: SymbolResult[]
  /** Symbol set ID */
  symbolSetId: string
  /** Whether to apply cancellation rules */
  applyCancellation?: boolean
  /** Display mode: 'compact' or 'expanded' */
  displayMode?: 'compact' | 'expanded'
  /** Animation duration in ms */
  animationDuration?: number
}

const props = withDefaults(defineProps<Props>(), {
  applyCancellation: true,
  displayMode: 'expanded',
  animationDuration: 600,
})

// =============================================================================
// STATE
// =============================================================================

const isAnimating = ref(true)
const visibleSymbols = ref<Set<string>>(new Set())

// =============================================================================
// COMPUTED
// =============================================================================

/** Get the symbol set configuration */
const symbolSet = computed(() => {
  return SYMBOL_SETS[props.symbolSetId] || null
})

/** Get processed symbols (with or without cancellation) */
const processedSymbols = computed(() => {
  if (!props.applyCancellation) {
    return props.symbols
  }

  const mapper = getDiceMapper()
  return mapper.calculateNetSymbols(props.symbols, props.symbolSetId)
})

/** Separate positive and negative symbols */
const positiveSymbols = computed(() => {
  return processedSymbols.value.filter((s) => {
    const symbolDef = symbolSet.value?.symbols[s.type]
    return symbolDef?.isPositive !== false
  })
})

const negativeSymbols = computed(() => {
  return processedSymbols.value.filter((s) => {
    const symbolDef = symbolSet.value?.symbols[s.type]
    return symbolDef?.isPositive === false
  })
})

/** Calculate net outcome for display */
const netOutcome = computed(() => {
  // For Genesys-style systems: success - failure
  const successSymbol = processedSymbols.value.find((s) => s.type === 'success')
  const failureSymbol = processedSymbols.value.find((s) => s.type === 'failure')

  const successes = successSymbol?.count || 0
  const failures = failureSymbol?.count || 0

  if (successes > 0) {
    return { type: 'success', count: successes }
  } else if (failures > 0) {
    return { type: 'failure', count: failures }
  }

  return null
})

/** Check for triumph or despair */
const hasTriumph = computed(() => {
  return processedSymbols.value.some((s) => s.type === 'triumph' && s.count > 0)
})

const hasDespair = computed(() => {
  return processedSymbols.value.some((s) => s.type === 'despair' && s.count > 0)
})

// =============================================================================
// METHODS
// =============================================================================

/** Default symbol definition */
const defaultSymbolDef = {
  id: 'unknown',
  name: 'Unknown',
  icon: '?',
  cssClass: '',
  isPositive: true,
}

/** Get symbol definition */
function getSymbolDef(symbolType: string) {
  const symbols = symbolSet.value?.symbols
  if (symbols && symbols[symbolType]) {
    return symbols[symbolType]
  }
  return { ...defaultSymbolDef, id: symbolType, name: symbolType }
}

/** Get CSS classes for a symbol */
function getSymbolClasses(symbol: SymbolResult): string[] {
  const def = getSymbolDef(symbol.type)
  const classes = ['symbol-item', def.cssClass]

  if (def.isPositive) {
    classes.push('positive')
  } else {
    classes.push('negative')
  }

  if (symbol.type === 'triumph' || symbol.type === 'despair') {
    classes.push('special')
  }

  return classes
}

// =============================================================================
// LIFECYCLE
// =============================================================================

onMounted(() => {
  // Animate symbols appearing
  let index = 0
  const allSymbols = processedSymbols.value
  const interval = props.animationDuration / (allSymbols.length + 1)

  const showNext = () => {
    if (index < allSymbols.length) {
      const symbol = allSymbols[index]
      if (symbol) {
        visibleSymbols.value.add(symbol.type)
      }
      index++
      setTimeout(showNext, interval)
    } else {
      setTimeout(() => {
        isAnimating.value = false
      }, 200)
    }
  }

  setTimeout(showNext, 100)
})
</script>

<template>
  <div class="symbol-display" :class="[displayMode]">
    <!-- Compact mode: single line summary -->
    <template v-if="displayMode === 'compact'">
      <div class="compact-summary">
        <template v-for="symbol in processedSymbols" :key="symbol.type">
          <span v-if="symbol.count > 0" :class="getSymbolClasses(symbol)">
            <span class="icon">{{ getSymbolDef(symbol.type).icon }}</span>
            <span v-if="symbol.count > 1" class="count">{{ symbol.count }}</span>
          </span>
        </template>
      </div>
    </template>

    <!-- Expanded mode: detailed display -->
    <template v-else>
      <!-- Net outcome banner -->
      <Transition name="outcome-reveal">
        <div v-if="!isAnimating && netOutcome" class="outcome-banner" :class="netOutcome.type">
          <span class="outcome-text">
            {{ netOutcome.type === 'success' ? 'SUCCESS' : 'FAILURE' }}
          </span>
          <span v-if="netOutcome.count > 1" class="outcome-count"> ×{{ netOutcome.count }} </span>
        </div>
      </Transition>

      <!-- Special symbols (Triumph/Despair) -->
      <div v-if="hasTriumph || hasDespair" class="special-symbols">
        <Transition name="special-pop">
          <div v-if="hasTriumph" class="special-badge triumph">
            <span class="special-icon">⭐</span>
            <span class="special-label">TRIUMPH!</span>
          </div>
        </Transition>
        <Transition name="special-pop">
          <div v-if="hasDespair" class="special-badge despair">
            <span class="special-icon">💀</span>
            <span class="special-label">DESPAIR!</span>
          </div>
        </Transition>
      </div>

      <!-- Symbol groups -->
      <div class="symbol-groups">
        <!-- Positive symbols -->
        <div v-if="positiveSymbols.length > 0" class="symbol-group positive">
          <TransitionGroup name="symbol-appear">
            <div
              v-for="symbol in positiveSymbols"
              v-show="visibleSymbols.has(symbol.type)"
              :key="symbol.type"
              :class="getSymbolClasses(symbol)"
            >
              <span class="symbol-icon">{{ getSymbolDef(symbol.type).icon }}</span>
              <span class="symbol-name">{{ getSymbolDef(symbol.type).name }}</span>
              <span v-if="symbol.count > 1" class="symbol-count">×{{ symbol.count }}</span>
            </div>
          </TransitionGroup>
        </div>

        <!-- Negative symbols -->
        <div v-if="negativeSymbols.length > 0" class="symbol-group negative">
          <TransitionGroup name="symbol-appear">
            <div
              v-for="symbol in negativeSymbols"
              v-show="visibleSymbols.has(symbol.type)"
              :key="symbol.type"
              :class="getSymbolClasses(symbol)"
            >
              <span class="symbol-icon">{{ getSymbolDef(symbol.type).icon }}</span>
              <span class="symbol-name">{{ getSymbolDef(symbol.type).name }}</span>
              <span v-if="symbol.count > 1" class="symbol-count">×{{ symbol.count }}</span>
            </div>
          </TransitionGroup>
        </div>
      </div>

      <!-- Additional effects summary -->
      <Transition name="effects-fade">
        <div v-if="!isAnimating" class="effects-summary">
          <template v-for="symbol in processedSymbols" :key="`effect-${symbol.type}`">
            <span
              v-if="
                symbol.count > 0 &&
                !['success', 'failure', 'triumph', 'despair'].includes(symbol.type)
              "
              class="effect-badge"
              :class="getSymbolDef(symbol.type).isPositive ? 'positive' : 'negative'"
            >
              {{ getSymbolDef(symbol.type).icon }} {{ symbol.count }}
              {{ getSymbolDef(symbol.type).name }}
            </span>
          </template>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.symbol-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

/* Compact Mode */
.compact-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.compact-summary .symbol-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 1rem;
}

.compact-summary .symbol-item.positive {
  background: rgba(72, 187, 120, 0.3);
}

.compact-summary .symbol-item.negative {
  background: rgba(245, 101, 101, 0.3);
}

.compact-summary .count {
  font-size: 0.75rem;
  font-weight: 700;
}

/* Outcome Banner */
.outcome-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.outcome-banner.success {
  background: linear-gradient(135deg, #48bb78 0%, #276749 100%);
  color: white;
  box-shadow: 0 0 30px rgba(72, 187, 120, 0.5);
}

.outcome-banner.failure {
  background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
  color: white;
  box-shadow: 0 0 30px rgba(245, 101, 101, 0.5);
}

.outcome-text {
  font-size: 1.5rem;
}

.outcome-count {
  font-size: 1.25rem;
  opacity: 0.9;
}

/* Special Symbols */
.special-symbols {
  display: flex;
  gap: 1rem;
}

.special-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 700;
  animation: special-glow 2s ease-in-out infinite;
}

.special-badge.triumph {
  background: linear-gradient(135deg, #ecc94b 0%, #d69e2e 100%);
  color: #1a202c;
  box-shadow: 0 0 20px rgba(236, 201, 75, 0.6);
}

.special-badge.despair {
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
  color: #f56565;
  border: 2px solid #f56565;
  box-shadow: 0 0 20px rgba(245, 101, 101, 0.4);
}

.special-icon {
  font-size: 1.5rem;
}

.special-label {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@keyframes special-glow {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2);
  }
}

/* Symbol Groups */
.symbol-groups {
  display: flex;
  gap: 2rem;
}

.symbol-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.symbol-group.positive {
  align-items: flex-start;
}

.symbol-group.negative {
  align-items: flex-end;
}

.symbol-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  border: 2px solid transparent;
}

.symbol-item.positive {
  border-color: rgba(72, 187, 120, 0.5);
}

.symbol-item.negative {
  border-color: rgba(245, 101, 101, 0.5);
}

.symbol-icon {
  font-size: 1.25rem;
}

.symbol-name {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
}

.symbol-count {
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
}

/* Effects Summary */
.effects-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.effect-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.effect-badge.positive {
  background: rgba(66, 153, 225, 0.3);
  color: #90cdf4;
}

.effect-badge.negative {
  background: rgba(159, 122, 234, 0.3);
  color: #d6bcfa;
}

/* Animations */
.outcome-reveal-enter-active {
  animation: outcome-reveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.outcome-reveal-leave-active {
  animation: outcome-reveal 0.3s ease-in reverse;
}

@keyframes outcome-reveal {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.special-pop-enter-active {
  animation: special-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.special-pop-leave-active {
  animation: special-pop 0.2s ease-in reverse;
}

@keyframes special-pop {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-180deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

.symbol-appear-enter-active {
  animation: symbol-slide 0.3s ease-out;
}

.symbol-appear-leave-active {
  animation: symbol-slide 0.2s ease-in reverse;
}

@keyframes symbol-slide {
  0% {
    opacity: 0;
    transform: translateX(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.effects-fade-enter-active {
  transition: opacity 0.3s ease;
}

.effects-fade-leave-active {
  transition: opacity 0.2s ease;
}

.effects-fade-enter-from,
.effects-fade-leave-to {
  opacity: 0;
}
</style>
