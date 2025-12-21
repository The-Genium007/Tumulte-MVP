import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { StreamerRepository } from '#repositories/streamer_repository'
import { StreamerDto } from '#dtos/auth/streamer_dto'
import TwitchApiService from '#services/twitch/twitch_api_service'

/**
 * Contrôleur pour la recherche et gestion des streamers (MJ)
 */
@inject()
export default class StreamersController {
  constructor(
    private streamerRepository: StreamerRepository,
    private twitchApiService: TwitchApiService
  ) {}

  /**
   * Liste tous les streamers actifs
   * GET /api/v2/mj/streamers
   */
  async index({ response }: HttpContext) {
    const streamers = await this.streamerRepository.findActive()

    return response.ok({
      data: streamers.map((s) => StreamerDto.fromModel(s)),
    })
  }

  /**
   * Recherche des streamers par nom Twitch
   * GET /api/v2/mj/streamers/search?q=username
   */
  async search({ request, response }: HttpContext) {
    const query = request.input('q', '').trim()

    if (query.length < 3) {
      return response.badRequest({ error: 'Query must be at least 3 characters' })
    }

    try {
      // Rechercher dans la base locale
      const localStreamers = await this.streamerRepository.findActive()
      const filtered = localStreamers.filter((s) =>
        s.twitchDisplayName.toLowerCase().includes(query.toLowerCase())
      )

      // Si on a des résultats locaux, les retourner
      if (filtered.length > 0) {
        return response.ok({
          data: filtered.map((s) => StreamerDto.fromModel(s)),
        })
      }

      // Sinon, rechercher via l'API Twitch
      const appToken = await this.twitchApiService.getAppAccessToken()
      const users = await this.twitchApiService.searchUsers(query, appToken)

      return response.ok({
        data: users.map((user) => ({
          twitchUserId: user.id,
          twitchUsername: user.login,
          twitchDisplayName: user.display_name,
          profileImageUrl: user.profile_image_url,
          broadcasterType: user.broadcaster_type || '',
          isActive: false,
          isRegistered: false,
        })),
      })
    } catch (error) {
      return response.internalServerError({
        error: 'Failed to search streamers',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Récupère les informations d'un streamer
   * GET /api/v2/mj/streamers/:id
   */
  async show({ params, response }: HttpContext) {
    const streamer = await this.streamerRepository.findById(params.id)

    if (!streamer) {
      return response.notFound({ error: 'Streamer not found' })
    }

    return response.ok({
      data: StreamerDto.fromModel(streamer),
    })
  }
}
