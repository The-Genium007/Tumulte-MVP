<template>
  <div class="preview-page">
    <!-- Header Card -->
    <UCard class="preview-header-card">
      <!-- Desktop header: single row -->
      <div class="preview-header-desktop">
        <div class="flex items-center gap-4">
          <UButton
            color="neutral"
            variant="soft"
            size="xl"
            square
            class="group"
            to="/streamer"
          >
            <template #leading>
              <UIcon name="i-lucide-arrow-left" class="size-12 transition-transform duration-200 group-hover:-translate-x-1" />
            </template>
          </UButton>
          <div class="preview-title-section">
            <h2 class="preview-title">Prévisualisation Overlay</h2>
            <USelect
              v-model="selectedConfigId"
              :items="configOptions"
              placeholder="Sélectionner une configuration"
              size="sm"
              class="config-selector"
              @update:model-value="loadSelectedConfig"
            />
          </div>
        </div>
        <div v-if="isDev" class="preview-actions">
          <UButton
            color="primary"
            icon="i-lucide-pencil"
            to="/streamer/studio"
          >
            Ouvrir le Studio
          </UButton>
        </div>
      </div>

      <!-- Mobile header: stacked layout -->
      <div class="preview-header-mobile">
        <div class="mobile-top-row">
          <UButton
            color="neutral"
            variant="soft"
            size="lg"
            square
            class="group"
            to="/streamer"
          >
            <template #leading>
              <UIcon name="i-lucide-arrow-left" class="size-8 transition-transform duration-200 group-hover:-translate-x-1" />
            </template>
          </UButton>
          <h2 class="preview-title">Prévisualisation</h2>
        </div>
        <div class="mobile-bottom-row">
          <USelect
            v-model="selectedConfigId"
            :items="configOptions"
            placeholder="Configuration"
            size="sm"
            class="config-selector-mobile"
            @update:model-value="loadSelectedConfig"
          />
          <UButton
            v-if="isDev"
            color="primary"
            icon="i-lucide-pencil"
            size="sm"
            to="/streamer/studio"
          >
            Studio
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Zone de prévisualisation -->
    <div class="preview-content">
      <!-- Canvas de prévisualisation avec damier -->
      <div ref="canvasWrapper" class="preview-canvas-wrapper">
        <div
          ref="canvasContainer"
          class="preview-canvas"
          :style="canvasStyle"
        >
          <!-- Fond en damier pour montrer la transparence -->
          <div class="checkerboard-bg" />

          <!-- Loading indicator -->
          <div v-if="loading" class="loading-overlay">
            <UIcon name="i-heroicons-arrow-path" class="loading-icon" />
            <p>Chargement de la configuration...</p>
          </div>

          <!-- Éléments de l'overlay -->
          <template v-for="element in visibleElements" :key="element.id">
            <PreviewPollElement
              v-if="element.type === 'poll'"
              :ref="(el) => setElementRef(element.id, el)"
              :element="element"
              :external-state="elementStates[element.id]"
              :show-debug="true"
            />
            <!-- DiceBox pour les éléments de type dice -->
            <div
              v-else-if="element.type === 'dice'"
              class="dice-container"
              :style="getDiceContainerStyle(element)"
            >
              <DiceBox
                :ref="(el: unknown) => setDiceBoxRef(element.id, el)"
                :notation="selectedElementId === element.id ? currentDiceNotation : ''"
                :sounds="true"
                :volume="50"
                @roll-complete="handleDiceRollComplete"
                @ready="() => handleDiceBoxReady(element.id)"
              />
            </div>
          </template>

          <!-- Message si aucune configuration -->
          <div v-if="!hasConfig && !loading" class="no-config-message">
            <UIcon name="i-heroicons-exclamation-triangle" class="warning-icon" />
            <p>Aucune configuration d'overlay trouvée.</p>
            <UButton color="primary" to="/streamer/studio">
              Créer une configuration
            </UButton>
          </div>
        </div>
      </div>

      <!-- Panneau de contrôles -->
      <div class="controls-panel">
        <PreviewControls
          :elements="elements"
          :selected-element-id="selectedElementId"
          :current-state="currentState"
          @select-element="toggleElement"
          @toggle-visibility="toggleVisibility"
          @play-entry="handlePlayEntry"
          @play-loop="handlePlayLoop"
          @stop-loop="handleStopLoop"
          @play-result="handlePlayResult"
          @play-exit="handlePlayExit"
          @play-full-sequence="handlePlayFullSequence"
          @reset="handleReset"
          @roll-dice="handleRollDice"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import PreviewPollElement from "@/overlay-studio/components/PreviewPollElement.vue";
