import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { twitchAuthService as TwitchAuthService } from '#services/auth/twitch_auth_service'
import { campaign as Campaign } from '#models/campaign'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { pollTemplate as PollTemplate } from '#models/poll_template'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { pollChannelLink as PollChannelLink } from '#models/poll_channel_link'

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
   * Anonymise le compte utilisateur et toutes ses données associées (RGPD)
   * - Anonymise toutes les données personnelles identifiables
   * - Anonymise le twitchUserId pour permettre une nouvelle inscription
   * - Conserve les données statistiques de manière anonyme
   */
  async deleteAccount({ auth, response }: HttpContext) {
    const user = auth.user!

    try {
      // Générer un ID court unique pour l'anonymisation
      const shortId = user.id.substring(0, 8)
      const anonymizedTwitchId = `deleted_${shortId}_${Date.now()}`

      // Utiliser une transaction pour garantir l'intégrité
      await db.transaction(async (trx) => {
        // 1. Charger le streamer associé (tous les users ont un streamer via Twitch OAuth)
        await user.load((loader) => loader.load('streamer'))
        const streamer = user.streamer

        if (streamer) {
          // Révoquer le token Twitch (hors transaction car appel externe)
          try {
            const accessToken = await streamer.getDecryptedAccessToken()
            if (accessToken) {
              await this.twitchAuthService.revokeToken(accessToken)
            }
          } catch (error) {
            logger.warn(
              `Failed to revoke Twitch token for streamer ${streamer.id}: ${getErrorMessage(error)}`
            )
          }

          // 2. Anonymiser les PollChannelLinks (votes sur les chaînes)
          await PollChannelLink.query({ client: trx }).where('streamerId', streamer.id).update({
            twitchPollId: null, // Supprimer la référence au poll Twitch
          })

          // 3. Supprimer les CampaignMemberships (invitations/participations)
          await CampaignMembership.query({ client: trx }).where('streamerId', streamer.id).delete()

          // 4. Anonymiser le Streamer
          streamer.useTransaction(trx)
          streamer.twitchUserId = anonymizedTwitchId // CRUCIAL: permet nouvelle inscription
          streamer.twitchLogin = `deleted_${shortId}`
          streamer.twitchDisplayName = `Streamer supprimé ${shortId}`
          streamer.profileImageUrl = null
          streamer.accessTokenEncrypted = null
          streamer.refreshTokenEncrypted = null
          streamer.scopes = []
          streamer.isActive = false
          await streamer.save()
        }

        // 5. Anonymiser les Campaigns créées par l'utilisateur (si MJ)
        await Campaign.query({ client: trx })
          .where('ownerId', user.id)
          .update({
            name: `Campagne supprimée ${shortId}`,
            description: null,
          })

        // 6. Anonymiser les PollTemplates créés par l'utilisateur
        await PollTemplate.query({ client: trx })
          .where('ownerId', user.id)
          .update({
            label: `Template supprimé ${shortId}`,
            title: `Sondage supprimé`,
            options: JSON.stringify(['Option 1', 'Option 2']),
          })

        // 7. Anonymiser les PollInstances créés par l'utilisateur
        await PollInstance.query({ client: trx }).where('createdBy', user.id).update({
          title: `Sondage supprimé`,
        })

        // 8. Anonymiser les Polls créés par l'utilisateur (via ses campagnes)
        // Les polls sont liés aux campagnes, qui sont déjà anonymisées ci-dessus

        // 9. Anonymiser le User
        user.useTransaction(trx)
        user.displayName = `Utilisateur supprimé ${shortId}`
        user.email = null
        await user.save()
      })

      // Déconnecter l'utilisateur (hors transaction)
      await auth.use('web').logout()

      logger.info(`Account fully anonymized (GDPR) for user ${user.id}`)

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
