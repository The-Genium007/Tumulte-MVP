<template>
  <div class="preview-page">
    <!-- Zone de prévisualisation -->
    <div class="preview-area">
      <div class="preview-header">
        <div class="preview-title-section">
          <h2 class="preview-title">Prévisualisation Overlay</h2>
          <UBadge v-if="configName" color="primary" variant="soft">
            {{ configName }}
          </UBadge>
        </div>
        <div class="preview-actions">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-left"
            to="/streamer"
          >
            Retour
          </UButton>
          <UButton
            v-if="isDev"
            color="primary"
            icon="i-heroicons-pencil-square"
            to="/streamer/studio"
          >
            Ouvrir le Studio
          </UButton>
        </div>
      </div>

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
    </div>

    <!-- Panneau de contrôles -->
    <div class="controls-panel">
      <PreviewControls
        :elements="elements"
        :selected-element-id="selectedElementId"
        :current-state="currentState"
        @select-element="selectElement"
        @toggle-visibility="toggleVisibility"
        @play-entry="handlePlayEntry"
        @play-loop="handlePlayLoop"
        @stop-loop="handleStopLoop"
        @play-result="handlePlayResult"
        @play-exit="handlePlayExit"
        @play-full-sequence="handlePlayFullSequence"
        @reset="handleReset"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import PreviewPollElement from "@/overlay-studio/components/PreviewPollElement.vue";
import PreviewControls from "@/overlay-studio/components/PreviewControls.vue";
import { useOverlayStudioStore } from "@/overlay-studio/stores/overlayStudio";
import { useOverlayStudioApi } from "@/overlay-studio/composables/useOverlayStudioApi";
import type { PollProperties } from "@/overlay-studio/types";
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
const configName = ref<string | null>(null);
const selectedElementId = ref<string | null>(null);
const canvasWrapper = ref<HTMLElement | null>(null);
const canvasContainer = ref<HTMLElement | null>(null);

// Échelle calculée pour adapter le canvas à l'espace disponible
const canvasScale = ref(1);

// État des animations par élément
const elementStates = ref<Record<string, AnimationState>>({});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elementRefs = ref<Record<string, any>>({});

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
    transformOrigin: "center center",
  };
});

// Calculer l'échelle du canvas en fonction de l'espace disponible
const calculateCanvasScale = () => {
  if (!canvasWrapper.value) return;

  const wrapperRect = canvasWrapper.value.getBoundingClientRect();
  // Ajouter une marge pour éviter que le canvas touche les bords
  const availableWidth = wrapperRect.width - 32;
  const availableHeight = wrapperRect.height - 32;

  // Calculer l'échelle pour que le canvas 1920x1080 tienne dans l'espace disponible
  const scaleX = availableWidth / CANVAS_WIDTH;
  const scaleY = availableHeight / CANVAS_HEIGHT;

  // Utiliser la plus petite échelle pour préserver le ratio
  canvasScale.value = Math.min(scaleX, scaleY, 1); // Max 1 pour ne pas agrandir
};

// Observer le redimensionnement
let resizeObserver: ResizeObserver | null = null;

// Charger la configuration au montage
onMounted(async () => {
  try {
    // La configuration est déjà dans le store si on vient du Studio
    // Sinon, on charge la configuration active depuis l'API
    if (store.elements.length === 0) {
      // Charger la liste des configs pour trouver celle qui est active
      const configs = await api.fetchConfigs();
      const activeConfig = configs.find((c) => c.isActive);

      if (activeConfig) {
        // Charger les détails de la config active
        const fullConfig = await api.fetchConfig(activeConfig.id);
        store.loadConfig(fullConfig.config);
        configName.value = fullConfig.name;
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

// Sélectionner un élément
const selectElement = (id: string) => {
  selectedElementId.value = id;
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
};
</script>

<style scoped>
.preview-page {
  display: flex;
  height: 100vh;
  background: var(--ui-bg);
}

.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.preview-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.preview-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ui-text);
  margin: 0;
}

.preview-actions {
  display: flex;
  gap: 0.75rem;
}

.preview-canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--ui-bg-elevated);
  border-radius: 1rem;
  overflow: hidden;
  min-height: 0; /* Permet au flex de réduire la taille */
}

.preview-canvas {
  position: relative;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  /* Empêcher le canvas de dépasser avec le scale */
  flex-shrink: 0;
}

/* Fond en damier style Photoshop */
.checkerboard-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
    linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
    linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
  background-color: #1a1a1a;
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
  width: 320px;
  border-left: 1px solid var(--ui-border);
  background: var(--ui-bg);
  overflow-y: auto;
}

/* Responsive */
@media (max-width: 1024px) {
  .preview-page {
    flex-direction: column;
  }

  .controls-panel {
    width: 100%;
    max-height: 40vh;
    border-left: none;
    border-top: 1px solid var(--ui-border);
  }
}
</style>
