import { streamer as Streamer } from '#models/streamer'

/**
 * Repository pour gérer les streamers
 */
export class StreamerRepository {
  /**
   * Trouver un streamer par son ID
   */
  async findById(id: string): Promise<Streamer | null> {
    return await Streamer.find(id)
  }

  /**
   * Trouver un streamer par son user ID
   */
  async findByUserId(userId: string): Promise<Streamer | null> {
    return await Streamer.findBy('userId', userId)
  }

  /**
   * Trouver un streamer par son Twitch user ID
   */
  async findByTwitchUserId(twitchUserId: string): Promise<Streamer | null> {
    return await Streamer.findBy('twitchUserId', twitchUserId)
  }

  /**
   * Trouver un streamer par son username Twitch
   */
  async findByTwitchUsername(twitchUsername: string): Promise<Streamer | null> {
    return await Streamer.findBy('twitchLogin', twitchUsername)
  }

  /**
   * Trouver plusieurs streamers par leurs IDs
   */
  async findByIds(ids: string[]): Promise<Streamer[]> {
    return await Streamer.query().whereIn('id', ids)
  }

  /**
   * Créer un nouveau streamer
   */
  async create(data: {
    userId: string
    twitchUserId: string
    twitchUsername: string
    accessToken: string
    refreshToken: string
    scopes: string[]
    profileImageUrl?: string
    broadcasterType?: string
  }): Promise<Streamer> {
    const streamer = new Streamer()
    streamer.userId = data.userId
    streamer.twitchUserId = data.twitchUserId
    streamer.twitchLogin = data.twitchUsername
    streamer.scopes = JSON.stringify(data.scopes) as any
    streamer.profileImageUrl = data.profileImageUrl || null
    streamer.broadcasterType = data.broadcasterType || ''
    streamer.isActive = true

    // Utiliser la méthode du modèle pour chiffrer les tokens
    await streamer.updateTokens(data.accessToken, data.refreshToken)

    return streamer
  }

  /**
   * Mettre à jour un streamer
   */
  async update(streamer: Streamer): Promise<Streamer> {
    await streamer.save()
    return streamer
  }

  /**
   * Supprimer un streamer
   */
  async delete(streamer: Streamer): Promise<void> {
    await streamer.delete()
  }

  /**
   * Trouver tous les streamers actifs
   */
  async findActive(): Promise<Streamer[]> {
    return await Streamer.query().where('isActive', true)
  }

  /**
   * Désactiver un streamer
   */
  async deactivate(streamerId: string): Promise<void> {
    const streamer = await this.findById(streamerId)
    if (streamer) {
      streamer.isActive = false
      await streamer.save()
    }
  }

  /**
   * Activer un streamer
   */
  async activate(streamerId: string): Promise<void> {
    const streamer = await this.findById(streamerId)
    if (streamer) {
      streamer.isActive = true
      await streamer.save()
    }
  }

  /**
   * Vérifier si un streamer est compatible pour les polls (Affiliate ou Partner)
   */
  async isCompatibleForPolls(streamerId: string): Promise<boolean> {
    const streamer = await this.findById(streamerId)
    if (!streamer) return false

    const compatibleTypes = ['affiliate', 'partner']
    return compatibleTypes.includes(streamer.broadcasterType.toLowerCase())
  }
}

export default StreamerRepository
export { StreamerRepository as streamerRepository }
