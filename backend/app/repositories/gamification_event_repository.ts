import GamificationEvent from '#models/gamification_event'

/**
 * GamificationEventRepository - Accès aux données des événements de gamification
 */
export class GamificationEventRepository {
  /**
   * Trouve un événement par son ID
   */
  async findById(id: string): Promise<GamificationEvent | null> {
    return GamificationEvent.find(id)
  }

  /**
   * Trouve un événement par son slug
   */
  async findBySlug(slug: string): Promise<GamificationEvent | null> {
    return GamificationEvent.query().where('slug', slug).first()
  }

  /**
   * Récupère tous les événements
   */
  async findAll(): Promise<GamificationEvent[]> {
    return GamificationEvent.query().orderBy('name', 'asc')
  }

  /**
   * Récupère les événements système uniquement
   */
  async findSystemEvents(): Promise<GamificationEvent[]> {
    return GamificationEvent.query().where('isSystemEvent', true).orderBy('name', 'asc')
  }

  /**
   * Récupère les événements créés par un utilisateur
   */
  async findByCreator(userId: string): Promise<GamificationEvent[]> {
    return GamificationEvent.query().where('createdById', userId).orderBy('name', 'asc')
  }

  /**
   * Récupère les événements par type de trigger
   */
  async findByTriggerType(
    triggerType: 'dice_critical' | 'manual' | 'custom'
  ): Promise<GamificationEvent[]> {
    return GamificationEvent.query().where('triggerType', triggerType).orderBy('name', 'asc')
  }

  /**
   * Crée un nouvel événement
   */
  async create(data: Partial<GamificationEvent>): Promise<GamificationEvent> {
    return GamificationEvent.create(data)
  }

  /**
   * Met à jour un événement
   */
  async update(event: GamificationEvent): Promise<GamificationEvent> {
    await event.save()
    return event
  }

  /**
   * Supprime un événement
   */
  async delete(event: GamificationEvent): Promise<void> {
    await event.delete()
  }

  /**
   * Vérifie si un slug existe déjà
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const query = GamificationEvent.query().where('slug', slug)
    if (excludeId) {
      query.whereNot('id', excludeId)
    }
    const event = await query.first()
    return !!event
  }
}

export default GamificationEventRepository
