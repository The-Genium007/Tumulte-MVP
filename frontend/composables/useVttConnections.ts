import { ref, readonly } from "vue";
import { useSupportTrigger } from "@/composables/useSupportTrigger";

export interface VttProvider {
  id: string;
  name: string;
  displayName: string;
  authType: string;
  isActive: boolean;
  configSchema: Record<string, unknown> | null;
}

export interface VttConnection {
  id: string;
  userId: string;
  vttProviderId: string;
  name: string;
  apiKey: string;
  webhookUrl: string;
  status: "pending" | "active" | "expired" | "revoked";
  tunnelStatus?: "connecting" | "connected" | "disconnected" | "error";
  worldId?: string;
  worldName?: string;
  moduleVersion?: string;
  lastWebhookAt: string | null;
  lastHeartbeatAt?: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: VttProvider;
}

export interface VttConnectionWithCampaigns {
  connection: VttConnection;
  campaigns: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
}

export const useVttConnections = () => {
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;
  const { triggerSupportForError } = useSupportTrigger();

  const connections = ref<VttConnection[]>([]);
  const providers = ref<VttProvider[]>([]);
  const loading = ref<boolean>(false);

  /**
   * Récupère toutes les connexions VTT du GM authentifié
   * GET /mj/vtt-connections
   */
  const fetchConnections = async (): Promise<void> => {
    loading.value = true;
    try {
      const response = await fetch(`${API_URL}/mj/vtt-connections`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch VTT connections");
      const data = await response.json();
      connections.value = data;
    } catch (error) {
      console.error("Failed to fetch VTT connections:", error);
      triggerSupportForError("vtt_connections_fetch", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les détails d'une connexion VTT avec ses campagnes liées
   * GET /mj/vtt-connections/:id
   */
  const getConnectionDetails = async (
    id: string,
  ): Promise<VttConnectionWithCampaigns> => {
    try {
      const response = await fetch(`${API_URL}/mj/vtt-connections/${id}`, {
        credentials: "include",
      });
      if (!response.ok)
        throw new Error("Failed to fetch VTT connection details");
      const data = await response.json();
      return data;
    } catch (error) {
      triggerSupportForError("vtt_connection_fetch_detail", error);
      throw error;
    }
  };

  /**
   * Crée une nouvelle connexion VTT
   * POST /mj/vtt-connections
   */
  const createConnection = async (data: {
    vttProviderId: string;
    name: string;
    webhookUrl: string;
  }): Promise<VttConnection> => {
    try {
      const response = await fetch(`${API_URL}/mj/vtt-connections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create VTT connection");
      const result = await response.json();
      connections.value.unshift(result);
      return result;
    } catch (error) {
      triggerSupportForError("vtt_connection_create", error);
      throw error;
    }
  };

  /**
   * Met à jour une connexion VTT
   * PUT /mj/vtt-connections/:id
   */
  const updateConnection = async (
    id: string,
    data: {
      name?: string;
      webhookUrl?: string;
      status?: "pending" | "active" | "expired" | "revoked";
    },
  ): Promise<VttConnection> => {
    try {
      const response = await fetch(`${API_URL}/mj/vtt-connections/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update VTT connection");
      const result = await response.json();
      const index = connections.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        connections.value[index] = result;
      }
      return result;
    } catch (error) {
      triggerSupportForError("vtt_connection_update", error);
      throw error;
    }
  };

  /**
   * Supprime une connexion VTT
   * DELETE /mj/vtt-connections/:id
   */
  const deleteConnection = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/mj/vtt-connections/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        throw new Error("Failed to delete VTT connection");
      }
      connections.value = connections.value.filter((c) => c.id !== id);
    } catch (error) {
      triggerSupportForError("vtt_connection_delete", error);
      throw error;
    }
  };

  /**
   * Regénère l'API key d'une connexion
   * POST /mj/vtt-connections/:id/regenerate-key
   */
  const regenerateApiKey = async (id: string): Promise<VttConnection> => {
    try {
      const response = await fetch(
        `${API_URL}/mj/vtt-connections/${id}/regenerate-key`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to regenerate API key");
      const result = await response.json();
      const index = connections.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        connections.value[index] = result;
      }
      return result;
    } catch (error) {
      triggerSupportForError("vtt_connection_regenerate_key", error);
      throw error;
    }
  };

  /**
   * Récupère la liste des providers VTT disponibles
   * GET /mj/vtt-providers
   */
  const fetchProviders = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/mj/vtt-providers`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch VTT providers");
      const data = await response.json();
      providers.value = data;
    } catch (error) {
      console.error("Failed to fetch VTT providers:", error);
      triggerSupportForError("vtt_providers_fetch", error);
      throw error;
    }
  };

  return {
    // State
    connections: readonly(connections),
    providers: readonly(providers),
    loading: readonly(loading),

    // Methods
    fetchConnections,
    getConnectionDetails,
    createConnection,
    updateConnection,
    deleteConnection,
    regenerateApiKey,
    fetchProviders,
  };
};
