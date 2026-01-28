import type { HttpContext } from '@adonisjs/core/http'
import { formatUserResponse } from '#utils/user_response'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import authAuditService from '#services/auth/auth_audit_service'

/**
 * Controller for session management (logout, current user)
 */
export default class SessionController {
  /**
   * Logout the current user
   * POST /auth/logout
   *
   * Query params:
   * - all: boolean - If true, invalidates all sessions for this user (logout from all devices)
   */
  async logout(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user
    const logoutAll = request.input('all', false)

    // Standard logout (current session only)
    await auth.use('web').logout()

    // If logoutAll is requested, also invalidate all remember_me tokens for this user
    if (logoutAll && user) {
      try {
        const deletedCount = await db
          .from('remember_me_tokens')
          .where('tokenable_id', user.id)
          .delete()

        logger.info(
          { userId: user.id, deletedTokens: deletedCount },
          'User logged out from all devices'
        )

        // Audit log logout all
        authAuditService.logoutAll(user.id, ctx)
      } catch (error) {
        // Log but don't fail the request - main logout already succeeded
        logger.error(
          { userId: user.id, error },
          'Failed to delete remember_me tokens during logout all'
        )
      }
    } else if (user) {
      // Audit log standard logout
      authAuditService.logout(user.id, ctx)
    }

    return response.ok({
      message: logoutAll ? 'Logged out from all devices' : 'Logged out successfully',
    })
  }

  /**
   * Get the current authenticated user
   * GET /auth/me
   */
  async me({ auth, response }: HttpContext) {
    const user = auth.user!
    return response.ok({
      user: await formatUserResponse(user),
    })
  }
}
