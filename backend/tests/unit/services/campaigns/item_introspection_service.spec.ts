import { test } from '@japa/runner'
import { ItemIntrospectionService } from '#services/campaigns/item_introspection_service'
import type { SpellInfo, FeatureInfo } from '#models/character'
import type CampaignItemCategoryRule from '#models/campaign_item_category_rule'

// ========================================
// HELPERS
// ========================================

function createMockRuleRepository(rules: Partial<CampaignItemCategoryRule>[] = []) {
  return {
    findByCampaign: async (_campaignId: string) => rules as CampaignItemCategoryRule[],
  } as any
}

function createMockCharacter(overrides: Record<string, unknown> = {}) {
  return {
    id: `char-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Character',
    spells: [],
    features: [],
    inventory: [],
    ...overrides,
  } as any
}

function createSpell(overrides: Partial<SpellInfo> = {}): SpellInfo {
  return {
    id: `spell-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Spell',
    img: '/icons/spell.webp',
    type: 'spell',
    level: 1,
    school: 'evo',
    prepared: true,
    uses: null,
    ...overrides,
  }
}

function createFeature(overrides: Partial<FeatureInfo> = {}): FeatureInfo {
  return {
    id: `feat-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Feature',
    img: '/icons/feature.webp',
    type: 'feat',
    subtype: 'class',
    uses: null,
    ...overrides,
  }
}

function createRule(overrides: Partial<CampaignItemCategoryRule> = {}) {
  return {
    id: `rule-${Math.random().toString(36).slice(2, 8)}`,
    campaignId: 'campaign-1',
    category: 'spell',
    subcategory: 'evocation',
    itemType: 'spell',
    matchField: null,
    matchValue: null,
    label: 'Test Rule',
    isEnabled: true,
    ...overrides,
  } as Partial<CampaignItemCategoryRule>
}

// ========================================
// TESTS — buildSpellSource (via private method, tested through buildIntrospectionTree)
// ========================================

test.group('ItemIntrospectionService — spell source building', () => {
  test('should build spell source grouped by school when spells have school data', async ({
    assert,
  }) => {
    const characters = [
      createMockCharacter({
        spells: [
          createSpell({ name: 'Fireball', school: 'evo' }),
          createSpell({ name: 'Shield', school: 'abj' }),
          createSpell({ name: 'Lightning Bolt', school: 'evo' }),
        ],
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    // Access private method via prototype
    const result = (service as any).buildSpellSource(characters, [], [])

    assert.equal(result.key, 'spells')
    assert.equal(result.label, 'Sorts')
    assert.equal(result.totalCount, 3)
    assert.lengthOf(result.groups, 2)

    // Groups should be sorted by count descending
    assert.equal(result.groups[0].groupKey, 'evo')
    assert.equal(result.groups[0].count, 2)
    assert.equal(result.groups[0].groupProperty, 'school')

    assert.equal(result.groups[1].groupKey, 'abj')
    assert.equal(result.groups[1].count, 1)
  })

  test('should group by type when spells have no school data', async ({ assert }) => {
    const characters = [
      createMockCharacter({
        spells: [
          createSpell({ name: 'Power Word', school: null, type: 'spell' }),
          createSpell({ name: 'Cantrip', school: null, type: 'cantrip' }),
        ],
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSpellSource(characters, [], [])

    assert.equal(result.totalCount, 2)
    assert.isTrue(result.groups.some((g: any) => g.groupProperty === 'type'))
  })

  test('should return empty groups when no characters have spells', async ({ assert }) => {
    const characters = [createMockCharacter({ spells: [] }), createMockCharacter({ spells: null })]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSpellSource(characters, [], [])

    assert.equal(result.totalCount, 0)
    assert.lengthOf(result.groups, 0)
  })

  test('should aggregate spells across multiple characters', async ({ assert }) => {
    const characters = [
      createMockCharacter({
        spells: [createSpell({ school: 'evo' }), createSpell({ school: 'evo' })],
      }),
      createMockCharacter({
        spells: [createSpell({ school: 'evo' }), createSpell({ school: 'nec' })],
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSpellSource(characters, [], [])

    assert.equal(result.totalCount, 4)
    const evoGroup = result.groups.find((g: any) => g.groupKey === 'evo')
    assert.equal(evoGroup.count, 3)
  })
})

// ========================================
// TESTS — buildFeatureSource
// ========================================

test.group('ItemIntrospectionService — feature source building', () => {
  test('should build feature source grouped by subtype when features have subtype', async ({
    assert,
  }) => {
    const characters = [
      createMockCharacter({
        features: [
          createFeature({ name: 'Rage', subtype: 'class' }),
          createFeature({ name: 'Darkvision', subtype: 'race' }),
          createFeature({ name: 'Sneak Attack', subtype: 'class' }),
        ],
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildFeatureSource(characters, [], [])

    assert.equal(result.key, 'features')
    assert.equal(result.label, 'Capacités')
    assert.equal(result.totalCount, 3)

    // Groups should be sorted by count descending
    assert.equal(result.groups[0].groupKey, 'class')
    assert.equal(result.groups[0].count, 2)
  })

  test('should group by type when features have no subtype', async ({ assert }) => {
    const characters = [
      createMockCharacter({
        features: [
          createFeature({ name: 'Feat1', subtype: null, type: 'feat' }),
          createFeature({ name: 'Feat2', subtype: null, type: 'class' }),
        ],
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildFeatureSource(characters, [], [])

    assert.isTrue(result.groups.every((g: any) => g.groupProperty === 'type'))
  })

  test('should return empty groups when no characters have features', async ({ assert }) => {
    const characters = [createMockCharacter({ features: [] })]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildFeatureSource(characters, [], [])

    assert.equal(result.totalCount, 0)
    assert.lengthOf(result.groups, 0)
  })
})

// ========================================
// TESTS — buildInventorySource
// ========================================

test.group('ItemIntrospectionService — inventory source building', () => {
  test('should build inventory source grouped by item type', async ({ assert }) => {
    const characters = [
      createMockCharacter({
        inventory: [
          { name: 'Sword', type: 'weapon', quantity: 1, equipped: true },
          { name: 'Shield', type: 'armor', quantity: 1, equipped: true },
          { name: 'Dagger', type: 'weapon', quantity: 2, equipped: false },
        ],
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildInventorySource(characters, [], [])

    assert.equal(result.key, 'inventory')
    assert.equal(result.label, 'Inventaire')
    assert.equal(result.totalCount, 3)

    const weaponGroup = result.groups.find((g: any) => g.groupKey === 'weapon')
    assert.equal(weaponGroup.count, 2)
  })

  test('should handle keyed object format for inventory', async ({ assert }) => {
    const characters = [
      createMockCharacter({
        inventory: {
          item1: { name: 'Sword', type: 'weapon', quantity: 1, equipped: true },
          item2: { name: 'Potion', type: 'consumable', quantity: 5, equipped: false },
        },
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildInventorySource(characters, [], [])

    assert.equal(result.totalCount, 2)
    assert.isTrue(result.groups.some((g: any) => g.groupKey === 'weapon'))
    assert.isTrue(result.groups.some((g: any) => g.groupKey === 'consumable'))
  })

  test('should handle empty inventory', async ({ assert }) => {
    const characters = [createMockCharacter({ inventory: null })]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildInventorySource(characters, [], [])

    assert.equal(result.totalCount, 0)
    assert.lengthOf(result.groups, 0)
  })
})

// ========================================
// TESTS — samples
// ========================================

test.group('ItemIntrospectionService — samples', () => {
  test('should limit spell samples to 5', async ({ assert }) => {
    const spells = Array.from({ length: 10 }, (_, i) =>
      createSpell({ name: `Spell ${i}`, school: 'evo' })
    )

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSpellSamples(spells)

    assert.lengthOf(result, 5)
    assert.equal(result[0].name, 'Spell 0')
  })

  test('should build spell samples with correct properties', async ({ assert }) => {
    const spells = [
      createSpell({ name: 'Fireball', type: 'spell', level: 3, school: 'evo', prepared: true }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSpellSamples(spells)

    assert.lengthOf(result, 1)
    assert.equal(result[0].name, 'Fireball')
    assert.equal(result[0].properties.type, 'spell')
    assert.equal(result[0].properties.level, 3)
    assert.equal(result[0].properties.school, 'evo')
    assert.isTrue(result[0].properties.prepared)
  })

  test('should build feature samples with correct properties', async ({ assert }) => {
    const features = [createFeature({ name: 'Rage', type: 'feat', subtype: 'class' })]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildFeatureSamples(features)

    assert.lengthOf(result, 1)
    assert.equal(result[0].name, 'Rage')
    assert.equal(result[0].properties.type, 'feat')
    assert.equal(result[0].properties.subtype, 'class')
  })

  test('should build inventory samples with correct properties', async ({ assert }) => {
    const items = [{ name: 'Sword', type: 'weapon', quantity: 1, equipped: true }]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildInventorySamples(items)

    assert.lengthOf(result, 1)
    assert.equal(result[0].name, 'Sword')
    assert.equal(result[0].properties.type, 'weapon')
    assert.equal(result[0].properties.quantity, 1)
    assert.isTrue(result[0].properties.equipped)
  })

  test('should default name to Inconnu for nameless inventory items', async ({ assert }) => {
    const items = [{ type: 'loot', quantity: 1 }]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildInventorySamples(items)

    assert.equal(result[0].name, 'Inconnu')
  })
})

// ========================================
// TESTS — suggested rules
// ========================================

test.group('ItemIntrospectionService — suggested spell rules', () => {
  test('should generate default rule when no seed matches', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSuggestedSpellRule('evo', 'school', [])

    assert.equal(result.category, 'spell')
    assert.equal(result.subcategory, 'evo')
    assert.equal(result.itemType, 'spell')
    assert.equal(result.matchField, 'system.school')
    assert.equal(result.matchValue, 'evo')
    assert.isTrue(result.isTargetable)
    assert.equal(result.weight, 1)
    assert.equal(result.priority, 0)
  })

  test('should use seed data when a matching seed is found', async ({ assert }) => {
    const seeds = [
      {
        subcategory: 'evocation',
        itemType: 'spell',
        matchField: 'system.school',
        matchValue: 'evo',
        label: 'Évocation',
        icon: 'fire-icon',
        color: '#ff0000',
        isTargetable: true,
        weight: 2,
        priority: 10,
      },
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSuggestedSpellRule('evo', 'school', seeds)

    assert.equal(result.category, 'spell')
    assert.equal(result.subcategory, 'evocation')
    assert.equal(result.label, 'Évocation')
    assert.equal(result.icon, 'fire-icon')
    assert.equal(result.color, '#ff0000')
    assert.equal(result.weight, 2)
    assert.equal(result.priority, 10)
  })

  test('should generate type-based default rule when groupProperty is type', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSuggestedSpellRule('cantrip', 'type', [])

    assert.equal(result.category, 'spell')
    assert.equal(result.itemType, 'cantrip')
    assert.isNull(result.matchField)
    assert.isNull(result.matchValue)
  })
})

test.group('ItemIntrospectionService — suggested feature rules', () => {
  test('should generate default rule for subtype grouping', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSuggestedFeatureRule('class', 'subtype', [])

    assert.equal(result.category, 'feature')
    assert.equal(result.subcategory, 'class')
    assert.equal(result.itemType, 'feat')
    assert.equal(result.matchField, 'system.type.value')
    assert.equal(result.matchValue, 'class')
  })

  test('should generate default rule for type grouping', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSuggestedFeatureRule('feat', 'type', [])

    assert.equal(result.category, 'feature')
    assert.equal(result.itemType, 'feat')
    assert.isNull(result.matchField)
    assert.isNull(result.matchValue)
  })

  test('should use seed data when matching subtype seed is found', async ({ assert }) => {
    const seeds = [
      {
        subcategory: 'class_feature',
        itemType: 'feature',
        matchField: 'system.type.value',
        matchValue: 'class',
        label: 'Classe',
        icon: 'class-icon',
        color: '#00ff00',
        isTargetable: false,
        weight: 3,
        priority: 5,
      },
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSuggestedFeatureRule('class', 'subtype', seeds)

    assert.equal(result.label, 'Classe')
    assert.equal(result.icon, 'class-icon')
    assert.equal(result.weight, 3)
  })
})

test.group('ItemIntrospectionService — suggested inventory rules', () => {
  test('should generate default inventory rule', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSuggestedInventoryRule('weapon', [])

    assert.equal(result.category, 'inventory')
    assert.equal(result.subcategory, 'weapon')
    assert.equal(result.itemType, 'weapon')
    assert.isNull(result.matchField)
    assert.isNull(result.matchValue)
    assert.isFalse(result.isTargetable) // inventory defaults to not targetable
  })

  test('should use seed data when matching', async ({ assert }) => {
    const seeds = [
      {
        subcategory: 'weapons',
        itemType: 'weapon',
        matchField: null,
        matchValue: null,
        label: 'Armes',
        icon: 'sword-icon',
        color: '#0000ff',
        isTargetable: true,
        weight: 5,
        priority: 1,
      },
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).buildSuggestedInventoryRule('weapon', seeds)

    assert.equal(result.label, 'Armes')
    assert.equal(result.icon, 'sword-icon')
    assert.isTrue(result.isTargetable)
  })
})

// ========================================
// TESTS — findMatchingRule
// ========================================

test.group('ItemIntrospectionService — findMatchingRule', () => {
  test('should find matching rule by school', async ({ assert }) => {
    const rules = [
      createRule({
        id: 'rule-1',
        category: 'spell',
        matchField: 'system.school',
        matchValue: 'evo',
        label: 'Évocation',
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).findMatchingRule(rules, 'evo', 'school', 'spell')

    assert.isNotNull(result)
    assert.equal(result.id, 'rule-1')
    assert.equal(result.label, 'Évocation')
  })

  test('should find matching rule by subtype', async ({ assert }) => {
    const rules = [
      createRule({
        id: 'rule-2',
        category: 'feature',
        matchField: 'system.type.value',
        matchValue: 'class',
        label: 'Classe',
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).findMatchingRule(rules, 'class', 'subtype', 'feature')

    assert.isNotNull(result)
    assert.equal(result.id, 'rule-2')
  })

  test('should find matching rule by itemType for type grouping', async ({ assert }) => {
    const rules = [
      createRule({
        id: 'rule-3',
        category: 'inventory',
        itemType: 'weapon',
        matchField: null,
        matchValue: null,
        label: 'Armes',
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).findMatchingRule(rules, 'weapon', 'type', 'inventory')

    assert.isNotNull(result)
    assert.equal(result.id, 'rule-3')
  })

  test('should return null when no matching rule exists', async ({ assert }) => {
    const rules = [
      createRule({
        category: 'spell',
        matchField: 'system.school',
        matchValue: 'abj',
      }),
    ]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).findMatchingRule(rules, 'evo', 'school', 'spell')

    assert.isNull(result)
  })
})

// ========================================
// TESTS — resolveLabel
// ========================================

test.group('ItemIntrospectionService — resolveLabel', () => {
  test('should resolve label from seed data first', async ({ assert }) => {
    const seeds = [{ matchValue: 'evo', itemType: 'spell', label: 'Seed Évocation' }]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).resolveLabel('evo', seeds)

    assert.equal(result, 'Seed Évocation')
  })

  test('should fallback to static LABEL_MAP', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    assert.equal((service as any).resolveLabel('evo', []), 'Évocation')
    assert.equal((service as any).resolveLabel('nec', []), 'Nécromancie')
    assert.equal((service as any).resolveLabel('weapon', []), 'Armes')
    assert.equal((service as any).resolveLabel('class', []), 'Classe')
  })

  test('should titlecase unknown keys as fallback', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    assert.equal((service as any).resolveLabel('custom_type', []), 'Custom type')
    assert.equal((service as any).resolveLabel('foo-bar', []), 'Foo bar')
  })

  test('should match seed by itemType when matchValue does not match', async ({ assert }) => {
    const seeds = [{ matchValue: 'other', itemType: 'weapon', label: 'Armes (seed)' }]

    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const result = (service as any).resolveLabel('weapon', seeds)

    assert.equal(result, 'Armes (seed)')
  })
})

// ========================================
// TESTS — extractInventoryItems
// ========================================

test.group('ItemIntrospectionService — extractInventoryItems', () => {
  test('should return array directly if inventory is already an array', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const items = [{ name: 'Sword', type: 'weapon' }]
    const result = (service as any).extractInventoryItems(items)

    assert.lengthOf(result, 1)
    assert.equal(result[0].name, 'Sword')
  })

  test('should extract values from keyed object', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const inventory = {
      item1: { name: 'Sword', type: 'weapon' },
      item2: { name: 'Shield', type: 'armor' },
    }
    const result = (service as any).extractInventoryItems(inventory)

    assert.lengthOf(result, 2)
  })

  test('should return empty array for non-object inventory', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    assert.lengthOf((service as any).extractInventoryItems({}), 0)
  })

  test('should return empty array when object values are not objects', async ({ assert }) => {
    const repo = createMockRuleRepository()
    const service = new ItemIntrospectionService(repo)

    const inventory = { a: 1, b: 2 }
    const result = (service as any).extractInventoryItems(inventory)

    assert.lengthOf(result, 0)
  })
})
