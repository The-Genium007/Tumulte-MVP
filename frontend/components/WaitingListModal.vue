<template>
  <UModal v-model:open="store.isModalOpen" :prevent-close="isRetrying">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="bg-warning-500/10 p-2 rounded-lg">
          <UIcon name="i-lucide-users" class="size-6 text-warning-500" />
        </div>
        <div>
          <h3 class="text-xl font-semibold text-white">
            En attente des streamers
          </h3>
          <p class="text-sm text-gray-400">
            {{ store.readyCount }} / {{ store.totalCount }} prêts
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- Progress bar -->
        <UProgress
          :value="store.readyPercentage"
          color="primary"
          size="md"
          :indicator="true"
        />

        <!-- Liste des streamers -->
        <div class="space-y-2 max-h-80 overflow-y-auto">
          <!-- Streamers non prêts en premier -->
          <StreamerReadinessItem
            v-for="streamer in store.unreadyStreamers"
            :key="streamer.streamerId"
            :streamer="streamer"
            :live-status="liveStatuses[streamer.twitchUserId]"
          />

          <!-- Séparateur si on a des prêts et non prêts -->
          <div
            v-if="store.unreadyStreamers.length > 0 && store.readyStreamers.length > 0"
            class="border-t border-gray-700 my-3"
          />

          <!-- Streamers prêts ensuite -->
          <StreamerReadinessItem
            v-for="streamer in store.readyStreamers"
            :key="streamer.streamerId"
            :streamer="streamer"
            :live-status="liveStatuses[streamer.twitchUserId]"
          />
        </div>

        <!-- Info banner -->
        <UAlert
          v-if="!store.allReady"
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Lancement automatique"
          description="La session démarrera automatiquement dès que tous les streamers seront prêts."
        />

        <UAlert
          v-else
          color="success"
          variant="soft"
          icon="i-lucide-check-circle"
          title="Tous les streamers sont prêts !"
          description="Lancement de la session en cours..."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between gap-3 w-full">
        <UButton
          color="neutral"
          variant="soft"
          label="Annuler"
          :disabled="isRetrying"
          @click="handleCancel"
        />

        <div class="flex gap-2">
          <UButton
            v-if="store.unreadyStreamers.length > 0"
            color="warning"
            variant="soft"
            :loading="isNotifying"
            :disabled="isRetrying"
            @click="handleNotify"
          >
            <UIcon name="i-lucide-bell" class="size-4 mr-1" />
            Notifier ({{ store.unreadyStreamers.length }})
          </UButton>

          <UButton
            color="primary"
            :loading="isRetrying"
            :disabled="!store.allReady && !isRetrying"
            @click="handleRetry"
          >
            <UIcon name="i-lucide-play" class="size-4 mr-1" />
            {{ isRetrying ? "Lancement..." : "Réessayer" }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { useStreamerReadinessStore } from "@/stores/streamerReadiness";
import { useReadiness } from "@/composables/useReadiness";
import { useWebSocket } from "@/composables/useWebSocket";
import type { LiveStatusMap } from "@/types";

const toast = useToast();

const props = defineProps<{
  liveStatuses?: LiveStatusMap;
}>();

const emit = defineEmits<{
  launched: [];
  cancelled: [];
}>();

const store = useStreamerReadinessStore();
const { notifyUnready, retryLaunch } = useReadiness();
const { subscribeToCampaignReadiness } = useWebSocket();

const isNotifying = ref(false);
const isRetrying = ref(false);
let unsubscribe: (() => Promise<void>) | null = null;

// Livestatuses fallback
const liveStatuses = computed(() => props.liveStatuses ?? {});

// S'abonner aux changements de readiness via WebSocket
const setupWebSocketSubscription = () => {
  if (!store.pendingCampaignId) return;

  unsubscribe = subscribeToCampaignReadiness(store.pendingCampaignId, {
    onStreamerReady: (event) => {
      console.log("[WaitingListModal] Streamer ready:", event);
      store.updateStreamerStatus(event);
    },
    onStreamerNotReady: (event) => {
      console.log("[WaitingListModal] Streamer not ready:", event);
      store.updateStreamerStatus(event);
    },
  });
};

// Auto-retry quand tous les streamers sont prêts
watch(
  () => store.allReady,
  async (allReady) => {
    if (allReady && store.isModalOpen && !isRetrying.value) {
      console.log("[WaitingListModal] All streamers ready, auto-retrying...");
      // Petite attente pour montrer le message de succès
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await handleRetry();
    }
  },
);

// Setup WebSocket quand la modal s'ouvre
watch(
  () => store.isModalOpen,
  (isOpen) => {
    if (isOpen) {
      setupWebSocketSubscription();
    } else {
      cleanupSubscription();
    }
  },
);

const cleanupSubscription = async () => {
  if (unsubscribe) {
    await unsubscribe();
    unsubscribe = null;
  }
};

const handleCancel = () => {
  store.closeModal();
  emit("cancelled");
};

const handleNotify = async () => {
  if (!store.pendingCampaignId) return;

  isNotifying.value = true;
  try {
    const result = await notifyUnready(store.pendingCampaignId);
    console.log("[WaitingListModal] Notified streamers:", result);

    // Afficher un toast de confirmation
    if (result.notified > 0) {
      toast.add({
        title: "Notifications envoyées",
        description: `${result.notified} streamer(s) notifié(s)`,
        color: "success",
      });
    } else {
      toast.add({
        title: "Aucune notification envoyée",
        description: "Les streamers n'ont pas activé les notifications push",
        color: "warning",
      });
    }
  } catch (error) {
    console.error("[WaitingListModal] Failed to notify:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible d'envoyer les notifications",
      color: "error",
    });
  } finally {
    isNotifying.value = false;
  }
};

const handleRetry = async () => {
  isRetrying.value = true;
  try {
    const result = await retryLaunch();
    if (result.success) {
      console.log("[WaitingListModal] Session launched successfully");
      store.closeModal();
      emit("launched");
    }
    // Si échec avec nouveaux readinessDetails, le store sera mis à jour automatiquement
  } catch (error) {
    console.error("[WaitingListModal] Retry failed:", error);
  } finally {
    isRetrying.value = false;
  }
};

onMounted(() => {
  if (store.isModalOpen) {
    setupWebSocketSubscription();
  }
});

onUnmounted(() => {
  cleanupSubscription();
});
</script>