import PreviewControls from "@/overlay-studio/components/PreviewControls.vue";
import { useOverlayStudioStore } from "@/overlay-studio/stores/overlayStudio";
import { useOverlayStudioApi } from "@/overlay-studio/composables/useOverlayStudioApi";
import type { PollProperties, DiceRollEvent, OverlayElement } from "@/overlay-studio/types";
import type { AnimationState } from "@/overlay-studio/composables/useAnimationController";

definePageMeta({
  layout: "authenticated",
});

const store = useOverlayStudioStore();
const api = useOverlayStudioApi();

// Mode développement uniquement (import.meta.dev est une constante Vite/Nuxt)
const isDev = import.meta.dev;

// Dimensions du canvas overlay (référence 1920x1080)
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

// État local
const loading = ref(true);
const selectedConfigId = ref<string | undefined>(undefined);
const selectedElementId = ref<string | null>(null);

// Options pour le sélecteur de configuration
const configOptions = computed(() =>
  api.configs.value.map((c) => ({
    label: c.name + (c.isActive ? " (Active)" : ""),
    value: c.id,
  })),
);

// Charger une configuration sélectionnée
const loadSelectedConfig = async (configId: string | undefined) => {
  if (!configId) return;

  try {
    loading.value = true;
    const fullConfig = await api.fetchConfig(configId);
    store.loadConfig(fullConfig.config);

    // Réinitialiser les états des éléments
    for (const element of store.elements) {
      elementStates.value[element.id] = "hidden";
    }
  } catch (error) {
    console.error("Failed to load config:", error);
  } finally {
    loading.value = false;
  }
};
const canvasWrapper = ref<HTMLElement | null>(null);
const canvasContainer = ref<HTMLElement | null>(null);

// Échelle calculée pour adapter le canvas à l'espace disponible
const canvasScale = ref(1);

// État des animations par élément
const elementStates = ref<Record<string, AnimationState>>({});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elementRefs = ref<Record<string, any>>({});

// DiceBox refs par élément ID
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const diceBoxRefs = ref<Record<string, any>>({});
const currentDiceNotation = ref("");
const diceBoxReady = ref(false);

// Éléments de la configuration
const elements = computed(() => store.elements);
const visibleElements = computed(() => elements.value.filter((el) => el.visible));
const hasConfig = computed(() => elements.value.length > 0);

// État actuel de l'élément sélectionné
const currentState = computed<AnimationState>(() => {
  if (!selectedElementId.value) return "hidden";
  return elementStates.value[selectedElementId.value] || "hidden";
});

// Style du canvas (dimensions fixes 1920x1080 + échelle)
const canvasStyle = computed(() => {
  return {
    width: `${CANVAS_WIDTH}px`,
    height: `${CANVAS_HEIGHT}px`,
    transform: `scale(${canvasScale.value})`,
    transformOrigin: "top left",
  };
});

// Style du container de dés basé sur la position de l'élément
// Note: DiceBox occupe tout l'espace disponible, la position définit le coin supérieur gauche
const getDiceContainerStyle = (element: OverlayElement) => {
  // Taille par défaut pour le DiceBox (1920x1080 = format overlay standard)
  const baseWidth = 1920;
  const baseHeight = 1080;
  return {
    position: 'absolute' as const,
    left: `${element.position.x}px`,
    top: `${element.position.y}px`,
    width: `${baseWidth * element.scale.x}px`,
    height: `${baseHeight * element.scale.y}px`,
  };
};

/**
 * Calcule l'échelle du canvas en fonction de l'espace disponible.
 * Le wrapper utilise aspect-ratio: 16/9, donc on calcule uniquement sur la largeur.
 */
const calculateCanvasScale = () => {
  if (!canvasWrapper.value) return;

  const wrapperRect = canvasWrapper.value.getBoundingClientRect();
  const scaleX = wrapperRect.width / CANVAS_WIDTH;
  canvasScale.value = Math.min(scaleX, 1);
};

// Observer le redimensionnement
let resizeObserver: ResizeObserver | null = null;

// Charger la configuration au montage
onMounted(async () => {
  try {
    // Charger la liste des configs
    const configs = await api.fetchConfigs();

    // Trouver la config active par défaut
    const activeConfig = configs.find((c) => c.isActive);

    if (activeConfig) {
      // Sélectionner la config active
      selectedConfigId.value = activeConfig.id;

      // Si le store est vide (on ne vient pas du Studio), charger les éléments
      if (store.elements.length === 0) {
        const fullConfig = await api.fetchConfig(activeConfig.id);
        store.loadConfig(fullConfig.config);
      }
    }

    // Initialiser les états des éléments
    for (const element of elements.value) {
      elementStates.value[element.id] = "hidden";
    }
  } catch (error) {
    console.error("Failed to load overlay config:", error);
  } finally {
    loading.value = false;
  }

  // Calculer l'échelle initiale et observer les changements de taille
  await nextTick();
  calculateCanvasScale();

  if (canvasWrapper.value) {
    resizeObserver = new ResizeObserver(() => {
      calculateCanvasScale();
    });
    resizeObserver.observe(canvasWrapper.value);
  }
});

