import { test } from '@japa/runner'
import { ItemCategoryRuleService } from '#services/campaigns/item_category_rule_service'
import type CampaignItemCategoryRule from '#models/campaign_item_category_rule'

// ========================================
// MOCK REPOSITORY
// ========================================

function createMockRule(overrides: Partial<CampaignItemCategoryRule> = {}): any {
  return {
    id: 'rule-123',
    campaignId: 'campaign-123',
    category: 'spell' as const,
    subcategory: 'evocation',
    itemType: 'spell',
    matchField: 'system.school',
    matchValue: 'evo',
    label: 'Évocation',
    description: null,
    icon: 'flame',
    color: '#EF4444',
    isTargetable: true,
    weight: 2,
    priority: 5,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    merge(data: Record<string, unknown>) {
      Object.assign(this, data)
    },
    ...overrides,
  }
}

function createMockRepository(overrides: Record<string, unknown> = {}) {
  return {
    findById: async () => null,
    findByCampaign: async () => [],
    findByCampaignAndCategory: async () => [],
    findTargetableByCampaign: async () => [],
    countByCampaign: async () => 0,
    create: async (data: Partial<CampaignItemCategoryRule>) => ({
      id: 'rule-new',
      ...data,
    }),
    createMany: async (data: Partial<CampaignItemCategoryRule>[]) =>
      data.map((d, i) => ({ id: `rule-${i + 1}`, ...d })),
    update: async (rule: CampaignItemCategoryRule) => rule,
    delete: async () => {},
    deleteByCampaign: async () => {},
    ...overrides,
  }
}

// ========================================
// TESTS — list
// ========================================

test.group('ItemCategoryRuleService - list', () => {
  test('should delegate to repository.findByCampaign', async ({ assert }) => {
    const mockRules = [
      createMockRule({ id: 'rule-1', subcategory: 'abjuration' }),
      createMockRule({ id: 'rule-2', subcategory: 'evocation' }),
    ]

    const repository = createMockRepository({
      findByCampaign: async (campaignId: string) => {
        assert.equal(campaignId, 'campaign-123')
        return mockRules
      },
    })

    const service = new ItemCategoryRuleService(repository as any)
    const result = await service.list('campaign-123')

    assert.equal(result.length, 2)
    assert.equal(result[0].id, 'rule-1')
  })
})

test.group('ItemCategoryRuleService - listByCategory', () => {
  test('should delegate to repository.findByCampaignAndCategory', async ({ assert }) => {
    const mockSpells = [createMockRule({ id: 'rule-1', category: 'spell' as const })]

    const repository = createMockRepository({
      findByCampaignAndCategory: async (campaignId: string, category: string) => {
        assert.equal(campaignId, 'campaign-123')
        assert.equal(category, 'spell')
        return mockSpells
      },
    })

    const service = new ItemCategoryRuleService(repository as any)
    const result = await service.listByCategory('campaign-123', 'spell')

    assert.equal(result.length, 1)
    assert.equal(result[0].category, 'spell')
  })
})

test.group('ItemCategoryRuleService - listTargetable', () => {
  test('should delegate to repository.findTargetableByCampaign', async ({ assert }) => {
    const targetableRules = [createMockRule({ isTargetable: true, isEnabled: true })]

    const repository = createMockRepository({
      findTargetableByCampaign: async (campaignId: string, category: string) => {
        assert.equal(campaignId, 'campaign-123')
        assert.equal(category, 'spell')
        return targetableRules
      },
    })

    const service = new ItemCategoryRuleService(repository as any)
    const result = await service.listTargetable('campaign-123', 'spell')

    assert.equal(result.length, 1)
    assert.isTrue(result[0].isTargetable)
  })
})

// ========================================
// TESTS — create
// ========================================

