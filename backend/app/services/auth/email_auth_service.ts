import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import User from '#models/user'
import emailVerificationService from './email_verification_service.js'
import passwordSecurityService from './password_security_service.js'

/**
 * Hours before an unverified account can be replaced by a new registration
 */
const UNVERIFIED_ACCOUNT_EXPIRY_HOURS = 24

/**
 * Service for email/password authentication
 *
 * Handles:
 * - User registration with email/password
 * - Login validation
 * - Password changes
 */
class EmailAuthService {
  /**
   * Register a new user with email and password
   */
  async register(data: {
    email: string
    password: string
    displayName: string
  }): Promise<{ user: User; error?: never } | { user?: never; error: string }> {
    const normalizedEmail = data.email.toLowerCase().trim()

    // Check if email already exists
    const existingUser = await User.query().where('email', normalizedEmail).first()

    if (existingUser) {
      // If user exists but has no password, they registered via OAuth
      // They can set a password to enable email login
      if (!existingUser.password) {
        return {
          error:
            'Un compte existe déjà avec cet email (connecté via Google ou Twitch). Connectez-vous avec ce provider pour ajouter un mot de passe.',
        }
      }

      // If user exists but email is not verified, check if account is expired
      if (!existingUser.isEmailVerified) {
        const createdAt = existingUser.createdAt
        const expiresAt = createdAt.plus({ hours: UNVERIFIED_ACCOUNT_EXPIRY_HOURS })

        if (DateTime.now() > expiresAt) {
          // Account expired - delete it and allow re-registration
          logger.info(
            { userId: existingUser.id, email: existingUser.email },
            'Deleting expired unverified account for re-registration'
          )
          await existingUser.delete()
          // Continue to create new account below
        } else {
          // Account not expired - user should login to access verify-email page
          return {
            error:
              "Un compte existe déjà avec cet email. Connectez-vous pour renvoyer l'email de vérification.",
          }
        }
      } else {
        // Email is verified - account exists
        return { error: 'Un compte existe déjà avec cet email.' }
      }
    }

    // Validate password security (HIBP check, common passwords, etc.)
    const passwordValidation = await passwordSecurityService.validatePassword(data.password, {
      checkPwned: true,
      userInputs: [normalizedEmail, data.displayName],
    })

    if (!passwordValidation.valid) {
      return { error: passwordValidation.error! }
    }

    // Create user - password will be hashed automatically by AuthFinder mixin
    const user = await User.create({
      email: normalizedEmail,
      password: data.password,
      displayName: data.displayName.trim(),
      tier: 'free',
    })

    // Send verification email
    try {
      await emailVerificationService.sendVerificationEmail(user)
    } catch (error) {
      logger.error({ userId: user.id, error }, 'Failed to send verification email on registration')
      // Don't fail registration if email fails - user can resend
    }

    logger.info({ userId: user.id, email: user.email }, 'New user registered via email')
    return { user }
  }

  /**
   * Validate login credentials
   * Returns user if valid, with emailVerified flag to indicate if redirect is needed
   */
  async validateCredentials(
    email: string,
    password: string
  ): Promise<
    | { user: User; emailVerified: boolean; error?: never }
    | { user?: never; emailVerified?: never; error: string }
  > {
    const normalizedEmail = email.toLowerCase().trim()

    const user = await User.query().where('email', normalizedEmail).first()

    if (!user) {
      return { error: 'Email ou mot de passe incorrect.' }
    }

    // User registered via OAuth only (no password)
    if (!user.password) {
      return {
        error:
          'Ce compte a été créé via Google ou Twitch. Utilisez ce provider pour vous connecter.',
      }
    }

    // Verify password (hash.verify takes hashedValue first, then plainValue)
    const isValid = await hash.verify(user.password, password)
    if (!isValid) {
      return { error: 'Email ou mot de passe incorrect.' }
    }

    // Allow login even if email not verified - frontend will redirect to verify-email page
    logger.info(
      { userId: user.id, emailVerified: user.isEmailVerified },
      'User logged in via email'
    )
    return { user, emailVerified: user.isEmailVerified }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    user: User,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    // If user has a password, verify current password
    if (user.password) {
      const isValid = await hash.verify(user.password, currentPassword)
      if (!isValid) {
        return { success: false, error: 'Mot de passe actuel incorrect.' }
      }
    }

    // Validate new password security
    const passwordValidation = await passwordSecurityService.validatePassword(newPassword, {
      checkPwned: true,
      userInputs: [user.email || '', user.displayName],
    })

    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error }
    }

    // Save new password - will be hashed automatically by AuthFinder mixin
    user.password = newPassword
    await user.save()

    logger.info({ userId: user.id }, 'Password changed successfully')
    return { success: true }
  }

  /**
   * Set password for OAuth-only user
   * Allows users who registered via OAuth to add a password
   */
  async setPassword(
    user: User,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (user.password) {
      return {
        success: false,
        error: 'Ce compte a déjà un mot de passe. Utilisez "Changer le mot de passe".',
      }
    }

    // Validate new password security
    const passwordValidation = await passwordSecurityService.validatePassword(newPassword, {
      checkPwned: true,
      userInputs: [user.email || '', user.displayName],
    })

    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error }
    }

    // Password will be hashed automatically by AuthFinder mixin
    user.password = newPassword
    await user.save()

    logger.info({ userId: user.id }, 'Password set for OAuth user')
    return { success: true }
  }
}

export default new EmailAuthService()
