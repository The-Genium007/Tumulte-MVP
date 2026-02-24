import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { z } from 'zod'
import { DateTime } from 'luxon'
import VttConnection from '#models/vtt_connection'
import VttWebhookService from '#services/vtt/vtt_webhook_service'
import { InstanceManager } from '#services/gamification/instance_manager'

// Schéma de validation pour le payload de dice roll
const diceRollPayloadSchema = z.object({
  campaignId: z.string(), // ID de campagne VTT (pas Tumulte)
  characterId: z.string(), // ID de personnage VTT (pas Tumulte)
  characterName: z.string(),
  rollId: z.string().optional(), // Pour déduplication
  rollFormula: z.string(),
  result: z.number(),
  diceResults: z.array(z.number()),
  isCritical: z.boolean(),
  criticalType: z.enum(['success', 'failure']).nullable().optional(),
  isHidden: z.boolean().default(false),
  rollType: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(), // Données spécifiques VTT
})

// Schéma de validation pour le callback d'exécution gamification
const gamificationExecutedPayloadSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  originalValue: z.number().optional(),
  invertedValue: z.number().optional(),
})

@inject()
export default class VttController {
  constructor(private instanceManager: InstanceManager) {}
  /**
   * Reçoit un événement de dice roll d'un module/script VTT
   * POST /webhooks/vtt/dice-roll
   */
  async diceRoll({ request, response }: HttpContext) {
    try {
      // 1. Extraire et valider l'API key du header Authorization
      const authHeader = request.header('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response.unauthorized({
          error: 'Missing or invalid Authorization header',
        })
      }

      const apiKey = authHeader.substring(7) // Enlever "Bearer "

      // 2. Trouver la connexion VTT correspondante
      const vttConnection = await VttConnection.query()
        .where('api_key', apiKey)
        .where('status', 'active')
        .preload('provider')
        .firstOrFail()

      // 3. Mettre à jour le timestamp de dernier webhook
      vttConnection.lastWebhookAt = DateTime.now()
      await vttConnection.save()

      // 4. Valider le payload
      const payload = diceRollPayloadSchema.parse(request.body())

      // 5. Déléguer le traitement au service (avec gamification)
      const gamificationService = await app.container.make('gamificationService')
      const webhookService = new VttWebhookService(gamificationService)
      const { diceRoll, pendingAttribution } = await webhookService.processDiceRoll(
        vttConnection,
        payload
      )

      return response.ok({
        success: true,
        rollId: diceRoll.id,
        pendingAttribution,
        message: pendingAttribution
          ? 'Dice roll recorded, pending GM attribution'
          : 'Dice roll recorded successfully',
      })
    } catch (error) {
      // Gestion des erreurs de validation Zod
      if (error instanceof z.ZodError) {
        return response.badRequest({
          error: 'Invalid payload',
          details: error.issues,
        })
      }

      // Gestion des erreurs de connexion VTT non trouvée
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.unauthorized({
          error: 'Invalid API key or inactive connection',
        })
      }

      // Erreurs inattendues
      logger.error({ error }, 'Error processing VTT webhook')
      return response.internalServerError({
        error: 'An error occurred while processing the webhook',
      })
    }
  }

  /**
   * Endpoint de test pour valider la connexion VTT
   * POST /webhooks/vtt/test
   */
  async test({ request, response }: HttpContext) {
    try {
      // 1. Extraire et valider l'API key
      const authHeader = request.header('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response.unauthorized({
          error: 'Missing or invalid Authorization header',
        })
      }

      const apiKey = authHeader.substring(7)

      // 2. Trouver la connexion VTT correspondante
      const vttConnection = await VttConnection.query()
        .where('api_key', apiKey)
        .where('status', 'active')
        .preload('provider')
        .firstOrFail()

      // 3. Mettre à jour le timestamp
      vttConnection.lastWebhookAt = DateTime.now()
      await vttConnection.save()

      return response.ok({
        success: true,
        message: 'Connection test successful',
        connection: {
          id: vttConnection.id,
          name: vttConnection.name,
          provider: vttConnection.provider.displayName,
          status: vttConnection.status,
        },
      })
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.unauthorized({
          error: 'Invalid API key or inactive connection',
        })
      }

      logger.error({ error }, 'Error testing VTT connection')
      return response.internalServerError({
        error: 'An error occurred while testing the connection',
      })
    }
  }

  /**
   * Callback appelé par Foundry VTT quand une action de gamification est exécutée
   * POST /webhooks/vtt/gamification/:instanceId/executed
   *
   * Cet endpoint est appelé par le module Foundry après avoir exécuté l'action
   * (ex: inversion de dé). Il déclenche l'envoi du WebSocket pour l'Impact HUD.
   */
  async gamificationExecuted({ request, response, params }: HttpContext) {
    try {
      // 1. Extraire et valider l'API key
      const authHeader = request.header('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response.unauthorized({
          error: 'Missing or invalid Authorization header',
        })
      }

      const apiKey = authHeader.substring(7)

      // 2. Vérifier la connexion VTT
      const vttConnection = await VttConnection.query()
        .where('api_key', apiKey)
        .where('status', 'active')
        .firstOrFail()

      // 3. Mettre à jour le timestamp
      vttConnection.lastWebhookAt = DateTime.now()
      await vttConnection.save()

      // 4. Valider le payload
      const payload = gamificationExecutedPayloadSchema.parse(request.body())
      const instanceId = params.instanceId as string

      if (!instanceId) {
        return response.badRequest({
          error: 'Missing instanceId parameter',
        })
      }

      // 5. Marquer l'instance comme exécutée (déclenche WebSocket)
      const instance = await this.instanceManager.markExecuted(
        instanceId,
        payload.success,
        payload.message
      )

      if (!instance) {
        return response.notFound({
          error: 'Instance not found or not pending execution',
        })
      }

      return response.ok({
        success: true,
        instanceId: instance.id,
        executionStatus: instance.executionStatus,
        message: 'Gamification action execution recorded',
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.badRequest({
          error: 'Invalid payload',
          details: error.issues,
        })
      }

      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.unauthorized({
          error: 'Invalid API key or inactive connection',
        })
      }

      logger.error({ error }, 'Error processing gamification executed webhook')
      return response.internalServerError({
        error: 'An error occurred while processing the webhook',
      })
    }
  }
}
