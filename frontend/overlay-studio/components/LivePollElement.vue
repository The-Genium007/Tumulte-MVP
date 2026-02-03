<template>
  <div v-if="state !== 'hidden'" class="live-poll-container" :style="containerStyle">
    <!-- Wrapper pour les animations (séparé du positionnement) -->
    <div
      class="live-poll-animator"
      :class="[`state-${state}`, animationClass, { 'poll-shaking': shouldShake }]"
      :style="[
        innerWrapperStyle,
        { transform: shouldShake ? `translateX(${shakeIntensity}px)` : undefined },
      ]"
    >
      <div class="poll-content" :style="contentStyle">
        <!-- Header avec question et timer badge -->
        <div class="poll-header">
          <div class="poll-question" :style="questionStyle">
            <template v-if="state === 'result'">
              {{
                leaderIndices.length > 1 && gamification?.tieBreaker.showAllWinners
                  ? gamification.tieBreaker.titleText
                  : '🎉 RÉSULTAT 🎉'
              }}
            </template>
            <template v-else>
              {{ pollData?.title || 'Question du sondage' }}
            </template>
          </div>

          <!-- Timer badge (gamification) -->
          <div
            v-if="gamification?.timer.showBadge && state !== 'result'"
            class="timer-badge"
            :class="{ 'timer-urgent': isUrgent }"
            :style="{ '--urgent-color': gamification?.timer.urgentColor }"
          >
            ⏱ {{ formatTime(remainingTime) }}
          </div>
        </div>

        <!-- Time bar gamifiée -->
        <div
          v-if="gamification?.timeBar.enabled && state !== 'result'"
          class="gamified-time-bar"
          :class="{ 'time-bar-urgent': isUrgent }"
        >
          <div class="time-bar-fill" :style="timeBarFillStyle">
            <div v-if="gamification?.timeBar.shimmerEnabled" class="time-bar-shimmer" />
          </div>
          <div
            v-if="gamification?.timeBar.glowEdgeEnabled"
            class="time-bar-glow"
            :style="{ left: `${timePercent}%` }"
          />
        </div>

        <!-- Options -->
        <div class="poll-options" :style="{ gap: `${config.optionSpacing}px` }">
          <div
            v-for="(option, index) in pollData?.options || []"
            :key="index"
            class="poll-option"
            :class="{
              'is-winner': state === 'result' && isWinner(index),
              'is-loser':
                state === 'result' && !isWinner(index) && gamification?.result.loserFadeOut,
              'is-leader': leaderIndices.includes(index) && state !== 'result',
            }"
            :style="getOptionStyle(index)"
          >
            <div class="option-content">
              <span class="option-text" :style="optionTextStyle">
                <span v-if="state === 'result' && isWinner(index)" class="winner-trophy">🏆</span>
                {{ option }}
                <span
                  v-if="
                    leaderIndices.includes(index) &&
                    state !== 'result' &&
                    gamification?.leader.showCrown
                  "
                  class="leader-crown"
                  :class="{ 'crown-pulse': gamification?.leader.pulseAnimation }"
                >
                  👑
                </span>
              </span>
              <span
                class="option-percentage"
                :style="[
                  optionPercentageStyle,
                  state === 'result' && isWinner(index)
                    ? { color: gamification?.result.winnerColor }
                    : {},
                ]"
              >
                {{ percentages[index] || 0 }}%
              </span>
            </div>
            <div class="option-bar-container">
              <div
                class="option-bar"
                :class="{ 'bar-winner': state === 'result' && isWinner(index) }"
                :style="getBarStyle(index)"
              />
            </div>
          </div>
        </div>

        <!-- Barre de progression du temps (legacy, si gamification désactivée) -->
        <div
          v-if="!gamification?.timeBar.enabled"
          class="poll-progress"
          :style="progressContainerStyle"
        >
          <div class="progress-bar" :style="progressBarStyle">
            <div class="progress-fill" :style="progressFillStyle" />
          </div>
          <span v-if="config.progressBar.showTimeText" class="progress-time" :style="timeTextStyle">
            {{ remainingTime }}s
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useWorkerTimer } from '@/composables/useWorkerTimer'
import type { PollProperties, OverlayElement } from '../types'

