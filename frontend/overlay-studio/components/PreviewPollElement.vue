<template>
  <div
    v-if="state !== 'hidden'"
    class="preview-poll-container"
    :class="[`state-${state}`, animationClass]"
    :style="containerStyle"
  >
    <div class="poll-content" :style="contentStyle">
      <!-- Question -->
      <div class="poll-question" :style="questionStyle">
        {{ mockData.question }}
      </div>

      <!-- Options -->
      <div class="poll-options" :style="{ gap: `${config.optionSpacing}px` }">
        <div
          v-for="(option, index) in mockData.options"
          :key="index"
          class="poll-option"
          :class="{
            'is-winner': state === 'result' && isWinner(index),
            'is-loser': state === 'result' && !isWinner(index),
          }"
          :style="getOptionStyle(index)"
        >
          <div class="option-content">
            <span class="option-text" :style="optionTextStyle">
              {{ option }}
            </span>
            <span class="option-percentage" :style="optionPercentageStyle">
              {{ mockData.percentages[index] || 0 }}%
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
          {{ mockData.timeRemaining }}s
        </span>
      </div>
    </div>

    <!-- Debug info -->
    <div v-if="showDebug" class="debug-info">
      State: {{ state }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue";
import type { PollProperties, OverlayElement, PollMockData } from "../types";
import {
  useAnimationController,
  type AnimationState,
} from "../composables/useAnimationController";

const props = defineProps<{
  element: OverlayElement;
  externalState?: AnimationState;
  showDebug?: boolean;
}>();

// Configuration du poll
const config = computed(() => props.element.properties as PollProperties);

// Mock data depuis la config
const mockData = computed<PollMockData>(() => config.value.mockData);

// Animation controller
const controller = useAnimationController(toRef(() => config.value));

// État: utiliser l'état externe si fourni, sinon l'état interne du controller
const state = computed(() => props.externalState ?? controller.state.value);

// Exposer les méthodes du controller
defineExpose({
  playEntry: controller.playEntry,
  playLoop: controller.playLoop,
  stopLoop: controller.stopLoop,
  playResult: controller.playResult,
  playExit: controller.playExit,
  reset: controller.reset,
  playFullSequence: controller.playFullSequence,
  state: controller.state,
  audioEnabled: controller.audioEnabled,
});

// Calcul des rankings avec gestion des ex-aequo
const rankings = computed(() => {
  const percs = mockData.value.percentages;
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
  const rotation = -(el.rotation.z * 180) / Math.PI;

  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${el.scale.x}, ${el.scale.y})`,
  };
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
  const percentage = mockData.value.percentages[index] || 0;

  return {
    width: `${percentage}%`,
    backgroundColor: medalColor,
  };
};

const progressContainerStyle = computed(() => ({
  flexDirection:
    config.value.progressBar.position === "top"
      ? ("column-reverse" as const)
      : ("column" as const),
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
  const totalDuration = mockData.value.totalDuration || 60;
  const fillPercent = (mockData.value.timeRemaining / totalDuration) * 100;

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
</script>

<style scoped>
.preview-poll-container {
  position: absolute;
  transform-origin: center center;
  pointer-events: none;
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
  transition: all 0.3s ease;
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
}

.progress-time {
  min-width: 50px;
  text-align: right;
}

/* Debug info */
.debug-info {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-overlay-backdrop-solid);
  color: var(--color-success-500);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;
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
    transform: translate(-50%, -50%) translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0);
  }
}

@keyframes slideInFromDown {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(50px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0);
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateX(0);
  }
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateX(50px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateX(0);
  }
}

/* Animation de sortie */
.exiting-fade {
  animation: fadeOut 0.5s ease-in forwards;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
