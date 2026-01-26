import type { HttpContext } from '@adonisjs/core/http'
import { verifyEmailSchema, type VerifyEmailDto } from '#validators/auth/auth_validators'
import { validateRequest } from '#middleware/validate_middleware'
import emailVerificationService from '#services/auth/email_verification_service'

/**
 * Controller for email verification
 */
export default class VerificationController {
  /**
   * Verify email with token
   */
  async verify({ request, response }: HttpContext) {
    await validateRequest(verifyEmailSchema)({ request, response } as HttpContext, async () => {})
    const data = request.all() as VerifyEmailDto

    const user = await emailVerificationService.verifyToken(data.token)

    if (!user) {
      return response.badRequest({
        error: 'Le lien de vérification est invalide ou a expiré.',
      })
    }

    return response.ok({
      message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.',
    })
  }

  /**
   * Resend verification email (authenticated user)
   */
  async resend({ auth, response }: HttpContext) {
    const user = auth.user!

    if (user.isEmailVerified) {
      return response.badRequest({
        error: 'Votre email est déjà vérifié.',
      })
    }

    if (!user.email) {
      return response.badRequest({
        error: 'Aucun email associé à ce compte.',
      })
    }

    const result = await emailVerificationService.resendVerificationEmail(user)

    if (!result.success) {
      return response.tooManyRequests({
        error: `Veuillez attendre ${result.waitSeconds} secondes avant de demander un nouvel email.`,
        waitSeconds: result.waitSeconds,
      })
    }

    return response.ok({
      message: 'Email de vérification envoyé.',
    })
  }
}
