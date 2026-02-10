/**
 * Types pour le système unifié d'événements de campagne
 * Correspond aux DTOs backend dans campaign_event_dto.ts
 */

// ==========================================
// Types d'événements
// ==========================================

/**
 * Types d'événements supportés
 * Extensible pour futures intégrations Twitch
 */
export type CampaignEventType = 'poll' | 'gamification_dice_reverse'

/**
 * Configuration d'affichage par type d'événement
 */
export interface CampaignEventTypeConfig {
  icon: string
  iconColor: string
  label: string
}

/**
 * Résultat principal pour affichage en liste
 */
export interface CampaignEventPrimaryResult {
  /** Emoji/icône du résultat (ex: 🧙, 🐉) */
  emoji?: string
  /** Texte du résultat (ex: "Gandalf", "Dragon noir") */
  text: string
  /** Succès ou échec */
  success: boolean
  /** Mention ex-æquo pour les sondages */
  isExAequo?: boolean
}

// ==========================================
// Métadonnées spécifiques
// ==========================================

/**
 * Métadonnées spécifiques aux sondages
 */
export interface PollEventMetadata {
  pollInstanceId: string
  options: string[]
  totalVotes: number
  votesByOption: Record<string, number>
  /** Options gagnantes (peut y en avoir plusieurs si ex-æquo) */
  winningOptions: string[]
  /** Sondage annulé avant la fin */
  isCancelled: boolean
  /** Résultats par chaîne */
  channelResults?: Array<{
    streamerName: string
    totalVotes: number
    votesByOption: Record<string, number>
  }>
}

/**
 * Métadonnées spécifiques à la gamification (inversion 2D, etc.)
 */
export interface GamificationEventMetadata {
  instanceId: string
  eventSlug: string
  eventName: string
  /** Données du déclencheur */
  triggerData: {
    characterName?: string
    characterId?: string
    formula?: string
    result?: number
    criticalType?: 'success' | 'failure'
  } | null
  /** Progression */
  objectiveTarget: number
  currentProgress: number
  progressPercentage: number
  duration: number
  /** Résultat de l'action */
  resultData: {
    success: boolean
    message?: string
  } | null
  /** Top contributeurs */
  topContributors?: Array<{
    twitchUsername: string
    amount: number
  }>
}

export type CampaignEventMetadata = PollEventMetadata | GamificationEventMetadata

// ==========================================
// DTO principal
// ==========================================

/**
 * DTO unifié pour tous les types d'événements de campagne
 * Utilisé pour l'affichage dans "Événements récents"
 */
export interface CampaignEvent {
  /** ID unique de l'événement (format: "type_id") */
  id: string
  /** Type d'événement */
  type: CampaignEventType
  /** Nom de l'événement */
  name: string
  /** Date de complétion (ISO string) */
  completedAt: string
  /** Icône Lucide */
  icon: string
  /** Couleur de l'icône (classe Tailwind) */
  iconColor: string
  /** Résultat principal pour affichage en liste */
  primaryResult: CampaignEventPrimaryResult
  /** Métadonnées complètes pour la modal de détail */
  metadata: CampaignEventMetadata
}

// ==========================================
// Helpers
// ==========================================

/**
 * Configuration d'affichage par type d'événement
 */
export const CAMPAIGN_EVENT_TYPE_CONFIG: Record<CampaignEventType, CampaignEventTypeConfig> = {
  poll: {
    icon: 'i-lucide-bar-chart-2',
    iconColor: 'text-success-600',
    label: 'Sondage',
  },
  gamification_dice_reverse: {
    icon: 'i-lucide-dice-5',
    iconColor: 'text-orange-500',
    label: 'Inversion 2D',
  },
}

/**
 * Type guard pour vérifier si les métadonnées sont de type sondage
 */
export function isPollMetadata(metadata: CampaignEventMetadata): metadata is PollEventMetadata {
  return 'pollInstanceId' in metadata
}

/**
 * Type guard pour vérifier si les métadonnées sont de type gamification
 */
export function isGamificationMetadata(
  metadata: CampaignEventMetadata
): metadata is GamificationEventMetadata {
  return 'instanceId' in metadata
}
