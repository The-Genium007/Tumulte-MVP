import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import VttConnection from '#models/vtt_connection'
import VttPairingService from '#services/vtt/vtt_pairing_service'
import VttWebSocketService from '#services/vtt/vtt_websocket_service'
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'

// Pairing code format: ABC-123 (6 chars)
const PAIRING_CODE_LENGTH = 6
const PAIRING_CODE_EXPIRY = 300 // 5 minutes

interface PendingPairing {
  code: string
  worldId: string
  worldName: string
  gmUserId: string
  moduleVersion: string
  createdAt: number
  expiresAt: number
}

@inject()
export default class FoundryWebhookController {
  constructor(
    private vttPairingService: VttPairingService,
    private vttWebSocketService: VttWebSocketService
  ) {}

  /**
   * Handle revocation notification from Foundry VTT module
   * POST /webhooks/foundry/revoke
   */
  async revoke({ request, response }: HttpContext) {
    try {
      const { connectionId, apiKey, reason } = request.only(['connectionId', 'apiKey', 'reason'])

      // Validate required parameters
      if (!connectionId || !apiKey) {
        return response.badRequest({
          error: 'Missing required parameters: connectionId, apiKey',
        })
      }

      // Verify connection exists and API key matches
      const connection = await VttConnection.query()
        .where('id', connectionId)
        .where('api_key', apiKey)
        .first()

      if (!connection) {
        return response.notFound({
          error: 'Connection not found or invalid API key',
        })
      }

      // Check if already revoked
      if (connection.status === 'revoked') {
        return response.ok({
          success: true,
          message: 'Connection already revoked',
        })
      }

      logger.info('Foundry VTT revocation received', {
        connectionId: connection.id,
        worldId: connection.worldId,
        reason,
      })

      // Revoke connection
      await this.vttPairingService.revokeConnectionTokens(
        connection.id,
        reason || 'Revoked by VTT module'
      )

      // Disconnect WebSocket (if connected)
      await this.vttWebSocketService.revokeConnection(
        connection.id,
        reason || 'Revoked by VTT module'
      )

      return response.ok({
        success: true,
        message: 'Connection revoked successfully',
      })
    } catch (error) {
      logger.error('Failed to handle Foundry revocation webhook', { error })
      return response.internalServerError({
        error: 'Failed to process revocation',
      })
    }
  }

  /**
   * Handle heartbeat ping from Foundry VTT module
   * POST /webhooks/foundry/ping
   */
  async ping({ request, response }: HttpContext) {
    try {
      const { connectionId, apiKey } = request.only(['connectionId', 'apiKey'])

      if (!connectionId || !apiKey) {
        return response.badRequest({
          error: 'Missing required parameters: connectionId, apiKey',
        })
      }

      // Verify connection exists and API key matches
      const connection = await VttConnection.query()
        .where('id', connectionId)
        .where('api_key', apiKey)
        .first()

      if (!connection) {
        return response.notFound({
          error: 'Connection not found or invalid API key',
        })
      }

      // Update last heartbeat timestamp
      connection.lastHeartbeatAt = DateTime.now()
      await connection.save()

      return response.ok({
        success: true,
        timestamp: DateTime.now().toISO(),
      })
    } catch (error) {
      logger.error('Failed to handle Foundry ping webhook', { error })
      return response.internalServerError({
        error: 'Failed to process ping',
      })
    }
  }

  /**
   * Generate a pairing code for Foundry VTT module
   * POST /webhooks/foundry/request-pairing
   *
   * The module calls this to get a short code that the user enters on Tumulte dashboard
   */
  async requestPairing({ request, response }: HttpContext) {
    try {
      const { worldId, worldName, gmUserId, moduleVersion } = request.only([
        'worldId',
        'worldName',
        'gmUserId',
        'moduleVersion',
      ])

      if (!worldId || !worldName) {
        return response.badRequest({
          error: 'Missing required parameters: worldId, worldName',
        })
      }

      // Generate a short, user-friendly pairing code (ABC-123 format)
      const code = this.generatePairingCode()
      const now = Date.now()

      // Store pending pairing in Redis
      const pendingPairing: PendingPairing = {
        code,
        worldId,
        worldName,
        gmUserId: gmUserId || 'unknown',
        moduleVersion: moduleVersion || '2.0.0',
        createdAt: now,
        expiresAt: now + PAIRING_CODE_EXPIRY * 1000,
      }

      // Store with code as key (for lookup when user enters code on Tumulte)
      await redis.setex(`pairing:code:${code}`, PAIRING_CODE_EXPIRY, JSON.stringify(pendingPairing))

      // Also store with worldId as key (for module to check status)
      await redis.setex(
        `pairing:world:${worldId}`,
        PAIRING_CODE_EXPIRY,
        JSON.stringify(pendingPairing)
      )

      // Build API URL - use API_URL env var if set, otherwise construct from HOST:PORT
      const apiUrl = env.get('API_URL') || `http://${env.get('HOST')}:${env.get('PORT')}`

      logger.info('Foundry pairing code generated', {
        code,
        worldId,
        worldName,
        apiUrl,
        envApiUrl: env.get('API_URL'),
        envHost: env.get('HOST'),
        envPort: env.get('PORT'),
      })

      return response.ok({
        success: true,
        code,
        expiresIn: PAIRING_CODE_EXPIRY,
        expiresAt: pendingPairing.expiresAt,
        serverUrl: apiUrl,
      })
    } catch (error) {
      logger.error('Failed to generate pairing code', { error })
      return response.internalServerError({
        error: 'Failed to generate pairing code',
      })
    }
  }

