import { DateTime } from 'luxon'
import { poll as Poll } from '#models/poll'

export class PollRepository {
  async findById(id: string): Promise<Poll | null> {
    return await Poll.find(id)
  }

  async findByCampaign(campaignId: string): Promise<Poll[]> {
    return await Poll.query().where('campaignId', campaignId).orderBy('updated_at', 'desc')
  }

  async findByCampaignOrdered(campaignId: string): Promise<Poll[]> {
    return await Poll.query().where('campaignId', campaignId).orderBy('order_index', 'asc')
  }

  async create(data: {
    campaignId: string
    question: string
    options: string[]
    type: string
    durationSeconds: number
    orderIndex?: number
    channelPointsAmount?: number | null
  }): Promise<Poll> {
    const orderIndex = data.orderIndex ?? (await this.getNextOrderIndex(data.campaignId))

    return await Poll.create({
      campaignId: data.campaignId,
      question: data.question,
      type: data.type as 'STANDARD' | 'UNIQUE',
      durationSeconds: data.durationSeconds,
      orderIndex,
      channelPointsAmount: data.channelPointsAmount ?? null,
      channelPointsEnabled:
        data.channelPointsAmount !== null && data.channelPointsAmount !== undefined,
      options: data.options,
    })
  }

  async update(
    poll: Poll,
    data: {
      question?: string
      options?: string[]
      type?: string
      durationSeconds?: number
      channelPointsAmount?: number | null
    }
  ): Promise<Poll> {
    if (data.question !== undefined) poll.question = data.question
    if (data.options !== undefined) poll.options = data.options
    if (data.type !== undefined) poll.type = data.type as 'STANDARD' | 'UNIQUE'
    if (data.durationSeconds !== undefined) poll.durationSeconds = data.durationSeconds
    if (data.channelPointsAmount !== undefined) {
      poll.channelPointsAmount = data.channelPointsAmount
      poll.channelPointsEnabled = data.channelPointsAmount !== null
    }

    await poll.save()
    return poll
  }

  async delete(poll: Poll): Promise<void> {
    await poll.delete()
  }

  async getNextOrderIndex(campaignId: string): Promise<number> {
    const result = await Poll.query().where('campaignId', campaignId).max('order_index as maxIndex')
    const maxIndex = result[0]?.$extras?.maxIndex
    return maxIndex !== null && maxIndex !== undefined ? maxIndex + 1 : 0
  }

  async updateLastLaunchedAt(pollId: string): Promise<void> {
    await Poll.query().where('id', pollId).update({ lastLaunchedAt: DateTime.now().toISO() })
  }

  async reorderPolls(campaignId: string, pollIds: string[]): Promise<void> {
    for (const [i, pollId] of pollIds.entries()) {
      await Poll.query()
        .where('id', pollId)
        .where('campaignId', campaignId)
        .update({ orderIndex: i })
    }
  }
}

export default PollRepository
export { PollRepository as pollRepository }
