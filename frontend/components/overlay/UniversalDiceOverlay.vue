<script setup lang="ts">
/**
 * Universal Dice Overlay
 * Supports all Foundry VTT game systems with intelligent rendering:
 * - 3D rendering for standard dice (d4, d6, d8, d10, d12, d20, d100)
 * - 2D fallback for exotic dice
 * - Symbol display for narrative dice (Genesys, L5R)
 * - Full modifier support (keep, drop, reroll, explode)
 */

import { computed, watch, type CSSProperties } from 'vue'
import type { DiceRollEvent } from '@/types'
import type { DiceHudConfig, DiceCriticalColors } from '~/overlay-studio/types'
import type { MappedRoll, UniversalRollData } from '~/types/dice'
import { getDiceMapper } from '~/lib/dicebox/DiceMapper'
import { getRollEvaluator } from '~/lib/dicebox/RollEvaluator'

// =============================================================================
// PROPS & EMITS
// =============================================================================

const props = defineProps<{
  diceRoll: DiceRollEvent | null
  visible: boolean
  hudConfig?: DiceHudConfig
  criticalColors?: DiceCriticalColors
  /** Enable 3D dice rendering (requires DiceBox) */
  enable3D?: boolean
  /** Play sound effects */
  enableSound?: boolean
  /** Sound volume (0-100) */
  soundVolume?: number
}>()

const emit = defineEmits<{
  hidden: []
  animationComplete: []
}>()

// =============================================================================
// STATE
// =============================================================================

const diceMapper = getDiceMapper()
const rollEvaluator = getRollEvaluator()
const showFallback = ref(false)
const show3D = ref(false)
const diceBoxReady = ref(false)

// =============================================================================
// COMPUTED
// =============================================================================

/** Convert DiceRollEvent to UniversalRollData */
const universalRollData = computed<UniversalRollData | null>(() => {
  if (!props.diceRoll) return null

  return {
    rollId: props.diceRoll.id,
    characterId: props.diceRoll.characterId,
    characterName: props.diceRoll.characterName,
    systemId: props.diceRoll.systemId || 'generic',
    rollFormula: props.diceRoll.rollFormula,
    result: props.diceRoll.result,
    terms: props.diceRoll.terms || [],
    diceResults: props.diceRoll.diceResults,
    isCritical: props.diceRoll.isCritical,
    criticalType: props.diceRoll.criticalType,
    isHidden: props.diceRoll.isHidden,
    rollType: props.diceRoll.rollType,
    systemData: props.diceRoll.systemData || {},
    skill: props.diceRoll.skill,
    skillRaw: props.diceRoll.skillRaw,
    ability: props.diceRoll.ability,
    abilityRaw: props.diceRoll.abilityRaw,
    modifiers: props.diceRoll.modifiers || undefined,
  }
})

/** Map the roll for rendering */
const mappedRoll = computed<MappedRoll | null>(() => {
  if (!universalRollData.value) return null

  // If we have terms data, use the full mapping
  if (universalRollData.value.terms && universalRollData.value.terms.length > 0) {
    return diceMapper.mapRoll(universalRollData.value)
  }

  // Fallback: create basic mapping from diceResults
  return createBasicMapping(universalRollData.value)
})

/** Get 3D dice notation for DiceBox */
const diceBoxNotation = computed(() => {
  if (!mappedRoll.value || !mappedRoll.value.has3D) return null
  return diceMapper.getDiceBoxNotation(mappedRoll.value)
})

/** Get 2D fallback dice */
const fallbackDice = computed(() => {
  if (!mappedRoll.value) return []
  return diceMapper.get2DFallbackDice(mappedRoll.value)
})

/** Get symbol dice */
const symbolDice = computed(() => {
  if (!mappedRoll.value) return []
  return diceMapper.getSymbolDice(mappedRoll.value)
})

/** Check if we need 2D fallback */
const _needsFallback = computed(() => {
  return fallbackDice.value.length > 0 || !mappedRoll.value?.has3D
})

/** Check if we have symbols to display */
const hasSymbols = computed(() => {
  return symbolDice.value.length > 0 || (mappedRoll.value?.symbols?.length || 0) > 0
})

/** Get symbol set ID from mapped roll */
const symbolSetId = computed(() => {
  if (!symbolDice.value.length) return undefined
  return symbolDice.value[0]?.config.symbolSet
})

/** Get modifier summary */
const modifierSummary = computed(() => {
  if (!mappedRoll.value) return []
  return rollEvaluator.getModifierSummary(mappedRoll.value)
})

