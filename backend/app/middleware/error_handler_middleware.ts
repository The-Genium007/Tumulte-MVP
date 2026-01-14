import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Sentry } from '#config/sentry'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'

/**
 * Middleware pour gérer les erreurs et les envoyer à Sentry
 * Capture toutes les erreurs non gérées et les log
 */
export default class ErrorHandlerMiddleware {
  async handle({ request, response, auth }: HttpContext, next: NextFn) {
    try {
      await next()
    } catch (error) {
      const requestId = request.header('x-request-id')
      const sessionId = request.header('x-session-id')

      // Logger l'erreur
      logger.error(
        {
          requestId,
          sessionId,
          method: request.method(),
          url: request.url(),
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : error,
        },
        'Request error'
      )

      // Envoyer à Sentry si configuré
      if (error instanceof Error) {
        // Ajouter contexte utilisateur pour corrélation
        const user = auth.user
        if (user) {
          Sentry.setUser({
            id: String(user.id),
            username: user.displayName,
          })
        }

        Sentry.captureException(error, {
          tags: {
            requestId: requestId ?? undefined,
            sessionId: sessionId ?? undefined,
            method: request.method(),
            url: request.url(),
          },
        })
      }

      // Retourner une erreur appropriée
      const statusCode = this.getStatusCode(error)
      const message = this.getErrorMessage(error)

      return response.status(statusCode).json({
        error: message,
        requestId,
      })
    }
  }

  private getStatusCode(error: unknown): number {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      return typeof error.status === 'number' ? error.status : 500
    }
    return 500
  }

  /**
   * Messages d'erreur sûrs à exposer au client en production
   * Ces messages ne révèlent pas d'informations sensibles
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly SAFE_ERROR_PATTERNS = [
    'not found',
    'unauthorized',
    'forbidden',
    'bad request',
    'validation failed',
    'invalid',
    'already exists',
    'not allowed',
    'expired',
    'rate limit',
  ]

  private getErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'Internal server error'
    }

    // En développement, retourner le message complet
    if (!app.inProduction) {
      return error.message
    }

    // En production, filtrer les messages pour ne pas exposer d'informations sensibles
    const lowerMessage = error.message.toLowerCase()
    const isSafeMessage = ErrorHandlerMiddleware.SAFE_ERROR_PATTERNS.some((pattern) =>
      lowerMessage.includes(pattern)
    )

    if (isSafeMessage) {
      return error.message
    }

    // Message générique pour les erreurs potentiellement sensibles
    return 'An error occurred. Please try again later.'
  }
}
