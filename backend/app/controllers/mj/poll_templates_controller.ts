import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PollTemplateRepository } from '#repositories/poll_template_repository'
import { CampaignRepository } from '#repositories/campaign_repository'
import { PollTemplateDto } from '#dtos/polls/poll_template_dto'

/**
 * Contrôleur pour la gestion des templates de polls (MJ)
 */
@inject()
export default class PollTemplatesController {
  constructor(
    private pollTemplateRepository: PollTemplateRepository,
    private campaignRepository: CampaignRepository
  ) {}

  /**
   * Liste tous les templates du MJ
   * GET /api/v2/mj/templates
   */
  async index({ auth, response }: HttpContext) {
    const userId = auth.user!.id
    const templates = await this.pollTemplateRepository.findByOwner(userId)

    return response.ok({
      data: templates.map((t) => PollTemplateDto.fromModel(t)),
    })
  }

  /**
   * Liste les templates d'une campagne
   * GET /api/v2/mj/campaigns/:campaignId/templates
   */
  async indexByCampaign({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const templates = await this.pollTemplateRepository.findByCampaign(params.campaignId)

    return response.ok({
      data: templates.map((t) => PollTemplateDto.fromModel(t)),
    })
  }

  /**
   * Récupère un template
   * GET /api/v2/mj/templates/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const template = await this.pollTemplateRepository.findById(params.id)

    if (!template) {
      return response.notFound({ error: 'Poll template not found' })
    }

    // Vérifier l'ownership
    if (template.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    return response.ok({
      data: PollTemplateDto.fromModel(template),
    })
  }

  /**
   * Crée un nouveau template
   * POST /api/v2/mj/campaigns/:campaignId/templates
   */
  async store({ auth, params, request, response }: HttpContext) {
    const userId = auth.user!.id

    // Vérifier l'ownership de la campagne
    const isOwner = await this.campaignRepository.isOwner(params.campaignId, userId)
    if (!isOwner) {
      return response.forbidden({ error: 'Not authorized to access this campaign' })
    }

    const data = request.only(['label', 'title', 'options', 'durationSeconds'])

    const template = await this.pollTemplateRepository.create({
      ownerId: userId,
      campaignId: params.campaignId,
      label: data.label,
      title: data.title,
      options: data.options,
      durationSeconds: data.durationSeconds || 60,
    })

    return response.created({
      data: PollTemplateDto.fromModel(template),
    })
  }

  /**
   * Met à jour un template
   * PUT /api/v2/mj/templates/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const template = await this.pollTemplateRepository.findById(params.id)

    if (!template) {
      return response.notFound({ error: 'Poll template not found' })
    }

    if (template.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    const data = request.only(['label', 'title', 'options', 'durationSeconds'])

    if (data.label) template.label = data.label
    if (data.title) template.title = data.title
    if (data.options) template.options = data.options
    if (data.durationSeconds !== undefined) template.durationSeconds = data.durationSeconds

    await this.pollTemplateRepository.update(template)

    return response.ok({
      data: PollTemplateDto.fromModel(template),
    })
  }

  /**
   * Supprime un template
   * DELETE /api/v2/mj/templates/:id
   */
  async destroy({ auth, params, response }: HttpContext) {
    const template = await this.pollTemplateRepository.findById(params.id)

    if (!template) {
      return response.notFound({ error: 'Poll template not found' })
    }

    if (template.ownerId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    await this.pollTemplateRepository.delete(template)

    return response.noContent()
  }
}
