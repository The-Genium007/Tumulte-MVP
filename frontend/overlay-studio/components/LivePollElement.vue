<template>
  <div
    v-if="state !== 'hidden'"
    class="live-poll-container"
    :style="containerStyle"
  >
    <!-- Wrapper pour les animations (séparé du positionnement) -->
    <div
      class="live-poll-animator"
      :class="[`state-${state}`, animationClass]"
      :style="innerWrapperStyle"
    >
      <div class="poll-content" :style="contentStyle">
      <!-- Question -->
      <div class="poll-question" :style="questionStyle">
        {{ pollData?.title || 'Question du sondage' }}
      </div>

      <!-- Options -->
      <div class="poll-options" :style="{ gap: `${config.optionSpacing}px` }">
        <div
          v-for="(option, index) in pollData?.options || []"
          :key="index"
          class="poll-option"
          :class="{ 'is-winner': state === 'result' && isWinner(index), 'is-loser': state === 'result' && !isWinner(index) }"
          :style="getOptionStyle(index)"
        >
          <div class="option-content">
            <span class="option-text" :style="optionTextStyle">
              {{ option }}
            </span>
            <span class="option-percentage" :style="optionPercentageStyle">
              {{ percentages[index] || 0 }}%
            </span>
          </div>
          <div class="option-bar-container">
            <div class="option-bar" :style="getBarStyle(index)" />
          </div>
        </div>
      </div>

      <!-- Barre de progression du temps -->
      <div class="poll-progress" :style="progressContainerStyle">
        <div class="progress-bar" :style="progressBarStyle">
          <div class="progress-fill" :style="progressFillStyle" />
        </div>
        <span
          v-if="config.progressBar.showTimeText"
          class="progress-time"
          :style="timeTextStyle"
        >
          {{ remainingTime }}s
        </span>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useWorkerTimer } from "@/composables/useWorkerTimer";
import type { PollProperties, OverlayElement } from "../types";

interface PollData {
  pollInstanceId: string;
  title: string;
  options: string[];
  endsAt?: string;
  totalDuration: number;
}

const props = defineProps<{
  element: OverlayElement;
  pollData: PollData | null;
  percentages: Record<number, number>;
  isEnding: boolean;
}>();

const emit = defineEmits<{
  stateChange: [state: PollState];
}>();

// Types
type PollState = "hidden" | "entering" | "active" | "result" | "exiting";

// État
const state = ref<PollState>("hidden");
const remainingTime = ref(0);

// Worker timer pour résister au throttling OBS
const workerTimer = useWorkerTimer();
let currentEndsAt: string | null = null;

// Flag pour éviter le double déclenchement (contrôle externe vs watch)
let isExternalControl = false;

// Audio
const introAudio = ref<HTMLAudioElement | null>(null);
const loopAudio = ref<HTMLAudioElement | null>(null);
const resultAudio = ref<HTMLAudioElement | null>(null);

// Configuration du poll
const config = computed(() => props.element.properties as PollProperties);

// Calcul des rankings avec gestion des ex-aequo
const rankings = computed(() => {
  const percs = Object.values(props.percentages);
  if (percs.length === 0) return {};

  const sorted = percs
    .map((p, i) => ({ percentage: p, index: i }))
    .sort((a, b) => b.percentage - a.percentage);

  const ranks: Record<number, number> = {};
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].percentage < sorted[i - 1].percentage) {
      currentRank = i + 1;
    }
    ranks[sorted[i].index] = currentRank;
  }

  return ranks;
});

// Vérifier si une option est gagnante (rang 1)
const isWinner = (index: number): boolean => {
  return rankings.value[index] === 1;
};

// Obtenir la couleur de médaille selon le rang
const getMedalColor = (rank: number): string => {
  const colors = config.value.medalColors;
  switch (rank) {
    case 1:
      return colors.gold;
    case 2:
      return colors.silver;
    case 3:
      return colors.bronze;
    default:
      return colors.base;
  }
};

