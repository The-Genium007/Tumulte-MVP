import { pollInstance as PollInstance } from '#models/poll_instance'

export class PollInstanceRepository {
  async findById(id: string): Promise<PollInstance | null> {
    return await PollInstance.find(id)
  }

  async findByIdWithLinks(id: string): Promise<PollInstance | null> {
    return await PollInstance.query()
      .where('id', id)
      .preload('channelLinks', (query) => {
        query.preload('streamer')
      })
      .first()
  }

  async findByCampaign(campaignId: string): Promise<PollInstance[]> {
    return await PollInstance.query().where('campaignId', campaignId).orderBy('createdAt', 'desc')
  }

  async findRunningByCampaign(campaignId: string): Promise<PollInstance[]> {
    return await PollInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'RUNNING')
      .preload('channelLinks')
  }

  async findByStatus(status: string): Promise<PollInstance[]> {
    return await PollInstance.query().where('status', status)
  }

  async create(data: {
    templateId?: string | null
    campaignId: string
    createdBy: string
    title: string
    options: string[]
    durationSeconds: number
    type?: 'STANDARD' | 'UNIQUE'
    channelPointsEnabled?: boolean
    channelPointsAmount?: number | null
  }): Promise<PollInstance> {
    return await PollInstance.create({
      ...data,
      options: JSON.stringify(data.options) as any,
      status: 'PENDING',
      type: data.type || 'STANDARD',
      channelPointsEnabled: data.channelPointsEnabled || false,
      channelPointsAmount: data.channelPointsAmount || null,
    })
  }

  async update(instance: PollInstance): Promise<PollInstance> {
    await instance.save()
    return instance
  }

  async updateStatus(pollId: string, status: string): Promise<void> {
    await PollInstance.query().where('id', pollId).update({ status })
  }

  async setStarted(pollId: string): Promise<void> {
    await PollInstance.query().where('id', pollId).update({
      status: 'RUNNING',
      startedAt: new Date(),
    })
  }

  async setEnded(pollId: string): Promise<void> {
    await PollInstance.query().where('id', pollId).update({
      status: 'ENDED',
      endedAt: new Date(),
    })
  }

  async setCancelled(pollId: string): Promise<void> {
    await PollInstance.query().where('id', pollId).update({
      status: 'ENDED',
      endedAt: new Date(),
    })
  }

  async saveFinalResults(
    pollId: string,
    totalVotes: number,
    votesByOption: Record<string, number>
  ): Promise<void> {
    await PollInstance.query()
      .where('id', pollId)
      .update({
        finalTotalVotes: totalVotes,
        finalVotesByOption: JSON.stringify(votesByOption) as any,
      })
  }
}

export default PollInstanceRepository
export { PollInstanceRepository as pollInstanceRepository }
