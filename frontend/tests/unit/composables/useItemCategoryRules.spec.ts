import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useItemCategoryRules } from '~/composables/useItemCategoryRules'
import type { ItemCategoryRule } from '~/composables/useItemCategoryRules'

// Mock fetch globally
global.fetch = vi.fn()

function createMockRule(overrides: Partial<ItemCategoryRule> = {}): ItemCategoryRule {
  return {
    id: 'rule-123',
    campaignId: 'campaign-123',
    category: 'spell',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('useItemCategoryRules Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333',
      },
    } as ReturnType<typeof useRuntimeConfig>)
  })

  test('should initialize with empty state', () => {
    const { rules, loading, error } = useItemCategoryRules()

    expect(rules.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  // ========================================
  // fetchRules
  // ========================================

  test('fetchRules() should load rules list', async () => {
    const mockRules = [
      createMockRule({ id: 'rule-1', subcategory: 'abjuration' }),
      createMockRule({ id: 'rule-2', subcategory: 'evocation' }),
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockRules }),
    } as Response)

    const { fetchRules, rules } = useItemCategoryRules()
    await fetchRules('campaign-123')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/item-category-rules',
      { credentials: 'include' }
    )
    expect(rules.value).toEqual(mockRules)
  })

  test('fetchRules() should handle array response format', async () => {
    const mockRules = [createMockRule({ id: 'rule-1' })]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRules, // Direct array, no wrapper
    } as Response)

    const { fetchRules, rules } = useItemCategoryRules()
    await fetchRules('campaign-123')

    expect(rules.value).toEqual(mockRules)
  })

  test('fetchRules() should handle errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { fetchRules, error } = useItemCategoryRules()

    await expect(fetchRules('campaign-123')).rejects.toThrow(
      'Échec de la récupération des catégories'
    )
    expect(error.value).toBe('Échec de la récupération des catégories')
  })

  test('fetchRules() should set loading state correctly', async () => {
    let resolveFetch: ((value: Response) => void) | undefined
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

    const { fetchRules, loading } = useItemCategoryRules()
    const promise = fetchRules('campaign-123')

    expect(loading.value).toBe(true)

    if (resolveFetch) {
      resolveFetch({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)
    }
    await promise

    expect(loading.value).toBe(false)
  })

  // ========================================
  // createRule
  // ========================================

  test('createRule() should POST and add to local state', async () => {
    const newRule = createMockRule({ id: 'rule-new', subcategory: 'necromancy' })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newRule }),
    } as Response)

    const { createRule, rules } = useItemCategoryRules()
    const result = await createRule('campaign-123', {
      category: 'spell',
      subcategory: 'necromancy',
      itemType: 'spell',
      label: 'Nécromancie',
    })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/item-category-rules',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(result).toEqual(newRule)
    expect(rules.value).toContainEqual(newRule)
  })

  test('createRule() should handle error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Validation failed' }),
    } as Response)

    const { createRule, error } = useItemCategoryRules()

    await expect(
      createRule('campaign-123', {
        category: 'spell',
        subcategory: 'test',
        itemType: 'spell',
        label: 'Test',
      })
    ).rejects.toThrow('Validation failed')
    expect(error.value).toBe('Validation failed')
  })

  // ========================================
  // updateRule
  // ========================================

  test('updateRule() should PUT and update local state', async () => {
    // Pre-populate rules
    const existingRule = createMockRule({ id: 'rule-1', label: 'Old Label' })
    const updatedRule = createMockRule({ id: 'rule-1', label: 'New Label' })

    // First load rules
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [existingRule] }),
    } as Response)

    const { fetchRules, updateRule, rules } = useItemCategoryRules()
    await fetchRules('campaign-123')

    // Then update
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedRule }),
    } as Response)

    await updateRule('campaign-123', 'rule-1', { label: 'New Label' })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/item-category-rules/rule-1',
      expect.objectContaining({ method: 'PUT' })
    )
    expect(rules.value[0].label).toBe('New Label')
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

    const { fetchRules, deleteRule, rules } = useItemCategoryRules()
    await fetchRules('campaign-123')
    expect(rules.value).toHaveLength(1)

    // Delete
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response)

    await deleteRule('campaign-123', 'rule-1')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/item-category-rules/rule-1',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' })
    )
    expect(rules.value).toHaveLength(0)
  })

  test('deleteRule() should handle error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const { deleteRule, error } = useItemCategoryRules()

    await expect(deleteRule('campaign-123', 'nonexistent')).rejects.toThrow(
      'Échec de la suppression de la catégorie'
    )
    expect(error.value).toBe('Échec de la suppression de la catégorie')
  })

  // ========================================
  // toggleRule
  // ========================================

  test('toggleRule() should flip isEnabled and call updateRule', async () => {
    const rule = createMockRule({ id: 'rule-1', isEnabled: true })
    const toggledRule = createMockRule({ id: 'rule-1', isEnabled: false })

    // Load rules
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [rule] }),
    } as Response)

    const { fetchRules, toggleRule } = useItemCategoryRules()
    await fetchRules('campaign-123')

    // Toggle
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: toggledRule }),
    } as Response)

    await toggleRule('campaign-123', rule)

    // Should have called PUT with isEnabled: false
    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/item-category-rules/rule-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ isEnabled: false }),
      })
    )
  })

  // ========================================
  // detectCategories
  // ========================================

  test('detectCategories() should POST to /detect and update rules', async () => {
    const detectedRules = [
      createMockRule({ id: 'auto-1', subcategory: 'abjuration' }),
      createMockRule({ id: 'auto-2', subcategory: 'evocation' }),
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: detectedRules }),
    } as Response)

    const { detectCategories, rules } = useItemCategoryRules()
    const result = await detectCategories('campaign-123')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/item-category-rules/detect',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    )
    expect(result).toEqual(detectedRules)
    expect(rules.value).toEqual(detectedRules)
  })

  test('detectCategories() should handle detection error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'No system detected' }),
    } as Response)

    const { detectCategories, error } = useItemCategoryRules()

    await expect(detectCategories('campaign-123')).rejects.toThrow('No system detected')
    expect(error.value).toBe('No system detected')
  })
})
