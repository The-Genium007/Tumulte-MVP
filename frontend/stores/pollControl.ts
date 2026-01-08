import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { loggers } from "@/utils/logger";

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

interface IndividualPollState {
  status: "idle" | "sending" | "running" | "sent" | "cancelled";
  results: PollResults | null;
  instanceId: string | null;
  startTime: number | null;
  duration: number | null;
}

interface PollControlState {
  activeSession: unknown | null;
  activeSessionPolls: unknown[];
  currentPollIndex: number;
  pollStatus: "idle" | "sending" | "running" | "sent" | "cancelled";
  countdown: number;
  pollResults: PollResults | null;
  launchedPolls: number[];
  pollStartTime: number | null;
  pollDuration: number | null;
  currentPollInstanceId: string | null;
  pollStates: Record<number, IndividualPollState>;
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
  const pollStates = ref<Record<number, IndividualPollState>>({});

  // Vérifier si on est côté client
  const isClient = typeof window !== "undefined";

  // Flag pour éviter que le watcher supprime le localStorage pendant l'initialisation
  const isInitializing = ref(true);

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
      pollStates.value = data.pollStates || {};

      loggers.poll.debug("State restored from localStorage:", {
        hasActiveSession: !!data.activeSession,
        pollStatus: data.pollStatus,
        hasPollResults: !!data.pollResults,
        pollResultsData: data.pollResults,
        pollStatesCount: Object.keys(pollStates.value).length,
      });

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
    } catch (error) {
      loggers.poll.error("Failed to load poll control state:", error);
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
        pollStates: pollStates.value,
        timestamp: Date.now(),
      };

      loggers.poll.debug("Saving state to localStorage:", {
        hasActiveSession: !!activeSession.value,
        pollsCount: activeSessionPolls.value.length,
        pollStatus: pollStatus.value,
        hasPollResults: !!pollResults.value,
        pollResultsData: pollResults.value,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      loggers.poll.debug(
        "State saved successfully with pollResults:",
        !!pollResults.value,
      );
    } catch (error) {
      loggers.poll.error("Failed to save poll control state:", error);
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
    pollStates.value = {};
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
        pollStates,
      ],
      () => {
        // Ne pas supprimer le localStorage pendant l'initialisation
        if (isInitializing.value) {
          loggers.poll.debug(
            "Watcher triggered during initialization - skipping",
          );
          return;
        }

        loggers.poll.debug(
          "Watcher triggered - activeSession:",
          !!activeSession.value,
        );
        // Si une session est active, on sauvegarde
        if (activeSession.value) {
          loggers.poll.debug("Session active, saving state...");
          saveState();
        } else {
          // Si plus de session active, on nettoie le localStorage
          loggers.poll.debug("No active session, clearing localStorage");
          localStorage.removeItem(STORAGE_KEY);
        }
      },
      { deep: true },
    );
  }

  // Sauvegarder l'état du poll actuel dans pollStates
  const saveCurrentPollState = () => {
    const index = currentPollIndex.value;

    pollStates.value[index] = {
      status: pollStatus.value,
      results: pollResults.value,
      instanceId: currentPollInstanceId.value,
      startTime: pollStartTime.value,
      duration: pollDuration.value,
    };

    loggers.poll.debug(
      `Saved state for poll ${index}:`,
      pollStates.value[index],
    );
  };

  // Restaurer l'état d'un sondage spécifique
  const restorePollState = (index: number) => {
    const savedState = pollStates.value[index];

    if (savedState) {
      pollStatus.value = savedState.status;
      pollResults.value = savedState.results;
      currentPollInstanceId.value = savedState.instanceId;
      pollStartTime.value = savedState.startTime;
      pollDuration.value = savedState.duration;

      // Recalculer le countdown si le poll était en cours
      if (
        savedState.status === "sending" &&
        savedState.startTime &&
        savedState.duration
      ) {
        const now = Date.now();
        const elapsed = Math.floor((now - savedState.startTime) / 1000);
        const remainingTime = savedState.duration - elapsed;

        if (remainingTime > 0) {
          countdown.value = remainingTime;
        } else {
          countdown.value = 0;
          pollStatus.value = "sent";
        }
      } else {
        countdown.value = 0;
      }

      loggers.poll.debug(`Restored state for poll ${index}:`, savedState);
    } else {
      // Réinitialiser à l'état idle si aucun état sauvegardé
      pollStatus.value = "idle";
      pollResults.value = null;
      currentPollInstanceId.value = null;
      pollStartTime.value = null;
      pollDuration.value = null;
      countdown.value = 0;

      loggers.poll.debug(`No saved state for poll ${index}, reset to idle`);
    }
  };

  // Synchroniser avec le backend pour récupérer l'état réel du poll
  const syncWithBackend = async () => {
    if (!isClient || !currentPollInstanceId.value) return;

    try {
      // Importer dynamiquement le composable
      const { usePollInstance } = await import("@/composables/usePollInstance");
      const { fetchPollInstance } = usePollInstance();

      // Fetch l'état réel depuis le backend
      const pollInstance = await fetchPollInstance(currentPollInstanceId.value);

      if (pollInstance.status === "ENDED") {
        // Le poll est terminé côté backend
        pollStatus.value = "sent";
        countdown.value = 0;
        pollStartTime.value = null;
        pollDuration.value = null;

        // Récupérer les résultats finaux s'ils existent
        if (pollInstance.finalVotesByOption) {
          const results = Object.entries(pollInstance.finalVotesByOption).map(
            ([index, votes]) => ({
              option:
                pollInstance.options[parseInt(index)] ||
                `Option ${parseInt(index) + 1}`,
              votes: votes as number,
            }),
          );

          pollResults.value = {
            results,
            totalVotes: pollInstance.finalTotalVotes || 0,
          };

          loggers.poll.debug(
            "Synced final results from backend:",
            pollResults.value,
          );
        }
      } else if (pollInstance.status === "RUNNING" && pollInstance.startedAt) {
        // Calculer le temps restant basé sur startedAt backend
        const startedAt = new Date(pollInstance.startedAt).getTime();
        const endsAt = startedAt + pollInstance.durationSeconds * 1000;
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));

        // Mettre à jour les valeurs
        pollStartTime.value = startedAt;
        pollDuration.value = pollInstance.durationSeconds;
        countdown.value = remaining;
        pollStatus.value = remaining > 0 ? "sending" : "sent";
      }
    } catch (error) {
      loggers.poll.error("Failed to sync with backend:", error);
      // En cas d'erreur, on garde l'état local
    }
  };

  // Charger l'état au démarrage (uniquement côté client)
  loadState();

  // Désactiver le flag d'initialisation après le chargement
  // Utiliser nextTick pour s'assurer que le loadState est complètement terminé
  if (isClient) {
    setTimeout(() => {
      isInitializing.value = false;
      loggers.poll.debug("Initialization complete, watcher now active");
    }, 0);
  }

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
    pollStates,

    // Actions
    clearState,
    saveState,
    loadState,
    syncWithBackend,
    saveCurrentPollState,
    restorePollState,
  };
});