interface PollData {
  pollInstanceId: string
  title: string
  options: string[]
  endsAt?: string
  totalDuration: number
}

const props = defineProps<{
  element: OverlayElement
  pollData: PollData | null
  percentages: Record<number, number>
  isEnding: boolean
}>()

const emit = defineEmits<{
  stateChange: [state: PollState]
}>()

// Types
type PollState = 'hidden' | 'entering' | 'active' | 'urgent' | 'result' | 'exiting'

// État
const state = ref<PollState>('hidden')
const remainingTime = ref(0)
const shakeIntensity = ref(0)
const previousLeaderIndex = ref<number | null>(null)

// Worker timer pour résister au throttling OBS
const workerTimer = useWorkerTimer()
let currentEndsAt: string | null = null

// Flag pour éviter le double déclenchement (contrôle externe vs watch)
let isExternalControl = false

// Audio
const introAudio = ref<HTMLAudioElement | null>(null)
const loopAudio = ref<HTMLAudioElement | null>(null)
const resultAudio = ref<HTMLAudioElement | null>(null)
const leaderChangeAudio = ref<HTMLAudioElement | null>(null)

// Shake interval
let shakeInterval: ReturnType<typeof setInterval> | null = null

// Gestion sécurisée des timers pour éviter les memory leaks
const activeTimers = new Set<ReturnType<typeof setTimeout>>()

const safeSetTimeout = (callback: () => void, delay: number): ReturnType<typeof setTimeout> => {
  const id = setTimeout(() => {
    callback()
    activeTimers.delete(id)
  }, delay)
  activeTimers.add(id)
  return id
}

const clearAllTimers = () => {
  activeTimers.forEach((id) => clearTimeout(id))
  activeTimers.clear()
}

// Configuration du poll
const config = computed(() => props.element.properties as PollProperties)

// Calcul des rankings avec gestion des ex-aequo
const rankings = computed(() => {
  const percs = Object.values(props.percentages)
  if (percs.length === 0) return {}

  const sorted = percs
    .map((p, i) => ({ percentage: p, index: i }))
    .sort((a, b) => b.percentage - a.percentage)

  const ranks: Record<number, number> = {}
  let currentRank = 1

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    const previous = sorted[i - 1]
    if (current && i > 0 && previous && current.percentage < previous.percentage) {
      currentRank = i + 1
    }
    if (current) {
      ranks[current.index] = currentRank
    }
  }

  return ranks
})

// Vérifier si une option est gagnante (rang 1)
const isWinner = (index: number): boolean => {
  return rankings.value[index] === 1
}

// Gamification computed
const gamification = computed(() => config.value.gamification)

const isUrgent = computed(() => {
  if (!gamification.value) return false
  return remainingTime.value > 0 && remainingTime.value <= gamification.value.timer.urgentThreshold
})

const leaderIndices = computed(() => {
  const maxPercent = Math.max(...Object.values(props.percentages))
  if (maxPercent === 0) return []
  return Object.entries(props.percentages)
    .filter(([, percent]) => percent === maxPercent)
    .map(([index]) => parseInt(index))
})

const shouldShake = computed(() => {
  if (!gamification.value) return false
  return (
    isUrgent.value &&
    gamification.value.timeBar.shakeWhenUrgent &&
    state.value !== 'result' &&
    state.value !== 'hidden'
  )
})

// Shake animation
const updateShake = () => {
  if (!shouldShake.value || !gamification.value) {
    shakeIntensity.value = 0
    return
  }
  const intensity = gamification.value.timeBar.shakeIntensity
  shakeIntensity.value = (Math.random() - 0.5) * 2 * intensity
}

// Play leader change sound
const playLeaderChangeSound = () => {
  if (!gamification.value?.leader.changeSound.enabled || !leaderChangeAudio.value) return
  try {
    leaderChangeAudio.value.currentTime = 0
    leaderChangeAudio.value.play().catch(() => {})
  } catch {
    // Ignore audio errors
  }
}

// Format time as mm:ss
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Time percent for gamified bar
const timePercent = computed(() => {
  const totalDuration = props.pollData?.totalDuration || 60
  if (totalDuration === 0) return 100
  return (remainingTime.value / totalDuration) * 100
})

