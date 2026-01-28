import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Authentication Audit Service
 *
 * Provides structured logging for authentication events.
 * Useful for security monitoring, debugging, and compliance.
 */

export type AuthEventType =
  | 'login_success'
  | 'login_failed'
  | 'login_locked'
  | 'logout'
  | 'logout_all'
  | 'register'
  | 'email_verified'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'password_changed'
  | 'oauth_login'
  | 'oauth_link'
  | 'oauth_unlink'
  | 'session_expired'

export interface AuthAuditData {
  event: AuthEventType
  userId?: string
  email?: string
  provider?: string
  ip?: string
  userAgent?: string
  reason?: string
  metadata?: Record<string, unknown>
}

class AuthAuditService {
  /**
   * Extract client info from HTTP context
   */
  private getClientInfo(ctx?: HttpContext): { ip: string; userAgent: string } {
    if (!ctx) {
      return { ip: 'unknown', userAgent: 'unknown' }
    }

    const ip =
      ctx.request.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      ctx.request.header('x-real-ip') ||
      ctx.request.ip() ||
      'unknown'

    const userAgent = ctx.request.header('user-agent') || 'unknown'

    return { ip, userAgent }
  }

  /**
   * Log an authentication event
   */
  log(data: AuthAuditData, ctx?: HttpContext): void {
    const clientInfo = this.getClientInfo(ctx)

    const logData = {
      audit: 'auth',
      event: data.event,
      userId: data.userId,
      email: data.email ? this.maskEmail(data.email) : undefined,
      provider: data.provider,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      reason: data.reason,
      ...data.metadata,
      timestamp: new Date().toISOString(),
    }

    // Use appropriate log level based on event type
    switch (data.event) {
      case 'login_failed':
      case 'login_locked':
      case 'session_expired':
        logger.warn(logData, `Auth audit: ${data.event}`)
        break
      default:
        logger.info(logData, `Auth audit: ${data.event}`)
    }
  }

  /**
   * Mask email for logging (privacy)
   * john.doe@example.com -> j***e@example.com
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!domain || local.length < 2) return '***@' + (domain || '***')

    return `${local[0]}***${local[local.length - 1]}@${domain}`
  }

  // Convenience methods for common events

  loginSuccess(userId: string, email: string, ctx?: HttpContext): void {
    this.log({ event: 'login_success', userId, email }, ctx)
  }

  loginFailed(email: string, reason: string, ctx?: HttpContext): void {
    this.log({ event: 'login_failed', email, reason }, ctx)
  }

  loginLocked(email: string, ctx?: HttpContext): void {
    this.log({ event: 'login_locked', email, reason: 'Too many failed attempts' }, ctx)
  }

  logout(userId: string, ctx?: HttpContext): void {
    this.log({ event: 'logout', userId }, ctx)
  }

  logoutAll(userId: string, ctx?: HttpContext): void {
    this.log({ event: 'logout_all', userId }, ctx)
  }

  register(userId: string, email: string, ctx?: HttpContext): void {
    this.log({ event: 'register', userId, email }, ctx)
  }

  emailVerified(userId: string, email: string, ctx?: HttpContext): void {
    this.log({ event: 'email_verified', userId, email }, ctx)
  }

  passwordResetRequested(email: string, ctx?: HttpContext): void {
    this.log({ event: 'password_reset_requested', email }, ctx)
  }

  passwordResetCompleted(userId: string, ctx?: HttpContext): void {
    this.log({ event: 'password_reset_completed', userId }, ctx)
  }

  passwordChanged(userId: string, ctx?: HttpContext): void {
    this.log({ event: 'password_changed', userId }, ctx)
  }

  oauthLogin(userId: string, provider: string, ctx?: HttpContext): void {
    this.log({ event: 'oauth_login', userId, provider }, ctx)
  }

  oauthLink(userId: string, provider: string, ctx?: HttpContext): void {
    this.log({ event: 'oauth_link', userId, provider }, ctx)
  }

  oauthUnlink(userId: string, provider: string, ctx?: HttpContext): void {
    this.log({ event: 'oauth_unlink', userId, provider }, ctx)
  }
}

const authAuditService = new AuthAuditService()
export default authAuditService
