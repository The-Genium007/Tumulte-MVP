<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { ImpactData } from '@/types'

// Re-export for backward compatibility
export type { ImpactData }

const props = defineProps<{
  data: ImpactData | null
  visible: boolean
  // Customization props (from Overlay Studio)
  customStyles?: {
    container?: {
      backgroundColor?: string
      borderColor?: string
      borderWidth?: number
      borderRadius?: number
    }
    animation?: {
      dropDistance?: number
      dropDuration?: number
      displayDuration?: number
    }
    typography?: {
      title?: {
        fontFamily?: string
        fontSize?: number
        fontWeight?: number
        color?: string
      }
      detail?: {
        fontFamily?: string
        fontSize?: number
        fontWeight?: number
        color?: string
      }
    }
  }
}>()

const emit = defineEmits<{
  hidden: []
}>()

// Animation states
const animationPhase = ref<'idle' | 'dropping' | 'impact' | 'visible' | 'exiting'>('idle')
const impactAudio = ref<HTMLAudioElement | null>(null)

// Timing refs
let hideTimeout: ReturnType<typeof setTimeout> | null = null

// Computed display text
const displayTitle = computed(() => {
  if (!props.data) return ''
  switch (props.data.actionType) {
    case 'dice_invert':
      return '🎲 INVERSION DE DÉ !'
    case 'chat_message':
      return '💬 MESSAGE ENVOYÉ !'
    case 'stat_modify':
      return '📊 STATS MODIFIÉES !'
    default:
      return '✨ ACTION EXÉCUTÉE !'
  }
})

const displayDetail = computed(() => {
  if (!props.data) return ''
  if (
    props.data.actionType === 'dice_invert' &&
    props.data.originalValue &&
    props.data.invertedValue
  ) {
    return `${props.data.originalValue} → ${props.data.invertedValue}`
  }
  return props.data.message || ''
})

// Animation timing
const dropDuration = computed(() => props.customStyles?.animation?.dropDuration ?? 150)
const displayDuration = computed(() => props.customStyles?.animation?.displayDuration ?? 3000)

// Play impact sound
const playImpactSound = () => {
  try {
    if (impactAudio.value) {
      impactAudio.value.currentTime = 0
      impactAudio.value.play().catch(() => {})
    }
  } catch {
    // Ignore audio errors
  }
}

// Start animation sequence
const startAnimation = () => {
  animationPhase.value = 'dropping'

  // After drop, show impact
  setTimeout(() => {
    animationPhase.value = 'impact'
    playImpactSound()

    // After impact effect, show visible state
    setTimeout(() => {
      animationPhase.value = 'visible'

      // Schedule exit
      hideTimeout = setTimeout(() => {
        animationPhase.value = 'exiting'

        // After exit animation, hide
        setTimeout(() => {
          animationPhase.value = 'idle'
          emit('hidden')
        }, 300)
      }, displayDuration.value)
    }, 300) // Impact + shake duration
  }, dropDuration.value)
}

// Watch for visibility changes
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.data) {
      startAnimation()
    } else if (!visible) {
      // Cancel any pending timeouts
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
      }
      animationPhase.value = 'idle'
    }
  }
)

// Watch for new data while visible
watch(
  () => props.data,
  (newData) => {
    if (newData && props.visible) {
      // Cancel existing animation and restart
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
      }
      startAnimation()
    }
  }
)

onMounted(() => {
  // Initialize audio
  impactAudio.value = new Audio('/audio/dice-reverse/impact.wav')
  impactAudio.value.volume = 0.6
})

onUnmounted(() => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
})
</script>

