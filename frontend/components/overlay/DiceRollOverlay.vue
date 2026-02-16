<template>
  <Transition name="dice-roll" @after-leave="handleTransitionComplete">
    <div
      v-if="shouldShow"
      class="dice-roll-container"
      :class="[
        criticalClass,
        { 'own-character': diceRoll?.isOwnCharacter },
        { 'has-custom-styles': !!hudConfig },
      ]"
      :style="[containerStyle, criticalGlowStyle]"
    >
      <!-- Inner wrapper: separates positioning (container) from animations -->
      <div
        class="dice-roll-inner"
        :class="[
          { 'impact-anticipation': impactPhase === 'anticipation' },
          { 'impact-shake': impactPhase === 'impact' },
          { 'impact-transformed': impactPhase === 'transformed' || impactPhase === 'exiting' },
          { 'impact-exiting': impactPhase === 'exiting' },
        ]"
      >
        <!-- ==================== INCOMING INVERSION HUD ==================== -->
        <!-- Full HUD panel that drops from the top and merges into the dice HUD -->
        <div
          v-if="impactPhase === 'dropping' || impactPhase === 'impact'"
          class="inversion-hud-incoming"
          :class="[
            { 'inversion-dropping': impactPhase === 'dropping' },
            { 'inversion-merging': impactPhase === 'impact' },
          ]"
          :style="{
            '--drop-distance': `${impactConfig?.animations?.dropDistance ?? 200}px`,
            '--drop-duration': `${impactConfig?.animations?.dropDuration ?? 150}ms`,
            backgroundColor: impactConfig?.container?.backgroundColor ?? 'rgba(26, 26, 46, 0.98)',
            borderColor: impactConfig?.container?.borderColor ?? '#9146FF',
            borderWidth: `${impactConfig?.container?.borderWidth ?? 3}px`,
            borderRadius: `${impactConfig?.container?.borderRadius ?? 16}px`,
          }"
        >
          <div class="inversion-hud-glow" />
          <div
            class="inversion-hud-title"
            :style="{
              fontFamily: impactConfig?.typography?.title?.fontFamily ?? 'Inter',
              fontSize: `${impactConfig?.typography?.title?.fontSize ?? 28}px`,
              fontWeight: impactConfig?.typography?.title?.fontWeight ?? 900,
              color: impactConfig?.typography?.title?.color ?? '#9146FF',
            }"
          >
            INVERSION DE DÉ !
          </div>
          <div
            v-if="impactData?.originalValue != null && impactData?.invertedValue != null"
            class="inversion-hud-detail"
            :style="{
              fontFamily:
                impactConfig?.typography?.detail?.fontFamily ??
                `'JetBrains Mono', 'Fira Code', monospace`,
              fontSize: `${impactConfig?.typography?.detail?.fontSize ?? 42}px`,
              fontWeight: impactConfig?.typography?.detail?.fontWeight ?? 800,
              color: impactConfig?.typography?.detail?.color ?? '#ffffff',
            }"
          >
            {{ impactData.originalValue }} → {{ impactData.invertedValue }}
          </div>
        </div>

        <!-- ==================== CRACK OVERLAY (SVG) ==================== -->
        <div v-if="crackActive" class="crack-overlay">
          <svg class="crack-svg" viewBox="0 0 400 300" preserveAspectRatio="none">
            <!-- Main crack from top center -->
            <path
              class="crack-line crack-line-1"
              d="M200,0 L195,40 L205,80 L190,120 L210,160 L195,200"
            />
            <!-- Left branch -->
            <path class="crack-line crack-line-2" d="M120,0 L125,30 L115,70 L130,100 L118,140" />
            <!-- Right branch -->
            <path class="crack-line crack-line-3" d="M280,0 L275,35 L285,75 L270,110 L290,150" />
          </svg>
        </div>

        <!-- ==================== INVERSION LABEL (post-merge) ==================== -->
        <Transition name="inversion-label">
          <div
            v-if="['flip', 'transformed', 'exiting'].includes(impactPhase)"
            class="inversion-label"
          >
            INVERSION DE DÉ !
          </div>
        </Transition>

        <!-- ==================== DICE ROLL CONTENT ==================== -->
        <div class="roll-content">
          <!-- Critical Badge (if critical) -->
          <div
            v-if="diceRoll?.isCritical"
            class="critical-badge"
            :style="
              diceRoll.criticalType === 'success'
                ? criticalSuccessBadgeStyle
                : criticalFailureBadgeStyle
            "
          >
            <UIcon
              :name="diceRoll.criticalType === 'success' ? 'i-lucide-trophy' : 'i-lucide-skull'"
              class="critical-icon"
            />
            <span class="critical-text">
              {{ diceRoll.criticalType === 'success' ? 'CRITIQUE!' : 'ÉCHEC CRITIQUE!' }}
            </span>
          </div>

          <!-- Roll Formula & Result -->
          <div class="roll-info">
            <div class="roll-formula" :style="formulaStyle">{{ diceRoll?.rollFormula }}</div>
            <!-- Result with 3D flip wrapper -->
            <div class="roll-result-wrapper">
              <div
                class="roll-result"
                :class="{ 'result-flipping': impactPhase === 'flip' }"
                :style="resultDynamicStyle"
              >
                {{ displayedResultValue }}
              </div>
            </div>
          </div>

          <!-- Dice Breakdown (if available) -->
          <div
            v-if="diceRoll?.diceResults && diceRoll.diceResults.length > 0"
            class="dice-breakdown"
          >
            <span
              v-for="(die, index) in diceRoll.diceResults"
              :key="index"
              class="die"
              :style="diceBreakdownStyle"
            >
              {{ die }}
            </span>
          </div>

          <!-- Skill & Ability Info (if available from FlavorParser) -->
          <div
            v-if="diceRoll?.skillRaw || diceRoll?.abilityRaw"
            class="skill-info"
            :style="skillInfoContainerStyle"
          >
            <span v-if="diceRoll?.skillRaw" class="skill-name" :style="skillNameStyle">{{
              diceRoll.skillRaw
            }}</span>
            <span v-if="diceRoll?.skillRaw && diceRoll?.abilityRaw" class="skill-separator">•</span>
            <span v-if="diceRoll?.abilityRaw" class="ability-name" :style="abilityNameStyle"
              >({{ diceRoll.abilityRaw }})</span
            >
          </div>

          <!-- Modifiers (if available) -->
          <div v-if="diceRoll?.modifiers && diceRoll.modifiers.length > 0" class="modifiers">
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

          <!-- Roll Type (if available, fallback when no skill/ability) -->
          <div v-if="diceRoll?.rollType && !diceRoll?.skillRaw" class="roll-type">
            {{ formatRollType(diceRoll.rollType) }}
          </div>
        </div>

        <!-- ==================== PARTICLE CONTAINER ==================== -->
        <div ref="particleContainer" class="particle-container" />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type CSSProperties } from 'vue'