// Nettoyage
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// Surveiller les changements d'éléments pour mettre à jour les états
watch(
  elements,
  (newElements) => {
    for (const element of newElements) {
      if (!(element.id in elementStates.value)) {
        elementStates.value[element.id] = "hidden";
      }
    }
  },
  { deep: true },
);

// Stocker les refs des éléments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setElementRef = (id: string, el: any) => {
  if (el) {
    elementRefs.value[id] = el;
  }
};

// Toggle la sélection d'un élément (sélectionne ou désélectionne)
const toggleElement = (id: string) => {
  selectedElementId.value = selectedElementId.value === id ? null : id;
};

// Toggle visibilité
const toggleVisibility = (id: string) => {
  const element = elements.value.find((el) => el.id === id);
  if (element) {
    store.updateElement(id, { visible: !element.visible });
  }
};

// Obtenir le composant de l'élément sélectionné
const getSelectedComponent = () => {
  if (!selectedElementId.value) return null;
  return elementRefs.value[selectedElementId.value];
};

// Obtenir les mockData de l'élément sélectionné pour les envoyer à OBS
const getSelectedMockData = () => {
  if (!selectedElementId.value) return undefined;
  const element = elements.value.find((el) => el.id === selectedElementId.value);
  if (!element) return undefined;

  const props = element.properties as PollProperties;
  return {
    question: props.mockData.question,
    options: props.mockData.options,
    percentages: props.mockData.percentages,
    timeRemaining: props.mockData.timeRemaining,
    totalDuration: props.mockData.totalDuration,
  };
};

// Handlers d'animation - exécutent localement ET envoient au backend pour sync OBS
const handlePlayEntry = async () => {
  const component = getSelectedComponent();
  if (!component || !selectedElementId.value) return;

  // Sync avec l'overlay OBS (avec mockData)
  api.sendPreviewCommand(selectedElementId.value, "playEntry", {
    mockData: getSelectedMockData(),
  });

  elementStates.value[selectedElementId.value] = "entering";
  await component.playEntry();
  elementStates.value[selectedElementId.value] = "active";
};

const handlePlayLoop = () => {
  const component = getSelectedComponent();
  if (!component || !selectedElementId.value) return;

  // Sync avec l'overlay OBS
  api.sendPreviewCommand(selectedElementId.value, "playLoop");

  component.playLoop();
};

const handleStopLoop = () => {
  const component = getSelectedComponent();
  if (!component || !selectedElementId.value) return;

  // Sync avec l'overlay OBS
  api.sendPreviewCommand(selectedElementId.value, "stopLoop");

  component.stopLoop();
};

const handlePlayResult = async () => {
  const component = getSelectedComponent();
  if (!component || !selectedElementId.value) return;

  // Sync avec l'overlay OBS (avec mockData pour les pourcentages finaux)
  api.sendPreviewCommand(selectedElementId.value, "playResult", {
    mockData: getSelectedMockData(),
  });

  elementStates.value[selectedElementId.value] = "result";
  await component.playResult();
};

const handlePlayExit = async () => {
  const component = getSelectedComponent();
  if (!component || !selectedElementId.value) return;

  // Sync avec l'overlay OBS
  api.sendPreviewCommand(selectedElementId.value, "playExit");

  elementStates.value[selectedElementId.value] = "exiting";
  await component.playExit();
  elementStates.value[selectedElementId.value] = "hidden";
};

const handlePlayFullSequence = async () => {
  const component = getSelectedComponent();
  if (!component || !selectedElementId.value) return;

  const element = elements.value.find((el) => el.id === selectedElementId.value);
  if (!element) return;

  const props = element.properties as PollProperties;
  const duration = props.mockData.timeRemaining || 10;

  // Sync avec l'overlay OBS (avec mockData)
  api.sendPreviewCommand(selectedElementId.value, "playFullSequence", {
    duration,
    mockData: getSelectedMockData(),
  });

  // Mettre à jour les états au fur et à mesure
  elementStates.value[selectedElementId.value] = "entering";

  // L'animation gère les transitions en interne
  await component.playFullSequence(duration);

  elementStates.value[selectedElementId.value] = "hidden";
};

const handleReset = () => {
  const component = getSelectedComponent();
  if (!component || !selectedElementId.value) return;

  // Sync avec l'overlay OBS
  api.sendPreviewCommand(selectedElementId.value, "reset");

  component.reset();
  elementStates.value[selectedElementId.value] = "hidden";

  // Reset dice notation
  currentDiceNotation.value = "";
};

