import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  CampaignReadiness,
  StreamerReadiness,
  ReadinessChangeEvent,
} from "@/types";

/**
 * Store pour gérer l'état de readiness des streamers
 * Utilisé pour la waiting list avant le lancement de session
 */
export const useStreamerReadinessStore = defineStore(
  "streamerReadiness",
  () => {
    // State
    const readiness = ref<CampaignReadiness | null>(null);
    const isLoading = ref(false);
    const isModalOpen = ref(false);
    const pendingSessionId = ref<string | null>(null);
    const pendingCampaignId = ref<string | null>(null);

    // Getters
    const allReady = computed(() => readiness.value?.allReady ?? false);
    const readyCount = computed(() => readiness.value?.readyCount ?? 0);
    const totalCount = computed(() => readiness.value?.totalCount ?? 0);
    const unreadyStreamers = computed(
      () => readiness.value?.streamers.filter((s) => !s.isReady) ?? [],
    );
    const readyStreamers = computed(
      () => readiness.value?.streamers.filter((s) => s.isReady) ?? [],
    );
    const readyPercentage = computed(() => {
      if (totalCount.value === 0) return 0;
      return Math.round((readyCount.value / totalCount.value) * 100);
    });

    // Actions
    function setReadiness(data: CampaignReadiness) {
      readiness.value = data;
    }

    function updateStreamerStatus(event: ReadinessChangeEvent) {
      if (!readiness.value) return;

      const streamer = readiness.value.streamers.find(
        (s) => s.streamerId === event.streamerId,
      );

      if (streamer) {
        streamer.isReady = event.isReady;

        // Si le streamer est maintenant prêt, vider ses issues
        if (event.isReady) {
          streamer.issues = [];
        }

        // Recalculer les compteurs
        readiness.value.readyCount = readiness.value.streamers.filter(
          (s) => s.isReady,
        ).length;
        readiness.value.allReady =
          readiness.value.readyCount === readiness.value.totalCount;
      }
    }

    function openModal(
      campaignId: string,
      sessionId: string,
      data: CampaignReadiness,
    ) {
      pendingCampaignId.value = campaignId;
      pendingSessionId.value = sessionId;
      readiness.value = data;
      isModalOpen.value = true;
    }

    function closeModal() {
      isModalOpen.value = false;
      pendingSessionId.value = null;
      pendingCampaignId.value = null;
      readiness.value = null;
    }

    function setLoading(loading: boolean) {
      isLoading.value = loading;
    }

    function reset() {
      readiness.value = null;
      isLoading.value = false;
      isModalOpen.value = false;
      pendingSessionId.value = null;
      pendingCampaignId.value = null;
    }

    return {
      // State
      readiness,
      isLoading,
      isModalOpen,
      pendingSessionId,
      pendingCampaignId,

      // Getters
      allReady,
      readyCount,
      totalCount,
      unreadyStreamers,
      readyStreamers,
      readyPercentage,

      // Actions
      setReadiness,
      updateStreamerStatus,
      openModal,
      closeModal,
      setLoading,
      reset,
    };
  },
);