/** Critical class for styling */
const criticalClass = computed(() => {
  if (!props.diceRoll?.isCritical) return ''
  return props.diceRoll.criticalType === 'success' ? 'critical-success' : 'critical-failure'
})

/** System display name */
const systemDisplayName = computed(() => {
  if (!universalRollData.value) return ''
  const config = diceMapper.getSystemConfig(universalRollData.value.systemId)
  return config.name
})

/** Is this a pool-based system? */
const isPoolSystem = computed(() => {
  return universalRollData.value?.systemData?.isPool || false
})

/** Pool successes count */
const poolSuccesses = computed(() => {
  return universalRollData.value?.systemData?.poolSuccesses || 0
})

// =============================================================================
// STYLES
// =============================================================================

const containerStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}

  const { container } = props.hudConfig
  const style: CSSProperties = {
    backgroundColor: container.backgroundColor,
    borderColor: container.borderColor,
    borderWidth: `${container.borderWidth}px`,
    borderRadius: `${container.borderRadius}px`,
    paddingTop: `${container.padding.top}px`,
    paddingRight: `${container.padding.right}px`,
    paddingBottom: `${container.padding.bottom}px`,
    paddingLeft: `${container.padding.left}px`,
    minWidth: `${props.hudConfig.minWidth}px`,
    maxWidth: `${props.hudConfig.maxWidth}px`,
  }

  if (container.backdropBlur > 0) {
    style.backdropFilter = `blur(${container.backdropBlur}px)`
  }

  if (container.boxShadow.enabled) {
    style.boxShadow = `${container.boxShadow.offsetX}px ${container.boxShadow.offsetY}px ${container.boxShadow.blur}px ${container.boxShadow.color}`
  }

  return style
})

const criticalGlowStyle = computed<CSSProperties>(() => {
  if (!props.diceRoll?.isCritical) return {}

  const successGlow = props.criticalColors?.criticalSuccessGlow || 'rgba(34, 197, 94, 0.5)'
  const failureGlow = props.criticalColors?.criticalFailureGlow || 'rgba(239, 68, 68, 0.5)'

  const glowColor = props.diceRoll.criticalType === 'success' ? successGlow : failureGlow

  return {
    '--critical-glow-color': glowColor,
  } as CSSProperties
})

// =============================================================================
// METHODS
// =============================================================================

/** Create basic mapping when no terms data available */
function createBasicMapping(rollData: UniversalRollData): MappedRoll {
  // Try to infer dice from formula
  const formulaMatch = rollData.rollFormula.match(/(\d+)d(\d+)/i)
  const diceCount = formulaMatch ? parseInt(formulaMatch[1] || '1') : rollData.diceResults.length
  const faces = formulaMatch ? parseInt(formulaMatch[2] || '20') : 20

  const can3D = diceMapper.canRender3D(faces)

  return {
    original: rollData,
    dice: [
      {
        term: {
          type: 'die',
          faces,
          count: diceCount,
          results: rollData.diceResults.map((value) => ({
            value,
            active: true,
          })),
        },
        config: {
          render: can3D ? '3d' : '2d',
          diceboxType: `d${faces}`,
          soundProfile: 'plastic',
        },
        results: rollData.diceResults.map((value) => ({
          value,
          label: String(value),
          active: true,
          isCritical: faces === 20 && (value === 1 || value === 20),
          criticalType: value === 20 ? 'success' : value === 1 ? 'failure' : undefined,
        })),
        total: rollData.diceResults.reduce((a, b) => a + b, 0),
        activeCount: rollData.diceResults.length,
        droppedCount: 0,
      },
    ],
    operators: [],
    constant: null,
    total: rollData.result,
    has3D: can3D,
    has2D: !can3D,
    hasSymbols: false,
  }
}

function formatRollType(rollType: string): string {
  const types: Record<string, string> = {
    attack: 'Attaque',
    skill: 'Compétence',
    save: 'Sauvegarde',
    damage: 'Dégâts',
    initiative: 'Initiative',
    'death-save': 'Jet de mort',
    'hit-dice': 'Dé de vie',
    ability: 'Caractéristique',
    generic: 'Jet',
  }
  return types[rollType] || rollType
}

function handleTransitionComplete() {
  emit('hidden')
}

function handleFallbackComplete() {
  emit('animationComplete')
}

// =============================================================================
// WATCHERS
// =============================================================================

