import GamificationEvent, {
  type GamificationEventType,
  type GamificationTriggerType,
  type GamificationActionType,
  type GamificationCooldownType,
  type TriggerConfig,
  type ActionConfig,
  type CooldownConfig,
} from '#models/gamification_event'

/**
 * DTO pour un événement de gamification
 */
export class GamificationEventDto {
  id!: string
  name!: string
  slug!: string
  description!: string | null
  type!: GamificationEventType
  triggerType!: GamificationTriggerType
  triggerConfig!: TriggerConfig | null
  actionType!: GamificationActionType
  actionConfig!: ActionConfig | null
  defaultCost!: number
  defaultObjectiveCoefficient!: number
  defaultMinimumObjective!: number
  defaultDuration!: number
  cooldownType!: GamificationCooldownType
  cooldownConfig!: CooldownConfig | null
  rewardColor!: string
  isSystemEvent!: boolean
  createdAt!: string
  updatedAt!: string

  static fromModel(event: GamificationEvent): GamificationEventDto {
    return {
      id: event.id,
      name: event.name,
      slug: event.slug,
      description: event.description,
      type: event.type,
      triggerType: event.triggerType,
      triggerConfig: event.triggerConfig,
      actionType: event.actionType,
      actionConfig: event.actionConfig,
      defaultCost: event.defaultCost,
      defaultObjectiveCoefficient: event.defaultObjectiveCoefficient,
      defaultMinimumObjective: event.defaultMinimumObjective,
      defaultDuration: event.defaultDuration,
      cooldownType: event.cooldownType,
      cooldownConfig: event.cooldownConfig,
      rewardColor: event.rewardColor,
      isSystemEvent: event.isSystemEvent,
      createdAt: event.createdAt.toISO() || '',
      updatedAt: event.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(events: GamificationEvent[]): GamificationEventDto[] {
    return events.map((event) => GamificationEventDto.fromModel(event))
  }
}

/**
 * DTO simplifié pour les listes
 */
export class GamificationEventListDto {
  id!: string
  name!: string
  slug!: string
  description!: string | null
  type!: GamificationEventType
  triggerType!: GamificationTriggerType
  actionType!: GamificationActionType
  defaultCost!: number
  rewardColor!: string
  isSystemEvent!: boolean

  static fromModel(event: GamificationEvent): GamificationEventListDto {
    return {
      id: event.id,
      name: event.name,
      slug: event.slug,
      description: event.description,
      type: event.type,
      triggerType: event.triggerType,
      actionType: event.actionType,
      defaultCost: event.defaultCost,
      rewardColor: event.rewardColor,
      isSystemEvent: event.isSystemEvent,
    }
  }

  static fromModelArray(events: GamificationEvent[]): GamificationEventListDto[] {
    return events.map((event) => GamificationEventListDto.fromModel(event))
  }
}

export default GamificationEventDto
