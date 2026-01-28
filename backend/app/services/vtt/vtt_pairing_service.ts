import { inject } from '@adonisjs/core'
import jwt from 'jsonwebtoken'
import { randomBytes, createHash } from 'node:crypto'
import VttConnection from '#models/vtt_connection'
import TokenRevocationList from '#models/token_revocation_list'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export interface SessionTokens {
  sessionToken: string
  refreshToken: string
  expiresIn: number
}

@inject()
export default class VttPairingService {
  private readonly jwtSecret: string
  private readonly sessionTokenExpiry = 3600 // 1 hour in seconds
  private readonly refreshTokenExpiry = 604800 // 7 days in seconds

  constructor() {
    this.jwtSecret = env.get('APP_KEY')
  }

  /**
   * Generate a connection fingerprint from worldId and moduleVersion
   * This fingerprint is stored on first pairing and validated on every token refresh
   * to detect if someone tries to use stolen tokens from a different Foundry instance
   */
  generateFingerprint(worldId: string, moduleVersion: string): string {
    const data = `${worldId}:${moduleVersion}:tumulte-vtt-fingerprint`
    return createHash('sha256').update(data).digest('hex').substring(0, 32)
  }

  /**
   * Public method to generate session tokens for a connection
   * Used by the code-based pairing flow
   * Now includes fingerprint in the JWT for validation on refresh
   */
  async generateSessionTokensForConnection(
    connectionId: string,
    userId: string,
    tokenVersion: number,
    fingerprint?: string
  ): Promise<SessionTokens> {
    return this.generateSessionTokens(connectionId, userId, tokenVersion, fingerprint)
  }

  /**
   * Generate session and refresh tokens for VTT connection
   * Includes tokenVersion to enable instant invalidation of all tokens
   * Includes fingerprint to detect token theft across different Foundry instances
   */
  private async generateSessionTokens(
    connectionId: string,
    userId: string,
    tokenVersion: number,
    fingerprint?: string
  ): Promise<SessionTokens> {
    const now = Math.floor(Date.now() / 1000)

    // Generate JTI (JWT ID) for both tokens
    const sessionJti = randomBytes(16).toString('hex')
    const refreshJti = randomBytes(16).toString('hex')

    // Session token (short-lived) - includes tokenVersion for validation
    /* eslint-disable camelcase -- JWT payload uses snake_case by convention */
    const sessionToken = jwt.sign(
      {
        jti: sessionJti,
        sub: connectionId,
        user_id: userId,
        type: 'session',
        token_version: tokenVersion,
        fingerprint: fingerprint || null,
        iat: now,
        exp: now + this.sessionTokenExpiry,
      },
      this.jwtSecret,
      { algorithm: 'HS256' }
    )

    // Refresh token (long-lived) - includes tokenVersion and fingerprint for validation
    const refreshToken = jwt.sign(
      {
        jti: refreshJti,
        sub: connectionId,
        user_id: userId,
        type: 'refresh',
        token_version: tokenVersion,
        fingerprint: fingerprint || null,
        iat: now,
        exp: now + this.refreshTokenExpiry,
      },
      this.jwtSecret,
      { algorithm: 'HS256' }
    )
    /* eslint-enable camelcase */

    return {
      sessionToken,
      refreshToken,
      expiresIn: this.sessionTokenExpiry,
    }
  }

  /**
   * Refresh session token using refresh token
   * Validates tokenVersion and fingerprint to ensure token hasn't been invalidated
   * and is being used from the same Foundry instance
   */
  async refreshSessionToken(
    refreshToken: string,
    providedFingerprint?: string
  ): Promise<SessionTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as any

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      // Check if revoked via revocation list
      const isRevoked = await TokenRevocationList.isRevoked(decoded.jti)
      if (isRevoked) {
        throw new Error('Refresh token has been revoked')
      }

      // Verify connection still exists and is active
      const connection = await VttConnection.findOrFail(decoded.sub)
      if (connection.status === 'revoked') {
        throw new Error('Connection has been revoked')
      }

      // Validate tokenVersion - if it doesn't match, all tokens are invalidated
      if (decoded.token_version !== connection.tokenVersion) {
        throw new Error('Token has been invalidated')
      }

      // Validate fingerprint if stored on connection
      // This detects if someone tries to use stolen tokens from a different Foundry instance
      if (connection.connectionFingerprint) {
        const fingerprintToValidate = providedFingerprint || decoded.fingerprint

        if (!fingerprintToValidate) {
          logger.warn('Token refresh attempted without fingerprint', {
            connectionId: connection.id,
            worldId: connection.worldId,
          })
          throw new Error('Fingerprint required for token refresh')
        }

        if (fingerprintToValidate !== connection.connectionFingerprint) {
          logger.warn('Token refresh attempted with mismatched fingerprint', {
            connectionId: connection.id,
            worldId: connection.worldId,
            expected: connection.connectionFingerprint.substring(0, 8) + '...',
            received: fingerprintToValidate.substring(0, 8) + '...',
          })
          throw new Error('Invalid connection fingerprint')
        }
      }

      // Generate new session token with current tokenVersion and fingerprint
      return await this.generateSessionTokens(
        connection.id,
        decoded.user_id,
        connection.tokenVersion,
        connection.connectionFingerprint || undefined
      )
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Invalid refresh token: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Revoke all tokens for a VTT connection
   * Increments tokenVersion to instantly invalidate all existing tokens
   */
  async revokeConnectionTokens(connectionId: string, _reason: string): Promise<void> {
    const connection = await VttConnection.find(connectionId)

    // Connection may already be deleted - that's fine, nothing to revoke
    if (!connection) {
      return
    }

    // Increment tokenVersion to invalidate all existing tokens instantly
    // This is more efficient than adding all tokens to revocation list
    connection.tokenVersion = (connection.tokenVersion || 1) + 1
    connection.status = 'revoked'
    connection.tunnelStatus = 'disconnected'
    await connection.save()
  }

  /**
   * Invalidate all tokens without revoking the connection
   * Useful for security events like password change or suspicious activity
   */
  async invalidateAllTokens(connectionId: string): Promise<void> {
    const connection = await VttConnection.findOrFail(connectionId)
    connection.tokenVersion = (connection.tokenVersion || 1) + 1
    await connection.save()
  }
}
