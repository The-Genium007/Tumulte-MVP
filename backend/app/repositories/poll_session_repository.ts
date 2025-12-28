import { pollSession as PollSession } from '#models/poll_session'

export class PollSessionRepository {
  async findById(id: string): Promise<PollSession | null> {
    return await PollSession.find(id)
  }

  async findByIdWithPolls(id: string): Promise<PollSession | null> {
    return await PollSession.query().where('id', id).preload('polls').first()
  }

  async findByCampaign(campaignId: string): Promise<PollSession[]> {
    return await PollSession.query()
      .where('campaignId', campaignId)
      .preload('polls')
      .orderBy('createdAt', 'desc')
  }

  async findByOwner(ownerId: string): Promise<PollSession[]> {
    return await PollSession.query().where('ownerId', ownerId).orderBy('createdAt', 'desc')
  }

  async create(data: {
    ownerId: string
    campaignId: string
    name: string
    defaultDurationSeconds: number
  }): Promise<PollSession> {
    return await PollSession.create(data)
  }

  async update(session: PollSession): Promise<PollSession> {
    await session.save()
    return session
  }

  async delete(session: PollSession): Promise<void> {
    await session.delete()
  }

  async isOwner(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.findById(sessionId)
    return session?.ownerId === userId
  }
}

export default PollSessionRepository
export { PollSessionRepository as pollSessionRepository }