// DiceBox handlers
const setDiceBoxRef = (id: string, el: unknown) => {
  if (el) {
    diceBoxRefs.value[id] = el;
  }
};

const handleDiceBoxReady = (elementId: string) => {
  console.log("[Preview] DiceBox ready for element:", elementId);
  diceBoxReady.value = true;
};

const handleDiceRollComplete = (results: unknown) => {
  console.log("[Preview] Dice roll complete:", results);
  if (selectedElementId.value) {
    elementStates.value[selectedElementId.value] = "result";
  }
};

// Handler pour le lancer de dés manuel (depuis PreviewControls)
const handleRollDice = async (data: DiceRollEvent) => {
  console.log("[Preview] Manual dice roll triggered:", data);

  if (!selectedElementId.value) {
    console.warn("[Preview] No element selected for dice roll");
    return;
  }

  // Vérifier que l'élément sélectionné est bien un élément dice
  const selectedElement = elements.value.find((el) => el.id === selectedElementId.value);
  if (!selectedElement || selectedElement.type !== "dice") {
    console.warn("[Preview] Selected element is not a dice element");
    return;
  }

  // Vérifier que le DiceBox est prêt
  const diceBox = diceBoxRefs.value[selectedElementId.value];
  if (!diceBox) {
    console.warn("[Preview] DiceBox not found for element:", selectedElementId.value);
    return;
  }

  // Mettre à jour l'état
  elementStates.value[selectedElementId.value] = "active";

  // Construire la notation avec les résultats forcés si disponibles
  // Format DiceBox: "2d20@5,15" pour forcer les résultats à 5 et 15
  let notation = data.rollFormula;
  if (data.diceResults && data.diceResults.length > 0) {
    notation += "@" + data.diceResults.join(",");
  }

  console.log("[Preview] Rolling dice with notation:", notation);

  // Clear les dés précédents avant de lancer
  if (diceBox.clear) {
    diceBox.clear();
  }

  // Appeler directement la méthode roll du composant au lieu d'utiliser la prop notation
  // Cela évite les problèmes de watch qui ne se déclenche pas si la valeur est identique
  if (diceBox.roll) {
    try {
      await diceBox.roll(notation);
    } catch (error) {
      console.error("[Preview] Error rolling dice:", error);
    }
  } else {
    // Fallback: utiliser la prop notation
    currentDiceNotation.value = notation;
  }
};
</script>

<style scoped>
.preview-page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  background: var(--color-bg-page);
}

/* Header Card */
.preview-header-card {
  flex-shrink: 0;
}

/* Desktop header */
.preview-header-desktop {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Mobile header - hidden by default */
.preview-header-mobile {
  display: none;
}

.preview-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.config-selector {
  min-width: 200px;
}

.config-selector-mobile {
  flex: 1;
  min-width: 0;
}

.preview-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Mobile header rows */
.mobile-top-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mobile-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-neutral-200);
}

/* Content area */
.preview-content {
  flex: 1;
  display: flex;
  gap: 0.75rem;
  min-height: 0;
}

/* Canvas wrapper: aspect-ratio based layout for all screen sizes */
.preview-canvas-wrapper {
  flex: 1;
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-neutral-200);
  border-radius: 1rem;
  overflow: hidden;
}

.preview-canvas {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

/* Fond en damier style Photoshop */
.checkerboard-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(45deg, #d0d0d0 25%, transparent 25%),
    linear-gradient(-45deg, #d0d0d0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d0d0d0 75%),
    linear-gradient(-45deg, transparent 75%, #d0d0d0 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
  background-color: #e8e8e8;
}

/* Dice container */
.dice-container {
  z-index: 10;
}

.no-config-message {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  color: #f59e0b;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  text-align: center;
  z-index: 10;
}

.loading-icon {
  font-size: 2rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.controls-panel {
  width: 300px;
  flex-shrink: 0;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-neutral-200);
  border-radius: 2rem;
  overflow-y: auto;
}

/* Responsive - Mobile & Tablet */
@media (max-width: 1024px) {
  /* Show mobile header, hide desktop header */
  .preview-header-desktop {
    display: none;
  }

  .preview-header-mobile {
    display: block;
  }

  /* Switch to grid layout */
  .preview-content {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 0.75rem;
  }

  /* Canvas wrapper: remove border on mobile */
  .preview-canvas-wrapper {
    border: none;
    background: transparent;
  }

  /* Controls panel: full width, scrollable */
  .controls-panel {
    width: 100%;
    min-height: 0;
    overflow-y: auto;
  }
}
</style>
