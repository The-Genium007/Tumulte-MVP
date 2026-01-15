import { ref, readonly } from "vue";
import { useVttConnections } from "@/composables/useVttConnections";

/**
 * Composable pour la synchronisation automatique des connexions VTT
 * Utilisé au login pour récupérer les campagnes disponibles depuis les VTT
 */
export const useVttAutoSync = () => {
  const config = useRuntimeConfig();
  const { fetchConnections } = useVttConnections();

  const lastSyncTime = ref<number | null>(null);
  const isFirstSync = ref(false);
  const syncing = ref(false);

  /**
   * Initialise la synchronisation VTT au login
   * - Charge les dernières données de sync
   * - Lance la synchronisation de toutes les connexions
   * - Met à jour le timestamp de dernière sync
   */
  const initialize = async (): Promise<void> => {
    syncing.value = true;

    try {
      // Pour l'instant, on considère que c'est toujours la première sync
      // TODO: Implémenter le stockage IndexedDB pour lastSyncTime
      isFirstSync.value = true;

      // Fetch fresh data depuis API - sync toutes les connexions
      await syncAllConnections();

      // Update last sync time
      lastSyncTime.value = Date.now();
    } catch (error) {
      console.error("[VttAutoSync] Failed to initialize:", error);
    } finally {
      syncing.value = false;
    }
  };

  /**
   * Synchronise toutes les connexions VTT de l'utilisateur
   * Appelle l'endpoint backend qui fetch les campagnes depuis chaque VTT
   */
  const syncAllConnections = async (): Promise<void> => {
    try {
      const response = await fetch(
        `${config.public.apiBase}/mj/vtt-connections/sync-all`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Sync failed");
      }

      // Après sync, recharger les connexions
      await fetchConnections();
    } catch (error) {
      console.error("[VttAutoSync] Failed to sync all connections:", error);
      throw error;
    }
  };

  return {
    initialize,
    lastSyncTime: readonly(lastSyncTime),
    isFirstSync: readonly(isFirstSync),
    syncing: readonly(syncing),
  };
};
