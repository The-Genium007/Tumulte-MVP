import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
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

/**
 * Contrôleur pour la gestion des configurations d'overlay
 */
@inject()
export default class OverlayStudioController {
  constructor(private overlayService: OverlayStudioService) {}

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
