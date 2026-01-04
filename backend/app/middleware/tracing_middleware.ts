import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { randomUUID } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import { backendLogService, BackendLogService } from '#services/support/backend_log_service'

/**
 * Middleware pour ajouter un ID de corrélation à chaque requête
 * Permet de tracer les requêtes à travers les différents services
 * + Push les logs vers Redis pour le système de support
 */
export default class TracingMiddleware {
  async handle({ request, response, auth }: HttpContext, next: NextFn) {
    // Générer ou récupérer le request ID
    const requestId = request.header('x-request-id') || randomUUID()

    // Ajouter dans les headers de réponse
    response.header('x-request-id', requestId)

    // Logger la requête entrante
    logger.info(
      {
        requestId,
        method: request.method(),
        url: request.url(),
        ip: request.ip(),
        userAgent: request.header('user-agent'),
      },
      'Incoming request'
    )

    const startTime = Date.now()

    await next()

    // Logger la requête sortante avec durée
    const duration = Date.now() - startTime
    const statusCode = response.getStatus()

    logger.info(
      {
        requestId,
        method: request.method(),
        url: request.url(),
        statusCode,
        duration: `${duration}ms`,
      },
      'Request completed'
    )

    // Push vers Redis pour les utilisateurs authentifiés
    // (async, ne bloque pas la réponse)
    try {
      const user = auth.user
      if (user) {
        const logEntry = BackendLogService.createLogEntry({
          requestId,
          method: request.method(),
          url: request.url(),
          statusCode,
          durationMs: duration,
        })

        // Fire and forget - ne pas attendre
        backendLogService.pushLog(user.id.toString(), logEntry).catch(() => {
          // Silently ignore Redis errors
        })
      }
    } catch {
      // Ignore auth errors (user not authenticated)
    }
  }
}
