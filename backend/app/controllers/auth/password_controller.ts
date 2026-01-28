import type { HttpContext } from '@adonisjs/core/http'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  setPasswordSchema,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  type ChangePasswordDto,
  type SetPasswordDto,
} from '#validators/auth/auth_validators'
import { validateRequest } from '#middleware/validate_middleware'
import passwordResetService from '#services/auth/password_reset_service'
import emailAuthService from '#services/auth/email_auth_service'
import authAuditService from '#services/auth/auth_audit_service'

/**
 * Controller for password management
 */
export default class PasswordController {
  /**
   * Request password reset email
   */
  async forgotPassword(ctx: HttpContext) {
    const { request, response } = ctx
    await validateRequest(forgotPasswordSchema)(
      { request, response } as HttpContext,
      async () => {}
    )
    const data = request.all() as ForgotPasswordDto

    // Always send same response to prevent email enumeration
    await passwordResetService.sendResetEmail(data.email)

    // Audit log password reset request
    authAuditService.passwordResetRequested(data.email, ctx)

    return response.ok({
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
    })
  }

  /**
   * Validate reset token (check if it's valid before showing form)
   */
  async validateResetToken({ request, response }: HttpContext) {
    const token = request.input('token')

    if (!token || typeof token !== 'string' || token.length !== 64) {
      return response.badRequest({ valid: false })
    }

    const user = await passwordResetService.validateToken(token)

    return response.ok({ valid: user !== null })
  }

  /**
   * Reset password with token
   */
  async resetPassword(ctx: HttpContext) {
    const { request, response } = ctx
    await validateRequest(resetPasswordSchema)({ request, response } as HttpContext, async () => {})
    const data = request.all() as ResetPasswordDto

    const result = await passwordResetService.resetPassword(data.token, data.password)

    // Token invalid or expired
    if (result === null) {
      return response.badRequest({
        error: 'Le lien de réinitialisation est invalide ou a expiré.',
      })
    }

    // Password validation failed (weak, compromised, etc.)
    if (result.error) {
      return response.badRequest({
        error: result.error,
      })
    }

    // Audit log password reset completed
    if (result.user) {
      authAuditService.passwordResetCompleted(result.user.id, ctx)
    }

    return response.ok({
      message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    })
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(ctx: HttpContext) {
    const { request, response, auth } = ctx
    const user = auth.user!
    await validateRequest(changePasswordSchema)(
      { request, response } as HttpContext,
      async () => {}
    )
    const data = request.all() as ChangePasswordDto

    const result = await emailAuthService.changePassword(
      user,
      data.currentPassword,
      data.newPassword
    )

    if (!result.success) {
      return response.badRequest({ error: result.error })
    }

    // Audit log password changed
    authAuditService.passwordChanged(user.id, ctx)

    return response.ok({
      message: 'Mot de passe modifié avec succès.',
    })
  }

  /**
   * Set password for OAuth-only user
   */
  async setPassword({ request, response, auth }: HttpContext) {
    const user = auth.user!
    await validateRequest(setPasswordSchema)({ request, response } as HttpContext, async () => {})
    const data = request.all() as SetPasswordDto

    const result = await emailAuthService.setPassword(user, data.password)

    if (!result.success) {
      return response.badRequest({ error: result.error })
    }

    return response.ok({
      message: 'Mot de passe défini avec succès.',
    })
  }
}
