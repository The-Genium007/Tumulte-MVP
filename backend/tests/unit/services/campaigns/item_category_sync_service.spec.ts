import { test } from '@japa/runner'
import { ItemCategorySyncService } from '#services/campaigns/item_category_sync_service'
import type CampaignItemCategoryRule from '#models/campaign_item_category_rule'

// ========================================
// MOCK HELPERS
// ========================================

function createMockRule(
  overrides: Partial<CampaignItemCategoryRule> = {}
): CampaignItemCategoryRule {
  return {
    id: 'rule-1',
    campaignId: 'campaign-1',
    category: 'spell',
    subcategory: 'evocation',
    itemType: 'spell',
    matchField: 'system.school',
    matchValue: 'evo',
    label: 'Evocation',
    description: null,
    icon: 'flame',
    color: '#EF4444',
    isTargetable: true,
    weight: 1,
    priority: 5,
    isEnabled: true,
    ...overrides,
  } as CampaignItemCategoryRule
}

function createMockCharacter(overrides: Record<string, unknown> = {}) {
  let savedSummary: unknown = null
  let savedHash: unknown = null

  const character = {
    id: 'char-1',
    campaignId: 'campaign-1',
    name: 'Gandalf',
    itemCategorySummary: null as Record<string, Record<string, number>> | null,
    itemCategoryHash: null as string | null,
    spells: null as unknown[] | null,
    features: null as unknown[] | null,
    inventory: null as object | null,
    save: async () => {
      savedSummary = character.itemCategorySummary
      savedHash = character.itemCategoryHash
    },
    ...overrides,
  }

  return {
    character,
    getSavedSummary: () => savedSummary,
    getSavedHash: () => savedHash,
  }
}

function createMockRepository(overrides: Record<string, unknown> = {}) {
  return {
    findById: async () => null,
    findByCampaign: async () => [],
    findByCampaignAndCategory: async () => [],
    findTargetableByCampaign: async () => [],
    countByCampaign: async () => 0,
    create: async (data: Partial<CampaignItemCategoryRule>) => ({ id: 'rule-1', ...data }),
    createMany: async (data: Partial<CampaignItemCategoryRule>[]) =>
      data.map((d, i) => ({ id: `rule-${i + 1}`, ...d })),
    update: async (rule: CampaignItemCategoryRule) => rule,
    delete: async () => {},
    deleteByCampaign: async () => {},
    ...overrides,
  }
}

// ========================================
// TESTS — syncCharacterCategories
// ========================================

