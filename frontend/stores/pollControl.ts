import { defineStore } from "pinia";
import { ref, watch } from "vue";

const STORAGE_KEY = "pollControl";
const EXPIRY_HOURS = 24;

interface PollResult {
  option: string;
  votes: number;
}

interface PollResults {
  results: PollResult[];
  totalVotes: number;
}

interface PollControlState {
  activeSession: unknown | null;
  activeSessionPolls: unknown[];
  currentPollIndex: number;
  pollStatus: "idle" | "sending" | "sent" | "cancelled";
  countdown: number;
  pollResults: PollResults | null;
  launchedPolls: number[];
  pollStartTime: number | null;
  pollDuration: number | null;
  currentPollInstanceId: string | null;
  timestamp: number;
}

export const usePollControlStore = defineStore("pollControl", () => {
  // State
  const activeSession = ref<unknown | null>(null);
  const activeSessionPolls = ref<unknown[]>([]);
  const currentPollIndex = ref(0);
  const pollStatus = ref<"idle" | "sending" | "running" | "sent" | "cancelled">(
    "idle",
  );
  const countdown = ref(0);
  const pollResults = ref<PollResults | null>(null);
  const launchedPolls = ref<number[]>([]);
  const pollStartTime = ref<number | null>(null);
  const pollDuration = ref<number | null>(null);
  const currentPollInstanceId = ref<string | null>(null);

  // Vérifier si on est côté client
  const isClient = typeof window !== "undefined";

  // Charger l'état depuis localStorage
  const loadState = () => {
    if (!isClient) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data: PollControlState = JSON.parse(stored);

      // Vérifier l'expiration (24 heures)
      const now = Date.now();
      const expiryTime = data.timestamp + EXPIRY_HOURS * 60 * 60 * 1000;

      if (now > expiryTime) {
        // Données expirées, on les supprime
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Restaurer l'état
      activeSession.value = data.activeSession;
      activeSessionPolls.value = data.activeSessionPolls;
      currentPollIndex.value = data.currentPollIndex;
      pollStatus.value = data.pollStatus;
      pollResults.value = data.pollResults;
      launchedPolls.value = data.launchedPolls;
      pollStartTime.value = data.pollStartTime;
      pollDuration.value = data.pollDuration;
      currentPollInstanceId.value = data.currentPollInstanceId;

      // Recalculer le countdown si un sondage était en cours
      if (
        data.pollStatus === "sending" &&
        data.pollStartTime &&
        data.pollDuration
      ) {
        const elapsed = Math.floor((now - data.pollStartTime) / 1000);
        const remainingTime = data.pollDuration - elapsed;

        if (remainingTime > 0) {
          countdown.value = remainingTime;
        } else {
          // Le temps est écoulé, marquer comme envoyé
          countdown.value = 0;
          pollStatus.value = "sent";
          pollStartTime.value = null;
          pollDuration.value = null;
        }
      } else {
        countdown.value = data.countdown;
      }
    } catch {
      console._error("Failed to load poll control state:", _error);
      if (isClient) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  // Sauvegarder l'état dans localStorage
  const saveState = () => {
    if (!isClient) return;

    try {
      const state: PollControlState = {
        activeSession: activeSession.value,
        activeSessionPolls: activeSessionPolls.value,
        currentPollIndex: currentPollIndex.value,
        pollStatus: pollStatus.value,
        countdown: countdown.value,
        pollResults: pollResults.value,
        launchedPolls: launchedPolls.value,
        pollStartTime: pollStartTime.value,
        pollDuration: pollDuration.value,
        currentPollInstanceId: currentPollInstanceId.value,
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      console._error("Failed to save poll control state:", _error);
    }
  };

  // Effacer l'état
  const clearState = () => {
    activeSession.value = null;
    activeSessionPolls.value = [];
    currentPollIndex.value = 0;
    pollStatus.value = "idle";
    countdown.value = 0;
    pollResults.value = null;
    launchedPolls.value = [];
    pollStartTime.value = null;
    pollDuration.value = null;
    currentPollInstanceId.value = null;
    if (isClient) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Watcher pour sauvegarder automatiquement à chaque changement
  if (isClient) {
    watch(
      [
        activeSession,
        activeSessionPolls,
        currentPollIndex,
        pollStatus,
        countdown,
        pollResults,
        launchedPolls,
        pollStartTime,
        pollDuration,
        currentPollInstanceId,
      ],
      () => {
        // Si une session est active, on sauvegarde
        if (activeSession.value) {
          saveState();
        } else {
          // Si plus de session active, on nettoie le localStorage
          localStorage.removeItem(STORAGE_KEY);
        }
      },
      { deep: true },
    );
  }

  // Charger l'état au démarrage (uniquement côté client)
  loadState();

  return {
    // State
    activeSession,
    activeSessionPolls,
    currentPollIndex,
    pollStatus,
    countdown,
    pollResults,
    launchedPolls,
    pollStartTime,
    pollDuration,
    currentPollInstanceId,

    // Actions
    clearState,
    saveState,
    loadState,
  };
});
