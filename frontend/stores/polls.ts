import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useSupportTrigger } from "@/composables/useSupportTrigger";
import type { Poll, PollInstance } from "~/types";

export const usePollsStore = defineStore("polls", () => {
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;
  const { triggerSupportForError } = useSupportTrigger();

  // State
  const polls = ref<Poll[]>([]);
  const activePollInstance = ref<PollInstance | null>(null);
  const lastLaunchedPollId = ref<string | null>(null);
  const lastPollEndedAt = ref<Date | null>(null);
  const loading = ref(false);
  const launching = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const hasActivePoll = computed(() => activePollInstance.value !== null);

  const sortedPolls = computed(() => {
    return [...polls.value].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  });

  /**
   * Fetch all polls for a campaign
   */
  const fetchPolls = async (campaignId: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/polls`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) throw new Error("Failed to fetch polls");
      const data = await response.json();
      polls.value = data.data || [];
      activePollInstance.value = data.activePollInstance || null;
    } catch (err) {
      console.error("Failed to fetch polls:", err);
      triggerSupportForError("polls_fetch", err);
      error.value = "Impossible de charger les sondages";
      polls.value = [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * Create a new poll
   */
  const createPoll = async (
    campaignId: string,
    pollData: {
      question: string;
      options: string[];
      type?: "UNIQUE" | "STANDARD";
      durationSeconds?: number;
      channelPointsAmount?: number | null;
    },
  ): Promise<Poll> => {
    try {
      const response = await fetch(
        `${API_URL}/mj/campaigns/${campaignId}/polls`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(pollData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create poll");
      }

      const data = await response.json();
      polls.value.unshift(data.data);
      return data.data;
    } catch (err) {
      console.error("Failed to create poll:", err);
      triggerSupportForError("poll_create", err);
      throw err;
    }
  };

  /**
   * Update an existing poll
   */
  const updatePoll = async (
    pollId: string,
    pollData: {
      question?: string;
      options?: string[];
      type?: "UNIQUE" | "STANDARD";
      durationSeconds?: number;
      channelPointsAmount?: number | null;
    },
  ): Promise<Poll> => {
    try {
      const response = await fetch(`${API_URL}/mj/polls/${pollId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(pollData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update poll");
      }

      const data = await response.json();

      // Update in list
      const index = polls.value.findIndex((p) => p.id === pollId);
      if (index !== -1) {
        polls.value[index] = data.data;
      }

      return data.data;
    } catch (err) {
      console.error("Failed to update poll:", err);
      triggerSupportForError("poll_update", err);
      throw err;
    }
  };

  /**
   * Delete a poll
   */
  const deletePoll = async (pollId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/mj/polls/${pollId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete poll");
      }

      // Remove from list
      polls.value = polls.value.filter((p) => p.id !== pollId);
    } catch (err) {
      console.error("Failed to delete poll:", err);
      triggerSupportForError("poll_delete", err);
      throw err;
    }
  };

  /**
   * Launch a poll (creates a PollInstance from the Poll template)
   */
  const launchPoll = async (
    pollId: string,
  ): Promise<{ pollInstance: PollInstance; pollId: string }> => {
    launching.value = true;
    error.value = null;
    try {
      const response = await fetch(`${API_URL}/mj/polls/${pollId}/launch`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle conflict (poll already running)
        if (response.status === 409) {
          activePollInstance.value = errorData.activePollInstance || null;
          throw new Error(errorData.error || "Un sondage est déjà en cours");
        }

        // Handle health check failure
        if (response.status === 503) {
          throw new Error(errorData.error || "Les streamers ne sont pas prêts");
        }

        throw new Error(errorData.error || "Failed to launch poll");
      }

      const data = await response.json();
      activePollInstance.value = data.data;
      lastLaunchedPollId.value = data.pollId || pollId;

      // Update lastLaunchedAt in the polls list
      const index = polls.value.findIndex((p) => p.id === pollId);
      if (index !== -1) {
        polls.value[index] = {
          ...polls.value[index],
          lastLaunchedAt: new Date().toISOString(),
        };
      }

      return { pollInstance: data.data, pollId: data.pollId || pollId };
    } catch (err) {
      console.error("Failed to launch poll:", err);
      triggerSupportForError("poll_launch", err);
      throw err;
    } finally {
      launching.value = false;
    }
  };

  /**
   * Cancel an active poll
   */
  const cancelPoll = async (pollInstanceId: string): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/mj/polls/${pollInstanceId}/cancel`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel poll");
      }

      activePollInstance.value = null;
    } catch (err) {
      console.error("Failed to cancel poll:", err);
      triggerSupportForError("poll_cancel", err);
      throw err;
    }
  };

  /**
   * Clear active poll (when poll ends)
   */
  const clearActivePoll = () => {
    activePollInstance.value = null;
  };

  /**
   * Mark that a poll has ended (triggers refresh in RecentEventsColumn)
   */
  const markPollEnded = () => {
    lastPollEndedAt.value = new Date();
  };

  /**
   * Set active poll instance (from WebSocket event)
   */
  const setActivePollInstance = (instance: PollInstance | null) => {
    activePollInstance.value = instance;
    if (instance?.pollId) {
      lastLaunchedPollId.value = instance.pollId;
    }
  };

  /**
   * Clear all polls
   */
  const clearPolls = () => {
    polls.value = [];
    activePollInstance.value = null;
    lastLaunchedPollId.value = null;
    error.value = null;
  };

  return {
    // State
    polls,
    activePollInstance,
    lastLaunchedPollId,
    lastPollEndedAt,
    loading,
    launching,
    error,

    // Computed
    hasActivePoll,
    sortedPolls,

    // Actions
    fetchPolls,
    createPoll,
    updatePoll,
    deletePoll,
    launchPoll,
    cancelPoll,
    clearActivePoll,
    markPollEnded,
    setActivePollInstance,
    clearPolls,
  };
});
