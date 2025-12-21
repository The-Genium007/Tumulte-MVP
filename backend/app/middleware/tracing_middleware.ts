import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { randomUUID } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'

/**
 * Middleware pour ajouter un ID de corrélation à chaque requête
 * Permet de tracer les requêtes à travers les différents services
 */
export default class TracingMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
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
    logger.info(
      {
        requestId,
        method: request.method(),
        url: request.url(),
        statusCode: response.getStatus(),
        duration: `${duration}ms`,
      },
      'Request completed'
    )
  }
}
