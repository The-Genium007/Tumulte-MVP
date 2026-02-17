import { test } from '@japa/runner'
import CriticalityRulesController from '#controllers/mj/criticality_rules_controller'
import { campaign as Campaign } from '#models/campaign'

// ========================================
// HELPERS
// ========================================

function createMockHttpContext(overrides: Record<string, any> = {}) {
  return {
    auth: { user: { id: 'user-1' } },
    params: overrides.params || {},
    request: {
      body: () => overrides.body || {},
    },
    response: {
      ok: (data: any) => data,
      created: (data: any) => data,
      noContent: () => undefined,
    },
    ...overrides,
  }
}

function createMockService(overrides: Record<string, any> = {}) {
  return {
    list: overrides.list || (async () => []),
    create: overrides.create || (async () => ({ id: 'rule-1' })),
    update: overrides.update || (async () => ({ id: 'rule-1' })),
    delete: overrides.delete || (async () => {}),
  }
}

function createMockPresetService(overrides: Record<string, any> = {}) {
  return {
    getCompatibilityInfo:
      overrides.getCompatibilityInfo || (() => ({ tier: 1, displayName: 'D&D 5e' })),
    countActivePresets: overrides.countActivePresets || (async () => 3),
  }
}

/**
 * Helper to stub Campaign.query() chain for ownership check.
 * Returns restore function.
 */
function stubCampaignQuery(campaign: Record<string, any> | null) {
  const origQuery = Campaign.query
  ;(Campaign as any).query = () => ({
    where: function () {
      return this
    },
    firstOrFail: async () => {
      if (!campaign) throw new Error('Row not found')
      return campaign
    },
  })
  return () => {
    ;(Campaign as any).query = origQuery
  }
}

// ========================================
// TESTS — index
// ========================================

test.group('CriticalityRulesController — index', () => {
  test('should return list of rules for campaign', async ({ assert }) => {
    const mockRules = [
      { id: 'rule-1', label: 'Nat 20', criticalType: 'success' },
      { id: 'rule-2', label: 'Nat 1', criticalType: 'failure' },
    ]

    const controller = new CriticalityRulesController()
    ;(controller as any).service = createMockService({
      list: async (campaignId: string) => {
        assert.equal(campaignId, 'campaign-1')
        return mockRules
      },
    })

    const restoreQuery = stubCampaignQuery({
      id: 'campaign-1',
      ownerId: 'user-1',
    })

    try {
      const ctx = createMockHttpContext({
        params: { campaignId: 'campaign-1' },
      })
      const result: any = await controller.index(ctx as any)

      assert.isArray(result)
      assert.lengthOf(result, 2)
      assert.equal(result[0].label, 'Nat 20')
    } finally {
      restoreQuery()
    }
  })

  test('should throw when campaign not found', async ({ assert }) => {
    const controller = new CriticalityRulesController()
    const restoreQuery = stubCampaignQuery(null)

    try {
      const ctx = createMockHttpContext({
        params: { campaignId: 'nonexistent' },
      })

      await assert.rejects(() => controller.index(ctx as any), 'Row not found')
    } finally {
      restoreQuery()
    }
  })
})

// ========================================
// TESTS — store
// ========================================

test.group('CriticalityRulesController — store', () => {
  test('should create a new criticality rule', async ({ assert }) => {
    let createdData: any = null

    const controller = new CriticalityRulesController()
    ;(controller as any).service = createMockService({
      create: async (campaignId: string, data: any) => {
        createdData = { campaignId, ...data }
        return { id: 'rule-new', ...data }
      },
    })

    const restoreQuery = stubCampaignQuery({ id: 'campaign-1' })

    try {
      const body = {
        resultCondition: '== 20',
        resultField: 'max_die',
        criticalType: 'success',
        severity: 'major',
        label: 'Natural 20',
        priority: 10,
        isEnabled: true,
      }

      const ctx = createMockHttpContext({
        params: { campaignId: 'campaign-1' },
        body,
      })

      const result: any = await controller.store(ctx as any)

      assert.equal(createdData.campaignId, 'campaign-1')
      assert.equal(result.label, 'Natural 20')
      assert.equal(result.criticalType, 'success')
    } finally {
      restoreQuery()
    }
  })
})

