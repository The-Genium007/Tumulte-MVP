import { inject } from '@adonisjs/core'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import VttConnection from '#models/vtt_connection'
import VttProvider from '#models/vtt_provider'
import TokenRevocationList from '#models/token_revocation_list'
import encryption from '@adonisjs/core/services/encryption'
import env from '#start/env'

export interface PairingClaims {
  sub: string // 'vtt:foundry' | 'vtt:roll20' | 'vtt:alchemy'
  aud: string // 'tumulte:api'
  iss: string // 'foundry-module:tumulte'
  pairing_code: string
  world_id: string
  world_name: string
  gm_user_id: string
  module_version: string
  iat: number
  exp: number
  nonce: string
  jti: string
}

export interface PairingUrlParts {
  token: string
  state: string
}

export interface ConnectionTestResult {
  reachable: boolean
  worldInfo?: {
    id: string
    name: string
    version: string
  }
  error?: string
}

export interface SessionTokens {
  sessionToken: string
  refreshToken: string
  expiresIn: number
}

@inject()
export default class VttPairingService {
  private readonly JWT_SECRET: string
  private readonly SESSION_TOKEN_EXPIRY = 3600 // 1 hour in seconds
  private readonly REFRESH_TOKEN_EXPIRY = 604800 // 7 days in seconds

  constructor() {
    this.JWT_SECRET = env.get('APP_KEY')
  }

  /**
   * Parse pairing URL from Foundry VTT module
   * Format: foundry://connect?token=<JWT>&state=<CSRF>
   */
  parsePairingUrl(url: string): PairingUrlParts {
    try {
      const parsedUrl = new URL(url)

      if (parsedUrl.protocol !== 'foundry:') {
        throw new Error('Invalid protocol. Expected foundry://')
      }

      const token = parsedUrl.searchParams.get('token')
      const state = parsedUrl.searchParams.get('state')

      if (!token || !state) {
        throw new Error('Missing token or state parameter')
      }

      return { token, state }
    } catch (error) {
      throw new Error(`Invalid pairing URL: ${error.message}`)
    }
  }

  /**
   * Validate JWT pairing token from VTT module
   */
  async validatePairingToken(token: string): Promise<PairingClaims> {
    try {
      // DEV MODE: Accept mock tokens for testing
      if (env.get('NODE_ENV') === 'development' && token.startsWith('eyJ')) {
        try {
          const decoded = JSON.parse(atob(token)) as PairingClaims
          // Validate it has the mock structure
          if (decoded.world_id?.startsWith('mock-world')) {
            return decoded
          }
        } catch {
          // Not a valid mock token, continue with normal validation
        }
      }

      // Verify JWT signature and decode
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
        audience: 'tumulte:api',
      }) as PairingClaims

      // Validate required claims
      if (!decoded.pairing_code || !decoded.world_id || !decoded.world_name) {
        throw new Error('Missing required claims in pairing token')
      }

      // Check if token is already revoked
      const isRevoked = await TokenRevocationList.isRevoked(decoded.jti)
      if (isRevoked) {
        throw new Error('Pairing token has been revoked')
      }

      // Validate token expiry
      const now = Math.floor(Date.now() / 1000)
      if (decoded.exp < now) {
        throw new Error('Pairing token has expired')
      }

      return decoded
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Invalid JWT: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Test connection to VTT before establishing tunnel
   * Uses MOCK DATA for now
   */
  async testConnection(claims: PairingClaims): Promise<ConnectionTestResult> {
    // MOCK IMPLEMENTATION - Real implementation will ping the VTT
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Simulate successful test
    return {
      reachable: true,
      worldInfo: {
        id: claims.world_id,
        name: claims.world_name,
        version: claims.module_version,
      },
    }

    /* REAL IMPLEMENTATION (commented for now)
    try {
      // Ping the VTT's webhook endpoint
      const response = await fetch(claims.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${claims.pairing_code}`,
        },
        body: JSON.stringify({ action: 'ping' }),
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        return {
          reachable: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      return {
        reachable: true,
        worldInfo: {
          id: data.world_id,
          name: data.world_name,
          version: data.module_version,
        },
      }
    } catch (error) {
      return {
        reachable: false,
        error: error.message,
      }
    }
    */
  }

