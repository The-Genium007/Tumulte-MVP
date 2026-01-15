import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import VttConnection from '#models/vtt_connection'
import VttProvider from '#models/vtt_provider'
import { campaign as Campaign } from '#models/campaign'
import VttSyncService from '#services/vtt/vtt_sync_service'
import VttPairingService from '#services/vtt/vtt_pairing_service'
import VttWebSocketService from '#services/vtt/vtt_websocket_service'
import redis from '@adonisjs/redis/services/main'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'

// CSRF state expiration time (5 minutes)
const PAIRING_STATE_EXPIRY_MS = 5 * 60 * 1000

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
export default class VttConnectionsController {
  constructor(
    private vttSyncService: VttSyncService,
    private vttPairingService: VttPairingService,
    private vttWebSocketService: VttWebSocketService
  ) {}

  /**
   * Liste toutes les connexions VTT du GM authentifié
   * GET /mj/vtt-connections
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.user!

    const connections = await VttConnection.query()
      .where('user_id', user.id)
      .preload('provider')
      .orderBy('created_at', 'desc')

    return response.ok(connections)
  }

  /**
   * Affiche les détails d'une connexion VTT
   * GET /mj/vtt-connections/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const connection = await VttConnection.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .preload('provider')
      .firstOrFail()

    // Charger les campagnes liées à cette connexion
    const campaigns = await Campaign.query()
      .where('vtt_connection_id', connection.id)
      .orderBy('created_at', 'desc')

    return response.ok({
      connection,
      campaigns,
    })
  }

  /**
   * Crée une nouvelle connexion VTT
   * POST /mj/vtt-connections
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { vttProviderId, name, webhookUrl } = request.only([
      'vttProviderId',
      'name',
      'webhookUrl',
    ])

    // Vérifier que le provider existe
    await VttProvider.findOrFail(vttProviderId)

    // Générer une API key unique
    const apiKey = 'ta_' + randomBytes(32).toString('hex')

    // Créer la connexion
    const connection = await VttConnection.create({
      userId: user.id,
      vttProviderId,
      name,
      apiKey,
      webhookUrl,
      status: 'active',
    })

    await connection.load('provider')

    return response.created(connection)
  }

  /**
   * Met à jour une connexion VTT
   * PUT /mj/vtt-connections/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { name, webhookUrl, status } = request.only(['name', 'webhookUrl', 'status'])

    const connection = await VttConnection.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    connection.merge({
      name: name || connection.name,
      webhookUrl: webhookUrl || connection.webhookUrl,
      status: status || connection.status,
    })

    await connection.save()
    await connection.load('provider')

    return response.ok(connection)
  }

  /**
   * Supprime une connexion VTT
   * DELETE /mj/vtt-connections/:id
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const connection = await VttConnection.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    // Vérifier qu'il n'y a pas de campagnes actives liées
    const campaignsCount = await Campaign.query()
      .where('vtt_connection_id', connection.id)
      .count('* as total')

    if (campaignsCount[0].$extras.total > 0) {
      return response.badRequest({
        error: 'Cannot delete connection with active campaigns',
        campaignsCount: campaignsCount[0].$extras.total,
      })
    }

    await connection.delete()

    return response.noContent()
  }

  /**
   * Liste tous les providers VTT disponibles
   * GET /mj/vtt-providers
   */
  async listProviders({ response }: HttpContext) {
    const providers = await VttProvider.query().where('is_active', true).orderBy('name', 'asc')

    return response.ok(providers)
  }

