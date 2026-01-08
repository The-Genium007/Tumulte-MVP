<template>
  <div class="overlay">
    <template v-for="element in visibleElements" :key="element.id">
      <LivePollElement
        v-if="element.type === 'poll'"
        :ref="(el) => setElementRef(element.id, el)"
        :element="element"
        :poll-data="activePoll"
        :percentages="percentages"
        :is-ending="isEnding"
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

// Variable pour stocker la fonction de désabonnement
let unsubscribe: (() => Promise<void>) | null = null;

onMounted(async () => {
  console.log("[Overlay] Mounting overlay for streamer:", streamerId.value);

  // Charger la configuration de l'overlay
  await fetchConfig();
  console.log("[Overlay] Config loaded, visible elements:", visibleElements.value.length);

  // S'abonner aux events de poll
  console.log("[Overlay] ========== SUBSCRIBING TO WEBSOCKET ==========");
  console.log("[Overlay] StreamerId:", streamerId.value);
  console.log("[Overlay] Expected channel: streamer:" + streamerId.value + ":polls");
  unsubscribe = subscribeToStreamerPolls(streamerId.value, {
    onPollStart: (data) => {
      let totalDuration = 60;
      if (data.endsAt) {
        const now = Date.now();
        const end = new Date(data.endsAt).getTime();
        totalDuration = Math.max(1, Math.round((end - now) / 1000));
      }
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

    // Écouter les commandes de preview pour synchroniser
    onPreviewCommand: (data) => {
      console.log("[Overlay] Preview command received:", data);
      const { elementId, command, duration, mockData } = data;
      const component = elementRefs.value[elementId];
      console.log("[Overlay] Element refs:", Object.keys(elementRefs.value));
      console.log("[Overlay] Component found:", !!component);
      if (!component) {
        console.warn("[Overlay] Component not found for elementId:", elementId);
        return;
      }

      // Si mockData est fourni, créer un poll temporaire pour l'affichage
      if (mockData) {
        console.log("[Overlay] Setting mock poll data:", mockData);
        // Créer un "fake" poll avec les données mock
        const now = new Date();
        const fakeEndsAt = new Date(
          now.getTime() + mockData.timeRemaining * 1000
        ).toISOString();
        activePoll.value = {
          pollInstanceId: `preview-${Date.now()}`,
          title: mockData.question,
          options: mockData.options,
          durationSeconds: mockData.totalDuration,
          startedAt: now.toISOString(),
          endsAt: fakeEndsAt,
          totalDuration: mockData.totalDuration,
        };
        // Convertir les pourcentages du tableau en objet indexé
        const newPercentages: Record<number, number> = {};
        mockData.percentages.forEach((p, i) => {
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
});

// Nettoyage au démontage - en dehors de onMounted pour éviter le warning Vue
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
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
</style>