// Time bar fill style (gamified)
const timeBarFillStyle = computed(() => {
  return {
    width: `${timePercent.value}%`,
  }
})

// Obtenir la couleur de médaille selon le rang
const getMedalColor = (rank: number): string => {
  const colors = config.value.medalColors
  switch (rank) {
    case 1:
      return colors.gold
    case 2:
      return colors.silver
    case 3:
      return colors.bronze
    default:
      return colors.base
  }
}

// Styles calculés
const containerStyle = computed(() => {
  const el = props.element
  // Position en pourcentage du canvas 1920x1080
  const left = ((el.position.x + 960) / 1920) * 100
  const top = ((540 - el.position.y) / 1080) * 100

  return {
    left: `${left}%`,
    top: `${top}%`,
    // Seulement le centrage, pas de transform pour éviter les conflits avec les animations
    transform: `translate(-50%, -50%)`,
  }
})

// Style pour le wrapper interne qui gère rotation et scale via variables CSS
// Cela évite les conflits avec les animations qui utilisent transform
const innerWrapperStyle = computed(() => {
  const el = props.element
  const rotation = -(el.rotation.z * 180) / Math.PI

  return {
    '--poll-rotation': `${rotation}deg`,
    '--poll-scale-x': el.scale.x,
    '--poll-scale-y': el.scale.y,
  } as Record<string, string | number>
})

// Helper to convert borderRadius to CSS string
const getBorderRadiusStyle = (
  br:
    | number
    | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }
    | undefined
): string => {
  if (br === undefined) return '0px'
  if (typeof br === 'number') return `${br}px`
  return `${br.topLeft}px ${br.topRight}px ${br.bottomRight}px ${br.bottomLeft}px`
}

// Content style applies questionBoxStyle to the entire card
const contentStyle = computed(() => {
  const qbs = config.value.questionBoxStyle

  return {
    width: `${config.value.layout.maxWidth}px`,
    // Card background and border from questionBoxStyle
    backgroundColor: qbs?.backgroundColor ?? 'rgba(17, 17, 17, 0.9)',
    borderColor: qbs?.borderColor ?? 'transparent',
    borderWidth: `${qbs?.borderWidth ?? 0}px`,
    borderStyle: (qbs?.borderWidth ?? 0) > 0 ? 'solid' : 'none',
    borderRadius: getBorderRadiusStyle(qbs?.borderRadius ?? 24),
    padding: qbs?.padding
      ? `${qbs.padding.top}px ${qbs.padding.right}px ${qbs.padding.bottom}px ${qbs.padding.left}px`
      : '32px',
  }
})

// Question style is now typography only
const questionStyle = computed(() => {
  const qs = config.value.questionStyle

  return {
    fontFamily: qs.fontFamily,
    fontSize: `${qs.fontSize}px`,
    fontWeight: qs.fontWeight,
    color: qs.color,
    textShadow: qs.textShadow?.enabled
      ? `${qs.textShadow.offsetX}px ${qs.textShadow.offsetY}px ${qs.textShadow.blur}px ${qs.textShadow.color}`
      : 'none',
  }
})

const optionTextStyle = computed(() => {
  const ts = config.value.optionTextStyle
  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight: ts.fontWeight,
    color: ts.color,
  }
})

const optionPercentageStyle = computed(() => {
  const ps = config.value.optionPercentageStyle
  return {
    fontFamily: ps.fontFamily,
    fontSize: `${ps.fontSize}px`,
    fontWeight: ps.fontWeight,
    color: ps.color,
  }
})

