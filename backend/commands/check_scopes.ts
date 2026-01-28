import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { streamer as Streamer } from '#models/streamer'
import { TwitchAuthService } from '#services/auth/twitch_auth_service'

export default class CheckScopes extends BaseCommand {
  static commandName = 'check:scopes'
  static description = 'Vérifie et affiche les scopes OAuth manquants pour les streamers'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const authService = new TwitchAuthService()
    const requiredScopes = authService.getRequiredScopes()

    this.logger.info('Vérification des scopes OAuth pour tous les streamers...\n')

    // Récupérer tous les streamers
    const streamers = await Streamer.all()

    if (streamers.length === 0) {
      this.logger.warning('Aucun streamer trouvé dans la base de données')
      return
    }

    let hasIssues = false

    for (const streamer of streamers) {
      const currentScopes = Array.isArray(streamer.scopes)
        ? streamer.scopes
        : JSON.parse(streamer.scopes || '[]')

      const missingScopes = requiredScopes.filter((scope) => !currentScopes.includes(scope))

      if (missingScopes.length > 0) {
        hasIssues = true
        this.logger.error(`❌ ${streamer.twitchLogin} (${streamer.twitchUserId})`)
        this.logger.info(`   Scopes actuels: ${currentScopes.join(', ')}`)
        this.logger.warning(`   Scopes manquants: ${missingScopes.join(', ')}\n`)
      } else {
        this.logger.success(`✅ ${streamer.twitchLogin} - Tous les scopes présents\n`)
      }
    }

    if (hasIssues) {
      this.logger.warning('\n⚠️  Certains streamers ont des scopes manquants.')
      this.logger.info(
        'Les streamers doivent se reconnecter via OAuth pour obtenir les nouveaux scopes.'
      )
      this.logger.info('URL de reconnexion: /auth/twitch/logout puis /auth/twitch/login')
    } else {
      this.logger.success('\n✅ Tous les streamers ont les scopes requis!')
    }
  }
}
