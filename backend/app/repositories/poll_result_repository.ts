import PollResult from '#models/poll_result'
import { DateTime } from 'luxon'

export class PollResultRepository {
  async findById(id: string): Promise<PollResult | null> {
    return await PollResult.find(id)
  }

  async findByPollInstance(pollInstanceId: string): Promise<PollResult | null> {
    return await PollResult.query().where('pollInstanceId', pollInstanceId).first()
  }

  async findByCampaign(campaignId: string): Promise<PollResult[]> {
    return await PollResult.query().where('campaignId', campaignId).orderBy('createdAt', 'desc')
  }

  async create(data: {
    pollInstanceId: string
    campaignId: string
    status: string
    totalVotes: number
    votesByOption: Record<string, number>
    twitchPolls: any
    startedAt: Date
    endedAt?: Date | null
  }): Promise<PollResult> {
    return await PollResult.create({
      pollId: data.pollInstanceId,
      campaignId: data.campaignId,
      status: data.status as any,
      totalVotes: data.totalVotes,
      votesByOption: JSON.stringify(data.votesByOption) as any,
      twitchPolls: JSON.stringify(data.twitchPolls) as any,
      startedAt: DateTime.fromJSDate(data.startedAt),
      endedAt: data.endedAt ? DateTime.fromJSDate(data.endedAt) : null,
    })
  }

  async update(result: PollResult): Promise<PollResult> {
    await result.save()
    return result
  }

  async delete(result: PollResult): Promise<void> {
    await result.delete()
  }
}

export default PollResultRepository
