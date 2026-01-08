import { ref, computed, type Ref } from "vue";
import type { OverlayElement } from "@/overlay-studio/types";

interface OverlayConfigResponse {
  data: {
    config: {
      version: string;
      canvas: {
        width: number;
        height: number;
      };
      elements: OverlayElement[];
    };
  };
}

/**
 * Composable pour charger la configuration overlay d'un streamer
 * Utilisé par la page overlay OBS pour afficher les éléments configurés dans le Studio
 */
export const useOverlayConfig = (streamerId: Ref<string>) => {
  const elements = ref<OverlayElement[]>([]);
  const loading = ref(true);
  const error = ref<Error | null>(null);
  const hasConfig = computed(() => elements.value.length > 0);

  // Éléments visibles uniquement
  const visibleElements = computed(() =>
    elements.value.filter((el) => el.visible),
  );

  /**
   * Charge la configuration depuis l'API
   */
  const fetchConfig = async (): Promise<void> => {
    if (!streamerId.value) {
      loading.value = false;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const config = useRuntimeConfig();
      const response = await fetch(
        `${config.public.apiBase}/overlay/${streamerId.value}/config`,
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const data: OverlayConfigResponse = await response.json();
        elements.value = data.data.config.elements || [];
      } else if (response.status === 404) {
        // Pas de config, utiliser le fallback
        elements.value = [];
      } else {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      console.error("Error fetching overlay config:", e);
      elements.value = [];
    } finally {
      loading.value = false;
    }
  };

  return {
    elements,
    visibleElements,
    loading,
    error,
    hasConfig,
    fetchConfig,
  };
};
