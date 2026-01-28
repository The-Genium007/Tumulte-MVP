import { storeToRefs } from 'pinia'
import { useCookieConsentStore } from '@/stores/cookieConsent'

/**
 * Composable pour la gestion du consentement aux cookies (RGPD)
 *
 * Expose l'etat et les actions du store cookieConsent
 * de maniere reactive.
 *
 * @example
 * ```ts
 * const { analyticsAllowed, acceptAll, showBanner } = useCookieConsent()
 *
 * // Verifier si les analytics sont autorises
 * if (analyticsAllowed.value) {
 *   posthog.capture('event')
 * }
 *
 * // Accepter tous les cookies
 * acceptAll()
 *
 * // Ouvrir la banniere depuis les settings
 * showBanner()
 * ```
 */
export function useCookieConsent() {
  const store = useCookieConsentStore()

  // Extraire les refs reactives du store
  const {
    preferences,
    bannerVisible,
    initialized,
    hasConsent,
    analyticsAllowed,
    marketingAllowed,
    needsConsentUpdate,
  } = storeToRefs(store)

  return {
    // State (refs reactives)
    preferences,
    bannerVisible,
    initialized,

    // Computed (refs reactives)
    hasConsent,
    analyticsAllowed,
    marketingAllowed,
    needsConsentUpdate,

    // Actions (fonctions)
    initialize: store.initialize,
    savePreferences: store.savePreferences,
    acceptAll: store.acceptAll,
    rejectAll: store.rejectAll,
    updateCategory: store.updateCategory,
    showBanner: store.showBanner,
    hideBanner: store.hideBanner,
    reset: store.reset,
  }
}
