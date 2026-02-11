import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { campaign as Campaign } from '#models/campaign'
import { CriticalityRuleService } from '#services/campaigns/criticality_rule_service'
import { CampaignCriticalityRuleRepository } from '#repositories/campaign_criticality_rule_repository'
import {
  createCriticalityRuleSchema,
  updateCriticalityRuleSchema,
} from '#validators/mj/criticality_rule_validator'

@inject()
export default class CriticalityRulesController {
  private service: CriticalityRuleService

  constructor() {
    this.service = new CriticalityRuleService(new CampaignCriticalityRuleRepository())
  }

  /**
   * Liste les règles de criticité d'une campagne
   * GET /mj/campaigns/:campaignId/criticality-rules
   */
  async index({ auth, params, response }: HttpContext) {
    const user = auth.user!

    // Vérifier que la campagne appartient au user
    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    const rules = await this.service.list(campaign.id)
    return response.ok(rules)
  }

  /**
   * Crée une nouvelle règle de criticité
   * POST /mj/campaigns/:campaignId/criticality-rules
   */
  async store({ auth, params, request, response }: HttpContext) {
    const user = auth.user!

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    const data = createCriticalityRuleSchema.parse(request.body())
    const rule = await this.service.create(campaign.id, data)

    return response.created(rule)
  }

  /**
   * Met à jour une règle de criticité
   * PUT /mj/campaigns/:campaignId/criticality-rules/:ruleId
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    const data = updateCriticalityRuleSchema.parse(request.body())
    const rule = await this.service.update(params.ruleId, campaign.id, data)

    return response.ok(rule)
  }

  /**
   * Supprime une règle de criticité
   * DELETE /mj/campaigns/:campaignId/criticality-rules/:ruleId
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    await this.service.delete(params.ruleId, campaign.id)

    return response.noContent()
  }
}
