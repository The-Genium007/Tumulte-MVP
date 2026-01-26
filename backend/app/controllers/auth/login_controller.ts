import type { HttpContext } from '@adonisjs/core/http'
import { loginSchema, type LoginDto } from '#validators/auth/auth_validators'
import { validateRequest } from '#middleware/validate_middleware'
import emailAuthService from '#services/auth/email_auth_service'
import { formatUserResponse } from '#utils/user_response'
import AuthLockoutMiddleware from '#middleware/auth_lockout_middleware'

/**
 * Controller for email/password login
 */
export default class LoginController {
  /**
   * Login with email and password
   */
  async handle({ request, response, auth }: HttpContext) {
    await validateRequest(loginSchema)({ request, response } as HttpContext, async () => {})
    const data = request.all() as LoginDto
    const ip = request.ip()

    const result = await emailAuthService.validateCredentials(data.email, data.password)

    if (result.error || !result.user) {
      // Record failed attempt for progressive lockout
      await AuthLockoutMiddleware.recordFailedAttempt(ip, data.email)
      return response.unauthorized({ error: result.error ?? 'Erreur de connexion.' })
    }

    const user = result.user

    // Clear lockout on successful login
    await AuthLockoutMiddleware.clearLockout(ip, data.email)

    // Create session with optional "Remember Me"
    await auth.use('web').login(user, data.rememberMe ?? false)

    return response.ok({
      message: 'Connexion réussie',
      user: await formatUserResponse(user),
      emailVerified: result.emailVerified,
    })
  }
}