  /**
   * Check pairing status for Foundry VTT module
   * GET /webhooks/foundry/pairing-status
   *
   * The module polls this to check if the user has completed pairing on Tumulte
   */
  async pairingStatus({ request, response }: HttpContext) {
    try {
      const worldId = request.input('worldId')

      if (!worldId) {
        return response.badRequest({
          error: 'Missing required parameter: worldId',
        })
      }

      // Check if pairing was completed (connection exists with this worldId)
      const completedKey = `pairing:completed:${worldId}`
      const completedData = await redis.get(completedKey)

      if (completedData) {
        // Pairing was completed! Return the tokens
        const result = JSON.parse(completedData)

        // Clean up Redis keys
        await redis.del(completedKey)
        await redis.del(`pairing:world:${worldId}`)

        logger.info('Foundry pairing completed', { worldId, connectionId: result.connectionId })

        return response.ok({
          status: 'completed',
          connectionId: result.connectionId,
          apiKey: result.apiKey,
          sessionToken: result.sessionToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          serverUrl: result.serverUrl,
          fingerprint: result.fingerprint, // Module should store this and send it on refresh-token calls
        })
      }

      // Check if pairing is still pending
      const pendingKey = `pairing:world:${worldId}`
      const pendingData = await redis.get(pendingKey)

      if (pendingData) {
        const pending = JSON.parse(pendingData) as PendingPairing

        // Check if expired
        if (Date.now() > pending.expiresAt) {
          await redis.del(pendingKey)
          await redis.del(`pairing:code:${pending.code}`)
          return response.ok({
            status: 'expired',
            message: 'Pairing code has expired',
          })
        }

        return response.ok({
          status: 'pending',
          code: pending.code,
          expiresAt: pending.expiresAt,
          remainingSeconds: Math.floor((pending.expiresAt - Date.now()) / 1000),
        })
      }

      // No pairing found
      return response.ok({
        status: 'not_found',
        message: 'No pairing session found for this world',
      })
    } catch (error) {
      logger.error('Failed to check pairing status', { error })
      return response.internalServerError({
        error: 'Failed to check pairing status',
      })
    }
  }

  /**
   * Generate a user-friendly pairing code (ABC-123 format)
   */
  private generatePairingCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
    let code = ''

