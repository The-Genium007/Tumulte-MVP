import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import { z } from 'zod'
import { OverlayStudioService } from '#services/overlay-studio/overlay_studio_service'
import {
  OverlayConfigDto,
  OverlayConfigDetailDto,
  OverlayActiveConfigDto,
} from '#dtos/overlay-studio/overlay_studio_dto'
import { overlayConfig as OverlayConfig } from '#models/overlay_config'
import {
  createOverlayConfigSchema,
  updateOverlayConfigSchema,
  previewCommandSchema,
} from '#validators/overlay-studio/overlay_config_validator'
import { RESERVED_CONFIG_IDS } from '#constants/overlay'

/** Schema de validation pour les IDs de configuration (UUID) */
const configIdSchema = z.string().uuid('Invalid config ID format')

/**
 * Contrôleur pour la gestion des configurations d'overlay
 */
@inject()
export default class OverlayStudioController {
  constructor(private overlayService: OverlayStudioService) {}

  /**
   * Valide qu'un ID de configuration est un UUID valide et n'est pas réservé
   * @returns Message d'erreur si invalide, null si valide
   */
  private validateConfigId(
    id: string
  ): { status: 'forbidden' | 'badRequest'; error: string } | null {
    // Vérifier si l'ID est réservé (ex: 'default')
    if (RESERVED_CONFIG_IDS.includes(id as (typeof RESERVED_CONFIG_IDS)[number])) {
      return {
        status: 'forbidden',
        error: 'Cannot modify system default configuration',
      }
    }

    // Valider que l'ID est un UUID valide
    const validation = configIdSchema.safeParse(id)
    if (!validation.success) {
      return {
        status: 'badRequest',
        error: 'Invalid config ID format',
      }
    }

    return null
  }

  /**
   * Liste les configurations du streamer
   * GET /streamer/overlay-studio/configs
   */
  async index({ auth, response }: HttpContext) {
    try {
      const configs = await this.overlayService.getConfigsForUser(auth.user!.id)

      return response.ok({
        data: OverlayConfigDto.fromModelArray(configs),
      })
    } catch (error) {
      return response.notFound({
        error: error instanceof Error ? error.message : 'Failed to fetch configurations',
      })
    }
  }

  /**
   * Récupère une configuration par son ID
   * GET /streamer/overlay-studio/configs/:id
   */
  async show({ auth, params, response }: HttpContext) {
    // Valider l'ID avant toute requête DB
    const idError = this.validateConfigId(params.id)
    if (idError) {
      return response[idError.status]({ error: idError.error })
    }

    try {
      const config = await this.overlayService.getConfigById(auth.user!.id, params.id)

      if (!config) {
        return response.notFound({ error: 'Configuration not found' })
      }

      return response.ok({
        data: OverlayConfigDetailDto.fromModel(config),
      })
    } catch (error) {
      return response.notFound({
        error: error instanceof Error ? error.message : 'Failed to fetch configuration',
      })
    }
  }

