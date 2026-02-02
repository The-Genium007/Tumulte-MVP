import GamificationInstance, {
  type GamificationInstanceStatus,
  type TriggerData,
  type StreamerSnapshot,
  type ResultData,
} from '#models/gamification_instance'
import { GamificationEventListDto } from './gamification_event_dto.js'

/**
 * DTO pour une instance de gamification
 */
export class GamificationInstanceDto {
  id!: string
  campaignId!: string
  eventId!: string
  type!: 'individual' | 'group'
  status!: GamificationInstanceStatus
  triggerData!: TriggerData | null
  objectiveTarget!: number
  currentProgress!: number
  progressPercentage!: number
  duration!: number
  startsAt!: string
  expiresAt!: string
  completedAt!: string | null
  resultData!: ResultData | null
  cooldownEndsAt!: string | null
  streamerId!: string | null
  viewerCountAtStart!: number | null
  streamerSnapshots!: StreamerSnapshot[] | null
  remainingSeconds!: number
  isActive!: boolean
  isObjectiveReached!: boolean
  event!: GamificationEventListDto | null
  createdAt!: string
  updatedAt!: string

  static fromModel(instance: GamificationInstance): GamificationInstanceDto {
    return {
      id: instance.id,
      campaignId: instance.campaignId,
      eventId: instance.eventId,
      type: instance.type,
      status: instance.status,
      triggerData: instance.triggerData,
      objectiveTarget: instance.objectiveTarget,
      currentProgress: instance.currentProgress,
      progressPercentage: instance.progressPercentage,
      duration: instance.duration,
      startsAt: instance.startsAt.toISO() || '',
      expiresAt: instance.expiresAt.toISO() || '',
      completedAt: instance.completedAt?.toISO() || null,
      resultData: instance.resultData,
      cooldownEndsAt: instance.cooldownEndsAt?.toISO() || null,
      streamerId: instance.streamerId,
      viewerCountAtStart: instance.viewerCountAtStart,
      streamerSnapshots: instance.streamerSnapshots,
      remainingSeconds: instance.remainingSeconds,
      isActive: instance.isActive,
      isObjectiveReached: instance.isObjectiveReached,
      event: instance.event ? GamificationEventListDto.fromModel(instance.event) : null,
      createdAt: instance.createdAt.toISO() || '',
      updatedAt: instance.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(instances: GamificationInstance[]): GamificationInstanceDto[] {
    return instances.map((instance) => GamificationInstanceDto.fromModel(instance))
  }
}

/**
 * DTO pour l'overlay (données minimales en temps réel)
 */
export class GamificationOverlayDto {
  id!: string
  eventName!: string
  eventSlug!: string
  eventType!: 'individual' | 'group'
  objectiveTarget!: number
  currentProgress!: number
  progressPercentage!: number
  remainingSeconds!: number
  duration!: number
  startsAt!: string
  expiresAt!: string
  triggerData!: TriggerData | null
  streamerSnapshots!: StreamerSnapshot[] | null

  static fromModel(instance: GamificationInstance): GamificationOverlayDto {
    return {
      id: instance.id,
      eventName: instance.event?.name || 'Événement',
      eventSlug: instance.event?.slug || 'unknown',
      eventType: instance.type,
      objectiveTarget: instance.objectiveTarget,
      currentProgress: instance.currentProgress,
      progressPercentage: instance.progressPercentage,
      remainingSeconds: instance.remainingSeconds,
      duration: instance.duration,
      startsAt: instance.startsAt.toISO() || '',
      expiresAt: instance.expiresAt.toISO() || '',
      triggerData: instance.triggerData,
      streamerSnapshots: instance.streamerSnapshots,
    }
  }
}

/**
 * DTO pour l'historique des instances
 */
export class GamificationInstanceHistoryDto {
  id!: string
  eventName!: string
  eventSlug!: string
  type!: 'individual' | 'group'
  status!: GamificationInstanceStatus
  objectiveTarget!: number
  currentProgress!: number
  progressPercentage!: number
  duration!: number
  startsAt!: string
  completedAt!: string | null
  resultSuccess!: boolean | null

  static fromModel(instance: GamificationInstance): GamificationInstanceHistoryDto {
    return {
      id: instance.id,
      eventName: instance.event?.name || 'Événement',
      eventSlug: instance.event?.slug || 'unknown',
      type: instance.type,
      status: instance.status,
      objectiveTarget: instance.objectiveTarget,
      currentProgress: instance.currentProgress,
      progressPercentage: instance.progressPercentage,
      duration: instance.duration,
      startsAt: instance.startsAt.toISO() || '',
      completedAt: instance.completedAt?.toISO() || null,
      resultSuccess: instance.resultData?.success ?? null,
    }
  }

  static fromModelArray(instances: GamificationInstance[]): GamificationInstanceHistoryDto[] {
    return instances.map((instance) => GamificationInstanceHistoryDto.fromModel(instance))
  }
}

export default GamificationInstanceDto
