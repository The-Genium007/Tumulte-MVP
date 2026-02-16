import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { campaign as Campaign } from '#models/campaign'
import CampaignItemCategoryRule from '#models/campaign_item_category_rule'
import { ItemCategoryRuleService } from '#services/campaigns/item_category_rule_service'
import { CampaignItemCategoryRuleRepository } from '#repositories/campaign_item_category_rule_repository'
import { ItemCategoryDetectionService } from '#services/campaigns/item_category_detection_service'
import { ItemCategorySyncService } from '#services/campaigns/item_category_sync_service'
import {
  createItemCategoryRuleSchema,
  updateItemCategoryRuleSchema,
} from '#validators/mj/item_category_rule_validator'

@inject()
export default class ItemCategoryRulesController {
  private service: ItemCategoryRuleService

  constructor() {
    this.service = new ItemCategoryRuleService(new CampaignItemCategoryRuleRepository())
  }

  /**
   * Liste les règles de catégorie d'items d'une campagne
   * GET /mj/campaigns/:campaignId/item-category-rules
   */
  async index({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    const rules = await this.service.list(campaign.id)
    return response.ok(rules)
  }

  /**
   * Crée une nouvelle règle de catégorie
   * POST /mj/campaigns/:campaignId/item-category-rules
   */
  async store({ auth, params, request, response }: HttpContext) {
    const user = auth.user!

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    const data = createItemCategoryRuleSchema.parse(request.body())
    const rule = await this.service.create(campaign.id, data)

    this.triggerRecategorization(campaign.id)

    return response.created(rule)
  }

  /**
   * Met à jour une règle de catégorie
   * PUT /mj/campaigns/:campaignId/item-category-rules/:ruleId
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    const data = updateItemCategoryRuleSchema.parse(request.body())
    const rule = await this.service.update(params.ruleId, campaign.id, data)

    this.triggerRecategorization(campaign.id)

    return response.ok(rule)
  }

  /**
   * Supprime une règle de catégorie
   * DELETE /mj/campaigns/:campaignId/item-category-rules/:ruleId
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    await this.service.delete(params.ruleId, campaign.id)

    this.triggerRecategorization(campaign.id)

    return response.noContent()
  }

  /**
   * Auto-détecte et seed les catégories en fonction du système RPG
   * POST /mj/campaigns/:campaignId/item-category-rules/detect
   */
  async detect({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    const detectionService = new ItemCategoryDetectionService(
      new CampaignItemCategoryRuleRepository()
    )
    const rules = await detectionService.detectAndSeedCategories(
      campaign.id,
      campaign.gameSystemId ?? undefined
    )

    this.triggerRecategorization(campaign.id)

    return response.ok(rules)
  }

  /**
   * Force la synchronisation des items de tous les personnages contre les rules
   * POST /mj/campaigns/:campaignId/item-category-rules/sync
   */
  async sync({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .where('owner_id', user.id)
      .firstOrFail()

    const syncService = new ItemCategorySyncService(new CampaignItemCategoryRuleRepository())
    const result = await syncService.syncAllCampaignCharacters(campaign.id)

    return response.ok({
      synchronized: result.total,
      changed: result.changed,
    })
  }

  /**
   * Fire-and-forget: recategorize all characters after rules change
   * and sync updated categories to the Foundry VTT module via WebSocket.
   */
  private triggerRecategorization(campaignId: string): void {
    const syncService = new ItemCategorySyncService(new CampaignItemCategoryRuleRepository())
    syncService.recategorizeOnRulesChange(campaignId).catch((err) => {
      logger.error(
        { campaignId, error: (err as Error).message },
        'Failed to recategorize after rules change'
      )
    })

    // Sync updated categories to VTT module (fire-and-forget)
    this.syncCategoriesToVtt(campaignId).catch((err) => {
      logger.warn(
        { campaignId, error: (err as Error).message },
        'Failed to sync item categories to VTT (non-fatal)'
      )
    })
  }

  /**
   * Send updated item categories to the Foundry VTT module via WebSocket
   */
  private async syncCategoriesToVtt(campaignId: string): Promise<void> {
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .whereNotNull('vttConnectionId')
      .first()

    if (!campaign?.vttConnectionId) return

    const rules = await CampaignItemCategoryRule.query()
      .where('campaignId', campaignId)
      .where('isEnabled', true)
      .select('itemType', 'category', 'subcategory', 'isTargetable')

    const itemCategories = rules.map((r) => ({
      itemType: r.itemType,
      category: r.category,
      subcategory: r.subcategory,
      isTargetable: r.isTargetable,
    }))

    const vttWebSocketService = await app.container.make('vttWebSocketService')
    await vttWebSocketService.broadcast(campaign.vttConnectionId, 'command:sync_item_categories', {
      itemCategories,
    })

    logger.info('Item categories synced to VTT', {
      campaignId,
      connectionId: campaign.vttConnectionId,
      count: itemCategories.length,
    })
  }
}
