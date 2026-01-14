/**
 * Composable for tracking online/offline network status
 * Provides reactive state for connection status detection
 */

const isOnline = ref(true);
const wasOffline = ref(false);

let initialized = false;

function handleOnline() {
  // Track that we came back from offline
  if (!isOnline.value) {
    wasOffline.value = true;
  }
  isOnline.value = true;
}

function handleOffline() {
  isOnline.value = false;
}

export const useOnlineStatus = () => {
  // Initialize only once (singleton pattern for event listeners)
  if (!initialized && typeof window !== "undefined") {
    isOnline.value = navigator.onLine;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    initialized = true;
  }

  /**
   * Reset the wasOffline flag
   * Call this after handling the "back online" state
   */
  const acknowledgeReconnection = () => {
    wasOffline.value = false;
  };

  /**
   * Force refresh the online status
   * Useful after a manual connectivity check
   */
  const refresh = () => {
    if (typeof navigator !== "undefined") {
      const currentlyOnline = navigator.onLine;
      if (currentlyOnline && !isOnline.value) {
        wasOffline.value = true;
      }
      isOnline.value = currentlyOnline;
    }
  };

  return {
    /** Whether the browser reports being online */
    isOnline: readonly(isOnline),
    /** Whether the browser reports being offline */
    isOffline: computed(() => !isOnline.value),
    /** Whether we recently came back from being offline */
    wasOffline: readonly(wasOffline),
    /** Reset the wasOffline flag after handling reconnection */
    acknowledgeReconnection,
    /** Force refresh the online status */
    refresh,
  };
};
