import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Sentry } from '#config/sentry'
import logger from '@adonisjs/core/services/logger'

/**
 * Middleware pour gérer les erreurs et les envoyer à Sentry
 * Capture toutes les erreurs non gérées et les log
 */
export default class ErrorHandlerMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    try {
      await next()
    } catch (error) {
      const requestId = request.header('x-request-id')

      // Logger l'erreur
      logger.error(
        {
          requestId,
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
        Sentry.captureException(error, {
          tags: {
            requestId,
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return 'Internal server error'
  }
}
