import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useGmDiceAttribution, type PendingDiceRoll } from '~/composables/useGmDiceAttribution'

// Mock fetch globally
global.fetch = vi.fn()

function createMockRoll(overrides: Partial<PendingDiceRoll> = {}): PendingDiceRoll {
  return {
    id: 'roll-123',
    rollFormula: '1d20',
    result: 15,
    diceResults: [15],
    isCritical: false,
    criticalType: null,
    rollType: 'attack',
    skill: null,
    ability: 'strength',
    rolledAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('useGmDiceAttribution Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================
  // Initial state
  // ========================================

  test('should initialize with empty state', () => {
    const { pendingRolls, loading, attributing, hasPendingRolls, oldestPendingRoll } =
      useGmDiceAttribution()

    expect(pendingRolls.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(attributing.value).toBe(false)
    expect(hasPendingRolls.value).toBe(false)
    expect(oldestPendingRoll.value).toBeNull()
  })

  // ========================================
  // fetchPendingRolls
  // ========================================

  test('fetchPendingRolls() should load pending rolls', async () => {
    const mockRolls = [
      createMockRoll({ id: 'roll-1', result: 20 }),
      createMockRoll({ id: 'roll-2', result: 5 }),
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockRolls }),
    } as Response)

    const { fetchPendingRolls, pendingRolls, hasPendingRolls } = useGmDiceAttribution()
    await fetchPendingRolls('campaign-123')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/pending-rolls',
      { credentials: 'include' }
    )
    expect(pendingRolls.value).toEqual(mockRolls)
    expect(hasPendingRolls.value).toBe(true)
  })

  test('fetchPendingRolls() should set loading state', async () => {
    let resolveFetch: ((value: Response) => void) | undefined
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

    const { fetchPendingRolls, loading } = useGmDiceAttribution()
    const promise = fetchPendingRolls('campaign-123')

    expect(loading.value).toBe(true)

    resolveFetch!({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)
    await promise

    expect(loading.value).toBe(false)
  })

  test('fetchPendingRolls() should handle errors and clear rolls', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { fetchPendingRolls, pendingRolls } = useGmDiceAttribution()

    await expect(fetchPendingRolls('campaign-123')).rejects.toThrow('Failed to fetch pending rolls')
    expect(pendingRolls.value).toEqual([])
  })

  // ========================================
  // attributeRoll
  // ========================================

  test('attributeRoll() should POST and remove roll from pending', async () => {
    const roll = createMockRoll({ id: 'roll-1' })

    // First, load a roll into state
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [roll] }),
    } as Response)

    const { fetchPendingRolls, attributeRoll, pendingRolls } = useGmDiceAttribution()
    await fetchPendingRolls('campaign-123')
    expect(pendingRolls.value).toHaveLength(1)

    // Then attribute it
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response)

    await attributeRoll('campaign-123', 'roll-1', 'char-456')

    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:3333/mj/campaigns/campaign-123/dice-rolls/roll-1/attribute',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: 'char-456' }),
      })
    )
    expect(pendingRolls.value).toHaveLength(0)
  })

  test('attributeRoll() should support null characterId (ignore roll)', async () => {
    const roll = createMockRoll({ id: 'roll-1' })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [roll] }),
    } as Response)

    const { fetchPendingRolls, attributeRoll } = useGmDiceAttribution()
    await fetchPendingRolls('campaign-123')

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response)

    await attributeRoll('campaign-123', 'roll-1', null)

    expect(fetch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ characterId: null }),
      })
    )
  })

  test('attributeRoll() should set attributing state', async () => {
    let resolveFetch: ((value: Response) => void) | undefined
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

    const { attributeRoll, attributing } = useGmDiceAttribution()
    const promise = attributeRoll('campaign-123', 'roll-1', 'char-1')

    expect(attributing.value).toBe(true)

    resolveFetch!({
      ok: true,
      json: async () => ({}),
    } as Response)
    await promise

    expect(attributing.value).toBe(false)
  })

  test('attributeRoll() should handle error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Roll not found' }),
    } as Response)

    const { attributeRoll } = useGmDiceAttribution()

    await expect(attributeRoll('campaign-123', 'nonexistent', 'char-1')).rejects.toThrow(
      'Roll not found'
    )
  })

  // ========================================
  // addPendingRoll
  // ========================================

  test('addPendingRoll() should add a new roll to pending', () => {
    const { addPendingRoll, pendingRolls, hasPendingRolls } = useGmDiceAttribution()

    const roll = createMockRoll({ id: 'roll-ws-1' })
    addPendingRoll(roll)

    expect(pendingRolls.value).toHaveLength(1)
    expect(pendingRolls.value[0].id).toBe('roll-ws-1')
    expect(hasPendingRolls.value).toBe(true)
  })

  test('addPendingRoll() should not add duplicate rolls', () => {
    const { addPendingRoll, pendingRolls } = useGmDiceAttribution()

    const roll = createMockRoll({ id: 'roll-1' })
    addPendingRoll(roll)
    addPendingRoll(roll)

    expect(pendingRolls.value).toHaveLength(1)
  })

  // ========================================
  // removePendingRoll
  // ========================================

  test('removePendingRoll() should remove roll by id', () => {
    const { addPendingRoll, removePendingRoll, pendingRolls } = useGmDiceAttribution()

    addPendingRoll(createMockRoll({ id: 'roll-1' }))
    addPendingRoll(createMockRoll({ id: 'roll-2' }))
    expect(pendingRolls.value).toHaveLength(2)

    removePendingRoll('roll-1')
    expect(pendingRolls.value).toHaveLength(1)
    expect(pendingRolls.value[0].id).toBe('roll-2')
  })

  test('removePendingRoll() should be no-op for non-existent roll', () => {
    const { addPendingRoll, removePendingRoll, pendingRolls } = useGmDiceAttribution()

    addPendingRoll(createMockRoll({ id: 'roll-1' }))
    removePendingRoll('nonexistent')

    expect(pendingRolls.value).toHaveLength(1)
  })

  // ========================================
  // Computed properties
  // ========================================

  test('oldestPendingRoll should return the first roll', () => {
    const { addPendingRoll, oldestPendingRoll } = useGmDiceAttribution()

    addPendingRoll(createMockRoll({ id: 'roll-oldest', result: 1 }))
    addPendingRoll(createMockRoll({ id: 'roll-newest', result: 20 }))

    expect(oldestPendingRoll.value!.id).toBe('roll-oldest')
  })

  test('oldestPendingRoll should return null when empty', () => {
    const { oldestPendingRoll } = useGmDiceAttribution()
    expect(oldestPendingRoll.value).toBeNull()
  })
})
