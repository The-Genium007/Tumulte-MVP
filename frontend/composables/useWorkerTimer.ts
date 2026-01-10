import { ref, onUnmounted } from "vue";

/**
 * Composable pour créer des timers résistants au throttling des onglets en arrière-plan.
 * Utilise un Web Worker pour éviter que les setInterval soient ralentis par le navigateur
 * quand l'onglet/browser source OBS n'est pas visible.
 */
export const useWorkerTimer = () => {
  const worker = ref<Worker | null>(null);
  const isRunning = ref(false);
  const currentTick = ref(0);

  // Code du worker inline (évite un fichier séparé)
  const workerCode = `
    let intervalId = null;
    let tickCount = 0;

    self.onmessage = (e) => {
      const { action, interval } = e.data;

      switch (action) {
        case 'start':
          if (intervalId) {
            clearInterval(intervalId);
          }
          tickCount = 0;
          intervalId = setInterval(() => {
            tickCount++;
            self.postMessage({ type: 'tick', tick: tickCount, timestamp: Date.now() });
          }, interval || 1000);
          self.postMessage({ type: 'started' });
          break;

        case 'stop':
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          tickCount = 0;
          self.postMessage({ type: 'stopped' });
          break;

        case 'ping':
          // Health check - répond immédiatement
          self.postMessage({ type: 'pong', timestamp: Date.now() });
          break;
      }
    };
  `;

  // Callbacks pour les ticks
  const tickCallbacks = new Set<(timestamp: number) => void>();

  /**
   * Crée et démarre le worker timer
   */
  const createWorker = (): Worker | null => {
    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      const newWorker = new Worker(workerUrl);

      newWorker.onmessage = (e) => {
        const { type, timestamp } = e.data;

        if (type === "tick") {
          currentTick.value = e.data.tick;
          // Notifier tous les callbacks
          tickCallbacks.forEach((callback) => callback(timestamp));
        }
      };

      newWorker.onerror = (error) => {
        console.error("[WorkerTimer] Worker error:", error);
        isRunning.value = false;
      };

      // Nettoyer l'URL du blob après création
      URL.revokeObjectURL(workerUrl);

      return newWorker;
    } catch (error) {
      console.warn(
        "[WorkerTimer] Failed to create worker, falling back to setInterval:",
        error,
      );
      return null;
    }
  };

  /**
   * Démarre le timer avec l'intervalle spécifié
   */
  const start = (intervalMs: number = 1000) => {
    if (isRunning.value) {
      return;
    }

    worker.value = createWorker();

    if (worker.value) {
      worker.value.postMessage({ action: "start", interval: intervalMs });
      isRunning.value = true;
    }
  };

  /**
   * Arrête le timer
   */
  const stop = () => {
    if (worker.value) {
      worker.value.postMessage({ action: "stop" });
      worker.value.terminate();
      worker.value = null;
    }
    isRunning.value = false;
    currentTick.value = 0;
  };

  /**
   * Enregistre un callback appelé à chaque tick
   */
  const onTick = (callback: (timestamp: number) => void) => {
    tickCallbacks.add(callback);

    // Retourne une fonction pour se désinscrire
    return () => {
      tickCallbacks.delete(callback);
    };
  };

  /**
   * Vérifie si le worker est responsive (health check)
   */
  const ping = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const currentWorker = worker.value;
      if (!currentWorker) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, 1000);

      const originalHandler = currentWorker.onmessage;
      currentWorker.onmessage = (e) => {
        if (e.data.type === "pong") {
          clearTimeout(timeout);
          currentWorker.onmessage = originalHandler;
          resolve(true);
        } else if (originalHandler) {
          originalHandler.call(currentWorker, e);
        }
      };

      currentWorker.postMessage({ action: "ping" });
    });
  };

  // Cleanup automatique
  onUnmounted(() => {
    stop();
    tickCallbacks.clear();
  });

  return {
    isRunning,
    currentTick,
    start,
    stop,
    onTick,
    ping,
  };
};