  /**
   * Crée une nouvelle configuration
   * POST /streamer/overlay-studio/configs
   */
  async store({ auth, request, response }: HttpContext) {
    const validation = createOverlayConfigSchema.safeParse(request.body())

    if (!validation.success) {
      return response.badRequest({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      })
    }

    try {
      const config = await this.overlayService.createConfig(auth.user!.id, validation.data)

      return response.created({
        data: OverlayConfigDetailDto.fromModel(config),
      })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to create configuration',
      })
    }
  }

  /**
   * Met à jour une configuration
   * PUT /streamer/overlay-studio/configs/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    // Valider l'ID avant toute requête DB
    const idError = this.validateConfigId(params.id)
    if (idError) {
      return response[idError.status]({ error: idError.error })
    }

    const validation = updateOverlayConfigSchema.safeParse(request.body())

    if (!validation.success) {
      return response.badRequest({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      })
    }

    try {
      const config = await this.overlayService.updateConfig(
        auth.user!.id,
        params.id,
        validation.data
      )

      if (!config) {
        return response.notFound({ error: 'Configuration not found' })
      }

      return response.ok({
        data: OverlayConfigDetailDto.fromModel(config),
      })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to update configuration',
      })
    }
  }

  /**
   * Supprime une configuration
   * DELETE /streamer/overlay-studio/configs/:id
   */
  async destroy({ auth, params, response }: HttpContext) {
    // Valider l'ID avant toute requête DB
    const idError = this.validateConfigId(params.id)
    if (idError) {
      return response[idError.status]({ error: idError.error })
    }

    try {
      const deleted = await this.overlayService.deleteConfig(auth.user!.id, params.id)

      if (!deleted) {
        return response.notFound({ error: 'Configuration not found' })
      }

      return response.ok({ message: 'Configuration deleted successfully' })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to delete configuration',
      })
    }
  }

  /**
   * Active une configuration
   * POST /streamer/overlay-studio/configs/:id/activate
   */
  async activate({ auth, params, response }: HttpContext) {
    // Valider l'ID avant toute requête DB
    const idError = this.validateConfigId(params.id)
    if (idError) {
      return response[idError.status]({ error: idError.error })
    }

    try {
      const config = await this.overlayService.activateConfig(auth.user!.id, params.id)

      if (!config) {
        return response.notFound({ error: 'Configuration not found' })
      }

      return response.ok({
        data: OverlayConfigDto.fromModel(config),
        message: 'Configuration activated successfully',
      })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to activate configuration',
      })
    }
  }

  /**
   * Récupère la configuration système par défaut "Tumulte Default"
   * GET /overlay-studio/default-config
   * Endpoint public - pas besoin d'authentification
   */
  async getDefaultConfig({ response }: HttpContext) {
    const defaultConfig = OverlayConfig.getDefaultConfigWithPoll()
    return response.ok({
      data: {
        id: 'default',
        name: 'Tumulte Default',
        config: defaultConfig,
      },
    })
  }

  /**
   * Récupère les propriétés par défaut pour un type d'élément
   * GET /overlay-studio/defaults/:type
   * Endpoint public - pas besoin d'authentification
   *
   * Types supportés: poll, dice, diceReverseGoalBar, diceReverseImpactHud
   */
  async getElementDefaults({ params, response }: HttpContext) {
    const { type } = params

    const defaultsMap: Record<string, () => Record<string, unknown>> = {
      poll: () => OverlayConfig.getDefaultPollProperties(),
      dice: () => OverlayConfig.getDefaultDiceProperties(),
      diceReverseGoalBar: () => OverlayConfig.getDefaultGoalBarProperties(),
      diceReverseImpactHud: () => OverlayConfig.getDefaultImpactHudProperties(),
    }

    const getDefaults = defaultsMap[type]
    if (!getDefaults) {
      return response.badRequest({
        error: `Unknown element type: ${type}`,
        supportedTypes: Object.keys(defaultsMap),
      })
    }

    return response.ok({
      data: {
        type,
        properties: getDefaults(),
      },
    })
  }

  /**
   * Récupère la configuration active d'un streamer (endpoint public)
   * GET /overlay/:streamerId/config
   * Query params:
   *   - campaign: (optional) ID de la campagne pour récupérer la config spécifique
   *
   * Logique de résolution:
   * 1. Si campaign est fourni → cherche campaign_memberships.overlay_config_id
   * 2. Sinon → utilise l'overlay "is_active" du streamer
   * 3. Fallback → config par défaut système
   */
  async getActiveConfig({ params, request, response }: HttpContext) {
    const campaignId = request.qs().campaign as string | undefined

    let config

    // Si un campaignId est fourni, chercher la config spécifique à cette campagne
    if (campaignId) {
      config = await this.overlayService.getConfigForCampaign(params.streamerId, campaignId)
    }

    // Fallback: config active du streamer
    if (!config) {
      config = await this.overlayService.getActiveConfigForStreamer(params.streamerId)
    }

    // Fallback ultime: configuration par défaut système "Tumulte Défaut"
    if (!config) {
      const defaultConfig = OverlayConfig.getDefaultConfigWithPoll()
      return response.ok({
        data: {
          id: 'default',
          config: defaultConfig,
        },
      })
    }

    return response.ok({
      data: OverlayActiveConfigDto.fromModel(config),
    })
  }

  /**
   * Envoie une commande de preview vers l'overlay OBS
   * POST /streamer/overlay-studio/preview-command
   */
  async sendPreviewCommand({ auth, request, response }: HttpContext) {
    const validation = previewCommandSchema.safeParse(request.body())

    if (!validation.success) {
      return response.badRequest({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      })
    }

    try {
      // Récupérer le streamerId de l'utilisateur
      const streamerId = await this.overlayService.getStreamerIdForUser(auth.user!.id)

      if (!streamerId) {
        return response.notFound({ error: 'Streamer not found' })
      }

      // Envoyer la commande via WebSocket au canal du streamer
      const channel = `streamer:${streamerId}:polls`
      logger.debug({ channel, command: validation.data.command }, 'Broadcasting preview command')
      transmit.broadcast(channel, {
        event: 'preview:command',
        data: validation.data,
      })

      return response.ok({ message: 'Command sent successfully' })
    } catch (error) {
      return response.badRequest({
        error: error instanceof Error ? error.message : 'Failed to send command',
      })
    }
  }
}
