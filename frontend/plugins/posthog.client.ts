import posthog from 'posthog-js'
import { watch } from 'vue'
import { useCookieConsentStore } from '@/stores/cookieConsent'

/**
 * PostHog Analytics Plugin avec integration RGPD
 *
 * Initializes PostHog for:
 * - Automatic page view tracking (si consent analytics)
 * - Session replay (si consent analytics)
 * - Feature flags (pour A/B testing)
 * - User identification (lie a l'auth)
 *
 * RGPD Compliance:
 * - PostHog demarre en mode "opt-out" par defaut
 * - Le tracking complet n'est active qu'apres consentement analytics
 * - Les donnees sont stockees en EU (eu.i.posthog.com)
 *
 * Environment filtering:
 * Tous les events incluent une propriete 'environment' ('development' ou 'production')
 * pour filtrer dans le dashboard PostHog (projet unique, tier gratuit).
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const posthogKey = config.public.posthogKey as string
  const posthogHost = config.public.posthogHost as string

  // Determiner l'environnement pour filtrage dans PostHog
  const environment = import.meta.env.PROD ? 'production' : 'development'

  // Ne pas initialiser si pas de cle API
  if (!posthogKey) {
    if (import.meta.env.DEV) {
      console.warn('[PostHog] No API key configured, analytics disabled')
    }
    return
  }

  // Initialiser le store de consentement
  const consentStore = useCookieConsentStore()

  // S'assurer que le store est initialise
  if (!consentStore.initialized) {
    consentStore.initialize()
  }

  // Initialiser PostHog en mode restrictif (opt-out par defaut)
  /* eslint-disable camelcase */
  posthog.init(posthogKey, {
    api_host: posthogHost,

    // Desactive par defaut - sera active si consentement
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    capture_performance: false,

    // Session Replay desactive par defaut
    disable_session_recording: true,
    enable_recording_console_log: false,

    // Pas de persistence sans consentement
    persistence: 'memory',

    // Privacy / GDPR
    respect_dnt: true,
    secure_cookie: import.meta.env.PROD,

    // Opt-out par defaut pour RGPD
    opt_out_capturing_by_default: true,

    // Feature flags - bootstrap pour chargement plus rapide
    bootstrap: {
      featureFlags: {},
    },

    // Callback quand PostHog est pret
    loaded: (ph) => {
      // Enregistrer les super properties
      ph.register({
        environment,
        app_version: config.public.appVersion || 'unknown',
      })

      // Reagir aux changements de consentement
      watch(
        () => consentStore.analyticsAllowed,
        (allowed) => {
          if (allowed) {
            // Activer le tracking complet
            ph.opt_in_capturing()

            // Capturer la page view initiale
            ph.capture('$pageview')

            // Activer session recording
            ph.startSessionRecording()

            if (import.meta.env.DEV) {
              console.info('[PostHog] Analytics ENABLED - full tracking active')
            }
          } else {
            // Desactiver le tracking
            ph.opt_out_capturing()

            // Arreter session recording
            ph.stopSessionRecording()

            if (import.meta.env.DEV) {
              console.info('[PostHog] Analytics DISABLED - consent not given')
            }
          }
        },
        { immediate: true }
      )

      // Debug mode en developpement
      if (import.meta.env.DEV) {
        ph.debug()
        console.info(
          `[PostHog] Initialized (environment: ${environment}, consent: ${consentStore.analyticsAllowed ? 'granted' : 'pending'})`
        )
      }
    },
  })
  /* eslint-enable camelcase */

  // Exposer l'instance PostHog globalement pour le composable
  return {
    provide: {
      posthog,
    },
  }
})
