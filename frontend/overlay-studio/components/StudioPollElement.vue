<template>
  <TresGroup
    ref="groupRef"
    :position="[element.position.x, element.position.y, element.position.z]"
    :rotation="[element.rotation.x, element.rotation.y, element.rotation.z]"
    :scale="[element.scale.x, element.scale.y, element.scale.z]"
  >
    <!-- Rendu HTML via Html de @tresjs/cientos -->
    <!-- scale=50 pour rendre le HTML visible dans l'espace 3D (1920x1080) -->
    <Html
      :center="true"
      :transform="true"
      :scale="50"
      :occlude="false"
      :sprite="false"
    >
      <div
        class="poll-preview"
        :style="containerStyle"
        @pointerdown.stop="handlePointerDown"
      >
        <!-- Question -->
        <div class="poll-question" :style="questionStyle">
          {{ mockData.question }}
        </div>

        <!-- Options -->
        <div class="poll-options" :style="{ gap: `${pollProps.optionSpacing}px` }">
          <div
            v-for="(option, index) in mockData.options"
            :key="index"
            class="poll-option"
            :style="getOptionStyle(index)"
          >
            <div class="option-content">
              <span class="option-text" :style="optionTextStyle">
                {{ option }}
              </span>
              <span class="option-percentage" :style="optionPercentageStyle">
                {{ mockData.percentages[index] }}%
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
            v-if="pollProps.progressBar.showTimeText"
            class="progress-time"
            :style="timeTextStyle"
          >
            {{ mockData.timeRemaining }}s
          </span>
        </div>
      </div>
    </Html>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Html } from "@tresjs/cientos";
import type { Object3D } from "three";
import type { OverlayElement, PollProperties } from "../types";

const props = defineProps<{
  element: OverlayElement;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  select: [id: string, meshRef: Object3D];
  moveStart: [];
  move: [deltaX: number, deltaY: number];
  moveEnd: [];
}>();

const groupRef = ref<Object3D | null>(null);

// État du drag
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);

// Extraire les propriétés du poll
const pollProps = computed(() => props.element.properties as PollProperties);
const mockData = computed(() => pollProps.value.mockData);

// Calcul des rankings avec gestion des ex-aequo
const rankings = computed(() => {
  const percentages = mockData.value.percentages;
  const sorted = [...percentages]
    .map((p, i) => ({ percentage: p, index: i }))
    .sort((a, b) => b.percentage - a.percentage);

  const ranks: number[] = new Array(percentages.length);
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].percentage < sorted[i - 1].percentage) {
      currentRank = i + 1;
    }
    ranks[sorted[i].index] = currentRank;
  }

  return ranks;
});

// Obtenir la couleur de médaille selon le rang
const getMedalColor = (rank: number): string => {
  const colors = pollProps.value.medalColors;
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
const containerStyle = computed(() => ({
  width: `${pollProps.value.layout.maxWidth}px`,
}));

const questionStyle = computed(() => {
  const qs = pollProps.value.questionStyle;
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
  const ts = pollProps.value.optionTextStyle;
  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight: ts.fontWeight,
    color: ts.color,
  };
});

const optionPercentageStyle = computed(() => {
  const ps = pollProps.value.optionPercentageStyle;
  return {
    fontFamily: ps.fontFamily,
    fontSize: `${ps.fontSize}px`,
    fontWeight: ps.fontWeight,
    color: ps.color,
  };
});

const getOptionStyle = (index: number) => {
  const box = pollProps.value.optionBoxStyle;
  const rank = rankings.value[index];
  const medalColor = getMedalColor(rank);

  return {
    backgroundColor: box.backgroundColor,
    borderColor: medalColor,
    borderWidth: `${box.borderWidth}px`,
    borderRadius: `${box.borderRadius}px`,
    borderStyle: "solid",
    opacity: box.opacity,
    padding: `${box.padding.top}px ${box.padding.right}px ${box.padding.bottom}px ${box.padding.left}px`,
  };
};

const getBarStyle = (index: number) => {
  const rank = rankings.value[index];
  const medalColor = getMedalColor(rank);
  const percentage = mockData.value.percentages[index];

  return {
    width: `${percentage}%`,
    backgroundColor: medalColor,
  };
};

const progressContainerStyle = computed(() => ({
  flexDirection:
    (pollProps.value.progressBar.position === "top" ? "column-reverse" : "column") as "column" | "column-reverse",
}));

const progressBarStyle = computed(() => {
  const pb = pollProps.value.progressBar;
  return {
    height: `${pb.height}px`,
    backgroundColor: pb.backgroundColor,
    borderRadius: `${pb.borderRadius}px`,
  };
});

const progressFillStyle = computed(() => {
  const pb = pollProps.value.progressBar;
  const fillPercent =
    (mockData.value.timeRemaining / mockData.value.totalDuration) * 100;

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
  const ts = pollProps.value.progressBar.timeTextStyle;
  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight: ts.fontWeight,
    color: ts.color,
  };
});

// Gestion du pointerdown pour démarrer le drag
const handlePointerDown = (event: PointerEvent) => {
  event.stopPropagation();

  // Sélectionner l'élément
  if (groupRef.value) {
    emit("select", props.element.id, groupRef.value);
  }

  // Démarrer le drag
  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;

  emit("moveStart");
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
};

// Gestion du déplacement
const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;

  // Émettre le delta en pixels écran (sera converti par le parent)
  emit("move", deltaX, deltaY);

  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
};

// Fin du drag
const handlePointerUp = () => {
  if (isDragging.value) {
    isDragging.value = false;
    emit("moveEnd");
  }

  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
};
</script>

<style scoped>
.poll-preview {
  background: linear-gradient(
    145deg,
    var(--color-overlay-bg-dark),
    var(--color-overlay-bg-dark-alt)
  );
  backdrop-filter: blur(16px);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 20px 60px var(--color-overlay-shadow-brand);
  cursor: move;
  user-select: none;
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
</style>
