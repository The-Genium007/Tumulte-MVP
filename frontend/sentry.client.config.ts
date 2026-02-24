import * as Sentry from '@sentry/nuxt'

// Event bus pour notifier les composants Vue d'une erreur capturée
type SentryEventCallback = () => void
const sentryEventListeners: SentryEventCallback[] = []

export const onSentryError = (callback: SentryEventCallback) => {
  sentryEventListeners.push(callback)
  return () => {
    const index = sentryEventListeners.indexOf(callback)
    if (index > -1) sentryEventListeners.splice(index, 1)
  }
}

const notifySentryError = () => {
  sentryEventListeners.forEach((cb) => cb())
}

// Variable pour stocker le sessionId (sera défini par supportTelemetry)
let cachedSessionId: string | null = null

export const setSentrySessionId = (sessionId: string) => {
  cachedSessionId = sessionId
  if (sessionId) {
    Sentry.setTag('sessionId', sessionId)
  }
}

export const setSentryUser = (user: { id: string; email?: string; username?: string } | null) => {
  Sentry.setUser(user)
}

// Récupérer le DSN depuis les variables d'environnement injectées au build
// Note: En mode SPA, les variables sont disponibles via import.meta.env
const dsn = import.meta.env.VITE_SENTRY_DSN || import.meta.env.NUXT_PUBLIC_SENTRY_DSN || ''

// Utiliser ENV_SUFFIX pour distinguer staging et production
const envSuffix = import.meta.env.VITE_ENV_SUFFIX || import.meta.env.ENV_SUFFIX || 'dev'
const environment =
  envSuffix === 'prod' ? 'production' : envSuffix === 'staging' ? 'staging' : 'development'
const isProduction = envSuffix === 'prod'

// Version de l'application pour le tracking des releases
const appVersion = import.meta.env.VITE_APP_VERSION || '0.3.0'

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release: `tumulte-frontend@${appVersion}`,

    // Performance monitoring (10% en prod, 50% en staging pour mieux tester)
    tracesSampleRate: isProduction ? 0.1 : environment === 'staging' ? 0.5 : 1.0,

    // Session Replay pour debug visuel
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration(),
      Sentry.captureConsoleIntegration({
        levels: ['error', 'warn'], // Capturer console.error et console.warn
      }),
      Sentry.contextLinesIntegration(), // Plus de contexte autour des erreurs
      Sentry.extraErrorDataIntegration(), // Données d'erreur enrichies
    ],

    // Filtrer les erreurs non pertinentes
    ignoreErrors: [
      // Erreurs réseau (pas des bugs)
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // Erreurs de navigation
      'ResizeObserver loop',
      'ResizeObserver loop limit exceeded',
      // Extensions navigateur
      'chrome-extension://',
      'moz-extension://',
      // Erreurs de chargement de chunks (refresh résout)
      'ChunkLoadError',
      'Loading chunk',
    ],

    beforeSend(event, hint) {
      // Ajouter sessionId pour corrélation avec Discord
      if (cachedSessionId) {
        event.tags = { ...event.tags, sessionId: cachedSessionId }
      }

      // Ne pas envoyer si c'est une erreur filtrée
      const error = hint.originalException
      if (error instanceof Error) {
        // Ignorer les erreurs 4xx (erreurs utilisateur, pas bugs)
        if (error.message.includes('401') || error.message.includes('403')) {
          return null
        }
      }

      // Notifier l'UI qu'une erreur a été capturée
      notifySentryError()

      return event
    },
  })
}

// Capturer les promesses non gérées (unhandled rejections)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason, {
      tags: { type: 'unhandledrejection' },
      extra: {
        promise: String(event.promise),
      },
    })
  })
}

export { Sentry }
