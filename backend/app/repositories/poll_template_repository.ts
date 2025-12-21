import PollTemplate from '#models/poll_template'

export class PollTemplateRepository {
  async findById(id: string): Promise<PollTemplate | null> {
    return await PollTemplate.find(id)
  }

  async findByOwner(ownerId: string): Promise<PollTemplate[]> {
    return await PollTemplate.query().where('ownerId', ownerId).orderBy('createdAt', 'desc')
  }

  async findByCampaign(campaignId: string): Promise<PollTemplate[]> {
    return await PollTemplate.query().where('campaignId', campaignId).orderBy('createdAt', 'desc')
  }

  async create(data: {
    ownerId: string
    campaignId?: string | null
    label: string
    title: string
    options: string[]
    durationSeconds: number
  }): Promise<PollTemplate> {
    return await PollTemplate.create({
      ...data,
      options: JSON.stringify(data.options) as any,
    })
  }

  async update(template: PollTemplate): Promise<PollTemplate> {
    await template.save()
    return template
  }

  async delete(template: PollTemplate): Promise<void> {
    await template.delete()
  }

  async isOwner(templateId: string, userId: string): Promise<boolean> {
    const template = await this.findById(templateId)
    return template?.ownerId === userId
  }
}

export default PollTemplateRepository
