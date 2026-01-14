/**
 * @deprecated L'auto-trigger du widget support a été supprimé.
 * Les erreurs sont maintenant capturées par Sentry avec un toast informatif.
 * Ce composable est conservé pour compatibilité mais ne fait plus rien.
 *
 * Pour ouvrir le widget manuellement, utilisez useSupportWidget().openSupport()
 */
export const useSupportTrigger = () => {
  // Fonctions vides pour compatibilité avec le code existant
  const canAutoOpen = (): boolean => false;

  const triggerSupportForError = (
    _errorType?: string,
    _error?: unknown,
  ): boolean => {
    // Ne fait plus rien - Sentry gère les erreurs automatiques
    return false;
  };

  const getRemainingCooldown = (): number => 0;

  const resetRateLimit = (): void => {
    // No-op
  };

  return {
    canAutoOpen,
    triggerSupportForError,
    getRemainingCooldown,
    resetRateLimit,
    RATE_LIMIT_MS: 0,
  };
};
