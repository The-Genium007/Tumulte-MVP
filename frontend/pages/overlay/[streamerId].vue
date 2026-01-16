<template>
  <div class="overlay">
    <!-- Indicateur de reconnexion discret (point orange) -->
    <div
      v-if="!isWsConnected && isInitialized"
      class="connection-indicator"
      :title="`Reconnexion... (tentative ${reconnectAttempts})`"
    />

    <template v-for="element in visibleElements" :key="element.id">
      <LivePollElement
        v-if="element.type === 'poll'"
        :ref="(el) => setElementRef(element.id, el)"
        :element="element"
        :poll-data="activePoll"
        :percentages="percentages"
        :is-ending="isEnding"
        @state-change="handlePollStateChange"
      />
      <!-- DiceBox pour les éléments de type dice -->
      <div
        v-else-if="element.type === 'dice'"
        class="dice-element"
        :style="getDiceContainerStyle(element)"
      >
        <DiceBoxClient
          :notation="currentDiceNotation"
          :sounds="true"
          :volume="50"
          @roll-complete="handleDiceRollComplete"
        />
      </div>
    </template>

    <!-- Dice Roll Overlay (VTT Integration) -->
    <DiceRollOverlay
      :dice-roll="currentDiceRoll"
      :auto-hide-delay="5000"
      @hidden="handleDiceRollHidden"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import LivePollElement from "@/overlay-studio/components/LivePollElement.vue";
import DiceRollOverlay from "@/components/overlay/DiceRollOverlay.vue";
// Note: LiveDiceElement a été remplacé par DiceBox - voir DiceBox.client.vue
import { useWebSocket } from "@/composables/useWebSocket";
import { useOverlayConfig } from "@/composables/useOverlayConfig";
import { useWorkerTimer } from "@/composables/useWorkerTimer";
import { useOBSEvents } from "@/composables/useOBSEvents";
import type { PollStartEvent, DiceRollEvent } from "@/types";

// State pour l'indicateur de connexion
const isWsConnected = ref(true);
const reconnectAttempts = ref(0);
const isInitialized = ref(false);

// Worker timer pour les vérifications périodiques (résistant au throttling OBS)
const workerTimer = useWorkerTimer();

// Events OBS pour détecter les changements de visibilité de la source
const { isOBS, onVisibilityChange, onActiveChange } = useOBSEvents();

// Désactiver tout layout Nuxt
definePageMeta({
  layout: false,
});

// Récupérer le streamerId depuis les paramètres de route
const route = useRoute();
const streamerId = computed(() => route.params.streamerId as string);

// Mode preview activé via query param ?preview=true
const _isPreviewMode = computed(() => route.query.preview === "true");

// Charger la configuration de l'overlay
const { visibleElements, fetchConfig } = useOverlayConfig(streamerId);

// Refs des éléments pour contrôle externe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elementRefs = ref<Record<string, any>>({});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setElementRef = (id: string, el: any) => {
  if (el) {
    elementRefs.value[id] = el;
    console.log("[Overlay] Element ref set for:", id, "- has playEntry:", typeof el.playEntry === "function");
  }
};

// État du poll actif
const activePoll = ref<
  | (PollStartEvent & {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      campaign_id?: string;
      totalDuration: number;
    })
  | null
>(null);
const percentages = ref<Record<number, number>>({});
const isEnding = ref(false);

// État du dice roll actif (VTT Integration)
const currentDiceRoll = ref<DiceRollEvent | null>(null);
const diceRollQueue = ref<DiceRollEvent[]>([]);

// État séparé pour les dés 3D configurés dans l'overlay studio
// Les dice rolls sont envoyés aux deux systèmes (2D simple et 3D configuré)
const currentDiceRollFor3D = ref<DiceRollEvent | null>(null);

// Notation actuelle pour DiceBox (format: "2d20@5,15" pour résultats forcés)
const currentDiceNotation = ref("");

const { subscribeToStreamerPolls } = useWebSocket();

