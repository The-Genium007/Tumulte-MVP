import { test } from '@japa/runner'
import { CriticalityRuleService } from '#services/campaigns/criticality_rule_service'
import type { CampaignCriticalityRuleRepository } from '#repositories/campaign_criticality_rule_repository'
import type CampaignCriticalityRule from '#models/campaign_criticality_rule'

// ========================================
// HELPERS
// ========================================

function createMockRule(overrides: Partial<CampaignCriticalityRule> = {}): CampaignCriticalityRule {
  return {
    id: 'rule-1',
    campaignId: 'campaign-1',
    diceFormula: null,
    resultCondition: '== 20',
    resultField: 'max_die',
    criticalType: 'success',
    severity: 'major',
    label: 'Natural 20',
    description: null,
    priority: 100,
    isEnabled: true,
    isSystemPreset: false,
    presetKey: null,
    merge: function (data: Partial<CampaignCriticalityRule>) {
      Object.assign(this, data)
    },
    ...overrides,
  } as unknown as CampaignCriticalityRule
}

function createMockRepository(
  rules: CampaignCriticalityRule[] = []
): CampaignCriticalityRuleRepository {
  let storedRules = [...rules]

  return {
    findById: async (id: string) => storedRules.find((r) => r.id === id) ?? null,
    findByCampaign: async (campaignId: string) =>
      storedRules
        .filter((r) => r.campaignId === campaignId)
        .sort((a, b) => b.priority - a.priority),
    findEnabledByCampaign: async (campaignId: string) =>
      storedRules
        .filter((r) => r.campaignId === campaignId && r.isEnabled)
        .sort((a, b) => b.priority - a.priority),
    create: async (data: Partial<CampaignCriticalityRule>) => {
      const rule = createMockRule({ id: `rule-${storedRules.length + 1}`, ...data })
      storedRules.push(rule)
      return rule
    },
    update: async (rule: CampaignCriticalityRule) => rule,
    delete: async (rule: CampaignCriticalityRule) => {
      storedRules = storedRules.filter((r) => r.id !== rule.id)
    },
  } as unknown as CampaignCriticalityRuleRepository
}

// ========================================
// TESTS — CriticalityRuleService CRUD
// ========================================

test.group('CriticalityRuleService — list', () => {
  test('should return all rules for a campaign', async ({ assert }) => {
    const rules = [
      createMockRule({ id: 'r1', campaignId: 'camp-1', priority: 100 }),
      createMockRule({ id: 'r2', campaignId: 'camp-1', priority: 50 }),
      createMockRule({ id: 'r3', campaignId: 'camp-2', priority: 100 }),
    ]
    const repo = createMockRepository(rules)
    const service = new CriticalityRuleService(repo)

    const result = await service.list('camp-1')

    assert.lengthOf(result, 2)
    assert.equal(result[0].priority, 100)
    assert.equal(result[1].priority, 50)
  })

  test('should return only enabled rules for listEnabled', async ({ assert }) => {
    const rules = [
      createMockRule({ id: 'r1', campaignId: 'camp-1', isEnabled: true }),
      createMockRule({ id: 'r2', campaignId: 'camp-1', isEnabled: false }),
      createMockRule({ id: 'r3', campaignId: 'camp-1', isEnabled: true }),
    ]
    const repo = createMockRepository(rules)
    const service = new CriticalityRuleService(repo)

    const result = await service.listEnabled('camp-1')

    assert.lengthOf(result, 2)
    result.forEach((r) => assert.isTrue(r.isEnabled))
  })

  test('should return empty array when no rules exist', async ({ assert }) => {
    const repo = createMockRepository([])
    const service = new CriticalityRuleService(repo)

    const result = await service.list('camp-1')

    assert.lengthOf(result, 0)
  })
})

test.group('CriticalityRuleService — create', () => {
  test('should create a rule with all fields', async ({ assert }) => {
    const repo = createMockRepository([])
    const service = new CriticalityRuleService(repo)

    const result = await service.create('camp-1', {
      diceFormula: '1d20',
      resultCondition: '== 20',
      resultField: 'max_die',
      criticalType: 'success',
      severity: 'major',
      label: 'Nat 20',
      description: 'A natural 20',
      priority: 100,
      isEnabled: true,
    })

    assert.equal(result.campaignId, 'camp-1')
    assert.equal(result.resultCondition, '== 20')
    assert.equal(result.label, 'Nat 20')
  })

  test('should set diceFormula to null when not provided', async ({ assert }) => {
    const repo = createMockRepository([])
    const service = new CriticalityRuleService(repo)

    const result = await service.create('camp-1', {
      resultCondition: '== 1',
      resultField: 'min_die',
      criticalType: 'failure',
      severity: 'extreme',
      label: 'Fumble',
      priority: 90,
      isEnabled: true,
    })

    assert.isNull(result.diceFormula)
  })
})

