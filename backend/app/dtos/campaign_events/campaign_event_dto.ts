import type { pollInstance as PollInstance } from '#models/poll_instance'
import type GamificationInstance from '#models/gamification_instance'

// ==========================================
// TYPES
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
// DTO
// ==========================================

/**
 * DTO unifié pour tous les types d'événements de campagne
 * Utilisé pour l'affichage dans "Événements récents"
 */
export class CampaignEventDto {
  /** ID unique de l'événement */
  id!: string
  /** Type d'événement */
  type!: CampaignEventType
  /** Nom de l'événement */
  name!: string
  /** Date de complétion */
  completedAt!: string
  /** Icône Lucide */
  icon!: string
  /** Couleur de l'icône (classe Tailwind) */
  iconColor!: string
  /** Résultat principal pour affichage en liste */
  primaryResult!: CampaignEventPrimaryResult
  /** Métadonnées complètes pour la modal de détail */
  metadata!: CampaignEventMetadata

  /**
   * Configuration d'affichage par type d'événement
   */
  static readonly TYPE_CONFIG: Record<CampaignEventType, CampaignEventTypeConfig> = {
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
   * Convertit un PollInstance terminé en CampaignEventDto
   */
  static fromPollInstance(
    poll: PollInstance,
    aggregatedResults?: {
      votesByOption: Record<string, number>
      totalVotes: number
    }
  ): CampaignEventDto {
    const config = this.TYPE_CONFIG.poll

    // Calculer les résultats
    const votesByOption = aggregatedResults?.votesByOption || {}
    const totalVotes = aggregatedResults?.totalVotes || 0

    // Trouver le(s) gagnant(s)
    const maxVotes = Math.max(...Object.values(votesByOption), 0)
    const winningOptions =
      maxVotes > 0
        ? Object.entries(votesByOption)
            .filter(([, votes]) => votes === maxVotes)
            .map(([option]) => option)
        : poll.options.slice(0, 1) // Si aucun vote, prendre la première option

    const isExAequo = winningOptions.length > 1

    return {
      id: `poll_${poll.id}`,
      type: 'poll',
      name: poll.title,
      completedAt: poll.endedAt?.toISO() || poll.updatedAt.toISO() || '',
      icon: config.icon,
      iconColor: config.iconColor,
      primaryResult: {
        emoji: '📊',
        text: winningOptions[0] || 'Aucun résultat',
        success: totalVotes > 0,
        isExAequo,
      },
      metadata: {
        pollInstanceId: poll.id,
        options: poll.options,
        totalVotes,
        votesByOption,
        winningOptions,
      } as PollEventMetadata,
    }
  }

  /**
   * Convertit une GamificationInstance complétée en CampaignEventDto
   */
  static fromGamificationInstance(instance: GamificationInstance): CampaignEventDto {
    const config = this.TYPE_CONFIG.gamification_dice_reverse

    // Extraire le nom du personnage depuis triggerData
    const characterName = instance.triggerData?.diceRoll?.characterName || 'Personnage'
    const criticalType = instance.triggerData?.diceRoll?.criticalType

    // Déterminer l'emoji selon le type de critique
    const emoji = criticalType === 'success' ? '⚔️' : criticalType === 'failure' ? '💀' : '🎲'

    // Le succès dépend de si l'objectif a été atteint
    const success = instance.status === 'completed' && (instance.resultData?.success ?? false)

    return {
      id: `gamification_${instance.id}`,
      type: 'gamification_dice_reverse',
      name: instance.event?.name || 'Inversion 2D',
      completedAt: instance.completedAt?.toISO() || instance.updatedAt.toISO() || '',
      icon: config.icon,
      iconColor: config.iconColor,
      primaryResult: {
        emoji,
        text: characterName,
        success,
      },
      metadata: {
        instanceId: instance.id,
        eventSlug: instance.event?.slug || 'dice_reverse',
        eventName: instance.event?.name || 'Inversion 2D',
        triggerData: instance.triggerData?.diceRoll
          ? {
              characterName: instance.triggerData.diceRoll.characterName,
              characterId: instance.triggerData.diceRoll.characterId,
              formula: instance.triggerData.diceRoll.formula,
              result: instance.triggerData.diceRoll.result,
              criticalType: instance.triggerData.diceRoll.criticalType,
            }
          : null,
        objectiveTarget: instance.objectiveTarget,
        currentProgress: instance.currentProgress,
        progressPercentage: instance.progressPercentage,
        duration: instance.duration,
        resultData: instance.resultData
          ? {
              success: instance.resultData.success,
              message: instance.resultData.message,
            }
          : null,
      } as GamificationEventMetadata,
    }
  }

  /**
   * Ajoute les top contributeurs à un événement de gamification
   * (méthode séparée car les contributions nécessitent une requête supplémentaire)
   */
  static addTopContributors(
    dto: CampaignEventDto,
    contributors: Array<{ twitchUsername: string; amount: number }>
  ): CampaignEventDto {
    if (dto.type === 'gamification_dice_reverse') {
      ;(dto.metadata as GamificationEventMetadata).topContributors = contributors
    }
    return dto
  }
}

export default CampaignEventDto