test.group('ItemCategoryRuleService - create', () => {
  test('should create a rule with all provided fields', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule> | null = null

    const repository = createMockRepository({
      create: async (data: Partial<CampaignItemCategoryRule>) => {
        capturedData = data
        return { id: 'rule-new', ...data }
      },
    })

    const service = new ItemCategoryRuleService(repository as any)
    const result = await service.create('campaign-123', {
      category: 'spell',
      subcategory: 'necromancy',
      itemType: 'spell',
      matchField: 'system.school',
      matchValue: 'nec',
      label: 'Nécromancie',
      description: 'Death magic',
      icon: 'skull',
      color: '#6B7280',
      isTargetable: true,
      weight: 1,
      priority: 5,
      isEnabled: true,
    })

    assert.isNotNull(capturedData)
    assert.equal(capturedData!.campaignId, 'campaign-123')
    assert.equal(capturedData!.category, 'spell')
    assert.equal(capturedData!.subcategory, 'necromancy')
    assert.equal(capturedData!.matchField, 'system.school')
    assert.equal(capturedData!.matchValue, 'nec')
    assert.equal(capturedData!.weight, 1)
    assert.isTrue(capturedData!.isTargetable)
    assert.equal((result as any).id, 'rule-new')
  })

  test('should default matchField and matchValue to null when not provided', async ({ assert }) => {
    let capturedData: Partial<CampaignItemCategoryRule> | null = null

    const repository = createMockRepository({
      create: async (data: Partial<CampaignItemCategoryRule>) => {
        capturedData = data
        return { id: 'rule-new', ...data }
      },
    })

    const service = new ItemCategoryRuleService(repository as any)
    await service.create('campaign-123', {
      category: 'inventory',
      subcategory: 'weapon',
      itemType: 'weapon',
      label: 'Armes',
      isTargetable: false,
      weight: 1,
      priority: 5,
      isEnabled: true,
    })

    assert.isNull(capturedData!.matchField)
    assert.isNull(capturedData!.matchValue)
  })
})

// ========================================
// TESTS — update
// ========================================

test.group('ItemCategoryRuleService - update', () => {
  test('should update only the provided fields', async ({ assert }) => {
    const existingRule = createMockRule({ id: 'rule-1', campaignId: 'campaign-123' })
    let savedRule: any = null

    const repository = createMockRepository({
      findById: async () => existingRule,
      update: async (rule: CampaignItemCategoryRule) => {
        savedRule = rule
        return rule
      },
    })

    const service = new ItemCategoryRuleService(repository as any)
    await service.update('rule-1', 'campaign-123', {
      label: 'Updated Label',
      weight: 5,
    })

    assert.isNotNull(savedRule)
    assert.equal(savedRule.label, 'Updated Label')
    assert.equal(savedRule.weight, 5)
    // Unchanged fields should remain
    assert.equal(savedRule.subcategory, 'evocation')
  })

  test('should throw when rule is not found', async ({ assert }) => {
    const repository = createMockRepository({
      findById: async () => null,
    })

    const service = new ItemCategoryRuleService(repository as any)
    await assert.rejects(
      () => service.update('nonexistent', 'campaign-123', { label: 'New' }),
      'Rule not found'
    )
  })

  test('should throw when rule belongs to different campaign', async ({ assert }) => {
    const rule = createMockRule({ id: 'rule-1', campaignId: 'other-campaign' })

    const repository = createMockRepository({
      findById: async () => rule,
    })

    const service = new ItemCategoryRuleService(repository as any)
    await assert.rejects(
      () => service.update('rule-1', 'campaign-123', { label: 'New' }),
      'Rule not found'
    )
  })
})

// ========================================
// TESTS — delete
// ========================================

test.group('ItemCategoryRuleService - delete', () => {
  test('should delete the rule when found and campaign matches', async ({ assert }) => {
    let deleteCalled = false
    const existingRule = createMockRule({ id: 'rule-1', campaignId: 'campaign-123' })

    const repository = createMockRepository({
      findById: async () => existingRule,
      delete: async () => {
        deleteCalled = true
      },
    })

    const service = new ItemCategoryRuleService(repository as any)
    await service.delete('rule-1', 'campaign-123')

    assert.isTrue(deleteCalled)
  })

  test('should throw when rule is not found', async ({ assert }) => {
    const repository = createMockRepository({
      findById: async () => null,
    })

    const service = new ItemCategoryRuleService(repository as any)
    await assert.rejects(() => service.delete('nonexistent', 'campaign-123'), 'Rule not found')
  })

  test('should throw when rule belongs to different campaign', async ({ assert }) => {
    const rule = createMockRule({ id: 'rule-1', campaignId: 'other-campaign' })

    const repository = createMockRepository({
      findById: async () => rule,
    })

    const service = new ItemCategoryRuleService(repository as any)
    await assert.rejects(() => service.delete('rule-1', 'campaign-123'), 'Rule not found')
  })
})
