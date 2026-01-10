import { ref, onMounted, onUnmounted } from "vue";

/**
 * Interface pour l'API OBS Browser Source
 * @see https://github.com/obsproject/obs-browser
 *
 * Note: L'API peut varier selon la version d'OBS et la plateforme.
 * Certaines anciennes versions n'ont pas addEventListener.
 */
interface OBSStudioAPI {
  pluginVersion?: string;
  // Nouvelle API (OBS 28+)
  addEventListener?: (
    event: string,
    callback: (event: CustomEvent) => void,
  ) => void;
  removeEventListener?: (
    event: string,
    callback: (event: CustomEvent) => void,
  ) => void;
  // Ancienne API (callbacks directs)
  onVisibilityChange?: (callback: (visible: boolean) => void) => void;
  onActiveChange?: (callback: (active: boolean) => void) => void;
  getControlLevel?: (callback: (level: number) => void) => void;
  getCurrentScene?: (
    callback: (scene: { name: string; width: number; height: number }) => void,
  ) => void;
}

declare global {
  interface Window {
    obsstudio?: OBSStudioAPI;
  }
}

/**
 * Composable pour détecter et réagir aux events OBS Browser Source.
 * Permet de savoir quand la source devient visible/active et de récupérer l'état.
 */
export const useOBSEvents = () => {
  const isOBS = ref(false);
  const isSourceVisible = ref(true);
  const isSourceActive = ref(true);
  const pluginVersion = ref<string | null>(null);

  // Callbacks pour les changements de visibilité
  const visibilityCallbacks = new Set<(visible: boolean) => void>();
  const activeCallbacks = new Set<(active: boolean) => void>();

  // Handlers d'events
  const handleVisibilityChange = (event: CustomEvent) => {
    const visible = event.detail?.visible ?? true;
    isSourceVisible.value = visible;

    console.log("[OBS] Source visibility changed:", visible);

    visibilityCallbacks.forEach((callback) => {
      try {
        callback(visible);
      } catch (error) {
        console.error("[OBS] Error in visibility callback:", error);
      }
    });
  };

  const handleActiveChange = (event: CustomEvent) => {
    const active = event.detail?.active ?? true;
    isSourceActive.value = active;

    console.log("[OBS] Source active changed:", active);

    activeCallbacks.forEach((callback) => {
      try {
        callback(active);
      } catch (error) {
        console.error("[OBS] Error in active callback:", error);
      }
    });
  };

  /**
   * Enregistre un callback appelé quand la visibilité de la source change
   */
  const onVisibilityChange = (callback: (visible: boolean) => void) => {
    visibilityCallbacks.add(callback);
    return () => visibilityCallbacks.delete(callback);
  };

  /**
   * Enregistre un callback appelé quand l'état actif de la source change
   */
  const onActiveChange = (callback: (active: boolean) => void) => {
    activeCallbacks.add(callback);
    return () => activeCallbacks.delete(callback);
  };

  /**
   * Vérifie si on est dans un contexte OBS et initialise les listeners
   */
  const initialize = () => {
    if (typeof window === "undefined" || !window.obsstudio) {
      console.log("[OBS] Not running in OBS Browser Source");
      return;
    }

    isOBS.value = true;
    pluginVersion.value = window.obsstudio.pluginVersion || "unknown";

    console.log(
      "[OBS] Detected OBS Browser Source, plugin version:",
      pluginVersion.value,
    );

    const obs = window.obsstudio;

    // Essayer la nouvelle API (OBS 28+) avec addEventListener
    if (typeof obs.addEventListener === "function") {
      console.log("[OBS] Using new addEventListener API");
      try {
        obs.addEventListener("obsSourceVisibleChanged", handleVisibilityChange);
        obs.addEventListener("obsSourceActiveChanged", handleActiveChange);
      } catch (error) {
        console.warn("[OBS] Failed to use addEventListener:", error);
      }
    }
    // Fallback: ancienne API avec callbacks directs
    else if (typeof obs.onVisibilityChange === "function") {
      console.log("[OBS] Using legacy callback API");
      try {
        obs.onVisibilityChange((visible: boolean) => {
          isSourceVisible.value = visible;
          console.log("[OBS] Source visibility changed (legacy):", visible);
          visibilityCallbacks.forEach((cb) => {
            try {
              cb(visible);
            } catch (e) {
              console.error("[OBS] Error in visibility callback:", e);
            }
          });
        });

        if (typeof obs.onActiveChange === "function") {
          obs.onActiveChange((active: boolean) => {
            isSourceActive.value = active;
            console.log("[OBS] Source active changed (legacy):", active);
            activeCallbacks.forEach((cb) => {
              try {
                cb(active);
              } catch (e) {
                console.error("[OBS] Error in active callback:", e);
              }
            });
          });
        }
      } catch (error) {
        console.warn("[OBS] Failed to use legacy API:", error);
      }
    } else {
      console.warn("[OBS] No supported event API found in window.obsstudio");
    }

    // Récupérer le niveau de contrôle si disponible
    if (typeof obs.getControlLevel === "function") {
      try {
        obs.getControlLevel((level) => {
          console.log("[OBS] Control level:", level);
        });
      } catch (error) {
        console.warn("[OBS] Failed to get control level:", error);
      }
    }
  };

  /**
   * Nettoie les listeners
   */
  const cleanup = () => {
    if (typeof window !== "undefined" && window.obsstudio) {
      const obs = window.obsstudio;
      // Seulement si la nouvelle API est disponible
      if (typeof obs.removeEventListener === "function") {
        try {
          obs.removeEventListener(
            "obsSourceVisibleChanged",
            handleVisibilityChange,
          );
          obs.removeEventListener("obsSourceActiveChanged", handleActiveChange);
        } catch (error) {
          console.warn("[OBS] Failed to remove event listeners:", error);
        }
      }
      // L'ancienne API avec callbacks directs ne peut pas être "nettoyée"
    }
    visibilityCallbacks.clear();
    activeCallbacks.clear();
  };

  onMounted(() => {
    initialize();
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    isOBS,
    isSourceVisible,
    isSourceActive,
    pluginVersion,
    onVisibilityChange,
    onActiveChange,
  };
};