// Style du container de dés basé sur la position de l'élément
// Note: DiceBox occupe tout l'espace disponible, la position définit le coin supérieur gauche
const getDiceContainerStyle = (element: { position: { x: number; y: number }; scale: { x: number; y: number } }) => {
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

// Handler pour quand DiceBox termine un lancer
const handleDiceRollComplete = (results: unknown) => {
  console.log("[Overlay] DiceBox roll complete:", results);
  // Nettoyer la notation après le lancer
  currentDiceNotation.value = "";
};

// Handler pour les changements d'état du poll (émis par LivePollElement)
const handlePollStateChange = (newState: string) => {
  console.log("[Overlay] Poll state changed to:", newState);

  // Quand le poll passe en hidden, nettoyer l'état pour le prochain poll
  if (newState === "hidden") {
    setTimeout(() => {
      activePoll.value = null;
      percentages.value = {};
      isEnding.value = false;
      console.log("[Overlay] Poll state cleared, ready for next poll");
    }, 100);
  }
};

// Handler pour les dice rolls (VTT Integration)
const handleDiceRoll = (data: DiceRollEvent) => {
  console.log("[Overlay] Dice roll received:", data);

  // SECURITY: Never display hidden rolls on overlay (GM secret rolls)
  if (data.isHidden) {
    console.log("[Overlay] Ignoring hidden roll (GM secret)");
    return;
  }

  // Envoyer aux dés 3D configurés dans l'overlay studio (si présents)
  // Les dés 3D gèrent leur propre état et queue en interne
  currentDiceRollFor3D.value = data;

  // Construire la notation DiceBox avec résultats forcés si disponibles
  // Format: "2d20@5,15" pour forcer les résultats à 5 et 15
  let notation = data.rollFormula;
  if (data.diceResults && data.diceResults.length > 0) {
    notation += "@" + data.diceResults.join(",");
  }
  currentDiceNotation.value = notation;

  // Si un dice roll est déjà affiché (overlay 2D simple), ajouter à la queue
  if (currentDiceRoll.value) {
    diceRollQueue.value.push(data);
    console.log("[Overlay] Dice roll queued, queue size:", diceRollQueue.value.length);
  } else {
    currentDiceRoll.value = data;
  }
};

const handleDiceRollHidden = () => {
  console.log("[Overlay] Dice roll hidden");
  currentDiceRoll.value = null;

  // Afficher le prochain dice roll de la queue
  if (diceRollQueue.value.length > 0) {
    const nextRoll = diceRollQueue.value.shift();
    if (nextRoll) {
      setTimeout(() => {
        currentDiceRoll.value = nextRoll;
      }, 500); // Petit délai entre les rolls
    }
  }
};

// Variable pour stocker la fonction de désabonnement
let unsubscribe: (() => Promise<void>) | null = null;
// Compteur de ticks du worker pour vérification périodique
let lastCheckTick = 0;

// Récupérer le poll actif via HTTP (pour chargement initial et récupération après suspension OBS)
const fetchActivePoll = async () => {
  try {
    const config = useRuntimeConfig();
    const response = await fetch(
      `${config.public.apiBase}/overlay/${streamerId.value}/active-poll`,
      { credentials: "include" }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.data && !activePoll.value) {
        console.log("[Overlay] Fetched active poll from API:", data.data.pollInstanceId);
        const pollData = data.data;
        const startTime = new Date(pollData.startedAt).getTime();
        const endsAt = new Date(startTime + pollData.durationSeconds * 1000).toISOString();

        activePoll.value = {
          pollInstanceId: pollData.pollInstanceId,
          title: pollData.title,
          options: pollData.options,
          durationSeconds: pollData.durationSeconds,
          startedAt: pollData.startedAt,
          endsAt,
          totalDuration: pollData.durationSeconds,
        };
        percentages.value = pollData.percentages || {};
        isEnding.value = false;
      }
    }
  } catch (error) {
    console.warn("[Overlay] Failed to fetch active poll:", error);
  }
};

// Gérer les changements de visibilité (suspension OBS browser source)
const handleVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    console.log("[Overlay] Page became visible, checking state...");
    // Récupérer le poll actif au cas où on aurait raté des events
    fetchActivePoll();
    // Vérifier la connexion WebSocket
    if (!unsubscribe) {
      console.log("[Overlay] WebSocket disconnected, reconnecting...");
      isWsConnected.value = false;
      reconnectAttempts.value++;
      setupWebSocketSubscription();
    }
  }
};

