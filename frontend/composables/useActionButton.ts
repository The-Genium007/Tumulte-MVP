import { ref } from "vue";

interface UseActionButtonOptions {
  action: () => Promise<void>;
  cooldownMs?: number;
  onError?: (error: unknown) => void;
}

/**
 * Composable pour gérer les boutons d'action avec debouncing et loading state.
 * Empêche les double-clics et assure un cooldown entre les actions.
 *
 * @param options.action - La fonction async à exécuter
 * @param options.cooldownMs - Délai de cooldown après l'action (défaut: 1000ms)
 * @param options.onError - Callback optionnel en cas d'erreur
 */
export function useActionButton(options: UseActionButtonOptions) {
  const { action, cooldownMs = 1000, onError } = options;

  const isLoading = ref(false);
  const isDisabled = ref(false);
  const lastClickTime = ref(0);

  async function execute(): Promise<void> {
    const now = Date.now();

    // Protection anti-double-clic
    if (now - lastClickTime.value < cooldownMs) {
      return;
    }

    // Ne pas exécuter si déjà en cours ou désactivé
    if (isLoading.value || isDisabled.value) {
      return;
    }

    lastClickTime.value = now;
    isLoading.value = true;
    isDisabled.value = true;

    try {
      await action();
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error("[useActionButton] Action failed:", error);
      }
    } finally {
      isLoading.value = false;

      // Garder le bouton désactivé pendant le cooldown
      setTimeout(() => {
        isDisabled.value = false;
      }, cooldownMs);
    }
  }

  /**
   * Reset l'état du bouton (utile pour les cas edge)
   */
  function reset(): void {
    isLoading.value = false;
    isDisabled.value = false;
    lastClickTime.value = 0;
  }

  return {
    isLoading,
    isDisabled,
    execute,
    reset,
  };
}