const getOptionStyle = (index: number) => {
  const box = config.value.optionBoxStyle
  const rank = rankings.value[index] || 4
  const medalColor = getMedalColor(rank)

  const baseStyle = {
    backgroundColor: box.backgroundColor,
    borderColor: medalColor,
    borderWidth: `${box.borderWidth}px`,
    borderRadius: getBorderRadiusStyle(box.borderRadius),
    borderStyle: 'solid',
    opacity: box.opacity,
    padding: `${box.padding.top}px ${box.padding.right}px ${box.padding.bottom}px ${box.padding.left}px`,
  }

  // Animation de résultat avec gamification
  if (state.value === 'result') {
    const gam = gamification.value
    if (isWinner(index)) {
      const winnerColor = gam?.result.winnerColor || '#FFD700'
      const winnerScale = gam?.result.winnerScale || 1.05
      const winnerGlow = gam?.result.winnerGlow
      const winnerGlowColor = gam?.result.winnerGlowColor || '#FFD700'

      return {
        ...baseStyle,
        borderColor: winnerColor,
        transform: `scale(${winnerScale})`,
        transition: 'transform 0.3s ease-out, border-color 0.3s ease',
        boxShadow: winnerGlow ? `0 0 30px ${winnerGlowColor}` : undefined,
      }
    } else if (gam?.result.loserFadeOut) {
      return {
        ...baseStyle,
        opacity: gam.result.loserFinalOpacity,
        transition: `opacity ${gam.result.loserFadeDuration}ms ease-out`,
      }
    }
  }

  return baseStyle
}

const getBarStyle = (index: number) => {
  const rank = rankings.value[index] || 4
  const medalColor = getMedalColor(rank)
  const percentage = props.percentages[index] || 0

  return {
    width: `${percentage}%`,
    backgroundColor: medalColor,
  }
}

const progressContainerStyle = computed(() => ({
  flexDirection: (config.value.progressBar.position === 'top' ? 'column-reverse' : 'column') as
    | 'column'
    | 'column-reverse',
}))

const progressBarStyle = computed(() => {
  const pb = config.value.progressBar
  return {
    height: `${pb.height}px`,
    backgroundColor: pb.backgroundColor,
    borderRadius: `${pb.borderRadius}px`,
  }
})

const progressFillStyle = computed(() => {
  const pb = config.value.progressBar
  const totalDuration = props.pollData?.totalDuration || 60
  const fillPercent = (remainingTime.value / totalDuration) * 100

  const background = pb.fillGradient?.enabled
    ? `linear-gradient(90deg, ${pb.fillGradient.startColor}, ${pb.fillGradient.endColor})`
    : pb.fillColor

  return {
    width: `${fillPercent}%`,
    background,
    borderRadius: `${pb.borderRadius}px`,
    height: '100%',
  }
})

const timeTextStyle = computed(() => {
  const ts = config.value.progressBar.timeTextStyle
  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight: ts.fontWeight,
    color: ts.color,
  }
})

// Classe d'animation selon l'état et la direction
const animationClass = computed(() => {
  if (state.value === 'entering') {
    const dir = config.value.animations.entry.slideDirection
    return `entering-from-${dir}`
  }
  if (state.value === 'exiting') {
    return 'exiting-fade'
  }
  return ''
})

// Gestion du timer avec Worker (résistant au throttling OBS)
const startTimer = (endsAt: string) => {
  // Arrêter le timer précédent si actif
  workerTimer.stop()
  currentEndsAt = endsAt

  const updateTimer = () => {
    if (!currentEndsAt) return

    const now = Date.now()
    const end = new Date(currentEndsAt).getTime()
    const diff = end - now

    if (diff <= 0) {
      remainingTime.value = 0
      workerTimer.stop()
      currentEndsAt = null
    } else {
      remainingTime.value = Math.floor(diff / 1000)
    }
  }

  // Mise à jour initiale
  updateTimer()

  // Utiliser le worker pour les ticks (résiste au throttling)
  workerTimer.onTick(updateTimer)
  workerTimer.start(1000)
}

const stopTimer = () => {
  workerTimer.stop()
  currentEndsAt = null
}

// Gestion audio
const initAudio = () => {
  const entryAnim = config.value.animations.entry
  const loopAnim = config.value.animations.loop
  const resultAnim = config.value.animations.result

  if (entryAnim.sound.enabled) {
    introAudio.value = new Audio('/audio/poll/intro.wav')
    introAudio.value.volume = entryAnim.sound.volume
  }

  if (loopAnim.music.enabled) {
    loopAudio.value = new Audio('/audio/poll/loop.wav')
    loopAudio.value.volume = loopAnim.music.volume
    loopAudio.value.loop = true
  }

  if (resultAnim.sound.enabled) {
    resultAudio.value = new Audio('/audio/poll/result.wav')
    resultAudio.value.volume = resultAnim.sound.volume
  }

  // Leader change sound (gamification)
  if (gamification.value?.leader.changeSound.enabled) {
    leaderChangeAudio.value = new Audio('/audio/poll/leader-change.wav')
    leaderChangeAudio.value.volume = gamification.value.leader.changeSound.volume
  }
}

