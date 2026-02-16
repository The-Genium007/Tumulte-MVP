import { test } from '@japa/runner'
import { ItemCategoryDetectionService } from '#services/campaigns/item_category_detection_service'
import type CampaignItemCategoryRule from '#models/campaign_item_category_rule'

// ========================================
// MOCK REPOSITORY
// ========================================

function createMockRepository(overrides: Record<string, unknown> = {}) {
  return {
    findById: async () => null,
    findByCampaign: async () => [],
    findByCampaignAndCategory: async () => [],
    findTargetableByCampaign: async () => [],
    countByCampaign: async () => 0,
    create: async (data: Partial<CampaignItemCategoryRule>) => ({
      id: 'rule-1',
      ...data,
    }),
    createMany: async (data: Partial<CampaignItemCategoryRule>[]) =>
      data.map((d, i) => ({
        id: `rule-${i + 1}`,
        ...d,
      })),
    update: async (rule: CampaignItemCategoryRule) => rule,
    delete: async () => {},
    deleteByCampaign: async () => {},
    ...overrides,
  }
}

// ========================================
// TESTS — detectAndSeedCategories (core)
// ========================================

test.group('ItemCategoryDetectionService - detectAndSeedCategories', () => {
  test('should seed D&D 5e categories for a new campaign', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []

    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    const result = await service.detectAndSeedCategories('campaign-123', 'dnd5e')

    assert.isTrue(result.length > 0)
    assert.isTrue(capturedData.length > 0)

    // D&D 5e has 18 entries: 9 spell schools + 3 features + 6 inventory
    assert.equal(capturedData.length, 18)

    // Check campaignId is set on all rules
    for (const rule of capturedData) {
      assert.equal(rule.campaignId, 'campaign-123')
    }

    // Check categories breakdown
    const spells = capturedData.filter((r) => r.category === 'spell')
    const features = capturedData.filter((r) => r.category === 'feature')
    const inventory = capturedData.filter((r) => r.category === 'inventory')

    assert.equal(spells.length, 9) // 8 schools + cantrips
    assert.equal(features.length, 3) // class, racial, feat
    assert.equal(inventory.length, 6) // weapon, equipment, consumable, tool, loot, container
  })

  test('should not overwrite existing rules (idempotency)', async ({ assert }) => {
    let createManyCalled = false
    const existingRules = [{ id: 'existing-rule' }]

    const repository = createMockRepository({
      countByCampaign: async () => 5,
      findByCampaign: async () => existingRules,
      createMany: async () => {
        createManyCalled = true
        return []
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    const result = await service.detectAndSeedCategories('campaign-123', 'dnd5e')

    assert.isFalse(createManyCalled)
    assert.deepEqual(result, existingRules as any)
  })

  test('should return empty array for unknown system ID', async ({ assert }) => {
    let createManyCalled = false

    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async () => {
        createManyCalled = true
        return []
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    const result = await service.detectAndSeedCategories('campaign-123', 'unknown_system')

    assert.deepEqual(result, [])
    assert.isFalse(createManyCalled)
  })

  test('should return empty array when no system ID is provided', async ({ assert }) => {
    const repository = createMockRepository({
      countByCampaign: async () => 0,
    })

    const service = new ItemCategoryDetectionService(repository as any)
    const result = await service.detectAndSeedCategories('campaign-123')

    assert.deepEqual(result, [])
  })

  test('should seed PF2e categories with correct structure', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []

    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-456', 'pf2e')

    const spells = capturedData.filter((r) => r.category === 'spell')
    assert.equal(spells.length, 5) // arcane, divine, occult, primal, focus

    // Verify PF2e uses traditions as matchField
    const arcane = spells.find((s) => s.subcategory === 'arcane')
    assert.isNotNull(arcane)
    assert.equal(arcane!.matchField, 'system.traditions.value')
    assert.equal(arcane!.matchValue, 'arcane')
  })

  test('should set cantrips as non-targetable by default in D&D 5e', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []

    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-123', 'dnd5e')

    const cantrip = capturedData.find((r) => r.subcategory === 'cantrip')
    assert.isNotNull(cantrip)
    assert.isFalse(cantrip!.isTargetable)

    // Other schools should be targetable
    const evocation = capturedData.find((r) => r.subcategory === 'evocation')
    assert.isNotNull(evocation)
    assert.isTrue(evocation!.isTargetable)
  })

  test('should assign increasing priorities via index offset', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []

    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-123', 'dnd5e')

    // Each rule's priority should be seed.priority + its index
    const priorities = capturedData.map((r) => r.priority)
    assert.equal(priorities.length, 18)

    // The first item (cantrip, priority=10) should have priority 10+0=10
    assert.equal(priorities[0], 10)
    // The second item (abjuration, priority=5) should have priority 5+1=6
    assert.equal(priorities[1], 6)
    // The last item (container, priority=5) should have priority 5+17=22
    assert.equal(priorities[17], 22)
  })
})

