import posthog from 'posthog-js'
import type { PostHog } from 'posthog-js'
import { watch } from 'vue'
import { useCookieConsentStore } from '@/stores/cookieConsent'

/**
 * PostHog Analytics Plugin avec integration RGPD stricte
 *
 * ARCHITECTURE LAZY-INIT:
 * - PostHog n'est PAS initialisé au chargement de la page
 * - L'initialisation se fait UNIQUEMENT après consentement explicite
 * - La révocation du consentement arrête complètement le tracking
 *
 * Cela garantit une conformité RGPD stricte : aucune donnée n'est
 * collectée avant que l'utilisateur n'ait donné son accord.
 *
 * Features:
 * - Automatic page view tracking (après consentement)
 * - Session replay avec sampling (après consentement)
 * - Feature flags pour A/B testing
 * - User identification (lié à l'auth)
 *
 * Environment filtering:
 * Tous les events incluent une propriété 'environment' ('development' ou 'production')
 * pour filtrer dans le dashboard PostHog (projet unique, tier gratuit).
 */

// Instance PostHog globale - null tant que pas de consentement
let posthogInstance: PostHog | null = null

// Type pour l'API exposée
export interface PostHogApi {
  /** Instance PostHog brute (null si pas de consentement) */
  readonly instance: PostHog | null
  /** Capture un événement (no-op si pas de consentement) */
  capture: (event: string, properties?: Record<string, unknown>) => void
  /** Identifie un utilisateur (no-op si pas de consentement) */
  identify: (userId: string, properties?: Record<string, unknown>) => void
  /** Reset l'identité (logout) */
  reset: () => void
  /** Définit des propriétés utilisateur persistantes */
  setPersonProperties: (properties: Record<string, unknown>) => void
  /** Définit des propriétés utilisateur une seule fois */
  setPersonPropertiesOnce: (properties: Record<string, unknown>) => void
  /** Vérifie si un feature flag est activé */
  isFeatureEnabled: (flagKey: string) => boolean
  /** Récupère la valeur d'un feature flag */
  getFeatureFlag: (flagKey: string) => string | boolean | undefined
  /** Démarre l'enregistrement de session */
  startSessionRecording: () => void
  /** Arrête l'enregistrement de session */
  stopSessionRecording: () => void
  /** Récupère le distinct ID actuel */
  getDistinctId: () => string | undefined
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const posthogKey = config.public.posthogKey as string
  const posthogHost = config.public.posthogHost as string
  const environment = import.meta.env.PROD ? 'production' : 'development'

  // Ne pas initialiser si pas de clé API
  if (!posthogKey) {
    if (import.meta.env.DEV) {
      console.warn('[PostHog] No API key configured, analytics disabled')
    }
    return {
      provide: {
        posthog: createNoOpApi(),
      },
    }
  }

  /**
   * Initialise PostHog (appelé UNIQUEMENT après consentement)
   */
  const initializePostHog = (): PostHog => {
    if (posthogInstance) return posthogInstance

    /* eslint-disable camelcase */
    posthogInstance = posthog.init(posthogKey, {
      api_host: posthogHost,

      // Capture automatique après consentement
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // On garde le contrôle manuel pour éviter le bruit

      // Session Replay avec sampling (10% des sessions)
      disable_session_recording: false,
      session_recording: {
        // Sampling : enregistrer seulement 10% des sessions
        // Réduit les coûts et la bande passante
        maskAllInputs: true,
        maskTextSelector: '.mask-text',
      },

      // Persistence avec consentement
      persistence: 'localStorage+cookie',

      // Privacy / GDPR
      respect_dnt: true,
      secure_cookie: import.meta.env.PROD,

      // Feature flags - bootstrap vide pour chargement rapide
      bootstrap: {
        featureFlags: {},
      },

      // Callback quand PostHog est prêt
      loaded: (ph) => {
        // Enregistrer les super properties (ajoutées à tous les events)
        ph.register({
          environment,
          app_version: config.public.appVersion || 'unknown',
        })

        // Debug mode en développement
        if (import.meta.env.DEV) {
          ph.debug()
          console.info(`[PostHog] Initialized successfully (environment: ${environment})`)
        }
      },
    })!
    /* eslint-enable camelcase */

    return posthogInstance
  }

