import Character from '#models/character'
import type { SpellInfo, FeatureInfo } from '#models/character'
import { campaign as Campaign } from '#models/campaign'
import type CampaignItemCategoryRule from '#models/campaign_item_category_rule'
import { CampaignItemCategoryRuleRepository } from '#repositories/campaign_item_category_rule_repository'
import { SYSTEM_MAPPINGS } from '#services/campaigns/item_category_detection_service'

// ─── Response types ──────────────────────────────────────────

export interface ItemIntrospectionTree {
  sources: ItemSource[]
  systemId: string | null
}

export interface ItemSource {
  key: 'spells' | 'features' | 'inventory'
  label: string
  icon: string
  totalCount: number
  groups: ItemGroup[]
}

export interface ItemGroup {
  groupKey: string
  groupLabel: string
  groupProperty: string
  count: number
  samples: ItemSample[]
  suggestedRule: SuggestedRuleData
  existingRule: {
    id: string
    category: string
    label: string
    isEnabled: boolean
  } | null
}

export interface ItemSample {
  name: string
  properties: Record<string, string | number | boolean | null>
}

export interface SuggestedRuleData {
  category: 'spell' | 'feature' | 'inventory'
  subcategory: string
  itemType: string
  matchField: string | null
  matchValue: string | null
  label: string
  icon: string | null
  color: string | null
  isTargetable: boolean
  weight: number
  priority: number
}

// ─── Label resolution map ────────────────────────────────────

const LABEL_MAP: Record<string, string> = {
  // D&D 5e spell schools
  'abj': 'Abjuration',
  'con': 'Conjuration',
  'div': 'Divination',
  'enc': 'Enchantement',
  'evo': 'Évocation',
  'ill': 'Illusion',
  'nec': 'Nécromancie',
  'trs': 'Transmutation',
  // PF2e traditions
  'arcane': 'Arcanique',
  'divine': 'Divine',
  'occult': 'Occulte',
  'primal': 'Primordiale',
  // Feature subtypes
  'class': 'Classe',
  'race': 'Race',
  'feat': 'Dons',
  'general': 'Général',
  'action': 'Actions',
  'ancestry': 'Ascendance',
  // Inventory types
  'weapon': 'Armes',
  'equipment': 'Équipement',
  'consumable': 'Consommables',
  'tool': 'Outils',
  'loot': 'Trésors',
  'container': 'Conteneurs',
  'armor': 'Armures',
  'backpack': 'Sacs',
  // Generic item types
  'spell': 'Sorts',
  'power': 'Pouvoirs',
  'program': 'Programmes',
  'prayer': 'Prières',
  'talent': 'Talents',
  'trait': 'Traits',
  'edge': 'Atouts',
  'hindrance': 'Handicaps',
  'ability': 'Capacités',
  'cyberware': 'Cyberware',
  'role': 'Rôles',
  'agenda': 'Agendas',
  'discipline': 'Disciplines',
  'merit': 'Mérites',
  'flaw': 'Défauts',
  'background': 'Historiques',
  'stunt': 'Prouesses',
  'aspect': 'Aspects',
  'skill': 'Compétences',
  'occupation': 'Occupations',
  'complex_form': 'Formes complexes',
  'adept_power': 'Pouvoirs adeptes',
  'forcepower': 'Pouvoirs de la Force',
  'specialization': 'Spécialisations',
  'extra': 'Extras',
  // Levels as labels (cantrips)
  '0': 'Cantrips (Niv. 0)',
}

const MAX_SAMPLES = 5

// ─── Service ─────────────────────────────────────────────────

export class ItemIntrospectionService {
  constructor(private ruleRepository: CampaignItemCategoryRuleRepository) {}

  async buildIntrospectionTree(campaignId: string): Promise<ItemIntrospectionTree> {
    const campaign = await Campaign.query().where('id', campaignId).firstOrFail()

    const characters = await Character.query()
      .where('campaign_id', campaignId)
      .select(['id', 'name', 'spells', 'features', 'inventory'])

    const existingRules = await this.ruleRepository.findByCampaign(campaignId)

    const systemId = campaign.gameSystemId ?? null
    const systemSeeds = systemId ? (SYSTEM_MAPPINGS[systemId] ?? []) : []

    return {
      sources: [
        this.buildSpellSource(characters, existingRules, systemSeeds),
        this.buildFeatureSource(characters, existingRules, systemSeeds),
        this.buildInventorySource(characters, existingRules, systemSeeds),
      ],
      systemId,
    }
  }