// Fonction pour (ré)initialiser la subscription WebSocket (déclarée ici pour être accessible dans handleVisibilityChange)
const setupWebSocketSubscription = () => {
  // Nettoyer l'ancienne subscription si elle existe
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  unsubscribe = subscribeToStreamerPolls(streamerId.value, {
    onPollStart: (data) => {
      const totalDuration = data.durationSeconds || 60;
      activePoll.value = { ...data, totalDuration };
      isEnding.value = false;
    },

    onPollUpdate: (data) => {
      if (activePoll.value?.pollInstanceId === data.pollInstanceId) {
        percentages.value = data.percentages;
      }
    },

    onPollEnd: (data) => {
      if (activePoll.value?.pollInstanceId === data.pollInstanceId) {
        percentages.value = data.percentages;
        isEnding.value = true;
      }
    },

    onPreviewCommand: (data) => {
      console.log("[Overlay] Preview command received:", data);
      const { elementId, command, duration, mockData } = data;
      const component = elementRefs.value[elementId];
      if (!component) {
        console.warn("[Overlay] Component not found for elementId:", elementId);
        return;
      }

      if (mockData) {
        const now = new Date();
        const fakeEndsAt = new Date(now.getTime() + mockData.timeRemaining * 1000).toISOString();
        activePoll.value = {
          pollInstanceId: `preview-${Date.now()}`,
          title: mockData.question,
          options: mockData.options,
          durationSeconds: mockData.totalDuration,
          startedAt: now.toISOString(),
          endsAt: fakeEndsAt,
          totalDuration: mockData.totalDuration,
        };
        const newPercentages: Record<number, number> = {};
        mockData.percentages.forEach((p: number, i: number) => {
          newPercentages[i] = p;
        });
        percentages.value = newPercentages;
        isEnding.value = false;
      }

      switch (command) {
        case "playEntry":
          component.playEntry();
          break;
        case "playLoop":
          component.playLoop();
          break;
        case "stopLoop":
          component.stopLoop();
          break;
        case "playResult":
          component.playResult();
          break;
        case "playExit":
          component.playExit();
          break;
        case "playFullSequence":
          component.playFullSequence(duration || 10);
          break;
        case "reset":
          component.reset();
          activePoll.value = null;
          percentages.value = {};
          break;
      }
    },

    onLeftCampaign: (data) => {
      if (activePoll.value?.campaign_id === data.campaign_id) {
        activePoll.value = null;
        isEnding.value = false;
      }
    },

    // VTT Integration - Dice Rolls
    onDiceRoll: (data) => {
      handleDiceRoll(data);
    },

    onDiceRollCritical: (data) => {
      // SECURITY: Never display hidden rolls on overlay (GM secret rolls)
      if (data.isHidden) {
        console.log("[Overlay] Ignoring hidden critical roll (GM secret)");
        return;
      }

      // Les rolls critiques passent devant la queue
      if (currentDiceRoll.value) {
        diceRollQueue.value.unshift(data); // Ajouter au début de la queue
      } else {
        currentDiceRoll.value = data;
      }
    },
  });

  isWsConnected.value = true;
  reconnectAttempts.value = 0;
  console.log("[Overlay] WebSocket subscription established");
};

onMounted(async () => {
  console.log("[Overlay] Mounting overlay for streamer:", streamerId.value);

  // Charger la configuration de l'overlay
  await fetchConfig();
  console.log("[Overlay] Config loaded, visible elements:", visibleElements.value.length);

  // Récupérer le poll actif au chargement (recovery après refresh)
  await fetchActivePoll();

  // Marquer comme initialisé (pour l'indicateur de connexion)
  isInitialized.value = true;

  // S'abonner aux events de poll
  console.log("[Overlay] ========== SUBSCRIBING TO WEBSOCKET ==========");
  console.log("[Overlay] StreamerId:", streamerId.value);

  // Initialiser la subscription WebSocket
  setupWebSocketSubscription();

  // Écouter les changements de visibilité (OBS browser source suspension)
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Utiliser le Worker Timer pour les vérifications périodiques
  // (résistant au throttling quand l'onglet/source OBS est en arrière-plan)
  workerTimer.onTick(() => {
    lastCheckTick++;

    // Vérifier la connexion toutes les 30 secondes (30 ticks à 1s)
    if (lastCheckTick >= 30) {
      lastCheckTick = 0;

      if (!unsubscribe) {
        console.log("[Overlay] Worker detected disconnection, attempting reconnect...");
        isWsConnected.value = false;
        reconnectAttempts.value++;
        setupWebSocketSubscription();
      }

      // Récupérer le poll actif périodiquement pour rattraper les events manqués
      fetchActivePoll();
    }
  });
  workerTimer.start(1000);
  console.log("[Overlay] Worker timer started for connection monitoring");

  // Écouter les events OBS pour récupérer l'état quand la source redevient visible
  if (isOBS.value) {
    console.log("[Overlay] Running in OBS, setting up OBS event listeners");

    onVisibilityChange((visible) => {
      if (visible) {
        console.log("[Overlay] OBS source became visible, syncing state...");
        fetchActivePoll();
        if (!unsubscribe) {
          reconnectAttempts.value++;
          setupWebSocketSubscription();
        }
      }
    });

    onActiveChange((active) => {
      if (active) {
        console.log("[Overlay] OBS source became active, syncing state...");
        fetchActivePoll();
      }
    });
  }
});

// Nettoyage au démontage
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }

  // Arrêter le worker timer (cleanup automatique via le composable)
  workerTimer.stop();

  // Retirer le listener de visibilité
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});
</script>

<style>
/* Reset complet pour OBS */
html, body, #__nuxt {
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow: hidden;
}
</style>

<style scoped>
.overlay {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: transparent;
  overflow: hidden;
}

/* Indicateur de reconnexion discret (point orange) */
.connection-indicator {
  position: fixed;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background-color: #f97316;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
  z-index: 9999;
  opacity: 0.8;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* Container pour DiceBox */
.dice-element {
  z-index: 10;
}
</style>
