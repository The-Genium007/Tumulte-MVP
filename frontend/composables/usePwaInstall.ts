import { ref, computed, onMounted, onUnmounted } from "vue";
import type { BeforeInstallPromptEvent } from "@/types/pwa";

const DISMISSED_KEY = "tumulte-pwa-install-dismissed";

/**
 * Composable for PWA installation management.
 * Handles the beforeinstallprompt event and provides install/dismiss functionality.
 *
 * @returns PWA install state and methods
 *
 * @example
 * const { canInstall, dismissed, install, dismiss } = usePwaInstall()
 */
export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const dismissed = ref(false);

  /**
   * Can the app be installed?
   */
  const canInstall = computed(() => {
    return deferredPrompt.value !== null && !dismissed.value;
  });

  /**
   * Triggers the PWA installation prompt.
   *
   * @throws {Error} If no install prompt is available
   */
  async function install(): Promise<void> {
    if (!deferredPrompt.value) {
      console.warn("[usePwaInstall] No install prompt available");
      return;
    }

    try {
      await deferredPrompt.value.prompt();
      const choiceResult = await deferredPrompt.value.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("[usePwaInstall] User accepted the install prompt");
      } else {
        console.log("[usePwaInstall] User dismissed the install prompt");
        dismiss();
      }

      // Reset the prompt after use
      deferredPrompt.value = null;
    } catch (error) {
      console.error("[usePwaInstall] Error during installation:", error);
    }
  }

  /**
   * Dismisses the install prompt and saves the preference.
   */
  function dismiss(): void {
    dismissed.value = true;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
  }

  /**
   * Resets the dismissed state (for testing purposes).
   */
  function resetDismissed(): void {
    dismissed.value = false;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(DISMISSED_KEY);
    }
  }

  /**
   * Handles the beforeinstallprompt event.
   */
  const handleBeforeInstallPrompt = (e: Event) => {
    // Prevent the default browser install prompt
    e.preventDefault();
    // Store the event for later use
    deferredPrompt.value = e as BeforeInstallPromptEvent;
    console.log("[usePwaInstall] Install prompt captured");
  };

  onMounted(() => {
    // Check if user previously dismissed the prompt
    if (typeof localStorage !== "undefined") {
      const wasDismissed = localStorage.getItem(DISMISSED_KEY);
      dismissed.value = wasDismissed === "true";
    }

    // Listen for the beforeinstallprompt event
    if (typeof window !== "undefined") {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      // Check if app is already installed
      if (window.matchMedia("(display-mode: standalone)").matches) {
        console.log("[usePwaInstall] App is already installed");
      }
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    }
  });

  return {
    canInstall,
    dismissed,
    install,
    dismiss,
    resetDismissed,
  };
}
