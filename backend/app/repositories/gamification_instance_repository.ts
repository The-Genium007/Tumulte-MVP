import { DateTime } from 'luxon'
import GamificationInstance, {
  type GamificationInstanceStatus,
} from '#models/gamification_instance'

/**
 * GamificationInstanceRepository - Accès aux instances de gamification
 */
export class GamificationInstanceRepository {
  /**
   * Trouve une instance par son ID
   */
  async findById(id: string): Promise<GamificationInstance | null> {
    return GamificationInstance.find(id)
  }

  /**
   * Trouve une instance par son ID avec les relations
   */
  async findByIdWithRelations(id: string): Promise<GamificationInstance | null> {
    return GamificationInstance.query()
      .where('id', id)
      .preload('event')
      .preload('contributions')
      .first()
  }

  /**
   * Récupère les instances actives d'une campagne
   */
  async findActiveByCampaign(campaignId: string): Promise<GamificationInstance[]> {
    return GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'active')
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .preload('event')
      .orderBy('startsAt', 'desc')
  }

  /**
   * Récupère les instances "récentes" pour affichage côté MJ
   *
   * Logique de rétention:
   * - active/armed: toujours affichées (tant qu'elles ne sont pas terminées)
   * - completed: affichées pendant 5 minutes après completedAt
   * - expired/cancelled: affichées pendant 2 minutes après le changement de statut
   *
   * Note: 'armed' nécessite la migration 1770300000000 pour fonctionner
   */
  async findRecentForDisplay(campaignId: string): Promise<GamificationInstance[]> {
    const now = DateTime.now()
    const completedRetentionMinutes = 5
    const otherRetentionMinutes = 2

    // Calcul des seuils
    const completedThreshold = now.minus({ minutes: completedRetentionMinutes }).toSQL()!
    const otherThreshold = now.minus({ minutes: otherRetentionMinutes }).toSQL()!

    // Liste des statuts "en cours" - armed sera ajouté après migration
    // On utilise une raw query pour éviter les erreurs si 'armed' n'existe pas encore dans l'enum
    const activeStatuses = ['active']

    // Vérifier si armed existe en essayant une requête simple
    try {
      const testArmed = await GamificationInstance.query()
        .where('campaignId', campaignId)
        .where('status', 'armed')
        .limit(1)
      // Si pas d'erreur, armed existe dans l'enum
      if (testArmed !== undefined) {
        activeStatuses.push('armed')
      }
    } catch {
      // armed n'existe pas encore dans l'enum, on l'ignore
    }

    return GamificationInstance.query()
      .where('campaignId', campaignId)
      .where((query) => {
        // Instances actives (et armées si disponible) : toujours affichées
        query.whereIn('status', activeStatuses as GamificationInstanceStatus[])

        // Instances completed récentes (basé sur completedAt)
        query.orWhere((subQuery) => {
          subQuery
            .where('status', 'completed')
            .whereNotNull('completedAt')
            .where('completedAt', '>', completedThreshold)
        })

        // Instances expired récentes (basé sur expiresAt qui est le moment où elles ont expiré)
        query.orWhere((subQuery) => {
          subQuery.where('status', 'expired').where('expiresAt', '>', otherThreshold)
        })

        // Instances cancelled récentes (basé sur updatedAt comme proxy)
        query.orWhere((subQuery) => {
          subQuery.where('status', 'cancelled').where('updatedAt', '>', otherThreshold)
        })
      })
      .preload('event')
      .orderBy('createdAt', 'desc')
      .limit(20) // Limite raisonnable pour l'affichage
  }

  /**
   * Récupère l'instance active pour un streamer
   */
  async findActiveForStreamer(
    campaignId: string,
    streamerId: string
  ): Promise<GamificationInstance | null> {
    return GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'active')
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .where((query) => {
        query.where('streamerId', streamerId).orWhereNull('streamerId')
      })
      .preload('event')
      .orderBy('startsAt', 'desc')
      .first()
  }

  /**
   * Récupère les instances expirées à traiter
   */
  async findExpiredInstances(): Promise<GamificationInstance[]> {
    return GamificationInstance.query()
      .where('status', 'active')
      .where('expiresAt', '<=', DateTime.now().toSQL()!)
  }

  /**
   * Récupère les instances en cooldown pour une campagne/événement
   */
  async findOnCooldown(
    campaignId: string,
    eventId: string,
    streamerId?: string
  ): Promise<GamificationInstance | null> {
    const query = GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('eventId', eventId)
      .where('status', 'completed')
      .whereNotNull('cooldownEndsAt')
      .where('cooldownEndsAt', '>', DateTime.now().toSQL()!)
      .orderBy('cooldownEndsAt', 'desc')

    if (streamerId) {
      query.where('streamerId', streamerId)
    }

    return query.first()
  }

  /**
   * Récupère l'historique des instances d'une campagne
   */
  async findByCampaign(
    campaignId: string,
    options?: {
      status?: GamificationInstanceStatus
      limit?: number
      offset?: number
    }
  ): Promise<GamificationInstance[]> {
    const query = GamificationInstance.query()
      .where('campaignId', campaignId)
      .preload('event')
      .orderBy('createdAt', 'desc')

    if (options?.status) {
      query.where('status', options.status)
    }

    if (options?.limit) {
      query.limit(options.limit)
    }

    if (options?.offset) {
      query.offset(options.offset)
    }

    return query
  }

  /**
   * Crée une nouvelle instance
   */
  async create(data: Partial<GamificationInstance>): Promise<GamificationInstance> {
    return GamificationInstance.create(data)
  }

  /**
   * Met à jour une instance
   */
  async update(instance: GamificationInstance): Promise<GamificationInstance> {
    await instance.save()
    return instance
  }

  /**
   * Met à jour le statut d'une instance
   */
  async updateStatus(instanceId: string, status: GamificationInstanceStatus): Promise<void> {
    await GamificationInstance.query().where('id', instanceId).update({ status })
  }

  /**
   * Met à jour la progression d'une instance
   */
  async updateProgress(instanceId: string, progress: number): Promise<void> {
    await GamificationInstance.query().where('id', instanceId).update({
      currentProgress: progress,
    })
  }

  /**
   * Reset les cooldowns d'une campagne
   */
  async resetCooldowns(campaignId: string): Promise<number> {
    const result = await GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'completed')
      .whereNotNull('cooldownEndsAt')
      .update({ cooldownEndsAt: null })

    return result[0] as number
  }

  /**
   * Compte les instances par statut pour une campagne
   */
  async countByStatus(campaignId: string): Promise<Record<GamificationInstanceStatus, number>> {
    const results = await GamificationInstance.query()
      .where('campaignId', campaignId)
      .select('status')
      .count('* as count')
      .groupBy('status')

    const counts: Record<GamificationInstanceStatus, number> = {
      active: 0,
      armed: 0,
      completed: 0,
      expired: 0,
      cancelled: 0,
    }

    for (const row of results) {
      const status = row.status as GamificationInstanceStatus
      counts[status] = Number(row.$extras.count)
    }

    return counts
  }
}

export default GamificationInstanceRepository
