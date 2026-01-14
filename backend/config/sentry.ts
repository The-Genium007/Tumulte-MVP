import env from '#start/env'
import * as Sentry from '@sentry/node'

const isEnabled = !!env.get('SENTRY_DSN')
const envSuffix = env.get('ENV_SUFFIX', 'dev') // "prod", "staging", ou "dev"
const isProduction = envSuffix === 'prod'

if (isEnabled) {
  Sentry.init({
    dsn: env.get('SENTRY_DSN'),
    // Utilise ENV_SUFFIX pour distinguer staging et production
    environment:
      envSuffix === 'prod' ? 'production' : envSuffix === 'staging' ? 'staging' : 'development',
    release: `tumulte-backend@${env.get('APP_VERSION', '0.3.0')}`,

    // Performance monitoring (10% en prod pour limiter les coûts)
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // Profiling (5% en prod)
    profilesSampleRate: isProduction ? 0.05 : 1.0,

    // Logs Sentry v10 - capture automatique des logs
    integrations: [
      Sentry.captureConsoleIntegration({
        levels: ['error', 'warn'], // Capturer console.error et console.warn
      }),
      Sentry.contextLinesIntegration(), // Plus de contexte autour des erreurs
      Sentry.extraErrorDataIntegration(), // Données d'erreur enrichies
      Sentry.httpIntegration(), // Tracking automatique des requêtes HTTP sortantes
    ],

    // Filtrer les erreurs métier (pas des vrais bugs)
    ignoreErrors: [
      'E_UNAUTHORIZED_ACCESS',
      'E_VALIDATION_ERROR',
      'E_ROW_NOT_FOUND',
      'E_ROUTE_NOT_FOUND',
      // Erreurs réseau communes
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
    ],

    // Ne pas envoyer les erreurs 4xx (erreurs client)
    beforeSend(event, hint) {
      const error = hint.originalException
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status
        if (status >= 400 && status < 500) {
          return null
        }
      }
      return event
    },

    // Nettoyer les données sensibles des breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Supprimer les tokens et secrets des logs
      if (breadcrumb.data) {
        const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'api_key']
        for (const key of sensitiveKeys) {
          if (key in breadcrumb.data) {
            breadcrumb.data[key] = '[FILTERED]'
          }
        }
      }
      return breadcrumb
    },

    // Contexte global de l'application
    initialScope: {
      tags: {
        'app.component': 'backend',
      },
    },
  })
}

export { Sentry }
export const sentryEnabled = isEnabled
