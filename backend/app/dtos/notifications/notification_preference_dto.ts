import type NotificationPreference from '#models/notification_preference'

export class NotificationPreferenceDto {
  pushEnabled!: boolean
  campaignInvitations!: boolean
  criticalAlerts!: boolean
  pollStarted!: boolean
  pollEnded!: boolean
  campaignMemberJoined!: boolean
  sessionReminder!: boolean
  tokenRefreshFailed!: boolean
  sessionActionRequired!: boolean

  static fromModel(preference: NotificationPreference): NotificationPreferenceDto {
    return {
      pushEnabled: preference.pushEnabled,
      campaignInvitations: preference.campaignInvitations,
      criticalAlerts: preference.criticalAlerts,
      pollStarted: preference.pollStarted,
      pollEnded: preference.pollEnded,
      campaignMemberJoined: preference.campaignMemberJoined,
      sessionReminder: preference.sessionReminder,
      tokenRefreshFailed: preference.tokenRefreshFailed,
      sessionActionRequired: preference.sessionActionRequired,
    }
  }

  /**
   * Retourne les préférences par défaut (utilisées quand l'utilisateur n'a pas encore de préférences)
   */
  static defaults(): NotificationPreferenceDto {
    return {
      pushEnabled: true,
      campaignInvitations: true,
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: false,
      sessionReminder: false,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    }
  }
}

export default NotificationPreferenceDto
