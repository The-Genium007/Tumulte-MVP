import PollInstance from '#models/poll_instance'

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
  }): Promise<PollInstance> {
    return await PollInstance.create({
      ...data,
      options: JSON.stringify(data.options) as any,
      status: 'PENDING',
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
      status: 'COMPLETED',
      endedAt: new Date(),
    })
  }

  async setCancelled(pollId: string): Promise<void> {
    await PollInstance.query().where('id', pollId).update({
      status: 'CANCELLED',
      endedAt: new Date(),
    })
  }
}

export default PollInstanceRepository