// ========================================
// TESTS — New systems
// ========================================

test.group('ItemCategoryDetectionService - new system mappings', () => {
  test('should seed cyberpunk-red-core categories (7 rules)', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []
    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-1', 'cyberpunk-red-core')

    assert.equal(capturedData.length, 7)

    const subcategories = capturedData.map((r) => r.subcategory)
    assert.include(subcategories, 'program')
    assert.include(subcategories, 'cyberware')
    assert.include(subcategories, 'weapon')
    assert.include(subcategories, 'armor')
  })

  test('should seed alienrpg categories with no spells (5 rules)', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []
    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-1', 'alienrpg')

    assert.equal(capturedData.length, 5)

    // Alien RPG has no spells
    const spells = capturedData.filter((r) => r.category === 'spell')
    assert.equal(spells.length, 0)

    const subcategories = capturedData.map((r) => r.subcategory)
    assert.include(subcategories, 'talent')
    assert.include(subcategories, 'agenda')
  })

  test('should seed forbidden-lands categories (6 rules)', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []
    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-1', 'forbidden-lands')

    assert.equal(capturedData.length, 6)

    const subcategories = capturedData.map((r) => r.subcategory)
    assert.include(subcategories, 'spell')
    assert.include(subcategories, 'talent')
    assert.include(subcategories, 'critical_injury')
  })

  test('should seed vaesen categories with rituals (6 rules)', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []
    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-1', 'vaesen')

    assert.equal(capturedData.length, 6)

    const subcategories = capturedData.map((r) => r.subcategory)
    assert.include(subcategories, 'ritual')
    assert.include(subcategories, 'condition')
  })

  test('should seed blades-in-the-dark categories (5 rules)', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []
    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-1', 'blades-in-the-dark')

    assert.equal(capturedData.length, 5)

    const subcategories = capturedData.map((r) => r.subcategory)
    assert.include(subcategories, 'ghost')
    assert.include(subcategories, 'crew_ability')
  })

  test('should seed shadowrun5e categories (7 rules)', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []
    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-1', 'shadowrun5e')

    assert.equal(capturedData.length, 7)

    const subcategories = capturedData.map((r) => r.subcategory)
    assert.include(subcategories, 'complex_form')
    assert.include(subcategories, 'adept_power')
    assert.include(subcategories, 'metamagic')
  })

  test('should seed starwarsffg categories (6 rules)', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []
    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-1', 'starwarsffg')

    assert.equal(capturedData.length, 6)

    const subcategories = capturedData.map((r) => r.subcategory)
    assert.include(subcategories, 'forcepower')
    assert.include(subcategories, 'signatureability')
  })

  test('should seed fate-core-official categories with no inventory (4 rules)', async ({
    assert,
  }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []
    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-1', 'fate-core-official')

    assert.equal(capturedData.length, 4)

    // FATE has no inventory
    const inventory = capturedData.filter((r) => r.category === 'inventory')
    assert.equal(inventory.length, 0)

    const subcategories = capturedData.map((r) => r.subcategory)
    assert.include(subcategories, 'stunt')
    assert.include(subcategories, 'aspect')
  })

  test('should seed wod5e categories with background and power (5 rules)', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule>[] = []
    const repository = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        capturedData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service = new ItemCategoryDetectionService(repository as any)
    await service.detectAndSeedCategories('campaign-1', 'wod5e')

    assert.equal(capturedData.length, 5)

    const subcategories = capturedData.map((r) => r.subcategory)
    assert.include(subcategories, 'discipline')
    assert.include(subcategories, 'power')
    assert.include(subcategories, 'background')
    assert.include(subcategories, 'merit')
    assert.include(subcategories, 'flaw')
  })
})

// ========================================
// TESTS — Aliases
// ========================================

