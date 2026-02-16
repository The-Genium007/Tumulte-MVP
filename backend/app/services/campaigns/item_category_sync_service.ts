import { createHash } from 'node:crypto'
import Character from '#models/character'
import type { SpellInfo, FeatureInfo } from '#models/character'
import type CampaignItemCategoryRule from '#models/campaign_item_category_rule'
import { CampaignItemCategoryRuleRepository } from '#repositories/campaign_item_category_rule_repository'
import logger from '@adonisjs/core/services/logger'

type CategorySummary = Record<string, Record<string, number>>

interface SyncResult {
  changed: boolean
  summary: CategorySummary
}

interface BulkSyncResult {
  total: number
  changed: number
}

export class ItemCategorySyncService {
  constructor(private repository: CampaignItemCategoryRuleRepository) {}

  /**
   * Categorize a single character's items against campaign rules.
   * Uses hash-based dedup to skip DB writes when nothing changed.
   */
  async syncCharacterCategories(character: Character, campaignId: string): Promise<SyncResult> {
    const rules = await this.repository.findByCampaign(campaignId)
    const enabledRules = rules.filter((r) => r.isEnabled)

    if (enabledRules.length === 0) {
      return { changed: false, summary: {} }
    }

    const summary = this.buildSummary(character, enabledRules)
    const hash = this.computeHash(enabledRules, character)

    if (hash === character.itemCategoryHash) {
      return { changed: false, summary }
    }

    character.itemCategorySummary = summary
    character.itemCategoryHash = hash
    await character.save()

    logger.debug(
      {
        characterId: character.id,
        characterName: character.name,
        campaignId,
        summary,
      },
      '[item_category_sync] Character categories updated'
    )

    return { changed: true, summary }
  }

  /**
   * Sync all characters of a campaign. Used by the manual "Synchroniser" button.
   */
  async syncAllCampaignCharacters(campaignId: string): Promise<BulkSyncResult> {
    const characters = await Character.query().where('campaign_id', campaignId)
    let changed = 0

    for (const character of characters) {
      const result = await this.syncCharacterCategories(character, campaignId)
      if (result.changed) changed++
    }

    logger.info(
      { campaignId, total: characters.length, changed },
      '[item_category_sync] Bulk sync completed'
    )

    return { total: characters.length, changed }
  }

  /**
   * Force re-categorization after rules change.
   * Clears all hashes so every character gets re-evaluated.
   */
  async recategorizeOnRulesChange(campaignId: string): Promise<BulkSyncResult> {
    await Character.query().where('campaign_id', campaignId).update({ itemCategoryHash: null })

    return this.syncAllCampaignCharacters(campaignId)
  }

  /**
   * Build a summary of item counts per category → subcategory.
   */
  private buildSummary(character: Character, rules: CampaignItemCategoryRule[]): CategorySummary {
    const summary: CategorySummary = {}

    const spellRules = rules.filter((r) => r.category === 'spell')
    const featureRules = rules.filter((r) => r.category === 'feature')
    const inventoryRules = rules.filter((r) => r.category === 'inventory')

    if (character.spells?.length && spellRules.length > 0) {
      const counts = this.categorizeSpells(character.spells, spellRules)
      if (Object.keys(counts).length > 0) summary.spell = counts
    }

    if (character.features?.length && featureRules.length > 0) {
      const counts = this.categorizeFeatures(character.features, featureRules)
      if (Object.keys(counts).length > 0) summary.feature = counts
    }

    if (character.inventory && inventoryRules.length > 0) {
      const counts = this.categorizeInventory(character.inventory, inventoryRules)
      if (Object.keys(counts).length > 0) summary.inventory = counts
    }

    return summary
  }

  /**
   * Match spells against rules. Uses the flattened SpellInfo interface.
   */
  private categorizeSpells(
    spells: SpellInfo[],
    rules: CampaignItemCategoryRule[]
  ): Record<string, number> {
    const counts: Record<string, number> = {}

    for (const spell of spells) {
      const matchingRule = rules.find((rule) => {
        if (rule.itemType !== spell.type && rule.itemType !== 'spell') return false
        if (!rule.matchField || !rule.matchValue) return true
        const fieldValue = this.resolveSpellField(spell, rule.matchField)
        return fieldValue !== null && fieldValue === rule.matchValue
      })

      if (matchingRule) {
        counts[matchingRule.subcategory] = (counts[matchingRule.subcategory] || 0) + 1
      }
    }

    return counts
  }

