import { ref, readonly } from "vue";
import { useDebounceFn } from "@vueuse/core";
import type { OverlayConfig, OverlayConfigData } from "../types";
import type { PreviewCommand, PreviewMockData } from "@/types";
import { useSupportTrigger } from "@/composables/useSupportTrigger";
import { useOverlayStudioStore } from "../stores/overlayStudio";

/**
 * API response types
 */
interface OverlayConfigResponse {
  id: string;
  streamerId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OverlayConfigDetailResponse extends OverlayConfigResponse {
  config: OverlayConfigData;
}

/**
 * Composable pour interagir avec l'API Overlay Studio
 */
export const useOverlayStudioApi = () => {
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;
  const { triggerSupportForError } = useSupportTrigger();

  const configs = ref<OverlayConfig[]>([]);
  const currentConfig = ref<OverlayConfig | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const autoSaving = ref(false);

  // Auto-save delay en millisecondes
  const AUTO_SAVE_DELAY = 2000;

  /**
   * Récupère toutes les configurations du streamer
   */
  const fetchConfigs = async (): Promise<OverlayConfig[]> => {
    loading.value = true;
    try {
      const response = await fetch(
        `${API_URL}/streamer/overlay-studio/configs`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to fetch overlay configs");
      const data = await response.json();
      configs.value = data.data.map(mapResponseToConfig);
      return configs.value;
    } catch (error) {
      console.error("Failed to fetch overlay configs:", error);
      triggerSupportForError("overlay_configs_fetch", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère une configuration par son ID
   */
  const fetchConfig = async (id: string): Promise<OverlayConfig> => {
    loading.value = true;
    try {
      const response = await fetch(
        `${API_URL}/streamer/overlay-studio/configs/${id}`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to fetch overlay config");
      const data = await response.json();
      currentConfig.value = mapDetailResponseToConfig(data.data);
      return currentConfig.value;
    } catch (error) {
      console.error("Failed to fetch overlay config:", error);
      triggerSupportForError("overlay_config_fetch", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Crée une nouvelle configuration
   */
  const createConfig = async (payload: {
    name: string;
    config: OverlayConfigData;
  }): Promise<OverlayConfig> => {
    saving.value = true;
    try {
      const response = await fetch(
        `${API_URL}/streamer/overlay-studio/configs`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create overlay config");
      }
      const data = await response.json();
      const newConfig = mapDetailResponseToConfig(data.data);
      configs.value.unshift(newConfig);
      currentConfig.value = newConfig;
      return newConfig;
    } catch (error) {
      console.error("Failed to create overlay config:", error);
      triggerSupportForError("overlay_config_create", error);
      throw error;
    } finally {
      saving.value = false;
    }
  };

  /**
   * Met à jour une configuration existante
   */
  const updateConfig = async (
    id: string,
    payload: {
      name?: string;
      config?: OverlayConfigData;
    },
  ): Promise<OverlayConfig> => {
    saving.value = true;
    try {
      const response = await fetch(
        `${API_URL}/streamer/overlay-studio/configs/${id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update overlay config");
      }
      const data = await response.json();
      const updatedConfig = mapDetailResponseToConfig(data.data);

      // Update in list
      const index = configs.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        configs.value[index] = updatedConfig;
      }

      // Update current if same
      if (currentConfig.value?.id === id) {
        currentConfig.value = updatedConfig;
      }

      return updatedConfig;
    } catch (error) {
      console.error("Failed to update overlay config:", error);
      triggerSupportForError("overlay_config_update", error);
      throw error;
    } finally {
      saving.value = false;
    }
  };

  /**
   * Supprime une configuration
   */
  const deleteConfig = async (id: string): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/streamer/overlay-studio/configs/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to delete overlay config");

      configs.value = configs.value.filter((c) => c.id !== id);
      if (currentConfig.value?.id === id) {
        currentConfig.value = null;
      }
    } catch (error) {
      console.error("Failed to delete overlay config:", error);
      triggerSupportForError("overlay_config_delete", error);
      throw error;
    }
  };

  /**
   * Active une configuration
   */
  const activateConfig = async (id: string): Promise<OverlayConfig> => {
    saving.value = true;
    try {
      const response = await fetch(
        `${API_URL}/streamer/overlay-studio/configs/${id}/activate`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to activate overlay config");
      const data = await response.json();
      const activatedConfig = mapResponseToConfig(data.data);

      // Update all configs' isActive status
      configs.value = configs.value.map((c) => ({
        ...c,
        isActive: c.id === id,
      }));

      if (currentConfig.value?.id === id) {
        currentConfig.value = { ...currentConfig.value, isActive: true };
      }

      return activatedConfig;
    } catch (error) {
      console.error("Failed to activate overlay config:", error);
      triggerSupportForError("overlay_config_activate", error);
      throw error;
    } finally {
      saving.value = false;
    }
  };

  /**
   * Envoie une commande de preview à l'overlay OBS via WebSocket
   */
  const sendPreviewCommand = async (
    elementId: string,
    command: PreviewCommand,
    options?: {
      duration?: number;
      mockData?: PreviewMockData;
    },
  ): Promise<void> => {
    try {
      const payload: {
        elementId: string;
        command: PreviewCommand;
        duration?: number;
        mockData?: PreviewMockData;
      } = {
        elementId,
        command,
      };
      if (options?.duration !== undefined) {
        payload.duration = options.duration;
      }
      if (options?.mockData !== undefined) {
        payload.mockData = options.mockData;
      }

      const response = await fetch(
        `${API_URL}/streamer/overlay-studio/preview-command`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send preview command");
      }
    } catch (error) {
      console.error("Failed to send preview command:", error);
      // Don't trigger support for preview commands - not critical
    }
  };

  /**
   * Auto-save debounced - sauvegarde automatique après un délai sans modification
   * Appelle markAsSaved() sur le store après une sauvegarde réussie
   */
  const autoSave = useDebounceFn(
    async (id: string, configData: OverlayConfigData) => {
      if (autoSaving.value || saving.value) return;

      autoSaving.value = true;
      try {
        const response = await fetch(
          `${API_URL}/streamer/overlay-studio/configs/${id}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: configData }),
          },
        );

        if (!response.ok) {
          console.error("[AutoSave] Failed to save config");
          return;
        }

        const data = await response.json();
        const updatedConfig = mapDetailResponseToConfig(data.data);

        // Update in list
        const index = configs.value.findIndex((c) => c.id === id);
        if (index !== -1) {
          configs.value[index] = updatedConfig;
        }

        // Update current if same
        if (currentConfig.value?.id === id) {
          currentConfig.value = updatedConfig;
        }

        // Marquer comme sauvegardé dans le store
        const store = useOverlayStudioStore();
        store.markAsSaved();

        console.log("[AutoSave] Config saved successfully");
      } catch (error) {
        console.error("[AutoSave] Error:", error);
        // Ne pas trigger le support pour l'auto-save - pas critique
      } finally {
        autoSaving.value = false;
      }
    },
    AUTO_SAVE_DELAY,
  );

  /**
   * Map API response to OverlayConfig (list item)
   */
  const mapResponseToConfig = (
    response: OverlayConfigResponse,
  ): OverlayConfig => ({
    id: response.id,
    streamerId: response.streamerId,
    name: response.name,
    config: {
      version: "1.0",
      canvas: { width: 1920, height: 1080 },
      elements: [],
    },
    isActive: response.isActive,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  });

  /**
   * Map API detail response to OverlayConfig (with full config)
   */
  const mapDetailResponseToConfig = (
    response: OverlayConfigDetailResponse,
  ): OverlayConfig => ({
    id: response.id,
    streamerId: response.streamerId,
    name: response.name,
    config: response.config,
    isActive: response.isActive,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  });

  return {
    // State
    configs: readonly(configs),
    currentConfig: readonly(currentConfig),
    loading: readonly(loading),
    saving: readonly(saving),
    autoSaving: readonly(autoSaving),

    // Methods
    fetchConfigs,
    fetchConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    activateConfig,
    sendPreviewCommand,
    autoSave,
  };
};
