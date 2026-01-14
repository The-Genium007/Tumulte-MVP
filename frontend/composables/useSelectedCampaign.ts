/**
 * Composable pour gérer la campagne sélectionnée avec persistance localStorage
 *
 * Permet de conserver la sélection de campagne entre les sessions utilisateur.
 */
export const useSelectedCampaign = () => {
  const STORAGE_KEY = "mj_selected_campaign_id";

  const selectedCampaignId = ref<string | null>(null);

  /**
   * Charge l'ID de campagne depuis localStorage
   * À appeler dans onMounted côté client
   */
  const loadFromStorage = () => {
    if (import.meta.server) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      selectedCampaignId.value = stored;
    }
  };

  /**
   * Efface la sélection (localStorage + ref)
   */
  const clearSelection = () => {
    selectedCampaignId.value = null;
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Sauvegarde automatique dans localStorage à chaque changement
  watch(selectedCampaignId, (newId) => {
    if (import.meta.server) return;

    if (newId) {
      localStorage.setItem(STORAGE_KEY, newId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  });

  return {
    selectedCampaignId,
    loadFromStorage,
    clearSelection,
  };
};
