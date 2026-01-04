import { ref } from "vue";
import { useSupportWidget } from "./useSupportWidget";
import {
  SUPPORT_ERROR_MESSAGES,
  type SupportActionType,
} from "@/utils/supportErrorMessages";

// État global - rate limit 1 ouverture auto par minute
const lastAutoOpenTime = ref<number>(0);
const RATE_LIMIT_MS = 60_000;

export const useSupportTrigger = () => {
  const { openWithPrefill } = useSupportWidget();

  /**
   * Vérifie si on peut ouvrir automatiquement le widget (rate limiting)
   */
  const canAutoOpen = (): boolean => {
    return Date.now() - lastAutoOpenTime.value >= RATE_LIMIT_MS;
  };

  /**
   * Déclenche l'ouverture du widget de support avec un message pré-rempli
   * @param actionType - Type d'action qui a échoué
   * @param error - Erreur optionnelle pour contexte additionnel
   * @param additionalContext - Contexte additionnel optionnel
   * @returns true si le widget a été ouvert, false si rate limited
   */
  const triggerSupportForError = (
    actionType: SupportActionType,
    error?: Error | unknown,
    additionalContext?: string,
  ): boolean => {
    if (!canAutoOpen()) {
      console.log("[SupportTrigger] Rate limited - widget not opened");
      return false;
    }

    lastAutoOpenTime.value = Date.now();

    let message = SUPPORT_ERROR_MESSAGES[actionType];

    // Ajouter le contexte additionnel si fourni
    if (additionalContext) {
      message += `\n\nContexte: ${additionalContext}`;
    }

    // Ajouter le message d'erreur technique si disponible
    if (error instanceof Error && error.message) {
      message += `\n\nErreur technique: ${error.message}`;
    }

    openWithPrefill(message, actionType);
    return true;
  };

  /**
   * Retourne le temps restant avant la prochaine ouverture auto possible (en ms)
   */
  const getRemainingCooldown = (): number => {
    return Math.max(0, RATE_LIMIT_MS - (Date.now() - lastAutoOpenTime.value));
  };

  /**
   * Reset le rate limit (utile pour les tests)
   */
  const resetRateLimit = (): void => {
    lastAutoOpenTime.value = 0;
  };

  return {
    canAutoOpen,
    triggerSupportForError,
    getRemainingCooldown,
    resetRateLimit,
    RATE_LIMIT_MS,
  };
};
