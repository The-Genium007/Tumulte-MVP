import { ref, readonly } from "vue";
import type { PollTemplate } from "@/types";

const API_URL = import.meta.env.VITE_API_URL;

export const usePollTemplates = () => {
  const templates = ref<PollTemplate[]>([]);
  const loading = ref<boolean>(false);

  /**
   * Récupère tous les templates (optionnellement filtrés par campagne)
   */
  const fetchTemplates = async (campaignId?: string): Promise<void> => {
    loading.value = true;
    try {
      const url = campaignId
        ? `${API_URL}/mj/campaigns/${campaignId}/templates`
        : `${API_URL}/mj/poll-templates`;

      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      templates.value = data.data;
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Crée un nouveau template (optionnellement lié à une campagne)
   */
  const createTemplate = async (
    template: {
      label: string;
      title: string;
      options: string[];
      // eslint-disable-next-line @typescript-eslint/naming-convention
      duration_seconds: number;
    },
    campaignId?: string,
  ): Promise<PollTemplate> => {
    try {
      const url = campaignId
        ? `${API_URL}/mj/campaigns/${campaignId}/templates`
        : `${API_URL}/mj/poll-templates`;

      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!response.ok) throw new Error("Failed to create template");
      const data = await response.json();
      templates.value.unshift(data.data);
      return data.data;
    } catch (error) {
      console.error("Failed to create template:", error);
      throw error;
    }
  };

  /**
   * Met à jour un template existant
   */
  const updateTemplate = async (
    id: string,
    updates: Partial<{
      label: string;
      title: string;
      options: string[];
      // eslint-disable-next-line @typescript-eslint/naming-convention
      duration_seconds: number;
    }>,
    campaignId?: string,
  ): Promise<PollTemplate> => {
    try {
      const url = campaignId
        ? `${API_URL}/mj/campaigns/${campaignId}/templates/${id}`
        : `${API_URL}/mj/poll-templates/${id}`;

      const response = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update template");
      const data = await response.json();
      const index = templates.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        templates.value[index] = data.data;
      }
      return data.data;
    } catch (error) {
      console.error("Failed to update template:", error);
      throw error;
    }
  };

  /**
   * Supprime un template
   */
  const deleteTemplate = async (id: string, campaignId?: string): Promise<void> => {
    try {
      const url = campaignId
        ? `${API_URL}/mj/campaigns/${campaignId}/templates/${id}`
        : `${API_URL}/mj/poll-templates/${id}`;

      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete template");
      templates.value = templates.value.filter((t) => t.id !== id);
    } catch (error) {
      console.error("Failed to delete template:", error);
      throw error;
    }
  };

  /**
   * Lance un sondage à partir d'un template (optionnellement lié à une campagne)
   */
  const launchPoll = async (templateId: string, campaignId?: string): Promise<void> => {
    try {
      const url = campaignId
        ? `${API_URL}/mj/campaigns/${campaignId}/polls/launch`
        : `${API_URL}/mj/polls/launch`;

      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
         
        body: JSON.stringify({ template_id: templateId }),
      });
      if (!response.ok) throw new Error("Failed to launch poll");
    } catch (error) {
      console.error("Failed to launch poll:", error);
      throw error;
    }
  };

  return {
    templates: readonly(templates),
    loading: readonly(loading),
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    launchPoll,
  };
};