import type { DiceRollEvent, ImpactData } from '@/types'
import type {
  DiceHudConfig,
  DiceCriticalColors,
  DiceReverseImpactHudProperties,
} from '~/overlay-studio/types'

type ImpactPhase =
  | 'idle'
  | 'anticipation'
  | 'dropping'
  | 'impact'
  | 'flip'
  | 'transformed'
  | 'exiting'

const props = defineProps<{
  diceRoll: DiceRollEvent | null
  visible: boolean
  hudConfig?: DiceHudConfig
  criticalColors?: DiceCriticalColors
  // Impact props (dice inversion)
  impactData?: ImpactData | null
  impactVisible?: boolean
  impactConfig?: DiceReverseImpactHudProperties
}>()

const emit = defineEmits<{
  hidden: []
  impactHidden: []
}>()

// =============================================
// Impact State Machine
// =============================================
const impactPhase = ref<ImpactPhase>('idle')
const displayedResult = ref<number | null>(null)
const crackActive = ref(false)
const particleContainer = ref<HTMLElement | null>(null)
const impactAudio = ref<HTMLAudioElement | null>(null)

// Track all setTimeout refs for cleanup
const impactTimeouts: ReturnType<typeof setTimeout>[] = []

const addTimeout = (fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
  const id = setTimeout(fn, delay)
  impactTimeouts.push(id)
  return id
}

