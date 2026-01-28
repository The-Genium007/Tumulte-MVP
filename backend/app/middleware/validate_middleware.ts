import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Exception } from '@adonisjs/core/exceptions'
import { z } from 'zod'
import logger from '@adonisjs/core/services/logger'

/**
 * Custom exception for validation errors
 * This ensures the request processing stops when validation fails
 */
export class ValidationException extends Exception {
  constructor(public details: Array<{ field: string; message: string; code: string }>) {
    super('Validation failed', { code: 'E_VALIDATION_ERROR', status: 400 })
  }
}

/**
 * Middleware générique de validation Zod
 * Permet de valider les données de la requête avec un schéma Zod
 *
 * Throws ValidationException on failure to properly stop execution
 */
export function validateRequest(schema: z.ZodSchema) {
  return async ({ request }: HttpContext, next: NextFn) => {
    try {
      // Valider les données de la requête
      const validatedData = await schema.parseAsync(request.all())

      // Remplacer le body avec les données validées
      request.updateBody(validatedData as Record<string, unknown>)

      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const requestId = request.header('x-request-id')

        logger.warn(
          {
            requestId,
            method: request.method(),
            url: request.url(),
            errors: error.issues,
          },
          'Validation failed'
        )

        // Throw exception instead of returning response
        // This ensures execution stops properly
        throw new ValidationException(
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          }))
        )
      }

      throw error
    }
  }
}

export default validateRequest
