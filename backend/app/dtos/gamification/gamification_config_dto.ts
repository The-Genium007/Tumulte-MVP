import CampaignGamificationConfig from '#models/campaign_gamification_config'
import { GamificationEventListDto } from './gamification_event_dto.js'

/**
 * DTO pour une configuration de gamification par campagne
 */
export class GamificationConfigDto {
  id!: string
  campaignId!: string
  eventId!: string
  isEnabled!: boolean
  cost!: number | null
  objectiveCoefficient!: number | null
  minimumObjective!: number | null
  duration!: number | null
  cooldown!: number | null
  maxClicksPerUserPerSession!: number
  twitchRewardId!: string | null
  event!: GamificationEventListDto | null
  createdAt!: string
  updatedAt!: string

  static fromModel(config: CampaignGamificationConfig): GamificationConfigDto {
    return {
      id: config.id,
      campaignId: config.campaignId,
      eventId: config.eventId,
      isEnabled: config.isEnabled,
      cost: config.cost,
      objectiveCoefficient: config.objectiveCoefficient,
      minimumObjective: config.minimumObjective,
      duration: config.duration,
      cooldown: config.cooldown,
      maxClicksPerUserPerSession: config.maxClicksPerUserPerSession,
      twitchRewardId: config.twitchRewardId,
      event: config.event ? GamificationEventListDto.fromModel(config.event) : null,
      createdAt: config.createdAt.toISO() || '',
      updatedAt: config.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(configs: CampaignGamificationConfig[]): GamificationConfigDto[] {
    return configs.map((config) => GamificationConfigDto.fromModel(config))
  }
}

/**
 * DTO avec les valeurs effectives calculées
 */
export class GamificationConfigEffectiveDto extends GamificationConfigDto {
  effectiveCost!: number
  effectiveObjectiveCoefficient!: number
  effectiveMinimumObjective!: number
  effectiveDuration!: number

  static override fromModel(config: CampaignGamificationConfig): GamificationConfigEffectiveDto {
    const base = GamificationConfigDto.fromModel(config)

    // Calcul des valeurs effectives (override ou défaut)
    const event = config.event
    return {
      ...base,
      effectiveCost: config.cost ?? event?.defaultCost ?? 100,
      effectiveObjectiveCoefficient:
        config.objectiveCoefficient ?? event?.defaultObjectiveCoefficient ?? 0.3,
      effectiveMinimumObjective: config.minimumObjective ?? event?.defaultMinimumObjective ?? 3,
      effectiveDuration: config.duration ?? event?.defaultDuration ?? 60,
    }
  }

  static override fromModelArray(
    configs: CampaignGamificationConfig[]
  ): GamificationConfigEffectiveDto[] {
    return configs.map((config) => GamificationConfigEffectiveDto.fromModel(config))
  }
}

export default GamificationConfigDto