const clearAllImpactTimers = () => {
  for (const id of impactTimeouts) {
    clearTimeout(id)
  }
  impactTimeouts.length = 0
}

// Component should show if: normal display OR impact re-show
const shouldShow = computed(() => {
  if (props.visible && props.diceRoll) return true
  if (props.impactVisible && props.impactData && props.diceRoll) return true
  return false
})

// Display the inverted result during the flip, otherwise the normal result
const displayedResultValue = computed(() => {
  if (impactPhase.value !== 'idle' && displayedResult.value !== null) {
    return displayedResult.value
  }
  return props.diceRoll?.result
})

// Timing config from Overlay Studio (with defaults)
const dropDuration = computed(() => props.impactConfig?.animations?.dropDuration ?? 150)
const displayDuration = computed(() => props.impactConfig?.animations?.displayDuration ?? 3000)

// Dynamic result style: switches to purple after transformation
const resultDynamicStyle = computed<CSSProperties>(() => {
  if (impactPhase.value === 'transformed' || impactPhase.value === 'exiting') {
    return {
      color: '#c084fc',
      textShadow: '0 0 20px rgba(145, 70, 255, 0.8)',
    }
  }
  // Normal result styling (respecting critical/config)
  if (props.diceRoll?.isCritical) {
    return props.diceRoll.criticalType === 'success'
      ? resultSuccessStyle.value
      : resultFailureStyle.value
  }
  return resultStyle.value
})

// =============================================
// Impact Animation Sequence
// =============================================
const playImpactSound = () => {
  try {
    if (!impactAudio.value) return
    if (props.impactConfig?.audio?.impactSound?.enabled === false) return
    impactAudio.value.volume = props.impactConfig?.audio?.impactSound?.volume ?? 0.6
    impactAudio.value.currentTime = 0
    impactAudio.value.play().catch(() => {})
  } catch {
    // Ignore audio errors (common in OBS browser source)
  }
}

const spawnParticles = () => {
  const container = particleContainer.value
  if (!container) return

  const PARTICLE_COUNT = 14
  const COLORS = ['#9146ff', '#c084fc', '#e9d5ff', '#7c3aed', '#ffffff']

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particle = document.createElement('div')
    const size = 4 + Math.random() * 6
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${COLORS[Math.floor(Math.random() * COLORS.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      top: 0;
      left: 50%;
      pointer-events: none;
    `
    container.appendChild(particle)

    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5
    const distance = 80 + Math.random() * 120
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance

    const animation = particle.animate(
      [
        {
          transform: 'translate(-50%, -50%) scale(1)',
          opacity: '1',
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`,
          opacity: '0',
        },
      ],
      {
        duration: 500 + Math.random() * 300,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards' as const,
      }
    )

    animation.onfinish = () => {
      particle.remove()
    }
  }
}

