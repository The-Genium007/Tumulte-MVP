import { useCookieConsentStore } from '@/stores/cookieConsent'

/**
 * Plugin d'initialisation du consentement aux cookies
 *
 * Ce plugin s'execute au demarrage de l'application (cote client uniquement)
 * et initialise le store de consentement depuis localStorage.
 *
 * Le store determine automatiquement si la banniere doit etre affichee
 * en fonction de l'existence et de la version du consentement stocke.
 */
export default defineNuxtPlugin((nuxtApp) => {
  // Attendre que l'app soit montee pour acceder au store Pinia
  // Cela evite les erreurs "inject() can only be used inside setup()"
  nuxtApp.hook('app:mounted', () => {
    const consentStore = useCookieConsentStore()

    // Initialiser le store depuis localStorage
    consentStore.initialize()
  })

  // Fournir un acces global pour les autres plugins
  // Note: Ces fonctions seront appelees apres app:mounted
  return {
    provide: {
      cookieConsent: {
        /** Verifie si les cookies analytiques sont autorises */
        isAnalyticsAllowed: () => {
          const store = useCookieConsentStore()
          return store.analyticsAllowed
        },
        /** Verifie si les cookies marketing sont autorises */
        isMarketingAllowed: () => {
          const store = useCookieConsentStore()
          return store.marketingAllowed
        },
        /** Affiche la banniere de consentement */
        showBanner: () => {
          const store = useCookieConsentStore()
          store.showBanner()
        },
      },
    },
  }
})