    const bytes = randomBytes(PAIRING_CODE_LENGTH)
    for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
      code += chars[bytes[i] % chars.length]
    }

    // Format as ABC-123
    return `${code.slice(0, 3)}-${code.slice(3, 6)}`
  }

  /**
   * Check connection health for Foundry VTT module
   * GET /webhooks/foundry/connection-health
   *
   * Allows the module to verify if its connection is still valid
   * without needing a WebSocket connection
   */
  async connectionHealth({ request, response }: HttpContext) {
    try {
      // Get API key from Authorization header
      const authHeader = request.header('Authorization')
      const apiKey = authHeader?.replace('Bearer ', '')

      // Or from query params (for simple health checks)
      const worldId = request.input('worldId')

      if (!apiKey && !worldId) {
        return response.badRequest({
          error: 'Missing authentication: provide Authorization header or worldId query param',
        })
      }

      // Find connection by API key or worldId
      let connection: VttConnection | null = null

      if (apiKey) {
        connection = await VttConnection.query()
          .where('api_key', apiKey)
          .preload('campaigns')
          .first()
      } else if (worldId) {
        connection = await VttConnection.query()
          .where('world_id', worldId)
          .preload('campaigns')
          .first()
      }

      if (!connection) {
        return response.notFound({
          status: 'not_found',
          error: 'Connection not found',
        })
      }

      // Check if connection is revoked
      if (connection.status === 'revoked') {
        return response.status(401).json({
          status: 'revoked',
          error: 'Connection has been revoked',
          message:
            "Accès révoqué sur Tumulte. Demandez au GM de réautoriser l'accès depuis le tableau de bord.",
          canReauthorize: true, // Indicates data is preserved and reauthorization is possible
          revokedAt: connection.updatedAt?.toISO(),
          worldId: connection.worldId,
        })
      }

      // Check if connection is expired
      if (connection.status === 'expired') {
        return response.status(401).json({
          status: 'expired',
          error: 'Connection has expired',
        })
      }

      // Check if linked campaign still exists
      const linkedCampaign = connection.campaigns?.[0]
      if (!linkedCampaign) {
        return response.status(410).json({
          status: 'campaign_deleted',
          error: 'The linked campaign no longer exists',
          connectionId: connection.id,
        })
      }

      // Connection is healthy
      return response.ok({
        status: 'healthy',
        connectionId: connection.id,
        campaignId: linkedCampaign.id,
        campaignName: linkedCampaign.name,
        tunnelStatus: connection.tunnelStatus,
        lastHeartbeatAt: connection.lastHeartbeatAt?.toISO() || null,
        worldName: connection.worldName,
        moduleVersion: connection.moduleVersion,
      })
    } catch (error) {
      logger.error('Failed to check connection health', { error })
      return response.internalServerError({
        status: 'error',
        error: 'Failed to check connection health',
      })
    }
  }

  /**
   * Check reauthorization status for Foundry VTT module
   * GET /webhooks/foundry/reauthorization-status
   *
   * The module polls this to check if the GM has reauthorized the connection on Tumulte
   */
  async reauthorizationStatus({ request, response }: HttpContext) {
    try {
      const worldId = request.input('worldId')

      if (!worldId) {
        return response.badRequest({
          error: 'Missing required parameter: worldId',
        })
      }

      // Check if reauthorization was completed
      const reauthorizedKey = `pairing:reauthorized:${worldId}`
      const reauthorizedData = await redis.get(reauthorizedKey)

      if (reauthorizedData) {
        // Reauthorization was completed! Return the new tokens
        const result = JSON.parse(reauthorizedData)

        // Clean up Redis key
        await redis.del(reauthorizedKey)

        logger.info('Foundry reauthorization picked up', {
          worldId,
          connectionId: result.connectionId,
        })

        return response.ok({
          status: 'reauthorized',
          connectionId: result.connectionId,
          apiKey: result.apiKey,
          sessionToken: result.sessionToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          serverUrl: result.serverUrl,
          fingerprint: result.fingerprint,
          reauthorizedAt: result.reauthorizedAt,
        })
      }

      // Check if connection exists and is still revoked
      const connection = await VttConnection.query().where('world_id', worldId).first()

      if (!connection) {
        return response.ok({
          status: 'not_found',
          message: 'No connection found for this world',
        })
      }

      if (connection.status === 'revoked') {
        return response.ok({
          status: 'still_revoked',
          message: "Accès toujours révoqué. Demandez au GM de réautoriser l'accès depuis Tumulte.",
          revokedAt: connection.updatedAt?.toISO(),
        })
      }

      if (connection.status === 'active') {
        return response.ok({
          status: 'already_active',
          message: 'Connection is already active',
        })
      }

      return response.ok({
        status: connection.status,
        message: `Connection status: ${connection.status}`,
      })
    } catch (error) {
      logger.error('Failed to check reauthorization status', { error })
      return response.internalServerError({
        error: 'Failed to check reauthorization status',
      })
    }
  }

  /**
   * Handle status update from Foundry VTT module
   * POST /webhooks/foundry/status
   */
  async status({ request, response }: HttpContext) {
    try {
      const { connectionId, apiKey, status, worldInfo } = request.only([
        'connectionId',
        'apiKey',
        'status',
        'worldInfo',
      ])

      if (!connectionId || !apiKey || !status) {
        return response.badRequest({
          error: 'Missing required parameters: connectionId, apiKey, status',
        })
      }

      // Verify connection exists and API key matches
      const connection = await VttConnection.query()
        .where('id', connectionId)
        .where('api_key', apiKey)
        .first()

      if (!connection) {
        return response.notFound({
          error: 'Connection not found or invalid API key',
        })
      }

      // Update world info if provided
      if (worldInfo) {
        connection.worldName = worldInfo.name || connection.worldName
        connection.moduleVersion = worldInfo.version || connection.moduleVersion
      }

      // Update connection status based on VTT status
      if (status === 'active') {
        connection.tunnelStatus = 'connected'
      } else if (status === 'disconnected') {
        connection.tunnelStatus = 'disconnected'
      } else if (status === 'error') {
        connection.tunnelStatus = 'error'
      }

      await connection.save()

      logger.debug('Foundry VTT status update received', {
        connectionId: connection.id,
        status,
      })

      return response.ok({
        success: true,
        message: 'Status updated successfully',
      })
    } catch (error) {
      logger.error('Failed to handle Foundry status webhook', { error })
      return response.internalServerError({
        error: 'Failed to process status update',
      })
    }
  }
}
