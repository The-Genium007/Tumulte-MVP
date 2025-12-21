import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { z } from 'zod'
import logger from '@adonisjs/core/services/logger'

/**
 * Middleware générique de validation Zod
 * Permet de valider les données de la requête avec un schéma Zod
 */
export function validateRequest(schema: z.ZodSchema) {
  return async ({ request, response }: HttpContext, next: NextFn) => {
    try {
      // Valider les données de la requête
      const validatedData = await schema.parseAsync(request.all())

      // Remplacer le body avec les données validées
      request.updateBody(validatedData)

      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const requestId = request.header('x-request-id')

        logger.warn(
          {
            requestId,
            method: request.method(),
            url: request.url(),
            errors: error.errors,
          },
          'Validation failed'
        )

        return response.badRequest({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        })
      }

      throw error
    }
  }
}

export default validateRequest
