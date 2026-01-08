import { user as User } from '#models/user'

/**
 * Repository pour gérer les utilisateurs
 * Encapsule toutes les requêtes liées aux utilisateurs
 */
export class UserRepository {
  /**
   * Trouver un utilisateur par son ID
   */
  async findById(id: string): Promise<User | null> {
    return await User.find(id)
  }

  /**
   * Trouver un utilisateur par son email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await User.findBy('email', email)
  }

  /**
   * Trouver un utilisateur avec sa relation streamer
   */
  async findByIdWithStreamer(id: string): Promise<User | null> {
    return await User.query().where('id', id).preload('streamer').first()
  }

  /**
   * Créer un nouvel utilisateur
   */
  async create(data: { displayName: string; email?: string }): Promise<User> {
    return await User.create(data)
  }

  /**
   * Mettre à jour un utilisateur
   */
  async update(user: User): Promise<User> {
    await user.save()
    return user
  }

  /**
   * Supprimer un utilisateur
   */
  async delete(user: User): Promise<void> {
    await user.delete()
  }

  /**
   * Trouver ou créer un utilisateur par email
   */
  async findOrCreate(data: { displayName: string; email: string }): Promise<User> {
    let user = await this.findByEmail(data.email)

    if (!user) {
      user = await this.create(data)
    }

    return user
  }
}

export default UserRepository
export { UserRepository as userRepository }