  /**
   * Complete pairing and create VTT connection with secure tunnel
   */
  async completePairing(
    claims: PairingClaims,
    userId: string
  ): Promise<{ connection: VttConnection; tokens: SessionTokens }> {
    // 1. Verify VTT provider exists
    const providerName = claims.sub.replace('vtt:', '')
    const provider = await VttProvider.query().where('name', providerName).firstOrFail()

    // 2. Check if connection already exists for this world
    const existingConnection = await VttConnection.query()
      .where('user_id', userId)
      .where('world_id', claims.world_id)
      .first()

    if (existingConnection) {
      throw new Error('Connection already exists for this VTT world')
    }

    // 3. Generate secure credentials
    const apiKey = 'ta_' + randomBytes(32).toString('hex')
    const connectionName = `Foundry - ${claims.world_name}`

    // 4. Encrypt sensitive credentials before storage
    const sensitiveData = {
      pairingCode: claims.pairing_code,
      worldId: claims.world_id,
      gmUserId: claims.gm_user_id,
    }
    const encryptedCredentials = encryption.encrypt(JSON.stringify(sensitiveData))

    // 5. Create connection with initial tokenVersion
    const connection = await VttConnection.create({
      userId,
      vttProviderId: provider.id,
      name: connectionName,
      apiKey,
      webhookUrl: '', // Will be set by VTT module after handshake
      status: 'active',
      worldId: claims.world_id,
      worldName: claims.world_name,
      pairingCode: claims.pairing_code, // Keep unencrypted for lookup
      encryptedCredentials,
      tunnelStatus: 'connecting',
      moduleVersion: claims.module_version,
      lastHeartbeatAt: DateTime.now(),
      tokenVersion: 1,
    })

    await connection.load('provider')

    // 5. Generate session and refresh tokens (include tokenVersion for validation)
    const tokens = await this.generateSessionTokens(connection.id, userId, connection.tokenVersion)

    return { connection, tokens }
  }

  /**
   * Public method to generate session tokens for a connection
   * Used by the code-based pairing flow
   */
  async generateSessionTokensForConnection(
    connectionId: string,
    userId: string,
    tokenVersion: number
  ): Promise<SessionTokens> {
    return this.generateSessionTokens(connectionId, userId, tokenVersion)
  }

  /**
   * Generate session and refresh tokens for VTT connection
   * Includes tokenVersion to enable instant invalidation of all tokens
   */
  private async generateSessionTokens(
    connectionId: string,
    userId: string,
    tokenVersion: number
  ): Promise<SessionTokens> {
    const now = Math.floor(Date.now() / 1000)

    // Generate JTI (JWT ID) for both tokens
    const sessionJti = randomBytes(16).toString('hex')
    const refreshJti = randomBytes(16).toString('hex')

    // Session token (short-lived) - includes tokenVersion for validation
    const sessionToken = jwt.sign(
      {
        jti: sessionJti,
        sub: connectionId,
        user_id: userId,
        type: 'session',
        token_version: tokenVersion,
        iat: now,
        exp: now + this.SESSION_TOKEN_EXPIRY,
      },
      this.JWT_SECRET,
      { algorithm: 'HS256' }
    )

    // Refresh token (long-lived) - includes tokenVersion for validation
    const refreshToken = jwt.sign(
      {
        jti: refreshJti,
        sub: connectionId,
        user_id: userId,
        type: 'refresh',
        token_version: tokenVersion,
        iat: now,
        exp: now + this.REFRESH_TOKEN_EXPIRY,
      },
      this.JWT_SECRET,
      { algorithm: 'HS256' }
    )

    return {
      sessionToken,
      refreshToken,
      expiresIn: this.SESSION_TOKEN_EXPIRY,
    }
  }

  /**
   * Refresh session token using refresh token
   * Validates tokenVersion to ensure token hasn't been invalidated
   */
  async refreshSessionToken(refreshToken: string): Promise<SessionTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET, {
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

      // Generate new session token with current tokenVersion
      return await this.generateSessionTokens(
        connection.id,
        decoded.user_id,
        connection.tokenVersion
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
    const connection = await VttConnection.findOrFail(connectionId)

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