watch(
  () => props.visible,
  (visible) => {
    if (visible && mappedRoll.value) {
      // Determine rendering mode
      if (props.enable3D && mappedRoll.value.has3D) {
        show3D.value = true
        showFallback.value = mappedRoll.value.has2D || mappedRoll.value.hasSymbols
      } else {
        show3D.value = false
        showFallback.value = true
      }
    } else {
      show3D.value = false
      showFallback.value = false
    }
  }
)
</script>

<template>
  <Transition name="dice-roll" @after-leave="handleTransitionComplete">
    <div
      v-if="visible && diceRoll"
      class="universal-dice-container"
      :class="[
        criticalClass,
        { 'own-character': diceRoll?.isOwnCharacter },
        { 'has-custom-styles': !!hudConfig },
        { 'pool-system': isPoolSystem },
      ]"
      :style="[containerStyle, criticalGlowStyle]"
    >
      <!-- System Badge (for exotic systems) -->
      <div v-if="systemDisplayName && systemDisplayName !== 'Generic System'" class="system-badge">
        {{ systemDisplayName }}
      </div>

      <!-- Critical Badge -->
      <div v-if="diceRoll?.isCritical" class="critical-badge" :class="diceRoll.criticalType">
        <UIcon
          :name="diceRoll.criticalType === 'success' ? 'i-lucide-trophy' : 'i-lucide-skull'"
          class="critical-icon"
        />
        <span class="critical-text">
          {{ diceRoll.criticalType === 'success' ? 'CRITIQUE!' : 'ÉCHEC CRITIQUE!' }}
        </span>
      </div>

      <!-- Roll Content -->
      <div class="roll-content">
        <!-- Formula & Result Header -->
        <div class="roll-header">
          <div class="roll-formula">{{ diceRoll?.rollFormula }}</div>
          <div class="roll-result" :class="criticalClass">
            {{ isPoolSystem ? `${poolSuccesses} succès` : diceRoll?.result }}
          </div>
        </div>

        <!-- 3D Dice Area (placeholder for DiceBox integration) -->
        <div v-if="show3D && diceBoxNotation" class="dice-3d-area">
          <!-- DiceBox component would be rendered here -->
          <DiceBox
            v-if="diceBoxReady"
            :notation="diceBoxNotation"
            :play-sound="enableSound"
            :volume="soundVolume"
          />
        </div>

        <!-- 2D Fallback Rendering -->
        <DiceFallbackRenderer
          v-if="showFallback && fallbackDice.length > 0"
          :dice="fallbackDice"
          :play-sound="enableSound && !show3D"
          :volume="soundVolume"
          @complete="handleFallbackComplete"
        />

        <!-- Symbol Display (for narrative dice) -->
        <DiceSymbolDisplay
          v-if="hasSymbols && mappedRoll?.symbols"
          :symbols="mappedRoll.symbols"
          :symbol-set-id="symbolSetId || 'genesys'"
          :apply-cancellation="true"
          display-mode="expanded"
        />

        <!-- Dice Breakdown (legacy fallback when no terms) -->
        <div
          v-if="!mappedRoll?.dice.length && diceRoll?.diceResults?.length"
          class="dice-breakdown"
        >
          <span
            v-for="(die, index) in diceRoll.diceResults"
            :key="index"
            class="die"
            :class="{
              'critical-success': die === 20,
              'critical-failure': die === 1,
            }"
          >
            {{ die }}
          </span>
        </div>

        <!-- Modifier Summary -->
        <div v-if="modifierSummary.length > 0" class="modifier-summary">
          <span v-for="(mod, index) in modifierSummary" :key="index" class="modifier-badge">
            {{ mod }}
          </span>
        </div>

        <!-- Skill & Ability Info -->
        <div v-if="diceRoll?.skillRaw || diceRoll?.abilityRaw" class="skill-info">
          <span v-if="diceRoll?.skillRaw" class="skill-name">{{ diceRoll.skillRaw }}</span>
          <span v-if="diceRoll?.skillRaw && diceRoll?.abilityRaw" class="skill-separator">•</span>
          <span v-if="diceRoll?.abilityRaw" class="ability-name">({{ diceRoll.abilityRaw }})</span>
        </div>

        <!-- Roll Modifiers -->
        <div v-if="diceRoll?.modifiers?.length" class="modifiers">
          <span
            v-for="(mod, index) in diceRoll.modifiers"
            :key="index"
            class="modifier"
            :class="{
              'modifier-positive': mod.startsWith('+'),
              'modifier-negative': mod.startsWith('-'),
            }"
          >
            {{ mod }}
          </span>
        </div>

        <!-- Roll Type (fallback) -->
        <div v-if="diceRoll?.rollType && !diceRoll?.skillRaw" class="roll-type">
          {{ formatRollType(diceRoll.rollType) }}
        </div>

        <!-- Character Name -->
        <div class="character-info">
          <span class="character-name">{{ diceRoll?.characterName }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.universal-dice-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(35, 35, 55, 0.98));
  border: 2px solid rgba(145, 70, 255, 0.5);
  border-radius: 16px;
  padding: 24px;
  min-width: 320px;
  max-width: 480px;
  backdrop-filter: blur(10px);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(145, 70, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  z-index: 9999;
  border-style: solid;
}

