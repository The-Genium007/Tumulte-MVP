import NotificationPreference from '#models/notification_preference'

/**
 * Repository pour gérer les préférences de notification
 */
export class NotificationPreferenceRepository {
  /**
   * Trouver les préférences d'un utilisateur
   */
  async findByUserId(userId: string): Promise<NotificationPreference | null> {
    return await NotificationPreference.findBy('userId', userId)
  }

  /**
   * Trouver ou créer les préférences d'un utilisateur
   */
  async findOrCreate(userId: string): Promise<NotificationPreference> {
    let preferences = await this.findByUserId(userId)

    if (!preferences) {
      preferences = await NotificationPreference.create({
        userId,
        pushEnabled: true,
        campaignInvitations: true,
        criticalAlerts: true,
        pollStarted: true,
        pollEnded: true,
        campaignMemberJoined: false,
        sessionReminder: false,
        tokenRefreshFailed: true,
        sessionActionRequired: true,
      })
    }

    return preferences
  }

  /**
   * Mettre à jour les préférences
   */
  async update(
    userId: string,
    data: Partial<{
      pushEnabled: boolean
      campaignInvitations: boolean
      criticalAlerts: boolean
      pollStarted: boolean
      pollEnded: boolean
      campaignMemberJoined: boolean
      sessionReminder: boolean
      tokenRefreshFailed: boolean
      sessionActionRequired: boolean
    }>
  ): Promise<NotificationPreference> {
    const preferences = await this.findOrCreate(userId)
    preferences.merge(data)
    await preferences.save()
    return preferences
  }

  /**
   * Vérifier si les notifications push sont activées pour un utilisateur
   */
  async isPushEnabled(userId: string): Promise<boolean> {
    const preferences = await this.findByUserId(userId)
    return preferences?.pushEnabled ?? true
  }

  /**
   * Vérifier si un type de notification est activé
   */
  async isTypeEnabled(
    userId: string,
    type:
      | 'campaignInvitations'
      | 'criticalAlerts'
      | 'pollStarted'
      | 'pollEnded'
      | 'campaignMemberJoined'
      | 'sessionReminder'
      | 'tokenRefreshFailed'
      | 'sessionActionRequired'
  ): Promise<boolean> {
    const preferences = await this.findByUserId(userId)
    if (!preferences?.pushEnabled) return false
    return preferences[type] ?? true
  }
}

export default NotificationPreferenceRepository
