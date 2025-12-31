import { poll as Poll } from '#models/poll'

export class PollRepository {
  async findById(id: string): Promise<Poll | null> {
    return await Poll.find(id)
  }

  async findBySession(sessionId: string): Promise<Poll[]> {
    return await Poll.query().where('sessionId', sessionId).orderBy('orderIndex', 'asc')
  }

  async create(data: {
    sessionId: string
    question: string
    options: string[]
    type: string
    orderIndex: number
    channelPointsPerVote?: number | null
  }): Promise<Poll> {
    return await Poll.create({
      sessionId: data.sessionId,
      question: data.question,
      type: data.type as any,
      orderIndex: data.orderIndex,
      channelPointsAmount: data.channelPointsPerVote,
      channelPointsEnabled:
        data.channelPointsPerVote !== null && data.channelPointsPerVote !== undefined,
      options: JSON.stringify(data.options) as any,
    })
  }

  async update(poll: Poll): Promise<Poll> {
    await poll.save()
    return poll
  }

  async delete(poll: Poll): Promise<void> {
    await poll.delete()
  }

  async getNextOrderIndex(sessionId: string): Promise<number> {
    const result = await Poll.query().where('sessionId', sessionId).max('orderIndex as maxIndex')
    const maxIndex = result[0]?.$extras?.maxIndex
    return maxIndex !== null && maxIndex !== undefined ? maxIndex + 1 : 0
  }

  async reorderPolls(sessionId: string, pollIds: string[]): Promise<void> {
    for (const [i, pollId] of pollIds.entries()) {
      await Poll.query().where('id', pollId).where('sessionId', sessionId).update({ orderIndex: i })
    }
  }
}

export default PollRepository
export { PollRepository as pollRepository }
