import { ref } from "vue";
import type { Character, CampaignSettings } from "@/types";
import { useSupportTrigger } from "@/composables/useSupportTrigger";

export const useCampaignCharacters = () => {
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;
  const { triggerSupportForError } = useSupportTrigger();

  const characters = ref<Character[]>([]);
  const currentCharacterId = ref<string | null>(null);
  const loading = ref(false);

  /**
   * Récupère les personnages disponibles pour une campagne
   */
  const fetchCharacters = async (campaignId: string): Promise<void> => {
    loading.value = true;
    try {
      const response = await fetch(
        `${API_URL}/streamer/campaigns/${campaignId}/characters`,
        { credentials: "include" },
      );

      if (!response.ok) throw new Error("Failed to fetch characters");

      const data = await response.json();
      characters.value = data.characters;
      currentCharacterId.value = data.currentAssignment?.character?.id || null;
    } catch (error) {
      console.error("Failed to fetch characters:", error);
      triggerSupportForError("characters_fetch", error);
      characters.value = [];
      currentCharacterId.value = null;
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Accepte une invitation avec choix de personnage
   */
  const acceptInvitationWithCharacter = async (
    invitationId: string,
    characterId: string,
  ): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/streamer/campaigns/invitations/${invitationId}/accept`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characterId }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept invitation");
      }
    } catch (error) {
      triggerSupportForError("invitation_accept_character", error);
      throw error;
    }
  };

  /**
   * Récupère les paramètres de campagne (personnage assigné, etc.)
   */
  const getCampaignSettings = async (
    campaignId: string,
  ): Promise<CampaignSettings> => {
    try {
      const response = await fetch(
        `${API_URL}/streamer/campaigns/${campaignId}/settings`,
        { credentials: "include" },
      );

      if (!response.ok) throw new Error("Failed to fetch campaign settings");

      return await response.json();
    } catch (error) {
      triggerSupportForError("campaign_settings_fetch", error);
      throw error;
    }
  };

  /**
   * Met à jour le personnage assigné pour une campagne
   */
  const updateCharacter = async (
    campaignId: string,
    characterId: string,
  ): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/streamer/campaigns/${campaignId}/character`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characterId }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update character");
      }
    } catch (error) {
      triggerSupportForError("character_update", error);
      throw error;
    }
  };

  return {
    // State
    characters,
    currentCharacterId,
    loading,

    // Methods
    fetchCharacters,
    acceptInvitationWithCharacter,
    getCampaignSettings,
    updateCharacter,
  };
};
