import { ref, onMounted, onUnmounted } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useOverlayStudioStore } from "../stores/overlayStudio";

/**
 * Composable pour protéger la navigation quand il y a des modifications non sauvegardées
 * Fonctionne avec Vue Router (navigation interne) et beforeunload (fermeture/refresh)
 */
export const useUnsavedChangesGuard = () => {
  const store = useOverlayStudioStore();

  // État de la modal de confirmation
  const showUnsavedModal = ref(false);
  const pendingNavigation = ref<(() => void) | null>(null);

  /**
   * Guard Vue Router - intercepte la navigation interne
   */
  onBeforeRouteLeave((_to, _from, next) => {
    if (store.isDirty) {
      showUnsavedModal.value = true;
      pendingNavigation.value = () => next();
      // Bloquer la navigation
      next(false);
    } else {
      next();
    }
  });

  /**
   * Handler pour beforeunload - protège contre fermeture onglet/refresh
   */
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (store.isDirty) {
      e.preventDefault();
      // Chrome requiert returnValue
      e.returnValue = "";
    }
  };

  onMounted(() => {
    window.addEventListener("beforeunload", beforeUnloadHandler);
  });

  onUnmounted(() => {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
  });

  /**
   * Confirmer la navigation (quitter sans sauvegarder)
   */
  const confirmLeave = () => {
    showUnsavedModal.value = false;
    // Reset dirty state pour éviter que le guard se re-déclenche
    store.markAsSaved();
    // Exécuter la navigation en attente
    pendingNavigation.value?.();
    pendingNavigation.value = null;
  };

  /**
   * Annuler la navigation (rester sur la page)
   */
  const cancelLeave = () => {
    showUnsavedModal.value = false;
    pendingNavigation.value = null;
  };

  return {
    showUnsavedModal,
    confirmLeave,
    cancelLeave,
  };
};