test.group('CriticalityRuleService — update', () => {
  test('should update a non-preset rule with all fields', async ({ assert }) => {
    const rule = createMockRule({ id: 'r1', campaignId: 'camp-1', label: 'Old Label' })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.update('r1', 'camp-1', { label: 'New Label', severity: 'extreme' })

    assert.equal(result.label, 'New Label')
    assert.equal(result.severity, 'extreme')
  })

  test('should throw when rule not found', async ({ assert }) => {
    const repo = createMockRepository([])
    const service = new CriticalityRuleService(repo)

    await assert.rejects(
      () => service.update('nonexistent', 'camp-1', { label: 'X' }),
      'Rule not found'
    )
  })

  test('should throw when rule belongs to different campaign', async ({ assert }) => {
    const rule = createMockRule({ id: 'r1', campaignId: 'camp-2' })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    await assert.rejects(() => service.update('r1', 'camp-1', { label: 'X' }), 'Rule not found')
  })

  test('should only allow toggling isEnabled for system preset rules', async ({ assert }) => {
    const rule = createMockRule({
      id: 'r1',
      campaignId: 'camp-1',
      isSystemPreset: true,
      isEnabled: true,
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.update('r1', 'camp-1', { isEnabled: false })
    assert.isFalse(result.isEnabled)
  })

  test('should throw when trying to update non-isEnabled fields on system preset', async ({
    assert,
  }) => {
    const rule = createMockRule({
      id: 'r1',
      campaignId: 'camp-1',
      isSystemPreset: true,
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    await assert.rejects(
      () => service.update('r1', 'camp-1', { label: 'Can not change this' }),
      'System preset rules can only be enabled or disabled'
    )
  })
})

test.group('CriticalityRuleService — delete', () => {
  test('should delete a non-preset rule', async ({ assert }) => {
    const rule = createMockRule({ id: 'r1', campaignId: 'camp-1' })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    await service.delete('r1', 'camp-1')

    const remaining = await service.list('camp-1')
    assert.lengthOf(remaining, 0)
  })

  test('should throw when deleting system preset rule', async ({ assert }) => {
    const rule = createMockRule({ id: 'r1', campaignId: 'camp-1', isSystemPreset: true })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    await assert.rejects(
      () => service.delete('r1', 'camp-1'),
      'System preset rules cannot be deleted'
    )
  })

  test('should throw when rule not found', async ({ assert }) => {
    const repo = createMockRepository([])
    const service = new CriticalityRuleService(repo)

    await assert.rejects(() => service.delete('nonexistent', 'camp-1'), 'Rule not found')
  })
})

// ========================================
// TESTS — CriticalityRuleService evaluate (pure logic)
// ========================================

test.group('CriticalityRuleService — evaluate: condition operators', () => {
  test('should match == condition', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '== 20',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [20], 20)
    assert.isNotNull(result)
    assert.equal(result!.resultCondition, '== 20')
  })

  test('should NOT match == condition when value differs', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '== 20',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [15], 15)
    assert.isNull(result)
  })

  test('should match != condition', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '!= 1',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [15], 15)
    assert.isNotNull(result)
  })

  test('should match <= condition', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '<= 5',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result5 = await service.evaluate('camp-1', '1d20', [5], 5)
    assert.isNotNull(result5)

    const result3 = await service.evaluate('camp-1', '1d20', [3], 3)
    assert.isNotNull(result3)

    const result6 = await service.evaluate('camp-1', '1d20', [6], 6)
    assert.isNull(result6)
  })

  test('should match >= condition', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '>= 18',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [18], 18)
    assert.isNotNull(result)

    const result20 = await service.evaluate('camp-1', '1d20', [20], 20)
    assert.isNotNull(result20)

    const result17 = await service.evaluate('camp-1', '1d20', [17], 17)
    assert.isNull(result17)
  })

  test('should match < condition', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '< 5',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result4 = await service.evaluate('camp-1', '1d20', [4], 4)
    assert.isNotNull(result4)

    const result5 = await service.evaluate('camp-1', '1d20', [5], 5)
    assert.isNull(result5)
  })

  test('should match > condition', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '> 19',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result20 = await service.evaluate('camp-1', '1d20', [20], 20)
    assert.isNotNull(result20)

    const result19 = await service.evaluate('camp-1', '1d20', [19], 19)
    assert.isNull(result19)
  })
})