const startImpactSequence = () => {
  clearAllImpactTimers()

  // Store original result for the flip
  displayedResult.value = props.diceRoll?.result ?? null

  // Phase 1: Anticipation (200ms) — HUD trembles
  impactPhase.value = 'anticipation'

  addTimeout(() => {
    // Phase 2: HUD d'inversion drops from top (configurable duration)
    impactPhase.value = 'dropping'

    addTimeout(() => {
      // Phase 3: Impact (300ms) — shake, cracks, particles, sound
      impactPhase.value = 'impact'
      crackActive.value = true
      playImpactSound()
      spawnParticles()

      addTimeout(() => {
        // Phase 4: Flip (400ms) — result number flips with rotateX
        impactPhase.value = 'flip'

        // Swap the value at the midpoint of the flip (when the number is edge-on)
        addTimeout(() => {
          displayedResult.value = props.impactData?.invertedValue ?? null
        }, 200)

        addTimeout(() => {
          // Phase 5: Transformed — stable display with purple colors
          impactPhase.value = 'transformed'

          addTimeout(() => {
            // Exit
            impactPhase.value = 'exiting'

            addTimeout(() => {
              impactPhase.value = 'idle'
              crackActive.value = false
              displayedResult.value = null
              emit('impactHidden')
            }, 300)
          }, displayDuration.value)
        }, 400)
      }, 300)
    }, dropDuration.value)
  }, 200)
}

// Watch for impact visibility to trigger the sequence
watch(
  () => props.impactVisible,
  (visible) => {
    if (visible && props.impactData) {
      startImpactSequence()
    } else if (!visible && impactPhase.value !== 'idle') {
      clearAllImpactTimers()
      impactPhase.value = 'idle'
      crackActive.value = false
      displayedResult.value = null
    }
  }
)

// =============================================
// Existing Dice Roll Logic (unchanged)
// =============================================
const criticalClass = computed(() => {
  if (!props.diceRoll?.isCritical) return ''
  return props.diceRoll.criticalType === 'success' ? 'critical-success' : 'critical-failure'
})

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

const criticalSuccessBadgeStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  const badge = props.hudConfig.criticalBadge
  return {
    backgroundColor: badge.successBackground,
    color: badge.successTextColor,
    borderColor: badge.successBorderColor,
  }
})

const criticalFailureBadgeStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  const badge = props.hudConfig.criticalBadge
  return {
    backgroundColor: badge.failureBackground,
    color: badge.failureTextColor,
    borderColor: badge.failureBorderColor,
  }
})

const formulaStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  const { typography } = props.hudConfig.formula
  const style: CSSProperties = {
    fontFamily: typography.fontFamily,
    fontSize: `${typography.fontSize}px`,
    fontWeight: typography.fontWeight,
    color: typography.color,
  }
  if (typography.textShadow?.enabled) {
    style.textShadow = `${typography.textShadow.offsetX}px ${typography.textShadow.offsetY}px ${typography.textShadow.blur}px ${typography.textShadow.color}`
  }
  return style
})

const resultStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  const { typography } = props.hudConfig.result
  const style: CSSProperties = {
    fontFamily: typography.fontFamily,
    fontSize: `${typography.fontSize}px`,
    fontWeight: typography.fontWeight,
    color: typography.color,
  }
  if (typography.textShadow?.enabled) {
    style.textShadow = `${typography.textShadow.offsetX}px ${typography.textShadow.offsetY}px ${typography.textShadow.blur}px ${typography.textShadow.color}`
  }
  return style
})

const resultSuccessStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  return {
    ...resultStyle.value,
    color: props.hudConfig.result.criticalSuccessColor,
  }
})

const resultFailureStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  return {
    ...resultStyle.value,
    color: props.hudConfig.result.criticalFailureColor,
  }
})

const diceBreakdownStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  const breakdown = props.hudConfig.diceBreakdown
  const style: CSSProperties = {
    backgroundColor: breakdown.backgroundColor,
    borderColor: breakdown.borderColor,
    borderRadius: `${breakdown.borderRadius}px`,
    fontFamily: breakdown.typography.fontFamily,
    fontSize: `${breakdown.typography.fontSize}px`,
    fontWeight: breakdown.typography.fontWeight,
    color: breakdown.typography.color,
  }
  return style
})

const skillInfoContainerStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  const skillInfo = props.hudConfig.skillInfo
  return {
    backgroundColor: skillInfo.backgroundColor,
    borderColor: skillInfo.borderColor,
    borderRadius: `${skillInfo.borderRadius}px`,
  }
})

const skillNameStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  const { skillTypography } = props.hudConfig.skillInfo
  const style: CSSProperties = {
    fontFamily: skillTypography.fontFamily,
    fontSize: `${skillTypography.fontSize}px`,
    fontWeight: skillTypography.fontWeight,
    color: skillTypography.color,
  }
  return style
})

const abilityNameStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {}
  const { abilityTypography } = props.hudConfig.skillInfo
  const style: CSSProperties = {
    fontFamily: abilityTypography.fontFamily,
    fontSize: `${abilityTypography.fontSize}px`,
    fontWeight: abilityTypography.fontWeight,
    color: abilityTypography.color,
  }
  return style
})

const criticalSuccessGlow = computed(() => {
  return props.criticalColors?.criticalSuccessGlow || 'rgba(34, 197, 94, 0.5)'
})

const criticalFailureGlow = computed(() => {
  return props.criticalColors?.criticalFailureGlow || 'rgba(239, 68, 68, 0.5)'
})

const criticalGlowStyle = computed<CSSProperties>(() => {
  if (!props.diceRoll?.isCritical) return {}

  const glowColor =
    props.diceRoll.criticalType === 'success'
      ? criticalSuccessGlow.value
      : criticalFailureGlow.value

  return {
    '--critical-glow-color': glowColor,
  } as CSSProperties
})

const formatRollType = (rollType: string): string => {
  const types: Record<string, string> = {
    attack: 'Attaque',
    skill: 'Compétence',
    save: 'Sauvegarde',
    damage: 'Dégâts',
    initiative: 'Initiative',
  }
  return types[rollType] || rollType
}

const handleTransitionComplete = () => {
  emit('hidden')
}

// =============================================
// Lifecycle
// =============================================
onMounted(() => {
  impactAudio.value = new Audio('/audio/dice-reverse/impact.wav')
  impactAudio.value.volume = 0.6
})

onUnmounted(() => {
  clearAllImpactTimers()
})
</script>

<style scoped>
.dice-roll-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
}

/* Inner wrapper: carries all visual styles + animations (isolated from positioning) */
.dice-roll-inner {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 16px;
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border-style: solid;
  overflow: visible;
}

/* Custom styles applied via containerStyle override the inner's default background */
.has-custom-styles .dice-roll-inner {
  background: none;
}

/* Critical Success */
.critical-success:not(.has-custom-styles) .dice-roll-inner {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.3));
  border-color: rgb(34, 197, 94);
  box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);
}

.critical-success .dice-roll-inner {
  animation: pulse-critical 1s ease-in-out infinite;
  --critical-glow-color: rgba(34, 197, 94, 0.5);
}

/* Critical Failure */
.critical-failure:not(.has-custom-styles) .dice-roll-inner {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.3));
  border-color: rgb(239, 68, 68);
  box-shadow: 0 0 40px rgba(239, 68, 68, 0.5);
}

.critical-failure .dice-roll-inner {
  animation: pulse-critical 1s ease-in-out infinite;
  --critical-glow-color: rgba(239, 68, 68, 0.5);
}

/* Own Character Highlight */
.own-character .dice-roll-inner {
  border-width: 3px;
  border-color: rgb(59, 130, 246);
}

/* ==========================================
   INCOMING INVERSION HUD (drops from top)
   ========================================== */