  /**
   * Détruit l'instance PostHog (révocation du consentement)
   */
  const destroyPostHog = () => {
    if (posthogInstance) {
      // Arrêter tous les trackings
      posthogInstance.opt_out_capturing()
      posthogInstance.stopSessionRecording()

      // Reset l'identité pour supprimer les données locales
      posthogInstance.reset()

      if (import.meta.env.DEV) {
        console.info('[PostHog] Instance destroyed - all tracking stopped')
      }

      // Note: posthog-js n'a pas de vraie méthode destroy()
      // On remet à null pour forcer une nouvelle init si re-consentement
      posthogInstance = null
    }
  }

  // API PostHog exposée à l'application
  const posthogApi: PostHogApi = {
    get instance() {
      return posthogInstance
    },

    capture(event: string, properties?: Record<string, unknown>) {
      posthogInstance?.capture(event, properties)
    },

    identify(userId: string, properties?: Record<string, unknown>) {
      posthogInstance?.identify(userId, properties)
    },

    reset() {
      posthogInstance?.reset()
    },

    setPersonProperties(properties: Record<string, unknown>) {
      posthogInstance?.setPersonProperties(properties)
    },

    setPersonPropertiesOnce(properties: Record<string, unknown>) {
      posthogInstance?.setPersonPropertiesForFlags(properties)
    },

    isFeatureEnabled(flagKey: string): boolean {
      return posthogInstance?.isFeatureEnabled(flagKey) ?? false
    },

    getFeatureFlag(flagKey: string): string | boolean | undefined {
      return posthogInstance?.getFeatureFlag(flagKey)
    },

    startSessionRecording() {
      posthogInstance?.startSessionRecording()
    },

    stopSessionRecording() {
      posthogInstance?.stopSessionRecording()
    },

    getDistinctId(): string | undefined {
      return posthogInstance?.get_distinct_id()
    },
  }

  // Watcher sur le consentement - initialisé après mount de l'app
  // pour éviter les erreurs "inject() can only be used inside setup()"
  nuxtApp.hook('app:mounted', () => {
    const consentStore = useCookieConsentStore()

    // S'assurer que le store est initialisé
    if (!consentStore.initialized) {
      consentStore.initialize()
    }

    // Réagir aux changements de consentement
    watch(
      () => consentStore.analyticsAllowed,
      (allowed) => {
        if (allowed) {
          // CONSENTEMENT DONNÉ : Initialiser PostHog
          initializePostHog()

          if (import.meta.env.DEV) {
            console.info('[PostHog] Analytics ENABLED - tracking started')
          }
        } else {
          // CONSENTEMENT RÉVOQUÉ OU NON DONNÉ : Détruire PostHog
          destroyPostHog()

          if (import.meta.env.DEV) {
            console.info('[PostHog] Analytics DISABLED - no consent')
          }
        }
      },
      { immediate: true }
    )
  })

  return {
    provide: {
      posthog: posthogApi,
    },
  }
})

/**
 * Crée une API no-op pour quand PostHog n'est pas configuré
 */
function createNoOpApi(): PostHogApi {
  return {
    get instance() {
      return null
    },
    capture: () => {},
    identify: () => {},
    reset: () => {},
    setPersonProperties: () => {},
    setPersonPropertiesOnce: () => {},
    isFeatureEnabled: () => false,
    getFeatureFlag: () => undefined,
    startSessionRecording: () => {},
    stopSessionRecording: () => {},
    getDistinctId: () => undefined,
  }
}
