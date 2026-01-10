/**
 * Types de notifications push supportés
 */
export type NotificationType =
  | 'campaign:invitation'
  | 'critical:alert'
  | 'poll:started'
  | 'poll:ended'
  | 'campaign:member_joined'
  | 'session:reminder'
  | 'session:start_blocked'
  | 'token:refresh_failed'
  | 'session:action_required'

/**
 * Mapping entre les types de notification et les champs de préférences
 */
export const notificationTypeToPreference: Record<
  NotificationType,
  | 'campaignInvitations'
  | 'criticalAlerts'
  | 'pollStarted'
  | 'pollEnded'
  | 'campaignMemberJoined'
  | 'sessionReminder'
  | 'tokenRefreshFailed'
  | 'sessionActionRequired'
> = {
  'campaign:invitation': 'campaignInvitations',
  'critical:alert': 'criticalAlerts',
  'poll:started': 'pollStarted',
  'poll:ended': 'pollEnded',
  'campaign:member_joined': 'campaignMemberJoined',
  'session:reminder': 'sessionReminder',
  'session:start_blocked': 'sessionReminder', // Réutilise la préférence sessionReminder
  'token:refresh_failed': 'tokenRefreshFailed',
  'session:action_required': 'sessionActionRequired',
}

/**
 * Payload d'une notification push
 */
export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: {
    url?: string
    campaignId?: string
    pollInstanceId?: string
    sessionId?: string
    [key: string]: unknown
  }
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

/**
 * Urgence de la notification (affecte la priorité de livraison)
 */
export type NotificationUrgency = 'very-low' | 'low' | 'normal' | 'high'

/**
 * Obtenir l'urgence par défaut pour un type de notification
 */
export function getDefaultUrgency(type: NotificationType): NotificationUrgency {
  switch (type) {
    case 'critical:alert':
    case 'token:refresh_failed':
    case 'session:action_required':
      return 'high'
    case 'poll:started':
    case 'poll:ended':
    case 'session:start_blocked':
      return 'normal'
    case 'campaign:invitation':
    case 'campaign:member_joined':
    case 'session:reminder':
      return 'low'
    default:
      return 'normal'
  }
}
