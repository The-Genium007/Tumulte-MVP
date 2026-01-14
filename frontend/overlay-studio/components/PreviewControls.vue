<template>
  <div class="preview-controls">
    <!-- Header -->
    <div class="controls-header">
      <h3 class="controls-title">Contrôles</h3>
    </div>

    <!-- Liste des éléments -->
    <div class="controls-section">
      <h4 class="section-title">Éléments</h4>
      <div class="elements-list">
        <div
          v-for="element in elements"
          :key="element.id"
          class="element-item"
          :class="{ selected: selectedElementId === element.id }"
          @click="$emit('selectElement', element.id)"
        >
          <UIcon
            :name="selectedElementId === element.id ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
            class="element-chevron"
          />
          <span class="element-name">{{ element.name }}</span>
          <UBadge size="xs" color="neutral" variant="subtle">
            {{ element.type }}
          </UBadge>
        </div>
      </div>
    </div>

    <!-- Animations (pour l'élément sélectionné) -->
    <div v-if="selectedElement" class="controls-section">
      <h4 class="section-title">Animations</h4>
      <div class="animation-buttons">
        <UButton
          color="primary"
          variant="soft"
          icon="i-heroicons-play"
          :disabled="isPlaying"
          @click="$emit('playEntry')"
        >
          Entry
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :disabled="currentState !== 'active'"
          @click="handleLoopToggle"
        >
          {{ isLoopPlaying ? "Stop Loop" : "Loop" }}
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-heroicons-trophy"
          :disabled="currentState !== 'active' && currentState !== 'result'"
          @click="$emit('playResult')"
        >
          Result
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-heroicons-arrow-right-start-on-rectangle"
          :disabled="currentState === 'hidden' || currentState === 'exiting'"
          @click="$emit('playExit')"
        >
          Exit
        </UButton>
      </div>

      <div class="animation-actions">
        <UButton
          block
          color="primary"
          icon="i-heroicons-play-circle"
          :disabled="isPlaying"
          @click="$emit('playFullSequence')"
        >
          Séquence complète
        </UButton>
        <UButton
          block
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          @click="$emit('reset')"
        >
          Reset
        </UButton>
      </div>

      <!-- État actuel -->
      <div class="current-state">
        <span class="state-label">État:</span>
        <UBadge
          :color="getStateColor(currentState)"
          variant="subtle"
          size="sm"
        >
          {{ currentState }}
        </UBadge>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { OverlayElement } from "../types";
import type { AnimationState } from "../composables/useAnimationController";

const props = defineProps<{
  elements: OverlayElement[];
  selectedElementId: string | null;
  currentState: AnimationState;
}>();

const emit = defineEmits<{
  (e: "selectElement", id: string): void;
  (e: "toggleVisibility", id: string): void;
  (e: "playEntry"): void;
  (e: "playLoop"): void;
  (e: "stopLoop"): void;
  (e: "playResult"): void;
  (e: "playExit"): void;
  (e: "playFullSequence"): void;
  (e: "reset"): void;
}>();

const isLoopPlaying = ref(false);

const selectedElement = computed(() => {
  if (!props.selectedElementId) return null;
  return props.elements.find((el) => el.id === props.selectedElementId) || null;
});

const isPlaying = computed(() => {
  return (
    props.currentState === "entering" || props.currentState === "exiting"
  );
});

const handleLoopToggle = () => {
  if (isLoopPlaying.value) {
    emit("stopLoop");
    isLoopPlaying.value = false;
  } else {
    emit("playLoop");
    isLoopPlaying.value = true;
  }
};

const getStateColor = (
  state: AnimationState,
): "neutral" | "primary" | "success" | "warning" | "error" => {
  switch (state) {
    case "hidden":
      return "neutral";
    case "entering":
      return "primary";
    case "active":
      return "success";
    case "result":
      return "warning";
    case "exiting":
      return "error";
    default:
      return "neutral";
  }
};
</script>

<style scoped>
.preview-controls {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.controls-header {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-neutral-200);
}

.controls-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin: 0;
}

.elements-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.element-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: var(--color-bg-page);
  border: 1px solid var(--color-neutral-200);
  cursor: pointer;
  transition: all 0.15s;
}

.element-item:hover {
  background: var(--color-neutral-100);
  border-color: var(--color-primary-400);
}

.element-item.selected {
  background: var(--color-primary-100);
  border-color: var(--color-primary-400);
}

.element-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.animation-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.animation-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.current-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-page);
  border-radius: 8px;
  border: 1px solid var(--color-neutral-200);
}

.state-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.element-chevron {
  color: var(--color-text-muted);
  transition: transform 0.2s;
}
</style>