const playIntro = async () => {
  if (introAudio.value) {
    try {
      await introAudio.value.play()
    } catch (e) {
      console.warn('Could not play intro audio:', e)
    }
  }
}

const startLoop = async () => {
  if (loopAudio.value) {
    try {
      await loopAudio.value.play()
    } catch (e) {
      console.warn('Could not play loop audio:', e)
    }
  }
}

const stopLoop = () => {
  if (loopAudio.value) {
    loopAudio.value.pause()
    loopAudio.value.currentTime = 0
  }
}

const playResult = async () => {
  if (resultAudio.value) {
    try {
      await resultAudio.value.play()
    } catch (e) {
      console.warn('Could not play result audio:', e)
    }
  }
}

const cleanupAudio = () => {
  stopLoop()
  if (introAudio.value) {
    introAudio.value.pause()
    introAudio.value = null
  }
  if (loopAudio.value) {
    loopAudio.value = null
  }
  if (resultAudio.value) {
    resultAudio.value.pause()
    resultAudio.value = null
  }
  if (leaderChangeAudio.value) {
    leaderChangeAudio.value.pause()
    leaderChangeAudio.value = null
  }
}

// Transition d'état
const transitionTo = (newState: PollState) => {
  state.value = newState
  emit('stateChange', newState)
}

// Démarrer le poll (appelé quand pollData change)
const startPoll = async () => {
  if (!props.pollData) return

  initAudio()

  // 1. Jouer le son d'entrée
  const entryAnim = config.value.animations.entry
  await playIntro()

  // 2. Attendre le soundLeadTime puis démarrer l'animation
  safeSetTimeout(() => {
    transitionTo('entering')

    // 3. Après l'animation d'entrée, passer en état actif
    safeSetTimeout(() => {
      transitionTo('active')
      startLoop()

      if (props.pollData?.endsAt) {
        startTimer(props.pollData.endsAt)
      }
    }, entryAnim.animation.duration * 1000)
  }, entryAnim.soundLeadTime * 1000)
}

// Terminer le poll (appelé quand isEnding devient true)
const endPoll = () => {
  stopLoop()
  playResult()
  transitionTo('result')

  // Après le délai d'affichage des résultats, sortir
  const resultAnim = config.value.animations.result
  safeSetTimeout(() => {
    transitionTo('exiting')

    // Après l'animation de sortie, cacher
    const exitAnim = config.value.animations.exit
    safeSetTimeout(() => {
      transitionTo('hidden')
      cleanupAudio()
    }, exitAnim.animation.duration * 1000)
  }, resultAnim.displayDuration * 1000)
}

// ==========================================
// Méthodes publiques pour contrôle externe (preview sync)
// ==========================================

const publicPlayEntry = async () => {
  // Activer le flag de contrôle externe pour éviter le double déclenchement
  isExternalControl = true

  initAudio()
  await playIntro()

  const entryAnim = config.value.animations.entry
  return new Promise<void>((resolve) => {
    safeSetTimeout(() => {
      transitionTo('entering')
      safeSetTimeout(() => {
        transitionTo('active')
        resolve()
      }, entryAnim.animation.duration * 1000)
    }, entryAnim.soundLeadTime * 1000)
  })
}

const publicPlayLoop = () => {
  startLoop()
}

const publicStopLoop = () => {
  stopLoop()
}

const publicPlayResult = async () => {
  stopLoop()
  await playResult()
  transitionTo('result')
}

const publicPlayExit = async () => {
  const exitAnim = config.value.animations.exit
  transitionTo('exiting')

  return new Promise<void>((resolve) => {
    safeSetTimeout(() => {
      transitionTo('hidden')
      cleanupAudio()
      resolve()
    }, exitAnim.animation.duration * 1000)
  })
}

const publicReset = () => {
  stopTimer()
  cleanupAudio()
  transitionTo('hidden')
  // Réinitialiser le flag de contrôle externe
  isExternalControl = false
}

