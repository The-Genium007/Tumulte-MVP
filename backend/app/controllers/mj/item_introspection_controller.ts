import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { campaign as Campaign } from '#models/campaign'
import { ItemIntrospectionService } from '#services/campaigns/item_introspection_service'
import { CampaignItemCategoryRuleRepository } from '#repositories/campaign_item_category_rule_repository'

@inject()
export default class ItemIntrospectionController {
  private service: ItemIntrospectionService

  constructor() {
    this.service = new ItemIntrospectionService(new CampaignItemCategoryRuleRepository())
  }

  /**
   * Retourne l'arbre d'introspection des items d'une campagne.
   * Agrège spells/features/inventory de tous les personnages, groupés par propriété.
   * GET /mj/campaigns/:campaignId/item-introspection
   */
  async index({ auth, params, response }: HttpContext) {
    const user = auth.user!

    await Campaign.query().where('id', params.campaignId).where('owner_id', user.id).firstOrFail()

    const tree = await this.service.buildIntrospectionTree(params.campaignId)
    return response.ok(tree)
  }
}