.inversion-hud-incoming {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  border-style: solid;
  padding: 16px 28px;
  text-align: center;
  z-index: 20;
  min-width: 280px;
  box-shadow:
    0 15px 50px rgba(0, 0, 0, 0.6),
    0 0 30px rgba(145, 70, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.inversion-hud-glow {
  position: absolute;
  inset: -20px;
  background: linear-gradient(135deg, #9146ff, #ff6b9d);
  border-radius: 30px;
  filter: blur(30px);
  opacity: 0.5;
  z-index: -1;
}

.inversion-hud-title {
  text-shadow:
    0 2px 10px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(145, 70, 255, 0.4);
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.inversion-hud-detail {
  text-shadow: 0 3px 15px rgba(0, 0, 0, 0.5);
  letter-spacing: 4px;
}

/* Phase 2: HUD drops from above */
.inversion-dropping {
  animation: inversion-hud-drop var(--drop-duration, 150ms) cubic-bezier(0.55, 0.055, 0.675, 0.19)
    forwards;
}

@keyframes inversion-hud-drop {
  0% {
    transform: translateX(-50%) translateY(calc(var(--drop-distance, 200px) * -1));
    opacity: 0.6;
    filter: blur(2px);
  }
  70% {
    filter: blur(0px);
  }
  100% {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
    filter: blur(0px);
  }
}

/* Phase 3: HUD merges (absorbs) into the dice HUD */
.inversion-merging {
  animation: inversion-hud-merge 0.3s ease-out forwards;
}

@keyframes inversion-hud-merge {
  0% {
    transform: translateX(-50%) translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateX(-50%) translateY(10px) scale(0.6);
    opacity: 0.7;
  }
  100% {
    transform: translateX(-50%) translateY(15px) scale(0.2);
    opacity: 0;
  }
}

/* ==========================================
   CRACK OVERLAY (SVG fissures)
   ========================================== */
.crack-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  overflow: hidden;
  border-radius: inherit;
}

.crack-svg {
  width: 100%;
  height: 100%;
}

.crack-line {
  fill: none;
  stroke: rgba(145, 70, 255, 0.6);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 300;
  stroke-dashoffset: 300;
  filter: drop-shadow(0 0 4px rgba(145, 70, 255, 0.8));
}

.crack-line-1 {
  animation: crack-draw 0.3s ease-out forwards;
}

.crack-line-2 {
  animation: crack-draw 0.25s ease-out 0.05s forwards;
}

.crack-line-3 {
  animation: crack-draw 0.25s ease-out 0.1s forwards;
}

@keyframes crack-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* ==========================================
   INVERSION LABEL (post-merge badge)
   ========================================== */
.inversion-label {
  text-align: center;
  font-size: 14px;
  font-weight: 800;
  color: #c084fc;
  text-transform: uppercase;
  letter-spacing: 2px;
  padding: 6px 16px;
  background: rgba(145, 70, 255, 0.2);
  border: 1px solid rgba(145, 70, 255, 0.4);
  border-radius: 8px;
  margin-bottom: 4px;
  text-shadow: 0 0 10px rgba(145, 70, 255, 0.5);
}

.inversion-label-enter-active {
  animation: label-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.inversion-label-leave-active {
  animation: label-fade 0.2s ease-in forwards;
}

@keyframes label-pop {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes label-fade {
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* ==========================================
   IMPACT ANIMATION PHASES
   ========================================== */

/* Phase 1: Anticipation — subtle tremble */
.impact-anticipation {
  animation: hud-tremble 0.2s ease-in-out;
}

@keyframes hud-tremble {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  10% {
    transform: translate(1px, -1px) rotate(0.3deg);
  }
  20% {
    transform: translate(-1px, 1px) rotate(-0.3deg);
  }
  30% {
    transform: translate(2px, 0px) rotate(0.2deg);
  }
  40% {
    transform: translate(-1px, -1px) rotate(-0.2deg);
  }
  50% {
    transform: translate(1px, 1px) rotate(0.4deg);
  }
  60% {
    transform: translate(-2px, 0px) rotate(-0.3deg);
  }
  70% {
    transform: translate(0px, 2px) rotate(0.2deg);
  }
  80% {
    transform: translate(1px, -1px) rotate(-0.1deg);
  }
  90% {
    transform: translate(-1px, 0px) rotate(0.1deg);
  }
}

/* Phase 3: Impact — elastic bounce with scale */
.impact-shake {
  animation: impact-shake 0.3s ease-out;
}

@keyframes impact-shake {
  0% {
    transform: scale(1) translate(0, 0);
  }
  15% {
    transform: scale(1.03, 0.97) translate(0, 4px);
  }
  30% {
    transform: scale(0.97, 1.03) translate(-5px, -6px);
  }
  45% {
    transform: scale(1.02, 0.98) translate(4px, 3px);
  }
  60% {
    transform: scale(0.99, 1.01) translate(-3px, -2px);
  }
  75% {
    transform: scale(1.01, 0.99) translate(2px, 1px);
  }
  100% {
    transform: scale(1) translate(0, 0);
  }
}

/* Phase 5: Transformed — purple glow */
.impact-transformed {
  border-color: #9146ff !important;
  box-shadow:
    0 0 30px rgba(145, 70, 255, 0.5),
    0 20px 60px rgba(0, 0, 0, 0.5) !important;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

/* Phase 5: Exit */
.impact-exiting {
  animation: impact-exit 0.3s ease-in forwards;
}

@keyframes impact-exit {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.85);
    opacity: 0;
  }
}

/* ==========================================
   RESULT 3D FLIP (Phase 4)
   ========================================== */
.roll-result-wrapper {
  perspective: 600px;
  display: inline-block;
}

.result-flipping {
  animation: result-flip-3d 0.4s ease-in-out;
}

@keyframes result-flip-3d {
  0% {
    transform: rotateX(0deg);
    opacity: 1;
  }
  45% {
    transform: rotateX(90deg);
    opacity: 0.3;
  }
  55% {
    transform: rotateX(90deg);
    opacity: 0.3;
  }
  100% {
    transform: rotateX(0deg);
    opacity: 1;
  }
}

/* ==========================================
   PARTICLE CONTAINER
   ========================================== */
.particle-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 25;
  overflow: visible;
}

/* ==========================================
   EXISTING STYLES (Roll content, badges, etc.)
   ========================================== */

/* Roll Content */
.roll-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
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
}

.critical-success .critical-badge {
  background: rgba(34, 197, 94, 0.3);
  color: rgb(74, 222, 128);
  border: 1px solid rgba(34, 197, 94, 0.5);
}

.critical-failure .critical-badge {
  background: rgba(239, 68, 68, 0.3);
  color: rgb(252, 165, 165);
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.critical-icon {
  width: 20px;
  height: 20px;
}

/* Roll Info */
.roll-info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.roll-formula {
  font-size: 20px;
  font-weight: 600;
  color: rgb(148, 163, 184);
  font-family: 'Courier New', monospace;
}

.roll-result {
  font-size: 48px;
  font-weight: 800;
  color: rgb(226, 232, 240);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
  line-height: 1;
  transition:
    color 0.3s ease,
    text-shadow 0.3s ease;
}

.critical-success .roll-result {
  color: rgb(74, 222, 128);
  text-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
}

.critical-failure .roll-result {
  color: rgb(252, 165, 165);
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
}

/* Dice Breakdown */
.dice-breakdown {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.die {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 16px;
  font-weight: 600;
  color: rgb(203, 213, 225);
  font-family: 'Courier New', monospace;
}

/* Skill & Ability Info */
.skill-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
}

.skill-name {
  font-size: 16px;
  font-weight: 700;
  color: rgb(147, 197, 253);
  text-transform: capitalize;
}

.skill-separator {
  color: rgba(148, 163, 184, 0.5);
  font-size: 12px;
}

.ability-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(148, 163, 184);
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
  color: rgb(148, 163, 184);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ==========================================
   ANIMATIONS
   ========================================== */
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

/* ==========================================
   ENTER/LEAVE TRANSITIONS
   ========================================== */
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