const publicPlayFullSequence = async (duration: number) => {
  await publicPlayEntry()
  publicPlayLoop()

  // Attendre la durée spécifiée
  await new Promise<void>((resolve) => safeSetTimeout(resolve, duration * 1000))

  publicStopLoop()
  await publicPlayResult()

  // Attendre l'affichage des résultats
  const resultAnim = config.value.animations.result
  await new Promise<void>((resolve) => safeSetTimeout(resolve, resultAnim.displayDuration * 1000))

  await publicPlayExit()
}

// Exposer les méthodes pour le contrôle externe
defineExpose({
  playEntry: publicPlayEntry,
  playLoop: publicPlayLoop,
  stopLoop: publicStopLoop,
  playResult: publicPlayResult,
  playExit: publicPlayExit,
  reset: publicReset,
  playFullSequence: publicPlayFullSequence,
  state,
})

// Watcher pour démarrer/terminer le poll
watch(
  () => props.pollData,
  (newData, oldData) => {
    // Ignorer si le contrôle externe est actif (évite le double déclenchement)
    if (isExternalControl) {
      return
    }

    // Nouveau poll (premier ou remplacement d'un ancien avec ID différent)
    if (newData && (!oldData || newData.pollInstanceId !== oldData.pollInstanceId)) {
      // Si ancien poll encore visible, reset d'abord
      if (oldData && state.value !== 'hidden') {
        transitionTo('hidden')
        cleanupAudio()
        // Petit délai pour permettre le reset avant de démarrer le nouveau
        safeSetTimeout(() => startPoll(), 100)
      } else {
        startPoll()
      }
    } else if (!newData && oldData) {
      // Poll terminé sans données (cleanup forcé)
      transitionTo('hidden')
      cleanupAudio()
    }
  },
  { immediate: true }
)

watch(
  () => props.isEnding,
  (ending) => {
    if (ending && (state.value === 'active' || state.value === 'urgent')) {
      endPoll()
    }
  }
)

// Watch for leader changes (gamification)
watch(
  leaderIndices,
  (newLeaders) => {
    if (state.value === 'result' || state.value === 'hidden') return
    if (newLeaders.length === 0) return

    const newLeader = newLeaders[0]
    if (previousLeaderIndex.value !== null && previousLeaderIndex.value !== newLeader) {
      playLeaderChangeSound()
    }
    previousLeaderIndex.value = newLeader ?? null
  },
  { deep: true }
)

// Watch for urgent state (gamification)
watch(isUrgent, (urgent) => {
  if (urgent && state.value === 'active') {
    transitionTo('urgent')
  }
})

// Cleanup
onMounted(() => {
  if (props.pollData) {
    startPoll()
  }
  // Start shake interval
  shakeInterval = setInterval(updateShake, 50)
})

onUnmounted(() => {
  clearAllTimers()
  stopTimer()
  cleanupAudio()
  if (shakeInterval) {
    clearInterval(shakeInterval)
    shakeInterval = null
  }
})
</script>

<style scoped>
.live-poll-container {
  position: absolute;
  transform-origin: center center;
  pointer-events: none;
}

.live-poll-animator {
  /* Variables CSS par défaut */
  --poll-rotation: 0deg;
  --poll-scale-x: 1;
  --poll-scale-y: 1;

  /* Optimisations GPU pour animations fluides */
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-origin: center center;
}

/* État par défaut (actif) - applique rotation et scale */
.live-poll-animator.state-active {
  transform: rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
}

/* État résultat - applique rotation et scale */
.live-poll-animator.state-result {
  transform: rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
}

.poll-content {
  /* background, border-radius, padding sont maintenant gérés par contentStyle via inline styles */
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 60px var(--color-overlay-shadow-brand);
}

.poll-question {
  text-align: center;
  margin-bottom: 24px;
}

.poll-options {
  display: flex;
  flex-direction: column;
}

.poll-option {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
  will-change: transform, opacity;
}

.poll-option.is-winner {
  z-index: 1;
}

.option-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.option-bar-container {
  height: 6px;
  background: var(--color-overlay-highlight);
  border-radius: 3px;
  overflow: hidden;
}

.option-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;
}

.poll-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.progress-bar {
  flex: 1;
  overflow: hidden;
}

.progress-fill {
  transition: width 1s linear;
  will-change: width;
}

.progress-time {
  min-width: 50px;
  text-align: right;
}

