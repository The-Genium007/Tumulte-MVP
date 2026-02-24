import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import type { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { DateTime } from 'luxon'
import redis from '@adonisjs/redis/services/main'
import VttConnection from '#models/vtt_connection'
import TokenRevocationList from '#models/token_revocation_list'
import { campaign as Campaign } from '#models/campaign'
import DiceRoll from '#models/dice_roll'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import VttWebhookService from '#services/vtt/vtt_webhook_service'
import VttSyncService from '#services/vtt/vtt_sync_service'

interface VttSocket extends Socket {
  vttConnectionId?: string
  heartbeatIntervalTimer?: NodeJS.Timeout
  heartbeatTimeoutTimer?: NodeJS.Timeout
}

@inject()
export default class VttWebSocketService {
  private readonly jwtSecret: string
  private readonly heartbeatInterval = 30000 // 30 seconds
  private readonly heartbeatTimeout = 60000 // 60 seconds
  private io?: Server

  constructor() {
    this.jwtSecret = env.get('APP_KEY')
  }

  /**
   * Setup WebSocket server with /vtt namespace
   */
  setup(io: Server): void {
    this.io = io

    // Create VTT namespace
    const vttNamespace = io.of('/vtt')

    // Authentication middleware
    vttNamespace.use(async (socket: VttSocket, next) => {
      try {
        const token = socket.handshake.auth.token

        if (!token) {
          return next(new Error('Authentication token required'))
        }

        // Verify JWT token
        const decoded = jwt.verify(token, this.jwtSecret, {
          algorithms: ['HS256'],
        }) as any

        if (decoded.type !== 'session') {
          return next(new Error('Invalid token type'))
        }

        // Check if token is revoked via revocation list
        const isRevoked = await TokenRevocationList.isRevoked(decoded.jti)
        if (isRevoked) {
          return next(new Error('Token has been revoked'))
        }

        // Verify connection exists and is active
        const connection = await VttConnection.find(decoded.sub)
        if (!connection || connection.status === 'revoked') {
          return next(new Error('Connection not found or revoked'))
        }

        // Validate tokenVersion - if it doesn't match, token has been invalidated
        if (decoded.token_version !== connection.tokenVersion) {
          return next(new Error('Token has been invalidated'))
        }

        // Check if at least one campaign is still associated with this connection
        const associatedCampaign = await Campaign.query()
          .where('vtt_connection_id', connection.id)
          .first()

        if (!associatedCampaign) {
          logger.warn('VTT connection has no associated campaign', { connectionId: connection.id })
          return next(
            new Error(
              'CAMPAIGN_DELETED:The campaign associated with this connection no longer exists'
            )
          )
        }

        // Attach connection ID to socket
        socket.vttConnectionId = connection.id

        next()
      } catch (error) {
        logger.error('VTT WebSocket authentication failed', { error })
        next(new Error('Authentication failed'))
      }
    })

    // Connection handler
    vttNamespace.on('connection', (socket: VttSocket) => {
      this.handleConnection(socket)
    })

    logger.info('VTT WebSocket service initialized')
  }

  /**
   * Handle new VTT connection
   */
  private async handleConnection(socket: VttSocket): Promise<void> {
    const connectionId = socket.vttConnectionId!

    try {
      // Update connection status
      const connection = await VttConnection.findOrFail(connectionId)
      connection.tunnelStatus = 'connected'
      connection.lastHeartbeatAt = DateTime.now()
      await connection.save()

      logger.info('VTT connected', { connectionId, socketId: socket.id })

      // Join room for this connection
      socket.join(`vtt:${connectionId}`)

      // Setup heartbeat
      this.setupHeartbeat(socket, connection)

      // Handle dice roll events
      socket.on('dice:roll', async (data) => {
        await this.handleDiceRoll(socket, data)
      })

      // Handle campaign sync events
      socket.on('campaign:sync', async (data) => {
        await this.handleCampaignSync(socket, data)
      })

      // Handle character update events
      socket.on('character:update', async (data) => {
        await this.handleCharacterUpdate(socket, data)
      })

      // Handle combat events
      socket.on('combat:start', async (data) => {
        await this.handleCombatStart(socket, data)
      })

      socket.on('combat:sync', async (data) => {
        await this.handleCombatSync(socket, data)
      })

      socket.on('combat:turn', async (data) => {
        await this.handleCombatTurn(socket, data)
      })

      socket.on('combat:round', async (data) => {
        await this.handleCombatRound(socket, data)
      })

      socket.on('combat:end', async (data) => {
        await this.handleCombatEnd(socket, data)
      })

      socket.on('combat:combatant-add', async (data) => {
        await this.handleCombatantAdd(socket, data)
      })

      socket.on('combat:combatant-remove', async (data) => {
        await this.handleCombatantRemove(socket, data)
      })

      socket.on('combat:combatant-defeated', async (data) => {
        await this.handleCombatantDefeated(socket, data)
      })

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        await this.handleDisconnection(socket, reason)
      })

      // Load item category rules for the campaigns linked to this connection
      let itemCategories: Array<{
        itemType: string
        category: string
        subcategory: string
        isTargetable: boolean
      }> = []

      try {
        const campaigns = await connection.related('campaigns').query()
        if (campaigns.length > 0) {
          const CampaignItemCategoryRuleModel = await import('#models/campaign_item_category_rule')
          const CampaignItemCategoryRule = CampaignItemCategoryRuleModel.default
          const rules = await CampaignItemCategoryRule.query()
            .where('campaignId', campaigns[0].id)
            .where('isEnabled', true)
            .select('itemType', 'category', 'subcategory', 'isTargetable')

          itemCategories = rules.map((r) => ({
            itemType: r.itemType,
            category: r.category,
            subcategory: r.subcategory,
            isTargetable: r.isTargetable,
          }))
        }
      } catch (err) {
        logger.warn('Failed to load item categories for VTT connection', {
          connectionId,
          error: err instanceof Error ? err.message : String(err),
        })
      }

      // Acknowledge connection (includes item categories for visual system)
      socket.emit('connected', {
        connectionId,
        timestamp: DateTime.now().toISO(),
        itemCategories,
      })
    } catch (error) {
      logger.error('Failed to handle VTT connection', { error, connectionId })
      socket.disconnect()
    }
  }

  /**
   * Setup heartbeat protocol (ping/pong)
   */
  private setupHeartbeat(socket: VttSocket, connection: VttConnection): void {
    // Clear any existing intervals
    if (socket.heartbeatIntervalTimer) {
      clearInterval(socket.heartbeatIntervalTimer)
    }
    if (socket.heartbeatTimeoutTimer) {
      clearTimeout(socket.heartbeatTimeoutTimer)
    }

    // Send ping every 30 seconds
    socket.heartbeatIntervalTimer = setInterval(() => {
      socket.emit('ping', { timestamp: Date.now() })

      // Set timeout for pong response
      socket.heartbeatTimeoutTimer = setTimeout(async () => {
        logger.warn('VTT heartbeat timeout', { connectionId: connection.id })

        // Update connection status
        connection.tunnelStatus = 'error'
        await connection.save()

        // Disconnect socket
        socket.disconnect(true)
      }, this.heartbeatTimeout - this.heartbeatInterval)
    }, this.heartbeatInterval)

    // Handle pong response
    socket.on('pong', async (data: { timestamp?: number; moduleVersion?: string }) => {
      // Clear timeout
      if (socket.heartbeatTimeoutTimer) {
        clearTimeout(socket.heartbeatTimeoutTimer)
      }

      connection.lastHeartbeatAt = DateTime.now()

      // Update module version if it changed (sent by module >= 2.2.0)
      // Note: we do NOT recalculate the fingerprint here — the fingerprint is set
      // at pairing time and must remain stable, otherwise the module (which still
      // holds the old fingerprint) will fail token refresh.
      if (data?.moduleVersion && data.moduleVersion !== connection.moduleVersion) {
        const oldVersion = connection.moduleVersion
        connection.moduleVersion = data.moduleVersion

        logger.info('Module version updated via heartbeat', {
          connectionId: connection.id,
          oldVersion,
          newVersion: data.moduleVersion,
        })
      }

      await connection.save()
    })
  }

  /**
   * Check if a campaign is still associated with this connection
   * If not, notify the client and disconnect
   * @returns true if campaign exists, false if it was deleted (and client was notified)
   */
  private async checkCampaignExistsOrNotify(socket: VttSocket): Promise<boolean> {
    const connectionId = socket.vttConnectionId!
    const campaign = await Campaign.query().where('vtt_connection_id', connectionId).first()

    if (!campaign) {
      logger.warn('Campaign deleted while connected, notifying client', { connectionId })
      socket.emit('connection:revoked', {
        reason: 'The campaign associated with this connection no longer exists',
        timestamp: DateTime.now().toISO(),
      })
      socket.disconnect(true)
      return false
    }

    return true
  }

  /**
   * Handle dice roll event from VTT
   */
  private async handleDiceRoll(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.info('Dice roll received from VTT', {
        connectionId,
        characterName: data.characterName,
        characterId: data.characterId,
        campaignId: data.campaignId,
        rollFormula: data.rollFormula,
        result: data.result,
        rollType: data.rollType,
        isCritical: data.isCritical,
        criticalType: data.criticalType,
        diceResults: data.diceResults,
        metadata: data.metadata,
        // Enriched flavor data
        skill: data.skill,
        skillRaw: data.skillRaw,
        ability: data.ability,
        abilityRaw: data.abilityRaw,
        modifiers: data.modifiers,
      })

      // Check if campaign still exists
      if (!(await this.checkCampaignExistsOrNotify(socket))) {
        return
      }

      // Get the VTT connection
      const connection = await VttConnection.findOrFail(connectionId)

      // Process dice roll via webhook service (same logic as HTTP webhook, with gamification)
      let gamificationService = null
      try {
        gamificationService = await app.container.make('gamificationService')
      } catch {
        logger.warn('Could not resolve gamificationService for dice roll')
      }
      const webhookService = new VttWebhookService(gamificationService)
      const { diceRoll, pendingAttribution } = await webhookService.processDiceRoll(connection, {
        campaignId: data.campaignId,
        characterId: data.characterId,
        characterName: data.characterName,
        rollId: data.rollId,
        rollFormula: data.rollFormula,
        result: data.result,
        diceResults: data.diceResults,
        isCritical: data.isCritical,
        criticalType: data.criticalType,
        isHidden: data.isHidden || false,
        rollType: data.rollType,
        metadata: data.metadata,
        // Enriched flavor data from FlavorParser
        skill: data.skill,
        skillRaw: data.skillRaw,
        ability: data.ability,
        abilityRaw: data.abilityRaw,
        modifiers: data.modifiers,
      })

      // If roll needs attribution, emit event to GM frontend
      if (pendingAttribution) {
        await this.emitPendingAttributionEvent(connection, diceRoll, data)
      }

      socket.emit('dice:roll:ack', {
        success: true,
        rollId: diceRoll.id,
        pendingAttribution,
      })
    } catch (error) {
      logger.error('Failed to handle dice roll', { error })
      socket.emit('dice:roll:ack', { success: false, error: (error as Error).message })
    }
  }

  /**
   * Emit event to GM frontend for pending dice roll attribution
   */
  private async emitPendingAttributionEvent(
    connection: VttConnection,
    diceRoll: DiceRoll,
    originalData: any
  ): Promise<void> {
    try {
      // Find the campaign for this connection
      const campaign = await Campaign.query().where('vtt_connection_id', connection.id).first()

      if (!campaign) {
        logger.warn('No campaign found for pending attribution event', {
          connectionId: connection.id,
        })
        return
      }

      // Import transmit dynamically to avoid circular dependency
      const transmitModule = await import('@adonisjs/transmit/services/main')
      const transmit = transmitModule.default

      // Emit to campaign channel for GM to see
      transmit.broadcast(`campaign/${campaign.id}/dice-rolls`, {
        event: 'gm:dice:pending',
        data: {
          rollId: diceRoll.id,
          rollFormula: diceRoll.rollFormula,
          result: diceRoll.result,
          diceResults: diceRoll.diceResults,
          isCritical: diceRoll.isCritical,
          criticalType: diceRoll.criticalType,
          rollType: diceRoll.rollType,
          rolledAt: diceRoll.rolledAt.toISO(),
          // Original character info from VTT (for context)
          vttCharacterName: originalData.characterName,
          vttCharacterId: originalData.characterId,
          // Enriched flavor data
          skill: diceRoll.skill,
          ability: diceRoll.ability,
        },
      })

      logger.info('Emitted pending attribution event to GM', {
        campaignId: campaign.id,
        rollId: diceRoll.id,
      })
    } catch (error) {
      logger.error('Failed to emit pending attribution event', { error })
    }
  }

  /**
   * Handle campaign sync event from VTT
   */
  private async handleCampaignSync(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.debug('Campaign sync received', { connectionId, data })

      // Get the VTT connection
      const connection = await VttConnection.findOrFail(connectionId)

      // Sync campaigns from VTT
      const syncService = new VttSyncService()
      const campaigns = await syncService.syncCampaignsFromWebSocket(
        connection,
        data.campaigns || []
      )

      socket.emit('campaign:sync:ack', {
        success: true,
        syncedCount: campaigns.length,
      })
    } catch (error) {
      logger.error('Failed to handle campaign sync', { error })
      socket.emit('campaign:sync:ack', { success: false, error: (error as Error).message })
    }
  }

  /**
   * Handle character update event from VTT
   */
  private async handleCharacterUpdate(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.info('Character update received', {
        connectionId,
        characterName: data.name,
        characterId: data.characterId,
        campaignId: data.campaignId,
      })

      // Check if campaign still exists
      if (!(await this.checkCampaignExistsOrNotify(socket))) {
        return
      }

      // Get the VTT connection
      logger.info('Looking up VTT connection', { connectionId })
      const connection = await VttConnection.findOrFail(connectionId)
      logger.info('VTT connection found', { connectionId, worldId: connection.worldId })

      // Update character via webhook service
      const webhookService = new VttWebhookService()
      logger.info('Calling syncCharacter', {
        connectionId,
        campaignId: data.campaignId,
        characterName: data.name,
      })

      const character = await webhookService.syncCharacter(connection, data.campaignId, {
        vttCharacterId: data.characterId,
        name: data.name,
        avatarUrl: data.avatarUrl,
        characterType: data.characterType,
        stats: data.stats,
        inventory: data.inventory,
        spells: data.spells,
        features: data.features,
        vttData: data.vttData,
      })

      logger.info('Character synced successfully', {
        characterId: character.id,
        characterName: character.name,
      })

      // Categorize items against campaign rules (non-fatal)
      try {
        const { ItemCategorySyncService } =
          await import('#services/campaigns/item_category_sync_service')
        const { CampaignItemCategoryRuleRepository } =
          await import('#repositories/campaign_item_category_rule_repository')
        const syncService = new ItemCategorySyncService(new CampaignItemCategoryRuleRepository())
        const syncResult = await syncService.syncCharacterCategories(
          character,
          character.campaignId
        )

        if (syncResult.changed) {
          const transmitModule = await import('@adonisjs/transmit/services/main')
          const transmit = transmitModule.default
          transmit.broadcast(`campaign:${character.campaignId}:characters`, {
            event: 'character:categories_updated',
            data: {
              characterId: character.id,
              characterName: character.name,
              summary: syncResult.summary,
            },
          })
        }
      } catch (syncError) {
        const syncMsg = syncError instanceof Error ? syncError.message : String(syncError)
        logger.error('Failed to sync item categories (non-fatal)', {
          error: syncMsg,
          characterId: character.id,
        })
      }

      socket.emit('character:update:ack', { success: true, characterId: character.id })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error(
        {
          error: errorMessage,
          stack: errorStack,
          connectionId: socket.vttConnectionId,
          characterName: data?.name,
        },
        `Failed to handle character update: ${errorMessage}`
      )
      socket.emit('character:update:ack', { success: false, error: errorMessage })
    }
  }

  /**
   * Handle combat start event from VTT
   */
  private async handleCombatStart(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.info('Combat started', { connectionId, combatId: data.combatId, round: data.round })

      // Broadcast combat start to overlay channel
      const connection = await VttConnection.findOrFail(connectionId)
      await connection.load('campaigns')

      // Find associated campaign and broadcast to streamers
      if (connection.campaigns && connection.campaigns.length > 0) {
        for (const campaign of connection.campaigns) {
          await this.broadcastToOverlay(campaign.id, 'combat:start', {
            combatId: data.combatId,
            round: data.round,
            turn: data.turn,
            combatants: data.combatants,
            timestamp: data.timestamp,
          })

          // Cache combat state in Redis for monster action handlers
          await redis.setex(
            `campaign:${campaign.id}:combat:active`,
            86400,
            JSON.stringify({
              combatId: data.combatId,
              combatants: data.combatants,
              round: data.round,
              timestamp: data.timestamp,
            })
          )

          // Réactiver les rewards monster (combat-linked toggle)
          try {
            const combatRewardToggle = await app.container.make('combatRewardToggleService')
            await combatRewardToggle.onCombatStart(campaign.id)
          } catch (toggleError) {
            logger.error(
              {
                event: 'combat_reward_toggle_start_error',
                campaignId: campaign.id,
                error: toggleError instanceof Error ? toggleError.message : String(toggleError),
              },
              'Failed to toggle combat rewards on combat start'
            )
          }
        }
      }

      socket.emit('combat:start:ack', { success: true, combatId: data.combatId })
    } catch (error) {
      logger.error('Failed to handle combat start', { error })
      socket.emit('combat:start:ack', { success: false, error: (error as Error).message })
    }
  }

  /**
   * Handle combat sync event from VTT (reconnection with active combat)
   * Identical to combat:start — caches combat state and broadcasts to overlay.
   */
  private async handleCombatSync(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.info('Combat sync (reconnection)', {
        connectionId,
        combatId: data.combatId,
        round: data.round,
      })

      const connection = await VttConnection.findOrFail(connectionId)
      await connection.load('campaigns')

      if (connection.campaigns && connection.campaigns.length > 0) {
        for (const campaign of connection.campaigns) {
          await this.broadcastToOverlay(campaign.id, 'combat:start', {
            combatId: data.combatId,
            round: data.round,
            turn: data.turn,
            combatants: data.combatants,
            timestamp: data.timestamp,
          })

          // Cache combat state in Redis for monster action handlers
          await redis.setex(
            `campaign:${campaign.id}:combat:active`,
            86400,
            JSON.stringify({
              combatId: data.combatId,
              combatants: data.combatants,
              round: data.round,
              timestamp: data.timestamp,
            })
          )

          // Réactiver les rewards monster (combat-linked toggle, idempotent)
          try {
            const combatRewardToggle = await app.container.make('combatRewardToggleService')
            await combatRewardToggle.onCombatStart(campaign.id)
          } catch (toggleError) {
            logger.error(
              {
                event: 'combat_reward_toggle_sync_error',
                campaignId: campaign.id,
                error: toggleError instanceof Error ? toggleError.message : String(toggleError),
              },
              'Failed to toggle combat rewards on combat sync'
            )
          }
        }
      }

      socket.emit('combat:sync:ack', { success: true, combatId: data.combatId })
    } catch (error) {
      logger.error('Failed to handle combat sync', { error })
      socket.emit('combat:sync:ack', { success: false, error: (error as Error).message })
    }
  }

  /**
   * Handle combat turn change event from VTT
   */
  private async handleCombatTurn(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.debug('Combat turn changed', {
        connectionId,
        combatId: data.combatId,
        round: data.round,
        turn: data.turn,
      })

      const connection = await VttConnection.findOrFail(connectionId)
      await connection.load('campaigns')

      if (connection.campaigns && connection.campaigns.length > 0) {
        for (const campaign of connection.campaigns) {
          await this.broadcastToOverlay(campaign.id, 'combat:turn', {
            combatId: data.combatId,
            round: data.round,
            turn: data.turn,
            currentCombatant: data.currentCombatant,
            nextCombatant: data.nextCombatant,
            timestamp: data.timestamp,
          })
        }
      }

      socket.emit('combat:turn:ack', { success: true })
    } catch (error) {
      logger.error('Failed to handle combat turn', { error })
      socket.emit('combat:turn:ack', { success: false, error: (error as Error).message })
    }
  }

  /**
   * Handle combat round change event from VTT
   */
  private async handleCombatRound(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.debug('Combat round changed', {
        connectionId,
        combatId: data.combatId,
        round: data.round,
      })

      const connection = await VttConnection.findOrFail(connectionId)
      await connection.load('campaigns')

      if (connection.campaigns && connection.campaigns.length > 0) {
        for (const campaign of connection.campaigns) {
          await this.broadcastToOverlay(campaign.id, 'combat:round', {
            combatId: data.combatId,
            round: data.round,
            previousRound: data.previousRound,
            combatants: data.combatants,
            timestamp: data.timestamp,
          })

          // Refresh cached combat state with latest combatants
          if (data.combatants) {
            await redis.setex(
              `campaign:${campaign.id}:combat:active`,
              86400,
              JSON.stringify({
                combatId: data.combatId,
                combatants: data.combatants,
                round: data.round,
                timestamp: data.timestamp,
              })
            )
          }
        }
      }

      socket.emit('combat:round:ack', { success: true })
    } catch (error) {
      logger.error('Failed to handle combat round', { error })
      socket.emit('combat:round:ack', { success: false, error: (error as Error).message })
    }
  }

  /**
   * Handle combat end event from VTT
   */
  private async handleCombatEnd(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.info('Combat ended', { connectionId, combatId: data.combatId })

      const connection = await VttConnection.findOrFail(connectionId)
      await connection.load('campaigns')

      if (connection.campaigns && connection.campaigns.length > 0) {
        for (const campaign of connection.campaigns) {
          await this.broadcastToOverlay(campaign.id, 'combat:end', {
            combatId: data.combatId,
            finalRound: data.finalRound,
            timestamp: data.timestamp,
          })

          // Clear cached combat state
          await redis.del(`campaign:${campaign.id}:combat:active`)

          // Mettre en pause les rewards monster (combat-linked toggle)
          try {
            const combatRewardToggle = await app.container.make('combatRewardToggleService')
            await combatRewardToggle.onCombatEnd(campaign.id)
          } catch (toggleError) {
            logger.error(
              {
                event: 'combat_reward_toggle_end_error',
                campaignId: campaign.id,
                error: toggleError instanceof Error ? toggleError.message : String(toggleError),
              },
              'Failed to toggle combat rewards on combat end'
            )
          }
        }
      }

      socket.emit('combat:end:ack', { success: true })
    } catch (error) {
      logger.error('Failed to handle combat end', { error })
      socket.emit('combat:end:ack', { success: false, error: (error as Error).message })
    }
  }

  /**
   * Handle combatant added event from VTT
   */
  private async handleCombatantAdd(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.debug('Combatant added', { connectionId, combatant: data.combatant?.name })

      const connection = await VttConnection.findOrFail(connectionId)
      await connection.load('campaigns')

      if (connection.campaigns && connection.campaigns.length > 0) {
        for (const campaign of connection.campaigns) {
          await this.broadcastToOverlay(campaign.id, 'combat:combatant-add', {
            combatId: data.combatId,
            combatant: data.combatant,
            timestamp: data.timestamp,
          })

          // Add combatant to cached combat state
          await this.addCombatantToCache(campaign.id, data.combatant)
        }
      }

      socket.emit('combat:combatant-add:ack', { success: true })
    } catch (error) {
      logger.error('Failed to handle combatant add', { error })
      socket.emit('combat:combatant-add:ack', { success: false, error: (error as Error).message })
    }
  }

  /**
   * Handle combatant removed event from VTT
   */
  private async handleCombatantRemove(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.debug('Combatant removed', { connectionId, combatantId: data.combatantId })

      const connection = await VttConnection.findOrFail(connectionId)
      await connection.load('campaigns')

      if (connection.campaigns && connection.campaigns.length > 0) {
        for (const campaign of connection.campaigns) {
          await this.broadcastToOverlay(campaign.id, 'combat:combatant-remove', {
            combatId: data.combatId,
            combatantId: data.combatantId,
            name: data.name,
            timestamp: data.timestamp,
          })

          // Remove combatant from cached combat state
          await this.removeCombatantFromCache(campaign.id, data.combatantId)
        }
      }

      socket.emit('combat:combatant-remove:ack', { success: true })
    } catch (error) {
      logger.error('Failed to handle combatant remove', { error })
      socket.emit('combat:combatant-remove:ack', {
        success: false,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Handle combatant defeated event from VTT
   */
  private async handleCombatantDefeated(socket: VttSocket, data: any): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!
      logger.debug('Combatant defeated', {
        connectionId,
        combatant: data.combatant?.name,
        defeated: data.defeated,
      })

      const connection = await VttConnection.findOrFail(connectionId)
      await connection.load('campaigns')

      if (connection.campaigns && connection.campaigns.length > 0) {
        for (const campaign of connection.campaigns) {
          await this.broadcastToOverlay(campaign.id, 'combat:combatant-defeated', {
            combatId: data.combatId,
            combatant: data.combatant,
            defeated: data.defeated,
            timestamp: data.timestamp,
          })
        }
      }

      // Update cached combat state: mark combatant as defeated
      if (connection.campaigns && connection.campaigns.length > 0) {
        for (const campaign of connection.campaigns) {
          await this.updateCachedCombatant(campaign.id, data.combatant)
        }
      }

      socket.emit('combat:combatant-defeated:ack', { success: true })
    } catch (error) {
      logger.error('Failed to handle combatant defeated', { error })
      socket.emit('combat:combatant-defeated:ack', {
        success: false,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Update a single combatant in the cached combat state
   */
  private async updateCachedCombatant(campaignId: string, combatant: any): Promise<void> {
    if (!combatant?.id) return

    try {
      const cached = await redis.get(`campaign:${campaignId}:combat:active`)
      if (!cached) return

      const combatData = JSON.parse(cached)
      if (!combatData.combatants) return

      const index = combatData.combatants.findIndex((c: any) => c.id === combatant.id)
      if (index !== -1) {
        combatData.combatants[index] = { ...combatData.combatants[index], ...combatant }
      }

      await redis.setex(`campaign:${campaignId}:combat:active`, 86400, JSON.stringify(combatData))
    } catch (error) {
      logger.warn('Failed to update cached combatant', { campaignId, error })
    }
  }

  /**
   * Add a combatant to the cached combat state
   */
  private async addCombatantToCache(campaignId: string, combatant: any): Promise<void> {
    if (!combatant?.id) return

    try {
      const cached = await redis.get(`campaign:${campaignId}:combat:active`)
      if (!cached) return

      const combatData = JSON.parse(cached)
      if (!combatData.combatants) combatData.combatants = []

      // Avoid duplicates
      const exists = combatData.combatants.some((c: any) => c.id === combatant.id)
      if (!exists) {
        combatData.combatants.push(combatant)
      }

      await redis.setex(`campaign:${campaignId}:combat:active`, 86400, JSON.stringify(combatData))
    } catch (error) {
      logger.warn('Failed to add combatant to cache', {
        campaignId,
        combatantId: combatant?.id,
        error,
      })
    }
  }

  /**
   * Remove a combatant from the cached combat state
   */
  private async removeCombatantFromCache(campaignId: string, combatantId: string): Promise<void> {
    if (!combatantId) return

    try {
      const cached = await redis.get(`campaign:${campaignId}:combat:active`)
      if (!cached) return

      const combatData = JSON.parse(cached)
      if (!combatData.combatants) return

      combatData.combatants = combatData.combatants.filter((c: any) => c.id !== combatantId)

      await redis.setex(`campaign:${campaignId}:combat:active`, 86400, JSON.stringify(combatData))
    } catch (error) {
      logger.warn('Failed to remove combatant from cache', { campaignId, combatantId, error })
    }
  }

  /**
   * Broadcast event to overlay channel for a campaign
   * Uses Transmit to push to streamer overlays
   */
  private async broadcastToOverlay(campaignId: string, event: string, data: any): Promise<void> {
    try {
      // Import transmit dynamically to avoid circular dependency
      const transmitModule = await import('@adonisjs/transmit/services/main')
      const transmit = transmitModule.default

      // Broadcast to all streamers in the campaign
      transmit.broadcast(`overlay/${campaignId}/combat`, {
        event,
        data,
        timestamp: DateTime.now().toISO(),
      })

      logger.debug('Broadcast to overlay', { campaignId, event })
    } catch (error) {
      logger.error('Failed to broadcast to overlay', { error, campaignId, event })
    }
  }

  /**
   * Handle socket disconnection
   */
  private async handleDisconnection(socket: VttSocket, reason: string): Promise<void> {
    try {
      const connectionId = socket.vttConnectionId!

      // Clear heartbeat intervals
      if (socket.heartbeatIntervalTimer) {
        clearInterval(socket.heartbeatIntervalTimer)
      }
      if (socket.heartbeatTimeoutTimer) {
        clearTimeout(socket.heartbeatTimeoutTimer)
      }

      // Update connection status
      const connection = await VttConnection.find(connectionId)
      if (connection) {
        connection.tunnelStatus = 'disconnected'
        await connection.save()
      }

      logger.info('VTT disconnected', { connectionId, reason })
    } catch (error) {
      logger.error('Failed to handle VTT disconnection', { error })
    }
  }

  /**
   * Notify VTT that a campaign has been deleted
   * This sends a specific event so the module can distinguish from revocation
   */
  async notifyCampaignDeleted(
    connectionId: string,
    campaignId: string,
    campaignName: string
  ): Promise<void> {
    // Skip WebSocket notification if server not initialized
    if (!this.io) {
      logger.debug('WebSocket service not initialized, skipping campaign deletion notification', {
        connectionId,
        campaignId,
      })
      return
    }

    const vttNamespace = this.io.of('/vtt')

    // Emit campaign deleted event to VTT
    vttNamespace.to(`vtt:${connectionId}`).emit('campaign:deleted', {
      campaignId,
      campaignName,
      reason: 'deleted_by_owner',
      timestamp: DateTime.now().toISO(),
    })

    logger.info('VTT notified of campaign deletion', { connectionId, campaignId, campaignName })
  }

  /**
   * Revoke a connection and notify VTT via WebSocket
   * Note: If WebSocket server is not initialized (e.g., in tests),
   * this method will skip the WebSocket notification gracefully.
   */
  async revokeConnection(connectionId: string, reason: string): Promise<void> {
    // Update connection status (if it still exists)
    const connection = await VttConnection.find(connectionId)
    if (connection) {
      connection.status = 'revoked'
      connection.tunnelStatus = 'disconnected'
      await connection.save()
    }

    // Skip WebSocket notification if server not initialized
    if (!this.io) {
      logger.debug('WebSocket service not initialized, skipping revocation notification', {
        connectionId,
      })
      return
    }

    const vttNamespace = this.io.of('/vtt')

    // Emit revocation event to VTT (even if connection is deleted, sockets may still exist)
    vttNamespace.to(`vtt:${connectionId}`).emit('connection:revoked', {
      reason,
      timestamp: DateTime.now().toISO(),
    })

    // Disconnect all sockets for this connection
    const sockets = await vttNamespace.in(`vtt:${connectionId}`).fetchSockets()
    for (const socket of sockets) {
      socket.disconnect(true)
    }

    logger.info('VTT connection revoked', { connectionId, reason })
  }

  /**
   * Broadcast event to specific VTT connection
   */
  async broadcast(connectionId: string, event: string, data: any): Promise<boolean> {
    if (!this.io) {
      throw new Error('WebSocket service not initialized')
    }

    const vttNamespace = this.io.of('/vtt')
    const roomName = `vtt:${connectionId}`

    // Check if there are actual sockets in the room before emitting
    const sockets = await vttNamespace.in(roomName).fetchSockets()
    if (sockets.length === 0) {
      logger.warn(
        {
          event: 'vtt_broadcast_no_sockets',
          connectionId,
          socketEvent: event,
        },
        `No VTT sockets in room ${roomName} — command will not be received by Foundry`
      )
      return false
    }

    logger.debug(
      {
        connectionId,
        socketEvent: event,
        socketCount: sockets.length,
      },
      `Broadcasting to ${sockets.length} socket(s) in room ${roomName}`
    )

    vttNamespace.to(roomName).emit(event, data)
    return true
  }
}