test.group('ItemCategorySyncService - syncCharacterCategories', () => {
  test('should return changed=false when no rules exist', async ({ assert }) => {
    const repository = createMockRepository({
      findByCampaign: async () => [],
    })

    const { character } = createMockCharacter()
    const service = new ItemCategorySyncService(repository as any)
    const result = await service.syncCharacterCategories(character as any, 'campaign-1')

    assert.isFalse(result.changed)
    assert.deepEqual(result.summary, {})
  })

  test('should return changed=false when all rules are disabled', async ({ assert }) => {
    const repository = createMockRepository({
      findByCampaign: async () => [createMockRule({ isEnabled: false })],
    })

    const { character } = createMockCharacter({
      spells: [
        {
          id: 's1',
          name: 'Fireball',
          type: 'spell',
          school: 'evo',
          level: 3,
          img: null,
          prepared: null,
          uses: null,
        },
      ],
    })

    const service = new ItemCategorySyncService(repository as any)
    const result = await service.syncCharacterCategories(character as any, 'campaign-1')

    assert.isFalse(result.changed)
    assert.deepEqual(result.summary, {})
  })

  test('should categorize spells by school with matchField', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'rule-evo',
        subcategory: 'evocation',
        matchField: 'system.school',
        matchValue: 'evo',
      }),
      createMockRule({
        id: 'rule-abj',
        subcategory: 'abjuration',
        matchField: 'system.school',
        matchValue: 'abj',
      }),
    ]

    const repository = createMockRepository({
      findByCampaign: async () => rules,
    })

    const { character } = createMockCharacter({
      spells: [
        {
          id: 's1',
          name: 'Fireball',
          type: 'spell',
          school: 'evo',
          level: 3,
          img: null,
          prepared: null,
          uses: null,
        },
        {
          id: 's2',
          name: 'Shield',
          type: 'spell',
          school: 'abj',
          level: 1,
          img: null,
          prepared: null,
          uses: null,
        },
        {
          id: 's3',
          name: 'Burning Hands',
          type: 'spell',
          school: 'evo',
          level: 1,
          img: null,
          prepared: null,
          uses: null,
        },
      ],
    })

    const service = new ItemCategorySyncService(repository as any)
    const result = await service.syncCharacterCategories(character as any, 'campaign-1')

    assert.isTrue(result.changed)
    assert.deepEqual(result.summary.spell, { evocation: 2, abjuration: 1 })
  })

  test('should categorize features by itemType', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'rule-feat',
        category: 'feature',
        subcategory: 'class_feature',
        itemType: 'feat',
        matchField: 'system.type.value',
        matchValue: 'class',
      }),
      createMockRule({
        id: 'rule-trait',
        category: 'feature',
        subcategory: 'racial_trait',
        itemType: 'feat',
        matchField: 'system.type.value',
        matchValue: 'race',
      }),
    ]

    const repository = createMockRepository({
      findByCampaign: async () => rules,
    })

    const { character } = createMockCharacter({
      features: [
        { id: 'f1', name: 'Action Surge', type: 'feat', subtype: 'class', img: null, uses: null },
        { id: 'f2', name: 'Darkvision', type: 'feat', subtype: 'race', img: null, uses: null },
      ],
    })

    const service = new ItemCategorySyncService(repository as any)
    const result = await service.syncCharacterCategories(character as any, 'campaign-1')

    assert.isTrue(result.changed)
    assert.deepEqual(result.summary.feature, { class_feature: 1, racial_trait: 1 })
  })

  test('should categorize inventory items', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'rule-weapon',
        category: 'inventory',
        subcategory: 'weapon',
        itemType: 'weapon',
        matchField: null,
        matchValue: null,
      }),
      createMockRule({
        id: 'rule-armor',
        category: 'inventory',
        subcategory: 'armor',
        itemType: 'armor',
        matchField: null,
        matchValue: null,
      }),
    ]

    const repository = createMockRepository({
      findByCampaign: async () => rules,
    })

    const { character } = createMockCharacter({
      inventory: [
        { type: 'weapon', name: 'Longsword' },
        { type: 'weapon', name: 'Shortbow' },
        { type: 'armor', name: 'Chain Mail' },
        { type: 'loot', name: 'Gold Coin' },
      ],
    })

    const service = new ItemCategorySyncService(repository as any)
    const result = await service.syncCharacterCategories(character as any, 'campaign-1')

    assert.isTrue(result.changed)
    assert.deepEqual(result.summary.inventory, { weapon: 2, armor: 1 })
  })

  test('should handle inventory as keyed object', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'rule-weapon',
        category: 'inventory',
        subcategory: 'weapon',
        itemType: 'weapon',
        matchField: null,
        matchValue: null,
      }),
    ]

    const repository = createMockRepository({
      findByCampaign: async () => rules,
    })

    const { character } = createMockCharacter({
      inventory: {
        item1: { type: 'weapon', name: 'Dagger' },
        item2: { type: 'weapon', name: 'Staff' },
      },
    })

    const service = new ItemCategorySyncService(repository as any)
    const result = await service.syncCharacterCategories(character as any, 'campaign-1')

    assert.isTrue(result.changed)
    assert.deepEqual(result.summary.inventory, { weapon: 2 })
  })

  test('should skip DB write when hash has not changed (dedup)', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'rule-evo',
        subcategory: 'evocation',
        matchField: 'system.school',
        matchValue: 'evo',
      }),
    ]

    const repository = createMockRepository({
      findByCampaign: async () => rules,
    })

    const spells = [
      {
        id: 's1',
        name: 'Fireball',
        type: 'spell',
        school: 'evo',
        level: 3,
        img: null,
        prepared: null,
        uses: null,
      },
    ]

    // First call — should change
    const { character: char1 } = createMockCharacter({ spells })
    const service = new ItemCategorySyncService(repository as any)
    const result1 = await service.syncCharacterCategories(char1 as any, 'campaign-1')
    assert.isTrue(result1.changed)

    // Second call with same hash — should NOT change
    const { character: char2 } = createMockCharacter({
      spells,
      itemCategoryHash: char1.itemCategoryHash,
    })
    const result2 = await service.syncCharacterCategories(char2 as any, 'campaign-1')
    assert.isFalse(result2.changed)
  })

  test('should detect change when character data changes', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'rule-evo',
        subcategory: 'evocation',
        matchField: 'system.school',
        matchValue: 'evo',
      }),
    ]

    const repository = createMockRepository({
      findByCampaign: async () => rules,
    })

    // First sync
    const { character: char1 } = createMockCharacter({
      spells: [
        {
          id: 's1',
          name: 'Fireball',
          type: 'spell',
          school: 'evo',
          level: 3,
          img: null,
          prepared: null,
          uses: null,
        },
      ],
    })
    const service = new ItemCategorySyncService(repository as any)
    const result1 = await service.syncCharacterCategories(char1 as any, 'campaign-1')
    assert.isTrue(result1.changed)

    // Second sync with different spells — should change even if old hash is set
    const { character: char2 } = createMockCharacter({
      spells: [
        {
          id: 's1',
          name: 'Fireball',
          type: 'spell',
          school: 'evo',
          level: 3,
          img: null,
          prepared: null,
          uses: null,
        },
        {
          id: 's2',
          name: 'Lightning Bolt',
          type: 'spell',
          school: 'evo',
          level: 3,
          img: null,
          prepared: null,
          uses: null,
        },
      ],
      itemCategoryHash: char1.itemCategoryHash,
    })
    const result2 = await service.syncCharacterCategories(char2 as any, 'campaign-1')
    assert.isTrue(result2.changed)
    assert.deepEqual(result2.summary.spell, { evocation: 2 })
  })

  test('should produce empty summary for character with no items', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'rule-evo',
        subcategory: 'evocation',
        matchField: 'system.school',
        matchValue: 'evo',
      }),
      createMockRule({
        id: 'rule-weapon',
        category: 'inventory',
        subcategory: 'weapon',
        itemType: 'weapon',
        matchField: null,
        matchValue: null,
      }),
    ]

    const repository = createMockRepository({
      findByCampaign: async () => rules,
    })

    const { character } = createMockCharacter({
      spells: null,
      features: null,
      inventory: null,
    })

    const service = new ItemCategorySyncService(repository as any)
    const result = await service.syncCharacterCategories(character as any, 'campaign-1')

    // Summary is empty but hash is still computed and different from null
    assert.isTrue(result.changed)
    assert.deepEqual(result.summary, {})
  })

  test('should handle mixed categories (spell + feature + inventory)', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'rule-spell',
        category: 'spell',
        subcategory: 'spell',
        itemType: 'spell',
        matchField: null,
        matchValue: null,
      }),
      createMockRule({
        id: 'rule-feat',
        category: 'feature',
        subcategory: 'talent',
        itemType: 'talent',
        matchField: null,
        matchValue: null,
      }),
      createMockRule({
        id: 'rule-weapon',
        category: 'inventory',
        subcategory: 'weapon',
        itemType: 'weapon',
        matchField: null,
        matchValue: null,
      }),
    ]

    const repository = createMockRepository({
      findByCampaign: async () => rules,
    })

    const { character } = createMockCharacter({
      spells: [
        {
          id: 's1',
          name: 'Magic Missile',
          type: 'spell',
          school: null,
          level: 1,
          img: null,
          prepared: null,
          uses: null,
        },
      ],
      features: [
        { id: 'f1', name: 'Quick Draw', type: 'talent', subtype: null, img: null, uses: null },
        { id: 'f2', name: 'Iron Jaw', type: 'talent', subtype: null, img: null, uses: null },
      ],
      inventory: [{ type: 'weapon', name: 'Sword' }],
    })

    const service = new ItemCategorySyncService(repository as any)
    const result = await service.syncCharacterCategories(character as any, 'campaign-1')

    assert.isTrue(result.changed)
    assert.deepEqual(result.summary.spell, { spell: 1 })
    assert.deepEqual(result.summary.feature, { talent: 2 })
    assert.deepEqual(result.summary.inventory, { weapon: 1 })
  })

  test('should not match spells that dont match any rule', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'rule-evo',
        subcategory: 'evocation',
        matchField: 'system.school',
        matchValue: 'evo',
      }),
    ]

    const repository = createMockRepository({
      findByCampaign: async () => rules,
    })

    const { character } = createMockCharacter({
      spells: [
        {
          id: 's1',
          name: 'Shield',
          type: 'spell',
          school: 'abj',
          level: 1,
          img: null,
          prepared: null,
          uses: null,
        },
        {
          id: 's2',
          name: 'Sleep',
          type: 'spell',
          school: 'enc',
          level: 1,
          img: null,
          prepared: null,
          uses: null,
        },
      ],
    })

    const service = new ItemCategorySyncService(repository as any)
    const result = await service.syncCharacterCategories(character as any, 'campaign-1')

    assert.isTrue(result.changed)
    assert.isUndefined(result.summary.spell)
  })
})
