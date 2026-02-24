<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

export interface MonsterImpactData {
  instanceId: string
  eventName: string
  actionType: 'monster_buff' | 'monster_debuff'
  success: boolean
  message?: string
  monsterName?: string
  monsterImg?: string
  acBonus?: number
  acPenalty?: number
  tempHp?: number
  maxHpReduction?: number
}

const props = defineProps<{
  data: MonsterImpactData | null
  visible: boolean
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

// Theme color based on action type
const themeColor = computed(() => {
  if (!props.data) return '#10B981'
  switch (props.data.actionType) {
    case 'monster_buff':
      return '#10B981' // green
    case 'monster_debuff':
      return '#EF4444' // red
    default:
      return '#10B981'
  }
})

// Display title
const displayTitle = computed(() => {
  if (!props.data) return ''
  switch (props.data.actionType) {
    case 'monster_buff':
      return '⚔️ MONSTRE RENFORCÉ !'
    case 'monster_debuff':
      return '💀 MONSTRE AFFAIBLI !'
    default:
      return '⚔️ COMBAT INFLUENCÉ !'
  }
})

// Display detail
const displayDetail = computed(() => {
  if (!props.data) return ''
  const monsterName = props.data.monsterName ?? 'Monstre'

  switch (props.data.actionType) {
    case 'monster_buff': {
      const ac = props.data.acBonus ?? 2
      const hp = props.data.tempHp ?? 10
      return `${monsterName} (+${ac} CA, +${hp} PV temp)`
    }
    case 'monster_debuff': {
      const ac = props.data.acPenalty ?? 2
      const hp = props.data.maxHpReduction ?? 10
      return `${monsterName} (-${ac} CA, -${hp} PV max)`
    }
    default:
      return props.data.message || monsterName
  }
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

  setTimeout(() => {
    animationPhase.value = 'impact'
    playImpactSound()

    setTimeout(() => {
      animationPhase.value = 'visible'

      hideTimeout = setTimeout(() => {
        animationPhase.value = 'exiting'

        setTimeout(() => {
          animationPhase.value = 'idle'
          emit('hidden')
        }, 300)
      }, displayDuration.value)
    }, 300)
  }, dropDuration.value)
}

// Watch for visibility changes
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.data) {
      startAnimation()
    } else if (!visible) {
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
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
      }
      startAnimation()
    }
  }
)

onMounted(() => {
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
  <Transition name="monster-impact">
    <div
      v-if="visible && data && animationPhase !== 'idle'"
      class="monster-impact-hud"
      :class="[`phase-${animationPhase}`]"
      :style="{
        '--drop-distance': `${customStyles?.animation?.dropDistance ?? 200}px`,
        '--drop-duration': `${dropDuration}ms`,
        '--theme-color': themeColor,
      }"
    >
      <!-- Glow effect -->
      <div
        class="impact-glow"
        :style="{ background: `radial-gradient(circle, ${themeColor}, transparent)` }"
      />

      <!-- Main container -->
      <div
        class="impact-container"
        :style="{
          backgroundColor: customStyles?.container?.backgroundColor ?? 'rgba(26, 26, 46, 0.98)',
          borderColor: customStyles?.container?.borderColor ?? themeColor,
          borderWidth: `${customStyles?.container?.borderWidth ?? 3}px`,
          borderRadius: `${customStyles?.container?.borderRadius ?? 16}px`,
        }"
      >
        <!-- Monster image (if available) -->
        <img v-if="data.monsterImg" :src="data.monsterImg" class="impact-monster-img" alt="" />

        <!-- Title -->
        <div
          class="impact-title"
          :style="{
            fontFamily: customStyles?.typography?.title?.fontFamily ?? 'Inter',
            fontSize: `${customStyles?.typography?.title?.fontSize ?? 28}px`,
            fontWeight: customStyles?.typography?.title?.fontWeight ?? 900,
            color: customStyles?.typography?.title?.color ?? themeColor,
          }"
        >
          {{ displayTitle }}
        </div>

        <!-- Detail -->
        <div
          v-if="displayDetail"
          class="impact-detail"
          :style="{
            fontFamily:
              customStyles?.typography?.detail?.fontFamily ??
              `'JetBrains Mono', 'Fira Code', monospace`,
            fontSize: `${customStyles?.typography?.detail?.fontSize ?? 24}px`,
            fontWeight: customStyles?.typography?.detail?.fontWeight ?? 800,
            color: customStyles?.typography?.detail?.color ?? '#ffffff',
          }"
        >
          {{ displayDetail }}
        </div>
      </div>

      <!-- Screen shake overlay -->
      <div v-if="animationPhase === 'impact'" class="impact-shake-trigger" />
    </div>
  </Transition>
</template>

<style scoped>
.monster-impact-hud {
  position: relative;
  font-family:
    'Inter', system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
}

.impact-glow {
  position: absolute;
  inset: -30px;
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

.impact-container {
  position: relative;
  border-style: solid;
  padding: 20px 32px;
  text-align: center;
  max-width: 500px;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(35, 35, 55, 0.98));
  box-shadow:
    0 15px 50px rgba(0, 0, 0, 0.6),
    0 0 30px color-mix(in srgb, var(--theme-color, #10b981) 30%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.impact-monster-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 8px;
  object-fit: cover;
}

.impact-title {
  font-size: 28px;
  font-weight: 900;
  text-shadow:
    0 2px 10px rgba(0, 0, 0, 0.5),
    0 0 20px color-mix(in srgb, var(--theme-color, #10b981) 40%, transparent);
  letter-spacing: 1px;
  margin-bottom: 8px;
  white-space: nowrap;
}

.impact-detail {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  font-family:
    'JetBrains Mono', 'Fira Code', monospace, 'Apple Color Emoji', 'Segoe UI Emoji',
    'Noto Color Emoji';
  text-shadow: 0 3px 15px rgba(0, 0, 0, 0.5);
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Animation phases */
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

.phase-visible {
  transform: translateY(0);
  opacity: 1;
}

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
.monster-impact-enter-active {
  animation: slam-drop var(--drop-duration, 150ms) cubic-bezier(0.55, 0.055, 0.675, 0.19);
}

.monster-impact-leave-active {
  animation: slam-exit 0.3s ease-in;
}
</style>