/* Animations d'entrée */
.state-entering {
  animation-fill-mode: forwards;
}

.entering-from-up {
  animation: slideInFromUp 0.5s ease-out forwards;
}

.entering-from-down {
  animation: slideInFromDown 0.5s ease-out forwards;
}

.entering-from-left {
  animation: slideInFromLeft 0.5s ease-out forwards;
}

.entering-from-right {
  animation: slideInFromRight 0.5s ease-out forwards;
}

@keyframes slideInFromUp {
  from {
    opacity: 0;
    transform: translate3d(0, -50px, 0) rotate(var(--poll-rotation))
      scale(var(--poll-scale-x), var(--poll-scale-y));
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(var(--poll-rotation))
      scale(var(--poll-scale-x), var(--poll-scale-y));
  }
}

@keyframes slideInFromDown {
  from {
    opacity: 0;
    transform: translate3d(0, 50px, 0) rotate(var(--poll-rotation))
      scale(var(--poll-scale-x), var(--poll-scale-y));
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(var(--poll-rotation))
      scale(var(--poll-scale-x), var(--poll-scale-y));
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translate3d(-50px, 0, 0) rotate(var(--poll-rotation))
      scale(var(--poll-scale-x), var(--poll-scale-y));
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(var(--poll-rotation))
      scale(var(--poll-scale-x), var(--poll-scale-y));
  }
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translate3d(50px, 0, 0) rotate(var(--poll-rotation))
      scale(var(--poll-scale-x), var(--poll-scale-y));
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(var(--poll-rotation))
      scale(var(--poll-scale-x), var(--poll-scale-y));
  }
}

/* Animation de sortie */
.exiting-fade {
  animation: fadeOut 0.5s ease-in forwards;
}

@keyframes fadeOut {
  from {
    opacity: 1;
    transform: rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
  }
  to {
    opacity: 0;
    transform: rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
  }
}

/* ========== Gamification Styles ========== */

.poll-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

/* Timer badge */
.timer-badge {
  background: rgba(147, 51, 234, 0.3);
  border: 2px solid rgba(147, 51, 234, 0.5);
  color: #fff;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 80px;
  text-align: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.timer-urgent {
  background: rgba(239, 68, 68, 0.3);
  border-color: var(--urgent-color, #ef4444);
  color: var(--urgent-color, #ef4444);
  animation: timer-pulse 0.5s ease-in-out infinite;
}

@keyframes timer-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* Gamified time bar */
.gamified-time-bar {
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-bottom: 20px;
  overflow: hidden;
}

.time-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #9333ea, #ec4899);
  border-radius: 4px;
  transition: width 0.3s ease-out;
  position: relative;
  overflow: hidden;
}

.time-bar-urgent .time-bar-fill {
  background: linear-gradient(90deg, #ef4444, #f97316);
}

.time-bar-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s linear infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.time-bar-glow {
  position: absolute;
  top: 50%;
  width: 20px;
  height: 30px;
  background: #fff;
  filter: blur(12px);
  transform: translate(-50%, -50%);
  transition: left 0.3s ease-out;
  opacity: 0.6;
  pointer-events: none;
}

/* Shake animation */
.poll-shaking {
  transition: transform 0.05s linear;
}

/* Leader crown */
.leader-crown {
  font-size: 16px;
  display: inline-block;
  margin-left: 6px;
}

.crown-pulse {
  animation: crown-pulse 1s ease-in-out infinite;
}

@keyframes crown-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

/* Winner trophy */
.winner-trophy {
  font-size: 20px;
  margin-right: 8px;
  animation: trophy-bounce 0.5s ease-out;
}

@keyframes trophy-bounce {
  0% {
    transform: scale(0) rotate(-20deg);
  }
  50% {
    transform: scale(1.3) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

/* Winner/Loser styles */
.poll-option.is-leader {
  transform: scale(1.02);
}

.poll-option.is-winner {
  z-index: 1;
}

.poll-option.is-loser {
  opacity: 0;
  transform: scale(0.95);
  transition: all 0.3s ease;
  pointer-events: none;
}

.option-bar.bar-winner {
  background: linear-gradient(90deg, #ffd700, #f59e0b) !important;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

/* État urgent */
.state-urgent {
  transform: rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
}
</style>
