import type { pollInstance as PollInstance } from '#models/poll_instance'
import type { pollTemplate as PollTemplate } from '#models/poll_template'
import type { poll as Poll } from '#models/poll'

export class PollTemplateDto {
  id!: string
  ownerId!: string
  campaignId!: string | null
  label!: string
  title!: string
  options!: string[]
  durationSeconds!: number
  createdAt!: string
  updatedAt!: string

  static fromModel(template: PollTemplate): PollTemplateDto {
    return {
      id: template.id,
      ownerId: template.ownerId,
      campaignId: template.campaignId,
      label: template.label,
      title: template.title,
      options: Array.isArray(template.options)
        ? template.options
        : JSON.parse(template.options || '[]'),
      durationSeconds: template.durationSeconds,
      createdAt: template.createdAt.toISO() || '',
      updatedAt: template.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(templates: PollTemplate[]): PollTemplateDto[] {
    return templates.map((template) => PollTemplateDto.fromModel(template))
  }
}

export class PollDto {
  id!: string
  campaignId!: string
  question!: string
  options!: string[]
  type!: string
  durationSeconds!: number
  orderIndex!: number
  channelPointsPerVote!: number | null
  channelPointsEnabled!: boolean
  lastLaunchedAt!: string | null
  createdAt!: string
  updatedAt!: string

  static fromModel(poll: Poll): PollDto {
    const channelPointsPerVote = poll.channelPointsAmount
    return {
      id: poll.id,
      campaignId: poll.campaignId,
      question: poll.question,
      options: Array.isArray(poll.options) ? poll.options : JSON.parse(poll.options || '[]'),
      type: poll.type,
      durationSeconds: poll.durationSeconds,
      orderIndex: poll.orderIndex,
      channelPointsPerVote,
      channelPointsEnabled: channelPointsPerVote !== null && channelPointsPerVote > 0,
      lastLaunchedAt: poll.lastLaunchedAt?.toISO() || null,
      createdAt: poll.createdAt.toISO() || '',
      updatedAt: poll.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(polls: Poll[]): PollDto[] {
    return polls.map((poll) => PollDto.fromModel(poll))
  }
}

export class PollInstanceDto {
  id!: string
  pollId!: string | null
  templateId!: string | null
  campaignId!: string | null
  createdBy!: string
  title!: string
  options!: string[]
  durationSeconds!: number
  status!: string
  startedAt!: string | null
  endedAt!: string | null
  createdAt!: string
  updatedAt!: string

  static fromModel(instance: PollInstance): PollInstanceDto {
    return {
      id: instance.id,
      pollId: instance.pollId,
      templateId: instance.templateId,
      campaignId: instance.campaignId,
      createdBy: instance.createdBy,
      title: instance.title,
      options: Array.isArray(instance.options)
        ? instance.options
        : JSON.parse(instance.options || '[]'),
      durationSeconds: instance.durationSeconds,
      status: instance.status,
      startedAt: instance.startedAt?.toISO() || null,
      endedAt: instance.endedAt?.toISO() || null,
      createdAt: instance.createdAt.toISO() || '',
      updatedAt: instance.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(instances: PollInstance[]): PollInstanceDto[] {
    return instances.map((instance) => PollInstanceDto.fromModel(instance))
  }
}

export class AggregatedVotesDto {
  pollInstanceId!: string
  title!: string
  options!: string[]
  totalVotes!: number
  votesByOption!: Record<string, number>
  percentages!: Record<string, number>
  channels!: ChannelVotesDto[]

  static create(data: Partial<AggregatedVotesDto>): AggregatedVotesDto {
    return {
      pollInstanceId: data.pollInstanceId || '',
      title: data.title || '',
      options: data.options || [],
      totalVotes: data.totalVotes || 0,
      votesByOption: data.votesByOption || {},
      percentages: data.percentages || {},
      channels: data.channels || [],
    }
  }
}

export class ChannelVotesDto {
  streamerId!: string
  streamerName!: string
  twitchPollId!: string
  totalVotes!: number
  votesByOption!: Record<string, number>
}

export class PollResultsDto {
  pollInstanceId!: string
  campaignId!: string
  title!: string
  options!: string[]
  status!: string
  startedAt!: string
  endedAt!: string | null
  totalVotes!: number
  votesByOption!: Record<string, number>
  percentages!: Record<string, number>
  channels!: ChannelResultDto[]
  createdAt!: string

  static create(data: Partial<PollResultsDto>): PollResultsDto {
    return {
      pollInstanceId: data.pollInstanceId || '',
      campaignId: data.campaignId || '',
      title: data.title || '',
      options: data.options || [],
      status: data.status || '',
      startedAt: data.startedAt || '',
      endedAt: data.endedAt || null,
      totalVotes: data.totalVotes || 0,
      votesByOption: data.votesByOption || {},
      percentages: data.percentages || {},
      channels: data.channels || [],
      createdAt: data.createdAt || new Date().toISOString(),
    }
  }

  static fromAggregated(pollInstance: any, aggregated: any): PollResultsDto {
    const options: string[] = Array.isArray(pollInstance.options)
      ? pollInstance.options
      : JSON.parse(pollInstance.options || '[]')

    // Convert index-based votes/percentages to option-name-based
    const votesByOption: Record<string, number> = {}
    const percentages: Record<string, number> = {}

    for (const [index, votes] of Object.entries(aggregated.votesByOption || {})) {
      const optionName = options[Number.parseInt(index)] || `Option ${Number.parseInt(index) + 1}`
      votesByOption[optionName] = votes as number
    }

    for (const [index, percentage] of Object.entries(aggregated.percentages || {})) {
      const optionName = options[Number.parseInt(index)] || `Option ${Number.parseInt(index) + 1}`
      percentages[optionName] = percentage as number
    }

    return {
      pollInstanceId: pollInstance.id,
      campaignId: pollInstance.campaignId || '',
      title: pollInstance.title,
      options,
      status: pollInstance.status,
      startedAt: pollInstance.startedAt?.toISO() || '',
      endedAt: pollInstance.endedAt?.toISO() || null,
      totalVotes: aggregated.totalVotes || 0,
      votesByOption,
      percentages,
      channels: aggregated.channels || [],
      createdAt: pollInstance.createdAt?.toISO() || new Date().toISOString(),
    }
  }
}

export class ChannelResultDto {
  streamerId!: string
  streamerName!: string
  twitchPollId!: string
  status!: string
  totalVotes!: number
  votesByOption!: Record<string, number>
}

export default PollInstanceDto
