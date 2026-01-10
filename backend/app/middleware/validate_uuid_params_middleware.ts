import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isValidUuid, UUID_PARAM_NAMES } from '#utils/uuid'

/**
 * Middleware de validation des paramètres UUID
 * Valide automatiquement tous les paramètres de route qui correspondent à des UUIDs
 * Retourne une erreur 400 Bad Request si un paramètre UUID est invalide
 */
export default class ValidateUuidParamsMiddleware {
  async handle({ params, response }: HttpContext, next: NextFn) {
    for (const paramName of UUID_PARAM_NAMES) {
      const value = params[paramName]

      // Skip if parameter is not present in this route
      if (value === undefined) {
        continue
      }

      // Validate UUID format
      if (!isValidUuid(value)) {
        return response.badRequest({
          error: 'Invalid parameter format',
          message: `The parameter '${paramName}' must be a valid UUID`,
          field: paramName,
        })
      }
    }

    await next()
  }
}
