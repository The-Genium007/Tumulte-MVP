import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { twitchAuthService as TwitchAuthService } from '#services/auth/twitch_auth_service'

/**
 * Extrait un message d'erreur sûr depuis une erreur inconnue
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}

@inject()
export default class AccountController {
  constructor(private readonly twitchAuthService: TwitchAuthService) {}

  /**
   * Anonymise le compte utilisateur et toutes ses données associées
   * Permet la reconnexion ultérieure (nouveau compte sera créé)
   */
  async deleteAccount({ auth, response }: HttpContext) {
    const user = auth.user!

    try {
      // Générer un ID court pour l'anonymisation
      const shortId = user.id.substring(0, 8)

      // Anonymiser le nom d'affichage
      user.displayName = `Utilisateur supprimé ${shortId}`

      // Supprimer l'email
      user.email = null

      // Si l'utilisateur est un streamer, anonymiser et désactiver les données Twitch
      if (user.role === 'STREAMER') {
        await user.load((loader) => loader.load('streamer'))

        if (user.streamer) {
          const streamer = user.streamer

          try {
            // Récupérer le token non chiffré et révoquer côté Twitch
            const accessToken = await streamer.getDecryptedAccessToken()
            await this.twitchAuthService.revokeToken(accessToken)
          } catch (error) {
            // Log l'erreur mais continue l'anonymisation même si la révocation échoue
            logger.warn(
              `Failed to revoke Twitch token for streamer ${streamer.id}: ${getErrorMessage(error)}`
            )
          }

          // Désactiver le compte streamer
          streamer.isActive = false

          // Anonymiser les données Twitch
          streamer.twitchDisplayName = `Streamer supprimé ${shortId}`
          streamer.twitchLogin = `deleted_${shortId}`

          await streamer.save()
        }
      }

      // Sauvegarder les modifications du user
      await user.save()

      // Déconnecter l'utilisateur
      await auth.use('web').logout()

      logger.info(`Account anonymized for user ${user.id}`)

      return response.ok({
        message: 'Compte supprimé et données anonymisées avec succès',
      })
    } catch (error) {
      logger.error(`Failed to anonymize account for user ${user.id}: ${getErrorMessage(error)}`)
      return response.internalServerError({
        error: 'Échec de la suppression du compte',
      })
    }
  }
}
