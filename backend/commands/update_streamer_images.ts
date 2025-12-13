import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Streamer from '#models/streamer'
import TwitchApiService from '#services/twitch_api_service'
import env from '#start/env'

interface TwitchUserData {
  data: Array<{
    id: string
    login: string
    display_name: string
    profile_image_url: string
    broadcaster_type: string
  }>
}

export default class UpdateStreamerImages extends BaseCommand {
  static commandName = 'streamers:update-images'
  static description = 'Récupère les images de profil des streamers depuis Twitch'

  static options: CommandOptions = {}

  async run() {
    const streamers = await Streamer.query()
    const twitchApiService = new TwitchApiService()
    const clientId = env.get('TWITCH_CLIENT_ID') || ''

    this.logger.info(`Mise à jour des images pour ${streamers.length} streamer(s)...`)

    const appAccessToken = await twitchApiService.getAppAccessToken()

    for (const streamer of streamers) {
      try {
        // Récupérer les infos Twitch
        const response = await fetch(
          `https://api.twitch.tv/helix/users?id=${streamer.twitchUserId}`,
          {
            headers: {
              'Authorization': `Bearer ${appAccessToken}`,
              'Client-Id': clientId,
            },
          }
        )

        if (!response.ok) {
          this.logger.warning(
            `Impossible de récupérer les infos pour ${streamer.twitchDisplayName}`
          )
          continue
        }

        const data = (await response.json()) as TwitchUserData

        if (data.data && data.data.length > 0) {
          const userData = data.data[0]
          streamer.profileImageUrl = userData.profile_image_url
          streamer.broadcasterType = userData.broadcaster_type || ''
          await streamer.save()
          this.logger.success(`✓ ${streamer.twitchDisplayName}: ${userData.profile_image_url}`)
        }
      } catch (error: any) {
        this.logger.error(
          `Erreur pour ${streamer.twitchDisplayName}: ${error?.message || 'Unknown error'}`
        )
      }
    }

    this.logger.info('Terminé!')
  }
}
