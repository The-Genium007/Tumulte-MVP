import { defineStore } from "pinia";
import { ref } from "vue";

export interface Poll {
  id: string;
  question: string;
  options: string[];
  type: "UNIQUE" | "STANDARD";
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string;
}

export const useSessionPollsStore = defineStore("sessionPolls", () => {
  const polls = ref<Poll[]>([]);
  const loading = ref(false);

  const fetchPolls = async (_campaignId: string, sessionId: string) => {
    loading.value = true;
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/mj/sessions/${sessionId}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch session polls");
      const data = await response.json();
      polls.value = data.data.polls || [];
    } catch (error) {
      console.error("Failed to fetch polls:", error);
      polls.value = [];
    } finally {
      loading.value = false;
    }
  };

  const addPoll = async (
    _campaignId: string,
    sessionId: string,
    pollData: {
      question: string;
      options: string[];
      type: "UNIQUE" | "STANDARD";
      channelPointsEnabled?: boolean;
      channelPointsAmount?: number;
    },
  ) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(
        `${API_URL}/mj/sessions/${sessionId}/polls`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(pollData),
        },
      );

      if (!response.ok) throw new Error("Failed to add poll");
      const data = await response.json();

      // Ajouter le nouveau sondage à la liste
      polls.value.push(data.data);

      return data.data;
    } catch (error) {
      console.error("Failed to add poll:", error);
      throw error;
    }
  };

  const deletePoll = async (
    _campaignId: string,
    sessionId: string,
    pollId: string,
  ) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(
        `${API_URL}/mj/sessions/${sessionId}/polls/${pollId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) throw new Error("Failed to delete poll");

      // Retirer le sondage de la liste
      polls.value = polls.value.filter((p) => p.id !== pollId);
    } catch (error) {
      console.error("Failed to delete poll:", error);
      throw error;
    }
  };

  const clearPolls = () => {
    polls.value = [];
  };

  return {
    polls,
    loading,
    fetchPolls,
    addPoll,
    deletePoll,
    clearPolls,
  };
});
