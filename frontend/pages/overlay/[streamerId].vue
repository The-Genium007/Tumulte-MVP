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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import LivePollElement from "@/overlay-studio/components/LivePollElement.vue";
import { useWebSocket } from "@/composables/useWebSocket";
import { useOverlayConfig } from "@/composables/useOverlayConfig";
import type { PollStartEvent } from "@/types";

// State pour l'indicateur de connexion
const isWsConnected = ref(true);
const reconnectAttempts = ref(0);
const isInitialized = ref(false);

// Désactiver tout layout Nuxt
definePageMeta({
  layout: false,
});

// Récupérer le streamerId depuis les paramètres de route
const route = useRoute();
const streamerId = computed(() => route.params.streamerId as string);

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

const { subscribeToStreamerPolls } = useWebSocket();

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

// Variable pour stocker la fonction de désabonnement
let unsubscribe: (() => Promise<void>) | null = null;
// Intervalle de vérification de connexion
let connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

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

  // Fallback: Vérifier périodiquement la connexion et reconnecter si nécessaire
  connectionCheckInterval = setInterval(() => {
    if (!unsubscribe) {
      console.log("[Overlay] Detected disconnection, attempting reconnect...");
      isWsConnected.value = false;
      reconnectAttempts.value++;
      setupWebSocketSubscription();
    }
  }, 30000);
});

// Nettoyage au démontage
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }

  // Nettoyer l'intervalle de vérification de connexion
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }

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
</style>
