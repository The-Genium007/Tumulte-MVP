import { watch } from 'vue'
import { useCookieConsentStore } from '@/stores/cookieConsent'

/**
 * Google Tag Manager Plugin avec integration RGPD
 *
 * Charge GTM uniquement apres consentement marketing.
 * Fournit une API pour pousser des events dans le dataLayer.
 *
 * RGPD Compliance:
 * - GTM n'est PAS charge par defaut
 * - Le script est injecte dynamiquement apres consentement marketing
 * - Sans consentement, les appels a push() sont ignores
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const gtmId = config.public.gtmId as string

  // Ne pas initialiser si pas de GTM ID configure
  if (!gtmId) {
    if (import.meta.env.DEV) {
      console.warn('[GTM] No GTM ID configured, marketing tracking disabled')
    }
    return {
      provide: {
        gtm: createGtmApi(false),
      },
    }
  }

  // Tracker si GTM a ete charge
  let gtmLoaded = false

  /**
   * Charge le script GTM dynamiquement
   */
  const loadGtm = () => {
    if (gtmLoaded) return
    gtmLoaded = true

    // Initialiser le dataLayer
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    })

    // Creer et injecter le script GTM
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
    document.head.appendChild(script)

    // Ajouter le noscript fallback pour les navigateurs sans JS
    const noscript = document.createElement('noscript')
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`
    iframe.height = '0'
    iframe.width = '0'
    iframe.style.display = 'none'
    iframe.style.visibility = 'hidden'
    noscript.appendChild(iframe)
    document.body.insertBefore(noscript, document.body.firstChild)

    if (import.meta.env.DEV) {
      console.info(`[GTM] Loaded with container ID: ${gtmId}`)
    }
  }

  // Attendre que l'app soit montee pour acceder au store Pinia
  // Cela evite les erreurs "inject() can only be used inside setup()"
  nuxtApp.hook('app:mounted', () => {
    const consentStore = useCookieConsentStore()

    // S'assurer que le store est initialise
    if (!consentStore.initialized) {
      consentStore.initialize()
    }

    // Reagir aux changements de consentement marketing
    watch(
      () => consentStore.marketingAllowed,
      (allowed) => {
        if (allowed && !gtmLoaded) {
          loadGtm()
        }
      },
      { immediate: true }
    )
  })

  return {
    provide: {
      gtm: createGtmApi(true, () => {
        // Cette fonction sera appelee dans un contexte ou le store est accessible
        try {
          const store = useCookieConsentStore()
          return store.marketingAllowed
        } catch {
          return false
        }
      }),
    },
  }
})

/**
 * Cree l'API GTM
 */
function createGtmApi(enabled: boolean, isAllowed?: () => boolean) {
  return {
    /**
     * Pousse un event dans le dataLayer GTM
     * Ignore silencieusement si GTM n'est pas charge ou consent non donne
     */
    push: (data: Record<string, unknown>) => {
      if (!enabled) {
        if (import.meta.env.DEV) {
          console.debug('[GTM] Push ignored - GTM not configured')
        }
        return
      }

      if (isAllowed && !isAllowed()) {
        if (import.meta.env.DEV) {
          console.debug('[GTM] Push ignored - no marketing consent')
        }
        return
      }

      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push(data)

        if (import.meta.env.DEV) {
          console.debug('[GTM] Push:', data)
        }
      }
    },

    /**
     * Track un event specifique
     */
    trackEvent: (eventName: string, params?: Record<string, unknown>) => {
      if (!enabled || (isAllowed && !isAllowed())) return

      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          event: eventName,
          ...params,
        })
      }
    },
  }
}
