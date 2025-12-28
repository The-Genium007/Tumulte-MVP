import { ref, computed, readonly, onMounted, onUnmounted } from "vue";
import { useIntervalFn } from "@vueuse/core";

/**
 * Composable pour gérer les notifications d'invitations aux campagnes
 */
export const useNotifications = () => {
  const invitationCount = ref(0);
  const loading = ref(false);
  const { fetchInvitations } = useCampaigns();
  const { isStreamer } = useAuth();

  /**
   * Rafraîchit le compteur d'invitations en attente
   */
  const refreshInvitations = async () => {
    // Ne charger les invitations que pour les streamers
    if (!isStreamer.value) {
      invitationCount.value = 0;
      return;
    }

    try {
      loading.value = true;
      const invitations = await fetchInvitations();
      invitationCount.value = invitations.length;
    } catch (error) {
      console.error("Erreur lors du chargement des invitations:", error);
      invitationCount.value = 0;
    } finally {
      loading.value = false;
    }
  };

  // Auto-refresh toutes les 30 secondes
  const { pause, resume, isActive } = useIntervalFn(
    refreshInvitations,
    30000, // 30s
    { immediate: false },
  );

  // Charger les invitations au montage du composant
  onMounted(async () => {
    await refreshInvitations();
    resume();
  });

  // Nettoyer l'intervalle au démontage
  onUnmounted(() => {
    pause();
  });

  return {
    invitationCount: readonly(invitationCount),
    loading: readonly(loading),
    hasInvitations: computed(() => invitationCount.value > 0),
    refreshInvitations,
    pausePolling: pause,
    resumePolling: resume,
    isPolling: computed(() => isActive.value),
  };
};