  // ─── Spells ──────────────────────────────────────────────

  private buildSpellSource(
    characters: Character[],
    existingRules: CampaignItemCategoryRule[],
    systemSeeds: Array<{
      category: string
      subcategory: string
      itemType: string
      matchField: string | null
      matchValue: string | null
      label: string
      icon: string | null
      color: string | null
      isTargetable: boolean
      weight: number
      priority: number
    }>
  ): ItemSource {
    const allSpells: SpellInfo[] = []
    for (const char of characters) {
      if (char.spells?.length) {
        allSpells.push(...char.spells)
      }
    }

    const hasSchool = allSpells.some((s) => s.school !== null && s.school !== undefined)
    const groupProperty = hasSchool ? 'school' : 'type'

    const groupMap = new Map<string, SpellInfo[]>()
    for (const spell of allSpells) {
      const key = (groupProperty === 'school' ? spell.school : spell.type) ?? 'unknown'
      const group = groupMap.get(key)
      if (group) {
        group.push(spell)
      } else {
        groupMap.set(key, [spell])
      }
    }

    const spellRules = existingRules.filter((r) => r.category === 'spell')
    const spellSeeds = systemSeeds.filter((s) => s.category === 'spell')

    const groups: ItemGroup[] = [...groupMap.entries()].map(([key, spells]) => ({
      groupKey: key,
      groupLabel: this.resolveLabel(key, spellSeeds),
      groupProperty,
      count: spells.length,
      samples: this.buildSpellSamples(spells),
      suggestedRule: this.buildSuggestedSpellRule(key, groupProperty, spellSeeds),
      existingRule: this.findMatchingRule(spellRules, key, groupProperty, 'spell'),
    }))

    return {
      key: 'spells',
      label: 'Sorts',
      icon: 'i-lucide-sparkles',
      totalCount: allSpells.length,
      groups: groups.sort((a, b) => b.count - a.count),
    }
  }

  // ─── Features ────────────────────────────────────────────

  private buildFeatureSource(
    characters: Character[],
    existingRules: CampaignItemCategoryRule[],
    systemSeeds: Array<{
      category: string
      subcategory: string
      itemType: string
      matchField: string | null
      matchValue: string | null
      label: string
      icon: string | null
      color: string | null
      isTargetable: boolean
      weight: number
      priority: number
    }>
  ): ItemSource {
    const allFeatures: FeatureInfo[] = []
    for (const char of characters) {
      if (char.features?.length) {
        allFeatures.push(...char.features)
      }
    }

    const hasSubtype = allFeatures.some((f) => f.subtype !== null && f.subtype !== undefined)
    const groupProperty = hasSubtype ? 'subtype' : 'type'

    const groupMap = new Map<string, FeatureInfo[]>()
    for (const feature of allFeatures) {
      const key = (groupProperty === 'subtype' ? feature.subtype : feature.type) ?? 'unknown'
      const group = groupMap.get(key)
      if (group) {
        group.push(feature)
      } else {
        groupMap.set(key, [feature])
      }
    }

    const featureRules = existingRules.filter((r) => r.category === 'feature')
    const featureSeeds = systemSeeds.filter((s) => s.category === 'feature')

    const groups: ItemGroup[] = [...groupMap.entries()].map(([key, features]) => ({
      groupKey: key,
      groupLabel: this.resolveLabel(key, featureSeeds),
      groupProperty,
      count: features.length,
      samples: this.buildFeatureSamples(features),
      suggestedRule: this.buildSuggestedFeatureRule(key, groupProperty, featureSeeds),
      existingRule: this.findMatchingRule(featureRules, key, groupProperty, 'feature'),
    }))

    return {
      key: 'features',
      label: 'Capacités',
      icon: 'i-lucide-swords',
      totalCount: allFeatures.length,
      groups: groups.sort((a, b) => b.count - a.count),
    }
  }

  // ─── Inventory ───────────────────────────────────────────