// Styles calculés
const containerStyle = computed(() => {
  const el = props.element;
  // Position en pourcentage du canvas 1920x1080
  const left = ((el.position.x + 960) / 1920) * 100;
  const top = ((540 - el.position.y) / 1080) * 100;

  return {
    left: `${left}%`,
    top: `${top}%`,
    // Seulement le centrage, pas de transform pour éviter les conflits avec les animations
    transform: `translate(-50%, -50%)`,
  };
});

// Style pour le wrapper interne qui gère rotation et scale via variables CSS
// Cela évite les conflits avec les animations qui utilisent transform
const innerWrapperStyle = computed(() => {
  const el = props.element;
  const rotation = -(el.rotation.z * 180) / Math.PI;

  return {
    "--poll-rotation": `${rotation}deg`,
    "--poll-scale-x": el.scale.x,
    "--poll-scale-y": el.scale.y,
  } as Record<string, string | number>;
});

const contentStyle = computed(() => ({
  width: `${config.value.layout.maxWidth}px`,
}));

const questionStyle = computed(() => {
  const qs = config.value.questionStyle;
  return {
    fontFamily: qs.fontFamily,
    fontSize: `${qs.fontSize}px`,
    fontWeight: qs.fontWeight,
    color: qs.color,
    textShadow: qs.textShadow?.enabled
      ? `${qs.textShadow.offsetX}px ${qs.textShadow.offsetY}px ${qs.textShadow.blur}px ${qs.textShadow.color}`
      : "none",
  };
});

const optionTextStyle = computed(() => {
  const ts = config.value.optionTextStyle;
  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight: ts.fontWeight,
    color: ts.color,
  };
});

const optionPercentageStyle = computed(() => {
  const ps = config.value.optionPercentageStyle;
  return {
    fontFamily: ps.fontFamily,
    fontSize: `${ps.fontSize}px`,
    fontWeight: ps.fontWeight,
    color: ps.color,
  };
});

const getOptionStyle = (index: number) => {
  const box = config.value.optionBoxStyle;
  const rank = rankings.value[index] || 4;
  const medalColor = getMedalColor(rank);

  const baseStyle = {
    backgroundColor: box.backgroundColor,
    borderColor: medalColor,
    borderWidth: `${box.borderWidth}px`,
    borderRadius: `${box.borderRadius}px`,
    borderStyle: "solid",
    opacity: box.opacity,
    padding: `${box.padding.top}px ${box.padding.right}px ${box.padding.bottom}px ${box.padding.left}px`,
  };

  // Animation de résultat
  if (state.value === "result") {
    const resultAnim = config.value.animations.result;
    if (isWinner(index)) {
      return {
        ...baseStyle,
        transform: `scale(${resultAnim.winnerEnlarge.scale})`,
        transition: `transform ${resultAnim.winnerEnlarge.duration}s ease-out`,
      };
    } else {
      return {
        ...baseStyle,
        opacity: resultAnim.loserFadeOut.opacity,
        transition: `opacity ${resultAnim.loserFadeOut.duration}s ease-out`,
      };
    }
  }

  return baseStyle;
};

const getBarStyle = (index: number) => {
  const rank = rankings.value[index] || 4;
  const medalColor = getMedalColor(rank);
  const percentage = props.percentages[index] || 0;

  return {
    width: `${percentage}%`,
    backgroundColor: medalColor,
  };
};

const progressContainerStyle = computed(() => ({
  flexDirection:
    (config.value.progressBar.position === "top" ? "column-reverse" : "column") as "column" | "column-reverse",
}));

const progressBarStyle = computed(() => {
  const pb = config.value.progressBar;
  return {
    height: `${pb.height}px`,
    backgroundColor: pb.backgroundColor,
    borderRadius: `${pb.borderRadius}px`,
  };
});

const progressFillStyle = computed(() => {
  const pb = config.value.progressBar;
  const totalDuration = props.pollData?.totalDuration || 60;
  const fillPercent = (remainingTime.value / totalDuration) * 100;

  const background = pb.fillGradient?.enabled
    ? `linear-gradient(90deg, ${pb.fillGradient.startColor}, ${pb.fillGradient.endColor})`
    : pb.fillColor;

  return {
    width: `${fillPercent}%`,
    background,
    borderRadius: `${pb.borderRadius}px`,
    height: "100%",
  };
});

