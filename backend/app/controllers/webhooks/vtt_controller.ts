import type { HttpContext } from '@adonisjs/core/http'
import { z } from 'zod'
import { DateTime } from 'luxon'
import VttConnection from '#models/vtt_connection'
import VttWebhookService from '#services/vtt/vtt_webhook_service'

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
  metadata: z.record(z.unknown()).optional(), // Données spécifiques VTT
})

export default class VttController {
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

      // 5. Déléguer le traitement au service
      const webhookService = new VttWebhookService()
      const diceRoll = await webhookService.processDiceRoll(vttConnection, payload)

      return response.ok({
        success: true,
        rollId: diceRoll.id,
        message: 'Dice roll recorded successfully',
      })
    } catch (error) {
      // Gestion des erreurs de validation Zod
      if (error instanceof z.ZodError) {
        return response.badRequest({
          error: 'Invalid payload',
          details: error.errors,
        })
      }

      // Gestion des erreurs de connexion VTT non trouvée
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.unauthorized({
          error: 'Invalid API key or inactive connection',
        })
      }

      // Erreurs inattendues
      console.error('Error processing VTT webhook:', error)
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

      console.error('Error testing VTT connection:', error)
      return response.internalServerError({
        error: 'An error occurred while testing the connection',
      })
    }
  }
}