  private buildInventorySource(
    characters: Character[],
    existingRules: CampaignItemCategoryRule[],
    systemSeeds: Array<{
      category: string
      subcategory: string
      itemType: string
      matchField: string | null
      matchValue: string | null
      label: string
      icon: string | null
      color: string | null
      isTargetable: boolean
      weight: number
      priority: number
    }>
  ): ItemSource {
    const allItems: Array<Record<string, unknown>> = []
    for (const char of characters) {
      if (char.inventory) {
        const items = this.extractInventoryItems(char.inventory)
        allItems.push(...items)
      }
    }

    const groupMap = new Map<string, Array<Record<string, unknown>>>()
    for (const item of allItems) {
      const key = (item.type as string) ?? 'unknown'
      const group = groupMap.get(key)
      if (group) {
        group.push(item)
      } else {
        groupMap.set(key, [item])
      }
    }

    const inventoryRules = existingRules.filter((r) => r.category === 'inventory')
    const inventorySeeds = systemSeeds.filter((s) => s.category === 'inventory')

    const groups: ItemGroup[] = [...groupMap.entries()].map(([key, items]) => ({
      groupKey: key,
      groupLabel: this.resolveLabel(key, inventorySeeds),
      groupProperty: 'type',
      count: items.length,
      samples: this.buildInventorySamples(items),
      suggestedRule: this.buildSuggestedInventoryRule(key, inventorySeeds),
      existingRule: this.findMatchingRule(inventoryRules, key, 'type', 'inventory'),
    }))

    return {
      key: 'inventory',
      label: 'Inventaire',
      icon: 'i-lucide-backpack',
      totalCount: allItems.length,
      groups: groups.sort((a, b) => b.count - a.count),
    }
  }

  // ─── Samples ─────────────────────────────────────────────

  private buildSpellSamples(spells: SpellInfo[]): ItemSample[] {
    return spells.slice(0, MAX_SAMPLES).map((s) => ({
      name: s.name,
      properties: {
        type: s.type,
        level: s.level,
        school: s.school,
        prepared: s.prepared,
      },
    }))
  }

  private buildFeatureSamples(features: FeatureInfo[]): ItemSample[] {
    return features.slice(0, MAX_SAMPLES).map((f) => ({
      name: f.name,
      properties: {
        type: f.type,
        subtype: f.subtype,
      },
    }))
  }

  private buildInventorySamples(items: Array<Record<string, unknown>>): ItemSample[] {
    return items.slice(0, MAX_SAMPLES).map((item) => ({
      name: (item.name as string) ?? 'Inconnu',
      properties: {
        type: (item.type as string) ?? null,
        quantity: (item.quantity as number) ?? null,
        equipped: (item.equipped as boolean) ?? null,
      },
    }))
  }

  // ─── Suggested rules ────────────────────────────────────

  private buildSuggestedSpellRule(
    groupKey: string,
    groupProperty: string,
    seeds: Array<{
      subcategory: string
      itemType: string
      matchField: string | null
      matchValue: string | null
      label: string
      icon: string | null
      color: string | null
      isTargetable: boolean
      weight: number
      priority: number
    }>
  ): SuggestedRuleData {
    const seed = seeds.find((s) => {
      if (groupProperty === 'school' && s.matchField === 'system.school') {
        return s.matchValue === groupKey
      }
      if (groupProperty === 'school' && s.matchField === 'system.level') {
        return s.matchValue === groupKey
      }
      if (groupProperty === 'type') {
        return s.itemType === groupKey && !s.matchField
      }
      return false
    })

    if (seed) {
      return {
        category: 'spell',
        subcategory: seed.subcategory,
        itemType: seed.itemType,
        matchField: seed.matchField,
        matchValue: seed.matchValue,
        label: seed.label,
        icon: seed.icon,
        color: seed.color,
        isTargetable: seed.isTargetable,
        weight: seed.weight,
        priority: seed.priority,
      }
    }

    return {
      category: 'spell',
      subcategory: groupKey,
      itemType: groupProperty === 'type' ? groupKey : 'spell',
      matchField: groupProperty === 'school' ? 'system.school' : null,
      matchValue: groupProperty === 'school' ? groupKey : null,
      label: this.resolveLabel(groupKey, []),
      icon: null,
      color: null,
      isTargetable: true,
      weight: 1,
      priority: 0,
    }
  }

