import type { HttpContext } from '@adonisjs/core/http'
import PushNotificationService from '#services/notifications/push_notification_service'
import PushSubscriptionRepository from '#repositories/push_subscription_repository'
import NotificationPreferenceRepository from '#repositories/notification_preference_repository'
import {
  subscribePushSchema,
  unsubscribePushSchema,
} from '#validators/notifications/subscribe_push_validator'
import { updatePreferencesSchema } from '#validators/notifications/update_preferences_validator'
import { PushSubscriptionDto } from '#dtos/notifications/push_subscription_dto'
import { NotificationPreferenceDto } from '#dtos/notifications/notification_preference_dto'

/**
 * Contrôleur pour la gestion des notifications push
 */
export default class NotificationsController {
  private pushService: PushNotificationService
  private subscriptionRepository: PushSubscriptionRepository
  private preferenceRepository: NotificationPreferenceRepository

  constructor() {
    this.pushService = new PushNotificationService()
    this.subscriptionRepository = new PushSubscriptionRepository()
    this.preferenceRepository = new NotificationPreferenceRepository()
  }

  /**
   * Récupère la clé publique VAPID pour l'inscription côté client
   * GET /notifications/vapid-public-key
   */
  async vapidPublicKey({ response }: HttpContext) {
    return response.ok({
      publicKey: this.pushService.getVapidPublicKey(),
    })
  }

  /**
   * Inscrit un appareil aux notifications push
   * POST /notifications/subscribe
   */
  async subscribe({ auth, request, response, logger }: HttpContext) {
    logger.info('[Push Subscribe] Request received')
    const result = subscribePushSchema.safeParse(request.body())

    if (!result.success) {
      logger.error(
        { errors: result.error.flatten().fieldErrors },
        '[Push Subscribe] Validation failed'
      )
      return response.badRequest({
        error: 'Données invalides',
        details: result.error.flatten().fieldErrors,
      })
    }

    const { endpoint, keys, deviceName } = result.data
    const userId = auth.user!.id
    logger.info(
      { userId, endpoint: endpoint.substring(0, 50) },
      '[Push Subscribe] Creating subscription'
    )

    const subscription = await this.subscriptionRepository.upsert({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: request.header('user-agent') || null,
      deviceName: deviceName || null,
    })

    logger.info(
      { subscriptionId: subscription.id },
      '[Push Subscribe] Subscription created/updated'
    )

    // S'assurer que les préférences existent
    await this.preferenceRepository.findOrCreate(userId)

    return response.created({
      data: PushSubscriptionDto.fromModel(subscription),
    })
  }

  /**
   * Désinscrit un appareil des notifications push
   * DELETE /notifications/subscribe
   */
  async unsubscribe({ request, response }: HttpContext) {
    const result = unsubscribePushSchema.safeParse(request.body())

    if (!result.success) {
      return response.badRequest({
        error: 'Données invalides',
        details: result.error.flatten().fieldErrors,
      })
    }

    await this.subscriptionRepository.deleteByEndpoint(result.data.endpoint)

    return response.ok({
      message: 'Désinscription réussie',
    })
  }

  /**
   * Liste les appareils inscrits de l'utilisateur
   * GET /notifications/subscriptions
   */
  async listSubscriptions({ auth, response, logger }: HttpContext) {
    const userId = auth.user!.id
    logger.info({ userId }, '[Push List] Fetching subscriptions')
    const subscriptions = await this.subscriptionRepository.findByUserId(userId)
    logger.info({ userId, count: subscriptions.length }, '[Push List] Subscriptions found')

    return response.ok({
      data: PushSubscriptionDto.fromModelArray(subscriptions),
    })
  }

  /**
   * Supprime une inscription spécifique
   * DELETE /notifications/subscriptions/:id
   */
  async deleteSubscription({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id
    const subscription = await this.subscriptionRepository.findById(params.id)

    if (!subscription) {
      return response.notFound({
        error: 'Inscription non trouvée',
      })
    }

    // Vérifier que l'inscription appartient à l'utilisateur
    if (subscription.userId !== userId) {
      return response.forbidden({
        error: 'Accès non autorisé',
      })
    }

    await this.subscriptionRepository.delete(params.id)

    return response.ok({
      message: 'Inscription supprimée',
    })
  }

  /**
   * Récupère les préférences de notification de l'utilisateur
   * GET /notifications/preferences
   */
  async getPreferences({ auth, response }: HttpContext) {
    const userId = auth.user!.id
    const preferences = await this.preferenceRepository.findOrCreate(userId)

    return response.ok({
      data: NotificationPreferenceDto.fromModel(preferences),
    })
  }

  /**
   * Met à jour les préférences de notification
   * PUT /notifications/preferences
   */
  async updatePreferences({ auth, request, response }: HttpContext) {
    const result = updatePreferencesSchema.safeParse(request.body())

    if (!result.success) {
      return response.badRequest({
        error: 'Données invalides',
        details: result.error.flatten().fieldErrors,
      })
    }

    const userId = auth.user!.id
    const preferences = await this.preferenceRepository.update(userId, result.data)

    return response.ok({
      data: NotificationPreferenceDto.fromModel(preferences),
    })
  }

  /**
   * Envoie une notification de test à l'utilisateur connecté
   * POST /notifications/test
   * Disponible uniquement en mode développement
   */
  async sendTestNotification({ auth, response, logger }: HttpContext) {
    // Route disponible uniquement en développement
    if (process.env.NODE_ENV === 'production') {
      return response.notFound({ error: 'Route non disponible' })
    }

    const userId = auth.user!.id
    logger.info({ userId }, '[Test Push] Sending test notification')

    // Vérifier les subscriptions de l'utilisateur
    const subscriptions = await this.subscriptionRepository.findByUserId(userId)
    logger.info({ userId, count: subscriptions.length }, '[Test Push] User subscriptions found')

    if (subscriptions.length > 0) {
      logger.info(
        { endpoints: subscriptions.map((s) => s.endpoint.substring(0, 50) + '...') },
        '[Test Push] Subscription endpoints'
      )
    }

    const result = await this.pushService.sendToUser(
      userId,
      'critical:alert',
      {
        title: 'Test de notification',
        body: 'Si vous voyez cette notification, les notifications push fonctionnent correctement !',
        data: {
          url: '/settings',
          test: true,
        },
      },
      true // bypassPreferences - on envoie même si les notifs sont désactivées pour les tests
    )

    if (result.sent === 0 && result.failed === 0) {
      return response.ok({
        success: false,
        message: 'Aucun appareil enregistré pour recevoir les notifications',
        sent: 0,
        failed: 0,
      })
    }

    return response.ok({
      success: result.sent > 0,
      message:
        result.sent > 0
          ? `Notification envoyée à ${result.sent} appareil(s)`
          : "Échec de l'envoi de la notification",
      sent: result.sent,
      failed: result.failed,
    })
  }
}