.universal-dice-container.has-custom-styles {
  background: none;
}

/* System Badge - Purple Tumulte style */
.system-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  background: linear-gradient(135deg, #9146ff, #ff6b9d);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(145, 70, 255, 0.4);
}

/* Critical States */
.critical-success:not(.has-custom-styles) {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.3));
  border-color: rgb(34, 197, 94);
  box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);
}

.critical-success {
  animation: pulse-critical 1s ease-in-out infinite;
  --critical-glow-color: rgba(34, 197, 94, 0.5);
}

.critical-failure:not(.has-custom-styles) {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.3));
  border-color: rgb(239, 68, 68);
  box-shadow: 0 0 40px rgba(239, 68, 68, 0.5);
}

.critical-failure {
  animation: pulse-critical 1s ease-in-out infinite;
  --critical-glow-color: rgba(239, 68, 68, 0.5);
}

/* Pool System Styling */
.pool-system .roll-result {
  font-size: 32px;
}

/* Critical Badge */
.critical-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: bounce 0.5s ease-in-out;
  margin-bottom: 12px;
}

.critical-badge.success {
  background: rgba(34, 197, 94, 0.3);
  color: rgb(74, 222, 128);
  border: 1px solid rgba(34, 197, 94, 0.5);
}

.critical-badge.failure {
  background: rgba(239, 68, 68, 0.3);
  color: rgb(252, 165, 165);
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.critical-icon {
  width: 20px;
  height: 20px;
}

/* Roll Content */
.roll-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.roll-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.roll-formula {
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Courier New', monospace;
}

.roll-result {
  font-size: 48px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
  line-height: 1;
}

.roll-result.critical-success {
  color: rgb(74, 222, 128);
  text-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
}

.roll-result.critical-failure {
  color: rgb(252, 165, 165);
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
}

/* 3D Dice Area */
.dice-3d-area {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Dice Breakdown */
.dice-breakdown {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.die {
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(145, 70, 255, 0.3);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Courier New', monospace;
  transition: all 0.2s ease;
}

.die.critical-success {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgb(34, 197, 94);
  color: rgb(74, 222, 128);
}

.die.critical-failure {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgb(239, 68, 68);
  color: rgb(252, 165, 165);
}

/* Modifier Summary - Purple Tumulte style */
.modifier-summary {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.modifier-badge {
  padding: 4px 10px;
  background: rgba(145, 70, 255, 0.2);
  border: 1px solid rgba(145, 70, 255, 0.4);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

/* Skill Info - Purple Tumulte style */
.skill-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(145, 70, 255, 0.15);
  border: 1px solid rgba(145, 70, 255, 0.3);
  border-radius: 8px;
}

.skill-name {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-transform: capitalize;
}

.skill-separator {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.ability-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

/* Modifiers */
.modifiers {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.modifier {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.modifier-positive {
  background: rgba(34, 197, 94, 0.2);
  color: rgb(74, 222, 128);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.modifier-negative {
  background: rgba(239, 68, 68, 0.2);
  color: rgb(252, 165, 165);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Roll Type */
.roll-type {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Character Info */
.character-info {
  text-align: center;
  padding-top: 8px;
  border-top: 1px solid rgba(145, 70, 255, 0.2);
}

.character-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

/* Animations */
@keyframes pulse-critical {
  0%,
  100% {
    box-shadow: 0 0 20px var(--critical-glow-color);
  }
  50% {
    box-shadow: 0 0 40px var(--critical-glow-color);
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* Transitions */
.dice-roll-enter-active {
  animation: dice-roll-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dice-roll-leave-active {
  animation: dice-roll-out 0.3s ease-in;
}

@keyframes dice-roll-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5) rotate(-10deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

@keyframes dice-roll-out {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
}
</style>