  private buildSuggestedFeatureRule(
    groupKey: string,
    groupProperty: string,
    seeds: Array<{
      subcategory: string
      itemType: string
      matchField: string | null
      matchValue: string | null
      label: string
      icon: string | null
      color: string | null
      isTargetable: boolean
      weight: number
      priority: number
    }>
  ): SuggestedRuleData {
    const seed = seeds.find((s) => {
      if (groupProperty === 'subtype' && s.matchField === 'system.type.value') {
        return s.matchValue === groupKey
      }
      if (groupProperty === 'type') {
        return s.itemType === groupKey
      }
      return false
    })

    if (seed) {
      return {
        category: 'feature',
        subcategory: seed.subcategory,
        itemType: seed.itemType,
        matchField: seed.matchField,
        matchValue: seed.matchValue,
        label: seed.label,
        icon: seed.icon,
        color: seed.color,
        isTargetable: seed.isTargetable,
        weight: seed.weight,
        priority: seed.priority,
      }
    }

    return {
      category: 'feature',
      subcategory: groupKey,
      itemType: groupProperty === 'type' ? groupKey : 'feat',
      matchField: groupProperty === 'subtype' ? 'system.type.value' : null,
      matchValue: groupProperty === 'subtype' ? groupKey : null,
      label: this.resolveLabel(groupKey, []),
      icon: null,
      color: null,
      isTargetable: true,
      weight: 1,
      priority: 0,
    }
  }

  private buildSuggestedInventoryRule(
    groupKey: string,
    seeds: Array<{
      subcategory: string
      itemType: string
      matchField: string | null
      matchValue: string | null
      label: string
      icon: string | null
      color: string | null
      isTargetable: boolean
      weight: number
      priority: number
    }>
  ): SuggestedRuleData {
    const seed = seeds.find((s) => s.itemType === groupKey)

    if (seed) {
      return {
        category: 'inventory',
        subcategory: seed.subcategory,
        itemType: seed.itemType,
        matchField: seed.matchField,
        matchValue: seed.matchValue,
        label: seed.label,
        icon: seed.icon,
        color: seed.color,
        isTargetable: seed.isTargetable,
        weight: seed.weight,
        priority: seed.priority,
      }
    }

    return {
      category: 'inventory',
      subcategory: groupKey,
      itemType: groupKey,
      matchField: null,
      matchValue: null,
      label: this.resolveLabel(groupKey, []),
      icon: null,
      color: null,
      isTargetable: false,
      weight: 1,
      priority: 0,
    }
  }

  // ─── Matching existing rules ─────────────────────────────

  private findMatchingRule(
    rules: CampaignItemCategoryRule[],
    groupKey: string,
    groupProperty: string,
    _category: 'spell' | 'feature' | 'inventory'
  ): ItemGroup['existingRule'] {
    const match = rules.find((r) => {
      if (groupProperty === 'school') {
        return r.matchField === 'system.school' && r.matchValue === groupKey
      }
      if (groupProperty === 'subtype') {
        return r.matchField === 'system.type.value' && r.matchValue === groupKey
      }
      // type-based grouping: match by itemType without field matching
      return r.itemType === groupKey && !r.matchField
    })

    if (!match) return null

    return {
      id: match.id,
      category: match.category,
      label: match.label,
      isEnabled: match.isEnabled,
    }
  }

  // ─── Helpers ─────────────────────────────────────────────

  private resolveLabel(
    key: string,
    seeds: Array<{ matchValue: string | null; itemType: string; label: string }>
  ): string {
    // Try seed label first (most specific)
    const seedMatch = seeds.find((s) => s.matchValue === key || s.itemType === key)
    if (seedMatch) return seedMatch.label

    // Try static label map
    if (LABEL_MAP[key]) return LABEL_MAP[key]

    // Fallback: titlecase the raw value
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/[-_]/g, ' ')
  }

  /**
   * Extract an array of items from the inventory JSONB.
   * Handles both array format and keyed object format.
   * Reuses the same logic as ItemCategorySyncService.
   */
  private extractInventoryItems(inventory: object): Array<Record<string, unknown>> {
    if (Array.isArray(inventory)) return inventory as Array<Record<string, unknown>>
    if (typeof inventory === 'object' && inventory !== null) {
      const values = Object.values(inventory)
      if (values.length > 0 && typeof values[0] === 'object') {
        return values as Array<Record<string, unknown>>
      }
    }
    return []
  }
}
