import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useCriticalityRules, type CriticalityRule } from '~/composables/useCriticalityRules'

// Mock fetch globally
global.fetch = vi.fn()

function createMockRule(overrides: Partial<CriticalityRule> = {}): CriticalityRule {
  return {
    id: 'rule-123',
    campaignId: 'campaign-123',
    diceFormula: 'd20',
    resultCondition: '== 20',
    resultField: 'max_die',
    criticalType: 'success',
    severity: 'major',
    label: 'Natural 20',
    description: null,
    priority: 10,
    isEnabled: true,
    isSystemPreset: false,
    presetKey: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('useCriticalityRules Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================
  // Initial state
  // ========================================

  test('should initialize with empty state', () => {
    const { rules, systemInfo, loading, error } = useCriticalityRules()

    expect(rules.value).toEqual([])
    expect(systemInfo.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  // ========================================
  // fetchRules
  // ========================================

  test('fetchRules() should load rules list with data wrapper', async () => {
    const mockRules = [
      createMockRule({ id: 'rule-1', label: 'Nat 20' }),
      createMockRule({ id: 'rule-2', label: 'Nat 1', criticalType: 'failure' }),
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockRules }),
    } as Response)

    const { fetchRules, rules } = useCriticalityRules()
    const result = await fetchRules('campaign-123')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/criticality-rules',
      { credentials: 'include' }
    )
    expect(rules.value).toEqual(mockRules)
    expect(result).toEqual(mockRules)
  })

  test('fetchRules() should handle direct array response', async () => {
    const mockRules = [createMockRule({ id: 'rule-1' })]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRules,
    } as Response)

    const { fetchRules, rules } = useCriticalityRules()
    await fetchRules('campaign-123')

    expect(rules.value).toEqual(mockRules)
  })

  test('fetchRules() should handle errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { fetchRules, error } = useCriticalityRules()

    await expect(fetchRules('campaign-123')).rejects.toThrow('Échec de la récupération des règles')
    expect(error.value).toBe('Échec de la récupération des règles')
  })

  test('fetchRules() should set loading state correctly', async () => {
    let resolveFetch: ((value: Response) => void) | undefined
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

    const { fetchRules, loading } = useCriticalityRules()
    const promise = fetchRules('campaign-123')

    expect(loading.value).toBe(true)

    resolveFetch!({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)
    await promise

    expect(loading.value).toBe(false)
  })

  // ========================================
  // createRule
  // ========================================

  test('createRule() should POST and add to local state', async () => {
    const newRule = createMockRule({ id: 'rule-new', label: 'Fumble' })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newRule }),
    } as Response)

    const { createRule, rules } = useCriticalityRules()
    const result = await createRule('campaign-123', {
      resultCondition: '== 1',
      criticalType: 'failure',
      label: 'Fumble',
    })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/criticality-rules',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(result).toEqual(newRule)
    expect(rules.value).toContainEqual(newRule)
  })

  test('createRule() should handle error with custom message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Validation échouée' }),
    } as Response)

    const { createRule, error } = useCriticalityRules()

    await expect(
      createRule('campaign-123', {
        resultCondition: 'invalid',
        criticalType: 'success',
        label: 'Test',
      })
    ).rejects.toThrow('Validation échouée')
    expect(error.value).toBe('Validation échouée')
  })

  test('createRule() should handle error with default message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error('parse error')
      },
    } as unknown as Response)

    const { createRule } = useCriticalityRules()

    await expect(
      createRule('campaign-123', {
        resultCondition: '== 1',
        criticalType: 'failure',
        label: 'Test',
      })
    ).rejects.toThrow('Échec de la création de la règle')
  })

  // ========================================
  // updateRule
  // ========================================

  test('updateRule() should PUT and update local state', async () => {
    const existingRule = createMockRule({ id: 'rule-1', label: 'Old' })
    const updatedRule = createMockRule({ id: 'rule-1', label: 'New' })

    // Load rules first
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [existingRule] }),
    } as Response)

    const { fetchRules, updateRule, rules } = useCriticalityRules()
    await fetchRules('campaign-123')

    // Update
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedRule }),
    } as Response)

    await updateRule('campaign-123', 'rule-1', { label: 'New' })

    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/criticality-rules/rule-1',
      expect.objectContaining({ method: 'PUT' })
    )
    expect(rules.value[0]!.label).toBe('New')
  })

  test('updateRule() should handle error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Preset protégé' }),
    } as Response)

    const { updateRule, error } = useCriticalityRules()

    await expect(updateRule('campaign-123', 'rule-1', { label: 'New' })).rejects.toThrow(
      'Preset protégé'
    )
    expect(error.value).toBe('Preset protégé')
  })

  // ========================================
  // deleteRule
  // ========================================

  test('deleteRule() should DELETE and remove from local state', async () => {
    const rule = createMockRule({ id: 'rule-1' })

    // Load rules first
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [rule] }),
    } as Response)

    const { fetchRules, deleteRule, rules } = useCriticalityRules()
    await fetchRules('campaign-123')
    expect(rules.value).toHaveLength(1)

    // Delete
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response)

    await deleteRule('campaign-123', 'rule-1')

    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/criticality-rules/rule-1',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' })
    )
    expect(rules.value).toHaveLength(0)
  })

  test('deleteRule() should handle error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const { deleteRule, error } = useCriticalityRules()

    await expect(deleteRule('campaign-123', 'nonexistent')).rejects.toThrow(
      'Échec de la suppression de la règle'
    )
    expect(error.value).toBe('Échec de la suppression de la règle')
  })

  // ========================================
  // toggleRule
  // ========================================

  test('toggleRule() should flip isEnabled via updateRule', async () => {
    const rule = createMockRule({ id: 'rule-1', isEnabled: true })
    const toggled = createMockRule({ id: 'rule-1', isEnabled: false })

    // Load rules
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [rule] }),
    } as Response)

    const { fetchRules, toggleRule } = useCriticalityRules()
    await fetchRules('campaign-123')

    // Toggle
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: toggled }),
    } as Response)

    await toggleRule('campaign-123', rule)

    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/criticality-rules/rule-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ isEnabled: false }),
      })
    )
  })

  // ========================================
  // fetchSystemInfo
  // ========================================

  test('fetchSystemInfo() should load system info', async () => {
    const mockInfo = {
      gameSystemId: 'dnd5e',
      systemName: 'D&D 5e',
      isKnownSystem: true,
      capabilities: {
        hasSpells: true,
        hasTraditionalCriticals: true,
        hasDicePool: false,
        hasPercentile: false,
        hasFudgeDice: false,
        hasNarrativeDice: false,
        primaryDie: 'd20',
      },
      recommendedEvents: ['dice_crit_success', 'dice_crit_failure'],
      availableWithWarning: [],
      presetRulesCount: 4,
      presetRulesActive: 4,
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockInfo,
    } as Response)

    const { fetchSystemInfo, systemInfo } = useCriticalityRules()
    const result = await fetchSystemInfo('campaign-123')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/system-info',
      { credentials: 'include' }
    )
    expect(result).toEqual(mockInfo)
    expect(systemInfo.value).toEqual(mockInfo)
  })

  test('fetchSystemInfo() should return null on error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const { fetchSystemInfo, systemInfo } = useCriticalityRules()
    const result = await fetchSystemInfo('campaign-123')

    expect(result).toBeNull()
    expect(systemInfo.value).toBeNull()
  })

  test('fetchSystemInfo() should return null on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const { fetchSystemInfo } = useCriticalityRules()
    const result = await fetchSystemInfo('campaign-123')

    expect(result).toBeNull()
  })
})
