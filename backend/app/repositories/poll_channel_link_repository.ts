import PollChannelLink from '#models/poll_channel_link'

export class PollChannelLinkRepository {
  async findById(id: string): Promise<PollChannelLink | null> {
    return await PollChannelLink.find(id)
  }

  async findByPollInstance(pollInstanceId: string): Promise<PollChannelLink[]> {
    return await PollChannelLink.query().where('pollInstanceId', pollInstanceId).preload('streamer')
  }

  async findByPollAndStreamer(
    pollInstanceId: string,
    streamerId: string
  ): Promise<PollChannelLink | null> {
    return await PollChannelLink.query()
      .where('pollInstanceId', pollInstanceId)
      .where('streamerId', streamerId)
      .first()
  }

  async create(data: {
    pollInstanceId: string
    streamerId: string
    twitchPollId: string
    status: string
  }): Promise<PollChannelLink> {
    return await PollChannelLink.create({
      pollInstanceId: data.pollInstanceId,
      streamerId: data.streamerId,
      twitchPollId: data.twitchPollId,
      status: data.status as any,
      votesByOption: JSON.stringify({}) as any,
      totalVotes: 0,
    })
  }

  async update(link: PollChannelLink): Promise<PollChannelLink> {
    await link.save()
    return link
  }

  async updateVotes(
    linkId: string,
    votesByOption: Record<string, number>,
    totalVotes: number
  ): Promise<void> {
    await PollChannelLink.query()
      .where('id', linkId)
      .update({
        votesByOption: JSON.stringify(votesByOption) as any,
        totalVotes,
      })
  }

  async updateStatus(linkId: string, status: string): Promise<void> {
    await PollChannelLink.query().where('id', linkId).update({ status })
  }

  async delete(link: PollChannelLink): Promise<void> {
    await link.delete()
  }

  async deleteByPollInstance(pollInstanceId: string): Promise<void> {
    await PollChannelLink.query().where('pollInstanceId', pollInstanceId).delete()
  }

  async deleteByStreamer(streamerId: string): Promise<void> {
    await PollChannelLink.query().where('streamerId', streamerId).delete()
  }
}

export default PollChannelLinkRepository