test.group('ItemCategoryDetectionService - aliases', () => {
  test('vtm5e should produce same rules as wod5e', async ({ assert }) => {
    let vtm5eData: Partial<CampaignItemCategoryRule>[] = []
    let wod5eData: Partial<CampaignItemCategoryRule>[] = []

    const repo1 = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        vtm5eData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })
    const repo2 = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        wod5eData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service1 = new ItemCategoryDetectionService(repo1 as any)
    const service2 = new ItemCategoryDetectionService(repo2 as any)

    await service1.detectAndSeedCategories('c1', 'vtm5e')
    await service2.detectAndSeedCategories('c2', 'wod5e')

    assert.equal(vtm5eData.length, wod5eData.length)
    for (let i = 0; i < vtm5eData.length; i++) {
      assert.equal(vtm5eData[i].subcategory, wod5eData[i].subcategory)
    }
  })

  test('shadowrun6-eden should produce same rules as shadowrun5e', async ({ assert }) => {
    let sr6Data: Partial<CampaignItemCategoryRule>[] = []
    let sr5Data: Partial<CampaignItemCategoryRule>[] = []

    const repo1 = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        sr6Data = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })
    const repo2 = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        sr5Data = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service1 = new ItemCategoryDetectionService(repo1 as any)
    const service2 = new ItemCategoryDetectionService(repo2 as any)

    await service1.detectAndSeedCategories('c1', 'shadowrun6-eden')
    await service2.detectAndSeedCategories('c2', 'shadowrun5e')

    assert.equal(sr6Data.length, sr5Data.length)
  })

  test('genesys should produce same rules as starwarsffg', async ({ assert }) => {
    let genesysData: Partial<CampaignItemCategoryRule>[] = []
    let swffgData: Partial<CampaignItemCategoryRule>[] = []

    const repo1 = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        genesysData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })
    const repo2 = createMockRepository({
      countByCampaign: async () => 0,
      createMany: async (data: Partial<CampaignItemCategoryRule>[]) => {
        swffgData = data
        return data.map((d, i) => ({ id: `rule-${i + 1}`, ...d }))
      },
    })

    const service1 = new ItemCategoryDetectionService(repo1 as any)
    const service2 = new ItemCategoryDetectionService(repo2 as any)

    await service1.detectAndSeedCategories('c1', 'genesys')
    await service2.detectAndSeedCategories('c2', 'starwarsffg')

    assert.equal(genesysData.length, swffgData.length)
  })
})

// ========================================
// TESTS — Static methods
// ========================================

test.group('ItemCategoryDetectionService - static methods', () => {
  test('getSupportedSystems should return all systems including aliases', ({ assert }) => {
    const systems = ItemCategoryDetectionService.getSupportedSystems()

    // 6 original + 8 new + 3 aliases = 17 entries
    assert.isTrue(systems.length >= 17)

    // Original systems
    assert.include(systems, 'dnd5e')
    assert.include(systems, 'pf2e')
    assert.include(systems, 'wfrp4e')
    assert.include(systems, 'swade')
    assert.include(systems, 'CoC7')
    assert.include(systems, 'wod5e')

    // New systems
    assert.include(systems, 'cyberpunk-red-core')
    assert.include(systems, 'alienrpg')
    assert.include(systems, 'forbidden-lands')
    assert.include(systems, 'vaesen')
    assert.include(systems, 'blades-in-the-dark')
    assert.include(systems, 'shadowrun5e')
    assert.include(systems, 'starwarsffg')
    assert.include(systems, 'fate-core-official')

    // Aliases
    assert.include(systems, 'vtm5e')
    assert.include(systems, 'shadowrun6-eden')
    assert.include(systems, 'genesys')
  })

  test('isSystemSupported should return true for known systems', ({ assert }) => {
    assert.isTrue(ItemCategoryDetectionService.isSystemSupported('dnd5e'))
    assert.isTrue(ItemCategoryDetectionService.isSystemSupported('pf2e'))
    assert.isTrue(ItemCategoryDetectionService.isSystemSupported('cyberpunk-red-core'))
    assert.isTrue(ItemCategoryDetectionService.isSystemSupported('vtm5e'))
    assert.isTrue(ItemCategoryDetectionService.isSystemSupported('shadowrun6-eden'))
    assert.isTrue(ItemCategoryDetectionService.isSystemSupported('genesys'))
  })

  test('isSystemSupported should return false for unknown systems', ({ assert }) => {
    assert.isFalse(ItemCategoryDetectionService.isSystemSupported('unknown'))
    assert.isFalse(ItemCategoryDetectionService.isSystemSupported(''))
  })
})
