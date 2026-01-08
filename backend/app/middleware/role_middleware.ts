import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { UserRole } from '#models/user'

/**
 * Role middleware - currently disabled to allow all authenticated users
 * to access both MJ and Streamer sections.
 *
 * Previously restricted access based on user role, but now any authenticated
 * user can access all parts of the application.
 */
export default class RoleMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    _options: {
      role: UserRole
    }
  ) {
    const user = ctx.auth.user

    if (!user) {
      return ctx.response.unauthorized({ error: 'Unauthorized' })
    }

    // Role check disabled - all authenticated users can access all sections
    // Previously: if (user.role !== options.role) { return forbidden }

    return next()
  }
}
