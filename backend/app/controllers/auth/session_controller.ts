import type { HttpContext } from '@adonisjs/core/http'
import { formatUserResponse } from '#utils/user_response'

/**
 * Controller for session management (logout, current user)
 */
export default class SessionController {
  /**
   * Logout the current user
   * POST /auth/logout
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.ok({ message: 'Logged out successfully' })
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
