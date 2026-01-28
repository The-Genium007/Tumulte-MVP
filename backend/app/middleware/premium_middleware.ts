import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware to check if the authenticated user has premium access
 *
 * Premium access is granted to:
 * - Admin users (determined by ADMIN_EMAILS env variable)
 * - Users with an active premium subscription
 */
export default class PremiumMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const user = auth.user

    if (!user) {
      return response.unauthorized({ error: 'Non authentifié.' })
    }

    // Admins always have premium access
    if (user.isAdmin) {
      return next()
    }

    // Check for active premium subscription
    const isPremium = await user.isPremium()

    if (!isPremium) {
      return response.forbidden({
        error: 'Cette fonctionnalité nécessite un abonnement Premium.',
        upgradeUrl: '/account/subscription',
      })
    }

    return next()
  }
}
