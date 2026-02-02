import GamificationContribution from '#models/gamification_contribution'

/**
 * GamificationContributionRepository - Accès aux contributions de gamification
 */
export class GamificationContributionRepository {
  /**
   * Trouve une contribution par son ID
   */
  async findById(id: string): Promise<GamificationContribution | null> {
    return GamificationContribution.find(id)
  }

  /**
   * Trouve une contribution par son Twitch Redemption ID (déduplication)
   */
  async findByRedemptionId(redemptionId: string): Promise<GamificationContribution | null> {
    return GamificationContribution.query().where('twitchRedemptionId', redemptionId).first()
  }

  /**
   * Récupère les contributions d'une instance
   */
  async findByInstance(instanceId: string): Promise<GamificationContribution[]> {
    return GamificationContribution.query()
      .where('instanceId', instanceId)
      .orderBy('createdAt', 'asc')
  }

  /**
   * Récupère les contributions d'un viewer pour une instance
   */
  async findByInstanceAndUser(
    instanceId: string,
    twitchUserId: string
  ): Promise<GamificationContribution[]> {
    return GamificationContribution.query()
      .where('instanceId', instanceId)
      .where('twitchUserId', twitchUserId)
      .orderBy('createdAt', 'asc')
  }

  /**
   * Compte les contributions d'un viewer pour une instance
   */
  async countByInstanceAndUser(instanceId: string, twitchUserId: string): Promise<number> {
    const result = await GamificationContribution.query()
      .where('instanceId', instanceId)
      .where('twitchUserId', twitchUserId)
      .count('* as total')

    return Number(result[0]?.$extras?.total || 0)
  }

  /**
   * Crée une nouvelle contribution
   */
  async create(data: Partial<GamificationContribution>): Promise<GamificationContribution> {
    return GamificationContribution.create(data)
  }

  /**
   * Récupère les top contributeurs d'une instance
   */
  async getTopContributors(
    instanceId: string,
    limit: number = 10
  ): Promise<{ twitchUserId: string; twitchUsername: string; totalAmount: number }[]> {
    const results = await GamificationContribution.query()
      .where('instanceId', instanceId)
      .select('twitchUserId', 'twitchUsername')
      .sum('amount as totalAmount')
      .groupBy('twitchUserId', 'twitchUsername')
      .orderBy('totalAmount', 'desc')
      .limit(limit)

    return results.map((row) => ({
      twitchUserId: row.twitchUserId,
      twitchUsername: row.twitchUsername,
      totalAmount: Number(row.$extras.totalAmount),
    }))
  }

  /**
   * Récupère les contributions par streamer pour une instance groupée
   */
  async getContributionsByStreamer(
    instanceId: string
  ): Promise<{ streamerId: string; count: number; totalAmount: number }[]> {
    const results = await GamificationContribution.query()
      .where('instanceId', instanceId)
      .select('streamerId')
      .count('* as count')
      .sum('amount as totalAmount')
      .groupBy('streamerId')

    return results.map((row) => ({
      streamerId: row.streamerId,
      count: Number(row.$extras.count),
      totalAmount: Number(row.$extras.totalAmount),
    }))
  }

  /**
   * Calcul le total des contributions pour une instance
   */
  async getTotalForInstance(instanceId: string): Promise<{ count: number; totalAmount: number }> {
    const result = await GamificationContribution.query()
      .where('instanceId', instanceId)
      .count('* as count')
      .sum('amount as totalAmount')

    return {
      count: Number(result[0]?.$extras?.count || 0),
      totalAmount: Number(result[0]?.$extras?.totalAmount || 0),
    }
  }
}

export default GamificationContributionRepository
