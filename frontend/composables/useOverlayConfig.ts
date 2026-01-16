import { ref, computed, type Ref } from "vue";
import type { OverlayElement } from "@/overlay-studio/types";

/**
 * Élément dice par défaut pour les tests
 * Inclut tous les types de dés pour la prévisualisation
 */
const DEFAULT_DICE_ELEMENT: OverlayElement = {
  id: "default-dice-element",
  type: "dice",
  name: "Dés 3D",
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  visible: true,
  locked: false,
  properties: {
    colors: {
      baseColor: "#1a1a2e",
      numberColor: "#ffffff",
      criticalSuccessGlow: "#ffd700",
      criticalFailureGlow: "#ff4444",
    },
    textures: {
      enabled: false,
      textureUrl: null,
    },
    physics: {
      gravity: -30,
      bounciness: 0.4,
      friction: 0.3,
      rollForce: 1,
      spinForce: 1,
    },
    resultText: {
      enabled: true,
      typography: {
        fontFamily: "Inter",
        fontSize: 64,
        fontWeight: 800,
        color: "#ffffff",
        textShadow: {
          enabled: true,
          color: "rgba(0, 0, 0, 0.8)",
          blur: 8,
          offsetX: 0,
          offsetY: 4,
        },
      },
      offsetY: 50,
      fadeInDelay: 0.3,
      persistDuration: 3,
    },
    audio: {
      rollSound: { enabled: true, volume: 0.7 },
      criticalSuccessSound: { enabled: true, volume: 0.9 },
      criticalFailureSound: { enabled: true, volume: 0.9 },
    },
    animations: {
      entry: {
        type: "throw",
        duration: 0.5,
      },
      settle: {
        timeout: 5,
      },
      result: {
        glowIntensity: 1.5,
        glowDuration: 0.5,
      },
      exit: {
        type: "fade",
        duration: 0.5,
        delay: 2,
      },
    },
    layout: {
      maxDice: 10,
      diceSize: 80,
    },
    mockData: {
      rollFormula: "1d20",
      diceTypes: ["d20"],
      diceValues: [20],
      isCritical: true,
      criticalType: "success",
    },
  },
};

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
        // Si pas d'éléments, ajouter l'élément dice par défaut pour les tests
        if (elements.value.length === 0) {
          elements.value = [DEFAULT_DICE_ELEMENT];
        }
      } else if (response.status === 404) {
        // Pas de config, utiliser l'élément dice par défaut pour les tests
        elements.value = [DEFAULT_DICE_ELEMENT];
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