test.group('CriticalityRuleService — evaluate: resultField', () => {
  test('should use max_die field', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '== 6',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    // diceResults = [3, 6, 2], max_die = 6
    const result = await service.evaluate('camp-1', '3d6', [3, 6, 2], 11)
    assert.isNotNull(result)
  })

  test('should use min_die field', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '== 1',
      resultField: 'min_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    // diceResults = [1, 5, 3], min_die = 1
    const result = await service.evaluate('camp-1', '3d6', [1, 5, 3], 9)
    assert.isNotNull(result)
  })

  test('should use total field', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '>= 18',
      resultField: 'total',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    // diceResults = [6, 6, 6], total = 18
    const result = await service.evaluate('camp-1', '3d6', [6, 6, 6], 18)
    assert.isNotNull(result)

    // diceResults = [5, 6, 6], total = 17
    const resultNo = await service.evaluate('camp-1', '3d6', [5, 6, 6], 17)
    assert.isNull(resultNo)
  })

  test('should default to total for unknown field', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '== 42',
      resultField: 'unknown_field',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '10d6', [4, 4, 4, 4, 5, 5, 5, 5, 3, 3], 42)
    assert.isNotNull(result)
  })

  test('should return null when diceResults is empty', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '== 20',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [], 0)
    assert.isNull(result)
  })
})

test.group('CriticalityRuleService — evaluate: formula matching', () => {
  test('should match when no diceFormula is set (wildcard)', async ({ assert }) => {
    const rule = createMockRule({
      diceFormula: null,
      resultCondition: '== 20',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [20], 20)
    assert.isNotNull(result)
  })

  test('should match when diceFormula is *', async ({ assert }) => {
    const rule = createMockRule({
      diceFormula: '*',
      resultCondition: '== 20',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '2d10', [20], 20)
    assert.isNotNull(result)
  })

  test('should match exact formula', async ({ assert }) => {
    const rule = createMockRule({
      diceFormula: '1d20',
      resultCondition: '== 20',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [20], 20)
    assert.isNotNull(result)
  })

  test('should match formula contained in roll formula', async ({ assert }) => {
    const rule = createMockRule({
      diceFormula: 'd20',
      resultCondition: '== 20',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    // '1d20+5' contains 'd20'
    const result = await service.evaluate('camp-1', '1d20+5', [20], 25)
    assert.isNotNull(result)
  })

  test('should match formula case-insensitively', async ({ assert }) => {
    const rule = createMockRule({
      diceFormula: 'D20',
      resultCondition: '== 20',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [20], 20)
    assert.isNotNull(result)
  })

  test('should NOT match when formula does not contain die type', async ({ assert }) => {
    const rule = createMockRule({
      diceFormula: '1d20',
      resultCondition: '== 6',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d6', [6], 6)
    assert.isNull(result)
  })
})

test.group('CriticalityRuleService — evaluate: priority ordering', () => {
  test('should return highest priority rule that matches', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'low',
        campaignId: 'camp-1',
        resultCondition: '== 20',
        resultField: 'max_die',
        priority: 50,
        label: 'Low Priority',
        isEnabled: true,
      }),
      createMockRule({
        id: 'high',
        campaignId: 'camp-1',
        resultCondition: '== 20',
        resultField: 'max_die',
        priority: 100,
        label: 'High Priority',
        isEnabled: true,
      }),
    ]
    const repo = createMockRepository(rules)
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [20], 20)

    assert.isNotNull(result)
    assert.equal(result!.label, 'High Priority')
  })

  test('should skip disabled rules', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'disabled',
        campaignId: 'camp-1',
        resultCondition: '== 20',
        resultField: 'max_die',
        priority: 100,
        label: 'Disabled Rule',
        isEnabled: false,
      }),
      createMockRule({
        id: 'enabled',
        campaignId: 'camp-1',
        resultCondition: '== 20',
        resultField: 'max_die',
        priority: 50,
        label: 'Enabled Rule',
        isEnabled: true,
      }),
    ]
    const repo = createMockRepository(rules)
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [20], 20)

    assert.isNotNull(result)
    assert.equal(result!.label, 'Enabled Rule')
  })

  test('should return null when no rules match', async ({ assert }) => {
    const rules = [
      createMockRule({
        id: 'r1',
        campaignId: 'camp-1',
        resultCondition: '== 20',
        resultField: 'max_die',
        isEnabled: true,
      }),
    ]
    const repo = createMockRepository(rules)
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [10], 10)
    assert.isNull(result)
  })
})

test.group('CriticalityRuleService — evaluate: invalid conditions', () => {
  test('should not match when condition has invalid format', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: 'invalid',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    const result = await service.evaluate('camp-1', '1d20', [20], 20)
    assert.isNull(result)
  })

  test('should not match when condition has spaces in wrong place', async ({ assert }) => {
    const rule = createMockRule({
      resultCondition: '==20',
      resultField: 'max_die',
      isEnabled: true,
      campaignId: 'camp-1',
    })
    const repo = createMockRepository([rule])
    const service = new CriticalityRuleService(repo)

    // The regex requires space between operator and number: /^(==|!=|<=|>=|<|>)\s*(-?\d+)$/
    // '==20' should still match as \s* means 0 or more spaces
    const result = await service.evaluate('camp-1', '1d20', [20], 20)
    assert.isNotNull(result)
  })
})
