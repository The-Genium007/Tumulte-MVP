import { ref, readonly } from "vue";
import { useSupportTrigger } from "@/composables/useSupportTrigger";

export interface Character {
  id: string;
  campaignId: string;
  vttCharacterId: string;
  name: string;
  avatarUrl: string | null;
  characterType: "pc" | "npc";
  stats: Record<string, unknown> | null;
  inventory: Record<string, unknown> | null;
  vttData: Record<string, unknown> | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterAssignment {
  id: string;
  characterId: string;
  streamerId: string;
  campaignId: string;
  assignedAt: string;
  character?: Character;
}

export interface CampaignCharacters {
  characters: Character[];
  currentAssignment: CharacterAssignment | null;
}

export const useCharacters = () => {
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;
  const { triggerSupportForError } = useSupportTrigger();

  const characters = ref<Character[]>([]);
  const currentAssignment = ref<CharacterAssignment | null>(null);
  const loading = ref<boolean>(false);

  /**
   * Récupère les personnages disponibles pour une campagne
   * GET /streamer/campaigns/:campaignId/characters
   */
  const fetchCampaignCharacters = async (campaignId: string): Promise<void> => {
    loading.value = true;
    try {
      const response = await fetch(
        `${API_URL}/streamer/campaigns/${campaignId}/characters`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to fetch characters");
      const data = await response.json();
      characters.value = data.characters;
      currentAssignment.value = data.currentAssignment;
    } catch (error) {
      console.error("Failed to fetch characters:", error);
      triggerSupportForError("characters_fetch", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Assigne un personnage au streamer pour une campagne
   * POST /streamer/campaigns/:campaignId/characters/:characterId/assign
   */
  const assignCharacter = async (
    campaignId: string,
    characterId: string,
  ): Promise<CharacterAssignment> => {
    try {
      const response = await fetch(
        `${API_URL}/streamer/campaigns/${campaignId}/characters/${characterId}/assign`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!response.ok) {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        throw new Error("Failed to assign character");
      }
      const data = await response.json();
      currentAssignment.value = data;
      return data;
    } catch (error) {
      triggerSupportForError("character_assign", error);
      throw error;
    }
  };

  /**
   * Retire l'assignment de personnage du streamer
   * DELETE /streamer/campaigns/:campaignId/characters/unassign
   */
  const unassignCharacter = async (campaignId: string): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/streamer/campaigns/${campaignId}/characters/unassign`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to unassign character");
      currentAssignment.value = null;
    } catch (error) {
      triggerSupportForError("character_unassign", error);
      throw error;
    }
  };

  return {
    // State
    characters: readonly(characters),
    currentAssignment: readonly(currentAssignment),
    loading: readonly(loading),

    // Methods
    fetchCampaignCharacters,
    assignCharacter,
    unassignCharacter,
  };
};