const timeTextStyle = computed(() => {
  const ts = config.value.progressBar.timeTextStyle;
  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight: ts.fontWeight,
    color: ts.color,
  };
});

// Classe d'animation selon l'état et la direction
const animationClass = computed(() => {
  if (state.value === "entering") {
    const dir = config.value.animations.entry.slideDirection;
    return `entering-from-${dir}`;
  }
  if (state.value === "exiting") {
    return "exiting-fade";
  }
  return "";
});

// Gestion du timer avec Worker (résistant au throttling OBS)
const startTimer = (endsAt: string) => {
  // Arrêter le timer précédent si actif
  workerTimer.stop();
  currentEndsAt = endsAt;

  const updateTimer = () => {
    if (!currentEndsAt) return;

    const now = Date.now();
    const end = new Date(currentEndsAt).getTime();
    const diff = end - now;

    if (diff <= 0) {
      remainingTime.value = 0;
      workerTimer.stop();
      currentEndsAt = null;
    } else {
      remainingTime.value = Math.floor(diff / 1000);
    }
  };

  // Mise à jour initiale
  updateTimer();

  // Utiliser le worker pour les ticks (résiste au throttling)
  workerTimer.onTick(updateTimer);
  workerTimer.start(1000);
};

const stopTimer = () => {
  workerTimer.stop();
  currentEndsAt = null;
};

// Gestion audio
const initAudio = () => {
  const entryAnim = config.value.animations.entry;
  const loopAnim = config.value.animations.loop;
  const resultAnim = config.value.animations.result;

  if (entryAnim.sound.enabled) {
    introAudio.value = new Audio("/audio/poll/intro.wav");
    introAudio.value.volume = entryAnim.sound.volume;
  }

  if (loopAnim.music.enabled) {
    loopAudio.value = new Audio("/audio/poll/loop.wav");
    loopAudio.value.volume = loopAnim.music.volume;
    loopAudio.value.loop = true;
  }

  if (resultAnim.sound.enabled) {
    resultAudio.value = new Audio("/audio/poll/result.wav");
    resultAudio.value.volume = resultAnim.sound.volume;
  }
};

const playIntro = async () => {
  if (introAudio.value) {
    try {
      await introAudio.value.play();
    } catch (e) {
      console.warn("Could not play intro audio:", e);
    }
  }
};

const startLoop = async () => {
  if (loopAudio.value) {
    try {
      await loopAudio.value.play();
    } catch (e) {
      console.warn("Could not play loop audio:", e);
    }
  }
};

const stopLoop = () => {
  if (loopAudio.value) {
    loopAudio.value.pause();
    loopAudio.value.currentTime = 0;
  }
};

const playResult = async () => {
  if (resultAudio.value) {
    try {
      await resultAudio.value.play();
    } catch (e) {
      console.warn("Could not play result audio:", e);
    }
  }
};

const cleanupAudio = () => {
  stopLoop();
  if (introAudio.value) {
    introAudio.value.pause();
    introAudio.value = null;
  }
  if (loopAudio.value) {
    loopAudio.value = null;
  }
  if (resultAudio.value) {
    resultAudio.value.pause();
    resultAudio.value = null;
  }
};

// Transition d'état
const transitionTo = (newState: PollState) => {
  state.value = newState;
  emit("stateChange", newState);
};

// Démarrer le poll (appelé quand pollData change)
const startPoll = async () => {
  if (!props.pollData) return;

  initAudio();

  // 1. Jouer le son d'entrée
  const entryAnim = config.value.animations.entry;
  await playIntro();

  // 2. Attendre le soundLeadTime puis démarrer l'animation
  setTimeout(() => {
    transitionTo("entering");

    // 3. Après l'animation d'entrée, passer en état actif
    setTimeout(() => {
      transitionTo("active");
      startLoop();

      if (props.pollData?.endsAt) {
        startTimer(props.pollData.endsAt);
      }
    }, entryAnim.animation.duration * 1000);
  }, entryAnim.soundLeadTime * 1000);
};

