import Campaign from '#models/campaign'

/**
 * Repository pour gérer les campagnes
 */
export class CampaignRepository {
  /**
   * Trouver une campagne par son ID
   */
  async findById(id: string): Promise<Campaign | null> {
    return await Campaign.find(id)
  }

  /**
   * Trouver une campagne avec ses membres
   */
  async findByIdWithMembers(id: string): Promise<Campaign | null> {
    return await Campaign.query()
      .where('id', id)
      .preload('memberships', (query) => {
        query.preload('streamer')
      })
      .first()
  }

  /**
   * Trouver toutes les campagnes d'un propriétaire
   */
  async findByOwnerId(ownerId: string): Promise<Campaign[]> {
    return await Campaign.query().where('ownerId', ownerId).orderBy('createdAt', 'desc')
  }

  /**
   * Trouver toutes les campagnes d'un propriétaire avec leurs membres
   */
  async findByOwnerIdWithMembers(ownerId: string): Promise<Campaign[]> {
    return await Campaign.query()
      .where('ownerId', ownerId)
      .preload('memberships', (query) => {
        query.preload('streamer')
      })
      .orderBy('createdAt', 'desc')
  }

  /**
   * Créer une nouvelle campagne
   */
  async create(data: {
    ownerId: string
    name: string
    description?: string | null
  }): Promise<Campaign> {
    return await Campaign.create(data)
  }

  /**
   * Mettre à jour une campagne
   */
  async update(campaign: Campaign): Promise<Campaign> {
    await campaign.save()
    return campaign
  }

  /**
   * Supprimer une campagne
   */
  async delete(campaign: Campaign): Promise<void> {
    await campaign.delete()
  }

  /**
   * Vérifier si un utilisateur est propriétaire d'une campagne
   */
  async isOwner(campaignId: string, userId: string): Promise<boolean> {
    const campaign = await this.findById(campaignId)
    return campaign?.ownerId === userId
  }

  /**
   * Compter le nombre de campagnes d'un utilisateur
   */
  async countByOwnerId(ownerId: string): Promise<number> {
    const result = await Campaign.query().where('ownerId', ownerId).count('* as total')
    return Number(result[0]?.$extras?.total || 0)
  }
}

export default CampaignRepository
