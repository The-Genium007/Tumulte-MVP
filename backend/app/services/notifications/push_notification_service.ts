import webPush from 'web-push'
import logger from '@adonisjs/core/services/logger'
import pushConfig from '#config/push'
import PushSubscriptionRepository from '#repositories/push_subscription_repository'
import NotificationPreferenceRepository from '#repositories/notification_preference_repository'
import {
  type NotificationType,
  type PushPayload,
  notificationTypeToPreference,
  getDefaultUrgency,
} from './notification_types.js'

/**
 * Service pour envoyer des notifications push
 */
export class PushNotificationService {
  private subscriptionRepository: PushSubscriptionRepository
  private preferenceRepository: NotificationPreferenceRepository

  constructor() {
    this.subscriptionRepository = new PushSubscriptionRepository()
    this.preferenceRepository = new NotificationPreferenceRepository()
    // Config VAPID initialisée de manière lazy lors de la première utilisation
  }

  /**
   * Obtenir la clé publique VAPID pour le client
   */
  getVapidPublicKey(): string {
    return pushConfig.vapidPublicKey
  }

  /**
   * Envoyer une notification push à un utilisateur
   * @param bypassPreferences - Ignore les préférences utilisateur (utile pour les tests dev)
   */
  async sendToUser(
    userId: string,
    type: NotificationType,
    payload: PushPayload,
    bypassPreferences: boolean = false
  ): Promise<{ sent: number; failed: number }> {
    // Vérifier que VAPID est configuré
    if (!pushConfig.isConfigured) {
      logger.warn('Push notification skipped: VAPID keys not configured')
      return { sent: 0, failed: 0 }
    }

    // Vérifier les préférences utilisateur (sauf si bypassPreferences)
    if (!bypassPreferences) {
      const preferences = await this.preferenceRepository.findByUserId(userId)

      // Si pas de préférences, l'utilisateur n'a jamais configuré = on envoie par défaut
      if (preferences) {
        if (!preferences.pushEnabled) {
          logger.debug({ userId, type }, 'Push notification skipped: push globally disabled')
          return { sent: 0, failed: 0 }
        }

        const preferenceKey = notificationTypeToPreference[type]
        if (!preferences[preferenceKey]) {
          logger.debug({ userId, type }, 'Push notification skipped: type disabled by user')
          return { sent: 0, failed: 0 }
        }
      }
    } else {
      logger.debug({ userId, type }, 'Push notification: bypassing preferences check')
    }

    // Récupérer toutes les subscriptions de l'utilisateur
    const subscriptions = await this.subscriptionRepository.findByUserId(userId)

    if (subscriptions.length === 0) {
      logger.debug({ userId, type }, 'Push notification skipped: no subscriptions')
      return { sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    const notificationPayload = JSON.stringify({
      type,
      ...payload,
      timestamp: new Date().toISOString(),
    })

    const options = {
      TTL: 60 * 60 * 24, // 24 heures
      urgency: getDefaultUrgency(type),
    }

    for (const subscription of subscriptions) {
      try {
        logger.debug(
          { subscriptionId: subscription.id, endpoint: subscription.endpoint.substring(0, 50) },
          'Sending push to subscription'
        )

        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload,
          options
        )

        await this.subscriptionRepository.updateLastUsed(subscription.id)
        sent++
        logger.debug({ subscriptionId: subscription.id }, 'Push sent successfully')
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        const errorMessage = (error as Error)?.message || 'Unknown error'

        logger.error(
          { subscriptionId: subscription.id, statusCode, errorMessage },
          'Push notification failed'
        )

        // 404 ou 410 = subscription expirée, on la supprime
        if (statusCode === 404 || statusCode === 410) {
          await this.subscriptionRepository.delete(subscription.id)
          logger.info({ subscriptionId: subscription.id }, 'Removed expired push subscription')
        }
        failed++
      }
    }

    logger.info({ userId, type, sent, failed }, 'Push notifications sent')
    return { sent, failed }
  }

  /**
   * Envoyer une notification push à plusieurs utilisateurs
   */
  async sendToUsers(
    userIds: string[],
    type: NotificationType,
    payload: PushPayload
  ): Promise<{ totalSent: number; totalFailed: number }> {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, type, payload))
    )

    let totalSent = 0
    let totalFailed = 0

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalSent += result.value.sent
        totalFailed += result.value.failed
      } else {
        totalFailed++
      }
    }

    return { totalSent, totalFailed }
  }

  /**
   * Envoyer une notification d'invitation à une campagne
   */
  async sendCampaignInvitation(
    userId: string,
    campaignName: string,
    campaignId: string
  ): Promise<void> {
    await this.sendToUser(userId, 'campaign:invitation', {
      title: 'Nouvelle invitation',
      body: `Vous avez été invité à rejoindre la campagne "${campaignName}"`,
      data: {
        url: '/streamer/invitations',
        campaignId,
      },
      actions: [
        { action: 'view', title: 'Voir' },
        { action: 'dismiss', title: 'Plus tard' },
      ],
    })
  }

  /**
   * Envoyer une notification de début de sondage
   */
  async sendPollStarted(
    userIds: string[],
    pollTitle: string,
    pollInstanceId: string,
    campaignId: string
  ): Promise<void> {
    await this.sendToUsers(userIds, 'poll:started', {
      title: 'Sondage en cours',
      body: `Le sondage "${pollTitle}" vient de commencer !`,
      data: {
        url: `/mj/campaigns/${campaignId}`,
        pollInstanceId,
        campaignId,
      },
      actions: [{ action: 'view', title: 'Voir le sondage' }],
    })
  }

  /**
   * Envoyer une notification de fin de sondage
   */
  async sendPollEnded(
    userIds: string[],
    pollTitle: string,
    pollInstanceId: string,
    campaignId: string
  ): Promise<void> {
    await this.sendToUsers(userIds, 'poll:ended', {
      title: 'Sondage terminé',
      body: `Le sondage "${pollTitle}" est terminé. Voir les résultats.`,
      data: {
        url: `/mj/campaigns/${campaignId}`,
        pollInstanceId,
        campaignId,
      },
      actions: [{ action: 'view', title: 'Voir les résultats' }],
    })
  }

  /**
   * Envoyer une alerte critique
   */
  async sendCriticalAlert(userId: string, title: string, message: string): Promise<void> {
    await this.sendToUser(userId, 'critical:alert', {
      title,
      body: message,
      data: {
        url: '/settings',
      },
    })
  }

  /**
   * Envoyer une notification d'action requise pour participer aux sondages
   * Utilisé quand le GM tente de lancer une session mais qu'un streamer a des problèmes
   * (token expiré, autorisation manquante, etc.)
   */
  async sendSessionActionRequired(
    userId: string,
    campaignName: string,
    issues: string[]
  ): Promise<void> {
    /* eslint-disable camelcase */
    const issueMessages: Record<string, string> = {
      token_expired: 'Reconnexion Twitch requise',
      token_invalid: 'Reconnexion Twitch requise',
      token_missing: 'Reconnexion Twitch requise',
      token_refresh_failed: 'Reconnexion Twitch requise',
      authorization_missing: 'Autorisation requise',
      authorization_expired: 'Autorisation expirée',
      streamer_inactive: 'Compte désactivé',
    }
    /* eslint-enable camelcase */

    const readableIssues = issues.map((i) => issueMessages[i] || i)
    const uniqueIssues = [...new Set(readableIssues)]
    const body = uniqueIssues.join(' • ')

    await this.sendToUser(userId, 'session:action_required', {
      title: `${campaignName} - Action requise`,
      body: `Pour participer aux sondages : ${body}`,
      data: {
        url: '/streamer/campaigns',
        issues,
        campaignName,
      },
      actions: [
        { action: 'fix', title: 'Corriger maintenant' },
        { action: 'dismiss', title: 'Plus tard' },
      ],
    })
  }
}

export default PushNotificationService