// ========================================
// TESTS — update
// ========================================

test.group('CriticalityRulesController — update', () => {
  test('should update an existing rule', async ({ assert }) => {
    let updatedRuleId: string | undefined
    let updatedCampaignId: string | undefined

    const controller = new CriticalityRulesController()
    ;(controller as any).service = createMockService({
      update: async (ruleId: string, campaignId: string, data: any) => {
        updatedRuleId = ruleId
        updatedCampaignId = campaignId
        return { id: ruleId, ...data }
      },
    })

    const restoreQuery = stubCampaignQuery({ id: 'campaign-1' })

    try {
      const ctx = createMockHttpContext({
        params: { campaignId: 'campaign-1', ruleId: 'rule-1' },
        body: { label: 'Updated Label' },
      })

      const result: any = await controller.update(ctx as any)

      assert.equal(updatedRuleId, 'rule-1')
      assert.equal(updatedCampaignId, 'campaign-1')
      assert.equal(result.label, 'Updated Label')
    } finally {
      restoreQuery()
    }
  })
})

// ========================================
// TESTS — destroy
// ========================================

test.group('CriticalityRulesController — destroy', () => {
  test('should delete a rule', async ({ assert }) => {
    let deletedRuleId: string | undefined
    let deletedCampaignId: string | undefined

    const controller = new CriticalityRulesController()
    ;(controller as any).service = createMockService({
      delete: async (ruleId: string, campaignId: string) => {
        deletedRuleId = ruleId
        deletedCampaignId = campaignId
      },
    })

    const restoreQuery = stubCampaignQuery({ id: 'campaign-1' })

    try {
      const ctx = createMockHttpContext({
        params: { campaignId: 'campaign-1', ruleId: 'rule-1' },
      })

      const result = await controller.destroy(ctx as any)

      assert.equal(deletedRuleId, 'rule-1')
      assert.equal(deletedCampaignId, 'campaign-1')
      assert.isUndefined(result) // noContent returns undefined
    } finally {
      restoreQuery()
    }
  })
})

// ========================================
// TESTS — systemInfo
// ========================================

test.group('CriticalityRulesController — systemInfo', () => {
  test('should return system compatibility info', async ({ assert }) => {
    const controller = new CriticalityRulesController()
    ;(controller as any).presetService = createMockPresetService({
      getCompatibilityInfo: (gameSystemId: string) => {
        assert.equal(gameSystemId, 'dnd5e')
        return {
          tier: 1,
          displayName: 'Dungeons & Dragons 5e',
          hasAdapter: true,
        }
      },
      countActivePresets: async (campaignId: string) => {
        assert.equal(campaignId, 'campaign-1')
        return 5
      },
    })

    const restoreQuery = stubCampaignQuery({
      id: 'campaign-1',
      gameSystemId: 'dnd5e',
    })

    try {
      const ctx = createMockHttpContext({
        params: { campaignId: 'campaign-1' },
      })

      const result: any = await controller.systemInfo(ctx as any)

      assert.equal(result.gameSystemId, 'dnd5e')
      assert.equal(result.tier, 1)
      assert.equal(result.displayName, 'Dungeons & Dragons 5e')
      assert.equal(result.presetRulesActive, 5)
    } finally {
      restoreQuery()
    }
  })

  test('should handle campaign without gameSystemId', async ({ assert }) => {
    const controller = new CriticalityRulesController()
    ;(controller as any).presetService = createMockPresetService({
      getCompatibilityInfo: () => ({
        tier: 3,
        displayName: null,
        hasAdapter: false,
      }),
      countActivePresets: async () => 0,
    })

    const restoreQuery = stubCampaignQuery({
      id: 'campaign-2',
      gameSystemId: null,
    })

    try {
      const ctx = createMockHttpContext({
        params: { campaignId: 'campaign-2' },
      })

      const result: any = await controller.systemInfo(ctx as any)

      assert.isNull(result.gameSystemId)
      assert.equal(result.presetRulesActive, 0)
    } finally {
      restoreQuery()
    }
  })
})
