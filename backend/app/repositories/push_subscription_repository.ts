import { DateTime } from 'luxon'
import PushSubscription from '#models/push_subscription'

/**
 * Repository pour gérer les subscriptions push
 */
export class PushSubscriptionRepository {
  /**
   * Trouver toutes les subscriptions d'un utilisateur
   */
  async findByUserId(userId: string): Promise<PushSubscription[]> {
    return await PushSubscription.query().where('userId', userId).orderBy('created_at', 'desc')
  }

  /**
   * Trouver une subscription par son endpoint
   */
  async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    return await PushSubscription.findBy('endpoint', endpoint)
  }

  /**
   * Trouver une subscription par son ID
   */
  async findById(id: string): Promise<PushSubscription | null> {
    return await PushSubscription.find(id)
  }

  /**
   * Créer une nouvelle subscription
   */
  async create(data: {
    userId: string
    endpoint: string
    p256dh: string
    auth: string
    userAgent?: string | null
    deviceName?: string | null
  }): Promise<PushSubscription> {
    return await PushSubscription.create(data)
  }

  /**
   * Créer ou mettre à jour une subscription (upsert par endpoint)
   */
  async upsert(data: {
    userId: string
    endpoint: string
    p256dh: string
    auth: string
    userAgent?: string | null
    deviceName?: string | null
  }): Promise<PushSubscription> {
    const existing = await this.findByEndpoint(data.endpoint)

    if (existing) {
      existing.merge({
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
        deviceName: data.deviceName,
      })
      await existing.save()
      return existing
    }

    return await this.create(data)
  }

  /**
   * Supprimer une subscription par son ID
   */
  async delete(id: string): Promise<void> {
    const subscription = await PushSubscription.find(id)
    if (subscription) {
      await subscription.delete()
    }
  }

  /**
   * Supprimer une subscription par son endpoint
   */
  async deleteByEndpoint(endpoint: string): Promise<void> {
    await PushSubscription.query().where('endpoint', endpoint).delete()
  }

  /**
   * Mettre à jour la date de dernière utilisation
   */
  async updateLastUsed(id: string): Promise<void> {
    await PushSubscription.query().where('id', id).update({ lastUsedAt: DateTime.now() })
  }

  /**
   * Compter le nombre de subscriptions d'un utilisateur
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await PushSubscription.query().where('userId', userId).count('* as total')
    return Number(result[0].$extras.total)
  }
}

export default PushSubscriptionRepository
