import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  useItemIntrospection,
  type ItemIntrospectionTree,
} from '~/composables/useItemIntrospection'

// Mock fetch globally
global.fetch = vi.fn()

function createMockTree(overrides: Partial<ItemIntrospectionTree> = {}): ItemIntrospectionTree {
  return {
    systemId: 'dnd5e',
    sources: [
      {
        key: 'spells',
        label: 'Sorts',
        icon: 'magic-wand',
        totalCount: 42,
        groups: [
          {
            groupKey: 'evocation',
            groupLabel: 'Évocation',
            groupProperty: 'system.school',
            count: 12,
            samples: [
              {
                name: 'Fireball',
                properties: { level: 3, school: 'evocation' },
              },
            ],
            suggestedRule: {
              category: 'spell',
              subcategory: 'evocation',
              itemType: 'spell',
              matchField: 'system.school',
              matchValue: 'evo',
              label: 'Évocation',
              icon: 'flame',
              color: '#EF4444',
              isTargetable: true,
              weight: 2,
              priority: 5,
            },
            existingRule: null,
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('useItemIntrospection Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================
  // Initial state
  // ========================================

  test('should initialize with empty state', () => {
    const { tree, loading, error } = useItemIntrospection()

    expect(tree.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  // ========================================
  // fetchTree
  // ========================================

  test('fetchTree() should load introspection data', async () => {
    const mockTree = createMockTree()

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTree,
    } as Response)

    const { fetchTree, tree } = useItemIntrospection()
    const result = await fetchTree('campaign-123')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/item-introspection',
      { credentials: 'include' }
    )
    expect(tree.value).toEqual(mockTree)
    expect(result).toEqual(mockTree)
    expect(result.systemId).toBe('dnd5e')
    expect(result.sources).toHaveLength(1)
  })

  test('fetchTree() should set loading state correctly', async () => {
    let resolveFetch: ((value: Response) => void) | undefined
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

    const { fetchTree, loading } = useItemIntrospection()
    const promise = fetchTree('campaign-123')

    expect(loading.value).toBe(true)

    resolveFetch!({
      ok: true,
      json: async () => createMockTree(),
    } as Response)
    await promise

    expect(loading.value).toBe(false)
  })

  test('fetchTree() should handle error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { fetchTree, error } = useItemIntrospection()

    await expect(fetchTree('campaign-123')).rejects.toThrow(
      "Échec de la récupération de l'arbre d'items"
    )
    expect(error.value).toBe("Échec de la récupération de l'arbre d'items")
  })

  test('fetchTree() should handle network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'))

    const { fetchTree, error } = useItemIntrospection()

    await expect(fetchTree('campaign-123')).rejects.toThrow('Network failure')
    expect(error.value).toBe('Network failure')
  })

  test('fetchTree() should clear error before new request', async () => {
    // First request fails
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { fetchTree, error } = useItemIntrospection()

    await expect(fetchTree('campaign-123')).rejects.toThrow()
    expect(error.value).toBeTruthy()

    // Second request succeeds
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockTree(),
    } as Response)

    await fetchTree('campaign-123')
    expect(error.value).toBeNull()
  })

  test('fetchTree() should handle tree with multiple sources', async () => {
    const mockTree = createMockTree({
      sources: [
        {
          key: 'spells',
          label: 'Sorts',
          icon: 'wand',
          totalCount: 20,
          groups: [],
        },
        {
          key: 'features',
          label: 'Capacités',
          icon: 'star',
          totalCount: 15,
          groups: [],
        },
        {
          key: 'inventory',
          label: 'Inventaire',
          icon: 'backpack',
          totalCount: 50,
          groups: [],
        },
      ],
    })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTree,
    } as Response)

    const { fetchTree, tree } = useItemIntrospection()
    await fetchTree('campaign-123')

    expect(tree.value!.sources).toHaveLength(3)
    expect(tree.value!.sources.map((s) => s.key)).toEqual(['spells', 'features', 'inventory'])
  })
})
