import { createHash } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'

/**
 * Common passwords that should always be rejected
 * Based on OWASP and NIST recommendations
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'azerty123',
  'admin123',
  'letmein',
  'welcome',
  'welcome1',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'dragon',
  'master',
  'monkey',
  'shadow',
  'michael',
  'jennifer',
  'charlie',
  'donald',
  'qwertyuiop',
  'azertyuiop',
  'trustno1',
  'whatever',
  'passw0rd',
  'p@ssw0rd',
  'p@ssword',
  'password!',
])

/**
 * Service for password security validation
 *
 * Implements OWASP and NIST 800-63b recommendations:
 * - Check against HaveIBeenPwned database (k-anonymity model)
 * - Reject common passwords
 * - Enforce minimum length (8 chars with MFA context)
 */
class PasswordSecurityService {
  private readonly hibpApiUrl = 'https://api.pwnedpasswords.com/range/'
  private readonly hibpTimeoutMs = 3000

  /**
   * Check if a password has been compromised using HaveIBeenPwned API
   * Uses k-anonymity model: only sends first 5 chars of SHA-1 hash
   *
   * @returns Number of times the password has been seen in breaches, or -1 if check failed
   */
  async checkPwnedPassword(password: string): Promise<number> {
    try {
      const sha1Hash = createHash('sha1').update(password).digest('hex').toUpperCase()
      const prefix = sha1Hash.substring(0, 5)
      const suffix = sha1Hash.substring(5)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.hibpTimeoutMs)

      const response = await fetch(`${this.hibpApiUrl}${prefix}`, {
        headers: {
          'User-Agent': 'Tumulte-PasswordCheck',
          'Add': 'padding', // Request padding to prevent response size analysis
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        logger.warn({ status: response.status }, 'HaveIBeenPwned API returned non-OK status')
        return -1 // Fail open - don't block registration if API is down
      }

      const text = await response.text()
      const lines = text.split('\n')

      for (const line of lines) {
        const [hashSuffix, count] = line.split(':')
        if (hashSuffix?.trim() === suffix) {
          return Number.parseInt(count?.trim() || '0', 10)
        }
      }

      return 0 // Password not found in breaches
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.warn('HaveIBeenPwned API request timed out')
      } else {
        logger.error({ error }, 'Failed to check password against HaveIBeenPwned')
      }
      return -1 // Fail open
    }
  }

  /**
   * Check if password is in the common passwords list
   */
  isCommonPassword(password: string): boolean {
    return COMMON_PASSWORDS.has(password.toLowerCase())
  }

  /**
   * Validate password strength according to NIST 800-63b guidelines
   * Returns validation result with potential error message
   */
  async validatePassword(
    password: string,
    options: {
      checkPwned?: boolean
      userInputs?: string[] // Email, username, etc. to check for
    } = {}
  ): Promise<{ valid: boolean; error?: string; pwnedCount?: number }> {
    const { checkPwned = true, userInputs = [] } = options

    // Minimum length (NIST recommends 8 minimum)
    if (password.length < 8) {
      return {
        valid: false,
        error: 'Le mot de passe doit contenir au moins 8 caractères.',
      }
    }

    // Maximum length (prevent DoS with huge passwords)
    if (password.length > 128) {
      return {
        valid: false,
        error: 'Le mot de passe ne peut pas dépasser 128 caractères.',
      }
    }

    // Check for common passwords
    if (this.isCommonPassword(password)) {
      return {
        valid: false,
        error: 'Ce mot de passe est trop courant. Choisissez quelque chose de plus unique.',
      }
    }

    // Check if password contains user-specific data
    const lowerPassword = password.toLowerCase()
    for (const input of userInputs) {
      if (input && input.length >= 4 && lowerPassword.includes(input.toLowerCase())) {
        return {
          valid: false,
          error: "Le mot de passe ne doit pas contenir votre email ou nom d'utilisateur.",
        }
      }
    }

    // Check against HaveIBeenPwned
    if (checkPwned) {
      const pwnedCount = await this.checkPwnedPassword(password)

      if (pwnedCount > 0) {
        logger.info({ pwnedCount }, 'Password found in breach database')
        return {
          valid: false,
          error: `Ce mot de passe a été exposé dans des fuites de données (${pwnedCount.toLocaleString('fr-FR')} fois). Choisissez-en un autre.`,
          pwnedCount,
        }
      }
    }

    return { valid: true }
  }
}

export default new PasswordSecurityService()
