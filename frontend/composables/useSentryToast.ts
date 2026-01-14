import { onSentryError } from "~/sentry.client.config";

/**
 * Composable pour afficher un toast quand Sentry capture une erreur
 * Le toast est informatif uniquement (pas de bouton d'action)
 */
export function useSentryToast() {
  const toast = useToast();
  let lastToastTime = 0;
  const TOAST_DEBOUNCE_MS = 5000; // Éviter le spam de toasts

  const showErrorCaptured = () => {
    const now = Date.now();
    if (now - lastToastTime < TOAST_DEBOUNCE_MS) {
      return; // Debounce
    }
    lastToastTime = now;

    toast.add({
      id: "sentry-error-captured",
      title: "Erreur détectée",
      description: "Elle a été automatiquement transmise au support.",
      icon: "i-lucide-bug",
      color: "warning",
    });
  };

  // S'abonner aux événements Sentry
  const unsubscribe = onSentryError(() => {
    showErrorCaptured();
  });

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe();
  });

  return { showErrorCaptured };
}
