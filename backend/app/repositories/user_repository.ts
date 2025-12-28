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
  async create(data: {
    displayName: string
    email?: string
    role: 'MJ' | 'STREAMER'
  }): Promise<User> {
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
  async findOrCreate(data: {
    displayName: string
    email: string
    role: 'MJ' | 'STREAMER'
  }): Promise<User> {
    let user = await this.findByEmail(data.email)

    if (!user) {
      user = await this.create(data)
    }

    return user
  }

  /**
   * Vérifier si un utilisateur a le rôle MJ
   */
  async isMJ(userId: string): Promise<boolean> {
    const user = await this.findById(userId)
    return user?.role === 'MJ'
  }

  /**
   * Vérifier si un utilisateur a le rôle STREAMER
   */
  async isStreamer(userId: string): Promise<boolean> {
    const user = await this.findById(userId)
    return user?.role === 'STREAMER'
  }

  /**
   * Changer le rôle d'un utilisateur
   */
  async switchRole(userId: string, newRole: 'MJ' | 'STREAMER'): Promise<User | null> {
    const user = await this.findById(userId)
    if (!user) return null

    user.role = newRole
    await user.save()

    return user
  }
}

export default UserRepository
export { UserRepository as userRepository }