// Terminer le poll (appelé quand isEnding devient true)
const endPoll = () => {
  stopLoop();
  playResult();
  transitionTo("result");

  // Après le délai d'affichage des résultats, sortir
  const resultAnim = config.value.animations.result;
  setTimeout(() => {
    transitionTo("exiting");

    // Après l'animation de sortie, cacher
    const exitAnim = config.value.animations.exit;
    setTimeout(() => {
      transitionTo("hidden");
      cleanupAudio();
    }, exitAnim.animation.duration * 1000);
  }, resultAnim.displayDuration * 1000);
};

// ==========================================
// Méthodes publiques pour contrôle externe (preview sync)
// ==========================================

const publicPlayEntry = async () => {
  // Activer le flag de contrôle externe pour éviter le double déclenchement
  isExternalControl = true;

  initAudio();
  await playIntro();

  const entryAnim = config.value.animations.entry;
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      transitionTo("entering");
      setTimeout(() => {
        transitionTo("active");
        resolve();
      }, entryAnim.animation.duration * 1000);
    }, entryAnim.soundLeadTime * 1000);
  });
};

const publicPlayLoop = () => {
  startLoop();
};

const publicStopLoop = () => {
  stopLoop();
};

const publicPlayResult = async () => {
  stopLoop();
  await playResult();
  transitionTo("result");
};

const publicPlayExit = async () => {
  const exitAnim = config.value.animations.exit;
  transitionTo("exiting");

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      transitionTo("hidden");
      cleanupAudio();
      resolve();
    }, exitAnim.animation.duration * 1000);
  });
};

const publicReset = () => {
  stopTimer();
  cleanupAudio();
  transitionTo("hidden");
  // Réinitialiser le flag de contrôle externe
  isExternalControl = false;
};

const publicPlayFullSequence = async (duration: number) => {
  await publicPlayEntry();
  publicPlayLoop();

  // Attendre la durée spécifiée
  await new Promise<void>((resolve) => setTimeout(resolve, duration * 1000));

  publicStopLoop();
  await publicPlayResult();

  // Attendre l'affichage des résultats
  const resultAnim = config.value.animations.result;
  await new Promise<void>((resolve) =>
    setTimeout(resolve, resultAnim.displayDuration * 1000)
  );

  await publicPlayExit();
};

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
});

// Watcher pour démarrer/terminer le poll
watch(
  () => props.pollData,
  (newData, oldData) => {
    // Ignorer si le contrôle externe est actif (évite le double déclenchement)
    if (isExternalControl) {
      return;
    }

    // Nouveau poll (premier ou remplacement d'un ancien avec ID différent)
    if (newData && (!oldData || newData.pollInstanceId !== oldData.pollInstanceId)) {
      // Si ancien poll encore visible, reset d'abord
      if (oldData && state.value !== "hidden") {
        transitionTo("hidden");
        cleanupAudio();
        // Petit délai pour permettre le reset avant de démarrer le nouveau
        setTimeout(() => startPoll(), 100);
      } else {
        startPoll();
      }
    } else if (!newData && oldData) {
      // Poll terminé sans données (cleanup forcé)
      transitionTo("hidden");
      cleanupAudio();
    }
  },
  { immediate: true }
);

watch(
  () => props.isEnding,
  (ending) => {
    if (ending && state.value === "active") {
      endPoll();
    }
  }
);

// Cleanup
onMounted(() => {
  if (props.pollData) {
    startPoll();
  }
});

onUnmounted(() => {
  stopTimer();
  cleanupAudio();
});
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
  background: linear-gradient(
    145deg,
    var(--color-overlay-bg-dark),
    var(--color-overlay-bg-dark-alt)
  );
  backdrop-filter: blur(16px);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 20px 60px var(--color-overlay-shadow-brand);
}

.poll-question {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--color-overlay-border-brand);
}

.poll-options {
  display: flex;
  flex-direction: column;
}

.poll-option {
  transition: transform 0.3s ease, opacity 0.3s ease;
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
    transform: translate3d(0, -50px, 0) rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
  }
}

@keyframes slideInFromDown {
  from {
    opacity: 0;
    transform: translate3d(0, 50px, 0) rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translate3d(-50px, 0, 0) rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
  }
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translate3d(50px, 0, 0) rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(var(--poll-rotation)) scale(var(--poll-scale-x), var(--poll-scale-y));
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
</style>