  /**
   * Regénère l'API key d'une connexion
   * POST /mj/vtt-connections/:id/regenerate-key
   */
  async regenerateApiKey({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const connection = await VttConnection.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    // Générer une nouvelle API key
    connection.apiKey = 'ta_' + randomBytes(32).toString('hex')
    await connection.save()

    await connection.load('provider')

    return response.ok(connection)
  }

  /**
   * Synchronise toutes les connexions VTT de l'utilisateur
   * GET /mj/vtt-connections/sync-all
   */
  async syncAll({ auth, response }: HttpContext) {
    const user = auth.user!

    const connections = await VttConnection.query()
      .where('user_id', user.id)
      .where('status', 'active')

    const results = await Promise.allSettled(
      connections.map((conn) => this.vttSyncService.fetchCampaignsFromVtt(conn))
    )

    return response.ok({
      connections: connections.length,
      synced: results.filter((r) => r.status === 'fulfilled').length,
    })
  }

  /**
   * Synchronise les campagnes disponibles depuis un VTT connecté
   * POST /mj/vtt-connections/:id/sync-campaigns
   */
  async syncCampaigns({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const connection = await VttConnection.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    // Appeler le service pour récupérer les campagnes depuis le VTT
    const vttCampaigns = await this.vttSyncService.fetchCampaignsFromVtt(connection)

    // Comparer avec BD et retourner seulement les nouvelles
    const existingCampaigns = await Campaign.query()
      .where('vtt_connection_id', connection.id)
      .select('vtt_campaign_id')

    const existingIds = existingCampaigns.map((c) => c.vttCampaignId)
    const newCampaigns = vttCampaigns.filter((vc) => !existingIds.includes(vc.id))

    return response.ok({ campaigns: newCampaigns })
  }

  /**
   * Start a pairing session and generate CSRF state
   * GET /mj/vtt-connections/start-pairing
   */
  async startPairingSession({ session, response }: HttpContext) {
    // Generate CSRF state token
    const state = randomBytes(32).toString('hex')
    const expiresAt = Date.now() + PAIRING_STATE_EXPIRY_MS

    // Store in session
    session.put('vtt_pairing_state', state)
    session.put('vtt_pairing_expires', expiresAt)

    return response.ok({
      state,
      expiresIn: PAIRING_STATE_EXPIRY_MS / 1000, // seconds
    })
  }

  /**
   * Initiate pairing with VTT module
   * POST /mj/vtt-connections/pair
   */
  async initiatePairing({ auth, request, response, session }: HttpContext) {
    const user = auth.user!
    const { pairingUrl } = request.only(['pairingUrl'])

    try {
      // 1. Parse pairing URL (extracts token and state)
      const { token, state } = this.vttPairingService.parsePairingUrl(pairingUrl)

      // 2. Validate CSRF state against session (skip for mock tokens in dev mode)
      const isDev = env.get('NODE_ENV') === 'development'
      const isMockToken = state === 'mock-csrf-state-xyz'

      if (!isDev || !isMockToken) {
        // Normal CSRF validation for production and non-mock tokens
        const sessionState = session.get('vtt_pairing_state')
        const sessionExpires = session.get('vtt_pairing_expires')

        if (!sessionState) {
          return response.badRequest({
            error: 'No pairing session found. Please restart pairing process.',
          })
        }

        if (Date.now() > sessionExpires) {
          session.forget('vtt_pairing_state')
          session.forget('vtt_pairing_expires')
          return response.badRequest({
            error: 'Pairing session expired. Please restart pairing process.',
          })
        }

        if (state !== sessionState) {
          return response.forbidden({
            error: 'Invalid CSRF state. Possible security attack detected.',
          })
        }

        // Clear the used state from session
        session.forget('vtt_pairing_state')
        session.forget('vtt_pairing_expires')
      }

      // 3. Validate JWT token
      const claims = await this.vttPairingService.validatePairingToken(token)

      // 4. Test connection to VTT
      const testResult = await this.vttPairingService.testConnection(claims)

      if (!testResult.reachable) {
        return response.badRequest({
          error: 'Cannot reach VTT',
          details: testResult.error,
        })
      }

      // 5. Complete pairing and create connection
      const { connection, tokens } = await this.vttPairingService.completePairing(claims, user.id)

      return response.created({
        connection: {
          id: connection.id,
          name: connection.name,
          worldId: connection.worldId,
          worldName: connection.worldName,
          moduleVersion: connection.moduleVersion,
          status: connection.status,
          tunnelStatus: connection.tunnelStatus,
          provider: connection.provider,
        },
        tokens: {
          sessionToken: tokens.sessionToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      })
    } catch (error) {
      return response.badRequest({
        error: error.message,
      })
    }
  }

  /**
   * Test pairing connection before completing
   * POST /mj/vtt-connections/test-pairing
   */
  async testPairing({ request, response }: HttpContext) {
    const { pairingUrl } = request.only(['pairingUrl'])

    try {
      // 1. Parse and validate pairing URL
      const { token } = this.vttPairingService.parsePairingUrl(pairingUrl)
      const claims = await this.vttPairingService.validatePairingToken(token)

      // 2. Test connection
      const testResult = await this.vttPairingService.testConnection(claims)

      if (!testResult.reachable) {
        return response.ok({
          success: false,
          error: testResult.error,
        })
      }

      // 3. Return world info if successful
      return response.ok({
        success: true,
        worldInfo: testResult.worldInfo,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        error: error.message,
      })
    }
  }

  /**
   * Revoke a VTT connection
   * POST /mj/vtt-connections/:id/revoke
   */
  async revoke({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { reason } = request.only(['reason'])

    const connection = await VttConnection.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    // Revoke connection and notify VTT
    await this.vttPairingService.revokeConnectionTokens(connection.id, reason || 'Revoked by user')

    await this.vttWebSocketService.revokeConnection(connection.id, reason || 'Revoked by user')

    return response.ok({
      success: true,
      message: 'Connection revoked successfully',
    })
  }

  /**
   * Refresh session token
   * POST /mj/vtt-connections/refresh-token
   */
  async refreshToken({ request, response }: HttpContext) {
    const { refreshToken } = request.only(['refreshToken'])

    try {
      const tokens = await this.vttPairingService.refreshSessionToken(refreshToken)

      return response.ok({
        sessionToken: tokens.sessionToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      })
    } catch (error) {
      return response.unauthorized({
        error: error.message,
      })
    }
  }

  /**
   * Complete pairing using a code entered by the user
   * POST /mj/vtt-connections/pair-with-code
   *
   * The user enters a code (ABC-123) displayed in Foundry VTT
   */
  async pairWithCode({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { code } = request.only(['code'])

    if (!code) {
      return response.badRequest({
        error: 'Missing required parameter: code',
      })
    }

    // Normalize code (uppercase, ensure dash)
    const normalizedCode = code.toUpperCase().replace(/\s/g, '')
    const formattedCode = normalizedCode.includes('-')
      ? normalizedCode
      : `${normalizedCode.slice(0, 3)}-${normalizedCode.slice(3, 6)}`

    try {
      // Look up pending pairing by code
      const pendingKey = `pairing:code:${formattedCode}`
      const pendingData = await redis.get(pendingKey)

      if (!pendingData) {
        return response.notFound({
          error: 'Invalid or expired pairing code',
        })
      }

      const pending = JSON.parse(pendingData) as PendingPairing

      // Check if expired
      if (Date.now() > pending.expiresAt) {
        await redis.del(pendingKey)
        await redis.del(`pairing:world:${pending.worldId}`)
        return response.badRequest({
          error: 'Pairing code has expired. Please generate a new code in Foundry.',
        })
      }

      // Check if connection already exists for this world
      const existingConnection = await VttConnection.query()
        .where('user_id', user.id)
        .where('world_id', pending.worldId)
        .first()

      if (existingConnection) {
        return response.badRequest({
          error: 'A connection already exists for this Foundry world',
          connectionId: existingConnection.id,
        })
      }

      // Get Foundry provider
      const provider = await VttProvider.query().where('name', 'foundry').firstOrFail()

      // Generate secure credentials
      const apiKey = 'ta_' + randomBytes(32).toString('hex')
      const connectionName = `Foundry - ${pending.worldName}`

      // Create the connection
      const connection = await VttConnection.create({
        userId: user.id,
        vttProviderId: provider.id,
        name: connectionName,
        apiKey,
        webhookUrl: '',
        status: 'active',
        worldId: pending.worldId,
        worldName: pending.worldName,
        pairingCode: pending.code,
        tunnelStatus: 'connecting',
        moduleVersion: pending.moduleVersion,
        lastHeartbeatAt: DateTime.now(),
        tokenVersion: 1,
      })

      await connection.load('provider')

      // Generate session tokens
      const tokens = await this.vttPairingService.generateSessionTokensForConnection(
        connection.id,
        user.id,
        connection.tokenVersion
      )

      // Store completed pairing for the module to pick up
      const completedData = {
        connectionId: connection.id,
        apiKey,
        sessionToken: tokens.sessionToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      }

      await redis.setex(
        `pairing:completed:${pending.worldId}`,
        300, // 5 minutes for module to pick up
        JSON.stringify(completedData)
      )

      // Clean up pending pairing
      await redis.del(pendingKey)

      return response.created({
        connection: {
          id: connection.id,
          name: connection.name,
          worldId: connection.worldId,
          worldName: connection.worldName,
          moduleVersion: connection.moduleVersion,
          status: connection.status,
          tunnelStatus: connection.tunnelStatus,
          provider: connection.provider,
        },
        message: 'Pairing successful! The Foundry module will connect shortly.',
      })
    } catch (error) {
      return response.badRequest({
        error: error.message,
      })
    }
  }
}
