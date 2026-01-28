import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import VttConnection from '#models/vtt_connection'
import VttProvider from '#models/vtt_provider'
import { campaign as Campaign } from '#models/campaign'
import VttSyncService from '#services/vtt/vtt_sync_service'
import VttPairingService from '#services/vtt/vtt_pairing_service'
import VttWebSocketService from '#services/vtt/vtt_websocket_service'
import { CampaignService } from '#services/campaigns/campaign_service'
import redis from '@adonisjs/redis/services/main'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'

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
    private vttWebSocketService: VttWebSocketService,
    private campaignService: CampaignService
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
   * Reauthorize a revoked VTT connection
   * POST /mj/vtt-connections/:id/reauthorize
   *
   * This allows re-enabling a revoked connection without going through the full pairing process.
   * The connection data (worldId, apiKey, campaign) are preserved.
   */
  async reauthorize({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const connection = await VttConnection.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .preload('provider')
      .firstOrFail()

    // Only allow reauthorization of revoked connections
    if (connection.status !== 'revoked') {
      return response.badRequest({
        error: 'Only revoked connections can be reauthorized',
        currentStatus: connection.status,
      })
    }

    // Generate fingerprint for security validation
    const fingerprint = this.vttPairingService.generateFingerprint(
      connection.worldId || '',
      connection.moduleVersion || '2.0.0'
    )

    // Reactivate connection
    connection.status = 'active'
    connection.tunnelStatus = 'connecting'
    connection.lastHeartbeatAt = DateTime.now()
    connection.tokenVersion = (connection.tokenVersion || 1) + 1 // Invalidate old tokens
    connection.connectionFingerprint = fingerprint
    await connection.save()

    // Generate new session tokens
    const tokens = await this.vttPairingService.generateSessionTokensForConnection(
      connection.id,
      user.id,
      connection.tokenVersion,
      fingerprint
    )

    // Build API URL
    const apiUrl = env.get('API_URL') || `http://${env.get('HOST')}:${env.get('PORT')}`

    // Store reauthorization data for the module to pick up
    const reauthorizedData = {
      connectionId: connection.id,
      apiKey: connection.apiKey,
      sessionToken: tokens.sessionToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      serverUrl: apiUrl,
      fingerprint,
      reauthorizedAt: DateTime.now().toISO(),
    }

    await redis.setex(
      `pairing:reauthorized:${connection.worldId}`,
      300, // 5 minutes for module to pick up
      JSON.stringify(reauthorizedData)
    )

    return response.ok({
      success: true,
      message: 'Connection reauthorized successfully',
      connection: {
        id: connection.id,
        name: connection.name,
        worldId: connection.worldId,
        worldName: connection.worldName,
        status: connection.status,
        tunnelStatus: connection.tunnelStatus,
      },
    })
  }

  /**
   * Refresh session token
   * POST /mj/vtt-connections/refresh-token
   *
   * Security: Validates fingerprint to detect token theft across Foundry instances
   */
  async refreshToken({ request, response }: HttpContext) {
    const { refreshToken, fingerprint } = request.only(['refreshToken', 'fingerprint'])

    try {
      const tokens = await this.vttPairingService.refreshSessionToken(refreshToken, fingerprint)

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
      let connection = await VttConnection.query()
        .where('user_id', user.id)
        .where('world_id', pending.worldId)
        .preload('provider')
        .first()

      // Generate fingerprint for security validation on token refresh
      const fingerprint = this.vttPairingService.generateFingerprint(
        pending.worldId,
        pending.moduleVersion
      )

      if (connection) {
        // Reuse existing connection - update it with new pairing info
        connection.status = 'active'
        connection.tunnelStatus = 'connecting'
        connection.pairingCode = pending.code
        connection.moduleVersion = pending.moduleVersion
        connection.lastHeartbeatAt = DateTime.now()
        connection.tokenVersion = (connection.tokenVersion || 1) + 1 // Invalidate old tokens
        connection.connectionFingerprint = fingerprint // Update fingerprint
        await connection.save()
      } else {
        // Get Foundry provider
        const provider = await VttProvider.query().where('name', 'foundry').firstOrFail()

        // Generate secure credentials
        const apiKey = 'ta_' + randomBytes(32).toString('hex')
        const connectionName = `Foundry - ${pending.worldName}`

        // Create new connection
        connection = await VttConnection.create({
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
          connectionFingerprint: fingerprint,
        })

        await connection.load('provider')
      }

      // Generate session tokens with fingerprint for security
      const tokens = await this.vttPairingService.generateSessionTokensForConnection(
        connection.id,
        user.id,
        connection.tokenVersion,
        fingerprint
      )

      // Build API URL - use API_URL env var if set, otherwise construct from HOST:PORT
      const apiUrl = env.get('API_URL') || `http://${env.get('HOST')}:${env.get('PORT')}`

      // Store completed pairing for the module to pick up
      // Include fingerprint so the module can send it back on token refresh
      const completedData = {
        connectionId: connection.id,
        apiKey: connection.apiKey,
        sessionToken: tokens.sessionToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        serverUrl: apiUrl,
        fingerprint, // Module should store this and send it on refresh-token calls
      }

      await redis.setex(
        `pairing:completed:${pending.worldId}`,
        300, // 5 minutes for module to pick up
        JSON.stringify(completedData)
      )

      // Clean up pending pairing
      await redis.del(pendingKey)

      // Check if a campaign already exists for this connection
      let campaign = await Campaign.query().where('vtt_connection_id', connection.id).first()

      if (!campaign) {
        // Create a new campaign linked to this VTT connection
        campaign = await Campaign.create({
          name: pending.worldName,
          description: `Campagne importée depuis Foundry VTT (${pending.worldName})`,
          ownerId: user.id,
          vttConnectionId: connection.id,
          vttCampaignId: pending.worldId,
          vttCampaignName: pending.worldName,
          lastVttSyncAt: DateTime.now(),
        })

        // Ajouter le propriétaire comme membre avec autorisation permanente
        await this.campaignService.addOwnerAsMember(campaign.id, user.id)
      }

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
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
        },
        message: 'Pairing successful! Campaign created automatically.',
      })
    } catch (error) {
      return response.badRequest({
        error: error.message,
      })
    }
  }
}
