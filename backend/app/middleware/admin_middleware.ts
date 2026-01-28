import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware to check if the authenticated user is an admin
 *
 * Admin status is determined by the ADMIN_EMAILS environment variable.
 * The user's email must be in the comma-separated list of admin emails.
 */
export default class AdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const user = auth.user

    if (!user) {
      return response.unauthorized({ error: 'Non authentifié.' })
    }

    if (!user.isAdmin) {
      return response.forbidden({ error: 'Accès réservé aux administrateurs.' })
    }

    return next()
  }
}