<template>
  <Transition name="impact-hud">
    <div
      v-if="visible && data && animationPhase !== 'idle'"
      class="dice-reverse-impact-hud"
      :class="[`phase-${animationPhase}`]"
      :style="{
        '--drop-distance': `${customStyles?.animation?.dropDistance ?? 200}px`,
        '--drop-duration': `${dropDuration}ms`,
      }"
    >
      <!-- Glow effect -->
      <div class="impact-glow" />

      <!-- Main container -->
      <div
        class="impact-container"
        :style="{
          backgroundColor: customStyles?.container?.backgroundColor ?? 'rgba(26, 26, 46, 0.98)',
          borderColor: customStyles?.container?.borderColor ?? '#9146FF',
          borderWidth: `${customStyles?.container?.borderWidth ?? 3}px`,
          borderRadius: `${customStyles?.container?.borderRadius ?? 16}px`,
        }"
      >
        <!-- Title -->
        <div
          class="impact-title"
          :style="{
            fontFamily: customStyles?.typography?.title?.fontFamily ?? 'Inter',
            fontSize: `${customStyles?.typography?.title?.fontSize ?? 28}px`,
            fontWeight: customStyles?.typography?.title?.fontWeight ?? 900,
            color: customStyles?.typography?.title?.color ?? '#9146FF',
          }"
        >
          {{ displayTitle }}
        </div>

        <!-- Detail (e.g., "20 → 1") -->
        <div
          v-if="displayDetail"
          class="impact-detail"
          :style="{
            fontFamily:
              customStyles?.typography?.detail?.fontFamily ??
              `'JetBrains Mono', 'Fira Code', monospace`,
            fontSize: `${customStyles?.typography?.detail?.fontSize ?? 42}px`,
            fontWeight: customStyles?.typography?.detail?.fontWeight ?? 800,
            color: customStyles?.typography?.detail?.color ?? '#ffffff',
          }"
        >
          {{ displayDetail }}
        </div>
      </div>

      <!-- Screen shake overlay (invisible but causes shake effect) -->
      <div v-if="animationPhase === 'impact'" class="impact-shake-trigger" />
    </div>
  </Transition>
</template>

<style scoped>
.dice-reverse-impact-hud {
  position: relative;
  font-family:
    'Inter', system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
}

/* Glow effect - Purple gradient matching Goal Bar */
.impact-glow {
  position: absolute;
  inset: -30px;
  background: linear-gradient(135deg, #9146ff, #ff6b9d);
  border-radius: 40px;
  filter: blur(40px);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.phase-impact .impact-glow,
.phase-visible .impact-glow {
  opacity: 0.4;
}

.phase-impact .impact-glow {
  animation: glow-flash 0.3s ease-out;
}

@keyframes glow-flash {
  0% {
    opacity: 0.7;
    transform: scale(1.2);
  }
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
}

/* Main container - Glass effect matching Goal Bar */
.impact-container {
  position: relative;
  border-style: solid;
  padding: 20px 32px;
  text-align: center;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(35, 35, 55, 0.98));
  box-shadow:
    0 15px 50px rgba(0, 0, 0, 0.6),
    0 0 30px rgba(145, 70, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.impact-title {
  font-size: 28px;
  font-weight: 900;
  color: #9146ff;
  text-shadow:
    0 2px 10px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(145, 70, 255, 0.4);
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.impact-detail {
  font-size: 42px;
  font-weight: 800;
  color: #fff;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  text-shadow: 0 3px 15px rgba(0, 0, 0, 0.5);
  letter-spacing: 4px;
}

/* Animation phases */

/* Dropping phase - comes from top */
.phase-dropping {
  animation: slam-drop var(--drop-duration) cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
}

@keyframes slam-drop {
  from {
    transform: translateY(calc(var(--drop-distance) * -1));
    opacity: 0.5;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Impact phase - bounce and shake */
.phase-impact {
  animation: slam-impact 0.3s ease-out forwards;
}

@keyframes slam-impact {
  0% {
    transform: translateY(0) scale(1);
  }
  20% {
    transform: translateY(5px) scale(1.02, 0.98);
  }
  40% {
    transform: translateY(-8px) scale(0.98, 1.02);
  }
  60% {
    transform: translateY(3px) scale(1.01, 0.99);
  }
  80% {
    transform: translateY(-2px) scale(0.99, 1.01);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

.phase-impact .impact-container {
  animation: container-shake 0.1s linear 3;
}

@keyframes container-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

/* Visible phase - stable */
.phase-visible {
  transform: translateY(0);
  opacity: 1;
}

/* Exiting phase */
.phase-exiting {
  animation: slam-exit 0.3s ease-in forwards;
}

@keyframes slam-exit {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-20px);
    opacity: 0;
  }
}

/* Screen shake trigger effect (applied to parent if needed) */
.impact-shake-trigger {
  position: fixed;
  inset: 0;
  pointer-events: none;
  animation: screen-shake 0.15s linear;
}

@keyframes screen-shake {
  0%,
  100% {
    transform: translate(0, 0);
  }
  20% {
    transform: translate(-3px, 2px);
  }
  40% {
    transform: translate(3px, -2px);
  }
  60% {
    transform: translate(-2px, -1px);
  }
  80% {
    transform: translate(2px, 1px);
  }
}

/* Vue transition (fallback) */
.impact-hud-enter-active {
  animation: slam-drop var(--drop-duration, 150ms) cubic-bezier(0.55, 0.055, 0.675, 0.19);
}

.impact-hud-leave-active {
  animation: slam-exit 0.3s ease-in;
}
</style>