  /**
   * Match features against rules. Uses the flattened FeatureInfo interface.
   */
  private categorizeFeatures(
    features: FeatureInfo[],
    rules: CampaignItemCategoryRule[]
  ): Record<string, number> {
    const counts: Record<string, number> = {}

    for (const feature of features) {
      const matchingRule = rules.find((rule) => {
        if (rule.itemType !== feature.type) return false
        if (!rule.matchField || !rule.matchValue) return true
        const fieldValue = this.resolveFeatureField(feature, rule.matchField)
        return fieldValue !== null && fieldValue === rule.matchValue
      })

      if (matchingRule) {
        counts[matchingRule.subcategory] = (counts[matchingRule.subcategory] || 0) + 1
      }
    }

    return counts
  }

  /**
   * Match inventory items against rules.
   * Inventory is stored as a generic object — items may be an array or keyed object.
   */
  private categorizeInventory(
    inventory: object,
    rules: CampaignItemCategoryRule[]
  ): Record<string, number> {
    const counts: Record<string, number> = {}
    const items = this.extractInventoryItems(inventory)

    for (const item of items) {
      const itemType = (item as Record<string, unknown>).type as string | undefined
      if (!itemType) continue

      const matchingRule = rules.find((rule) => {
        if (rule.itemType !== itemType) return false
        if (!rule.matchField || !rule.matchValue) return true
        const fieldValue = this.resolveGenericField(item, rule.matchField)
        return fieldValue !== null && String(fieldValue) === rule.matchValue
      })

      if (matchingRule) {
        counts[matchingRule.subcategory] = (counts[matchingRule.subcategory] || 0) + 1
      }
    }

    return counts
  }

  /**
   * Extract an array of items from the inventory JSONB.
   * Handles both array format and keyed object format.
   */
  private extractInventoryItems(inventory: object): object[] {
    if (Array.isArray(inventory)) return inventory
    if (typeof inventory === 'object' && inventory !== null) {
      const values = Object.values(inventory)
      if (values.length > 0 && typeof values[0] === 'object') {
        return values as object[]
      }
    }
    return []
  }

  /**
   * Resolve spell fields using the flattened SpellInfo interface.
   * Maps Foundry paths (system.school) to SpellInfo properties.
   */
  private resolveSpellField(spell: SpellInfo, matchField: string): string | null {
    const fieldMap: Record<string, string | null> = {
      'system.school': spell.school,
      'system.level': spell.level !== null ? String(spell.level) : null,
      'system.prepared': spell.prepared !== null ? String(spell.prepared) : null,
    }
    return fieldMap[matchField] ?? null
  }

  /**
   * Resolve feature fields using the flattened FeatureInfo interface.
   */
  private resolveFeatureField(feature: FeatureInfo, matchField: string): string | null {
    const fieldMap: Record<string, string | null> = {
      'system.type.value': feature.subtype,
    }
    return fieldMap[matchField] ?? null
  }

  /**
   * Walk a dot-notation path on a generic object.
   * Used for inventory items where we don't have a typed interface.
   */
  private resolveGenericField(obj: object, path: string): unknown {
    let current: unknown = obj
    for (const key of path.split('.')) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return null
      }
      current = (current as Record<string, unknown>)[key]
    }
    return current ?? null
  }

  /**
   * Compute a SHA-256 hash of the input data (rules + character items).
   * A change in either rules or character data produces a different hash.
   */
  private computeHash(rules: CampaignItemCategoryRule[], character: Character): string {
    const payload = JSON.stringify({
      ruleIds: rules.map((r) => r.id).sort(),
      spells: character.spells,
      features: character.features,
      inventory: character.inventory,
    })
    return createHash('sha256').update(payload).digest('hex')
  }
}

export default ItemCategorySyncService
