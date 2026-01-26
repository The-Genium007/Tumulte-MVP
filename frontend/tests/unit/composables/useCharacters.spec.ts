import { describe, test, expect, beforeEach, vi } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock fixtures
const mockCharacters = [
  {
    id: 'char-1',
    campaignId: 'campaign-1',
    vttCharacterId: 'vtt-1',
    name: 'Gandalf',
    avatarUrl: 'https://example.com/gandalf.png',
    characterType: 'pc' as const,
    stats: { hp: 100, mp: 200 },
    inventory: { gold: 500 },
    vttData: null,
    lastSyncAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'char-2',
    campaignId: 'campaign-1',
    vttCharacterId: 'vtt-2',
    name: 'Frodo',
    avatarUrl: null,
    characterType: 'pc' as const,
    stats: { hp: 50, mp: 10 },
    inventory: { ring: 1 },
    vttData: null,
    lastSyncAt: '2024-01-02T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
]

const mockAssignment = {
  id: 'assign-1',
  characterId: 'char-1',
  streamerId: 'streamer-1',
  campaignId: 'campaign-1',
  assignedAt: '2024-01-01T12:00:00Z',
  character: mockCharacters[0],
}

describe('useCharacters Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)
  })

  describe('Initial State', () => {
    test('should initialize with empty characters array', async () => {
      const { useCharacters } = await import('~/composables/useCharacters')
      const { characters } = useCharacters()

      expect(characters.value).toEqual([])
    })

    test('should initialize with null currentAssignment', async () => {
      const { useCharacters } = await import('~/composables/useCharacters')
      const { currentAssignment } = useCharacters()

      expect(currentAssignment.value).toBeNull()
    })

    test('should initialize with loading false', async () => {
      const { useCharacters } = await import('~/composables/useCharacters')
      const { loading } = useCharacters()

      expect(loading.value).toBe(false)
    })
  })

  describe('fetchCampaignCharacters', () => {
    test('should fetch characters successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          characters: mockCharacters,
          currentAssignment: mockAssignment,
        }),
      })

      const { useCharacters } = await import('~/composables/useCharacters')
      const { fetchCampaignCharacters, characters, currentAssignment } = useCharacters()

      await fetchCampaignCharacters('campaign-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/campaign-1/characters',
        { credentials: 'include' }
      )
      expect(characters.value).toEqual(mockCharacters)
      expect(currentAssignment.value).toEqual(mockAssignment)
    })

    test('should set loading to true while fetching', async () => {
      let resolvePromise: (value: unknown) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(fetchPromise)

      const { useCharacters } = await import('~/composables/useCharacters')
      const { fetchCampaignCharacters, loading } = useCharacters()

      const fetchCall = fetchCampaignCharacters('campaign-1')

      expect(loading.value).toBe(true)

      resolvePromise!({
        ok: true,
        json: async () => ({ characters: [], currentAssignment: null }),
      })

      await fetchCall

      expect(loading.value).toBe(false)
    })

    test('should set loading to false on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { useCharacters } = await import('~/composables/useCharacters')
      const { fetchCampaignCharacters, loading } = useCharacters()

      await expect(fetchCampaignCharacters('campaign-1')).rejects.toThrow(
        'Failed to fetch characters'
      )

      expect(loading.value).toBe(false)
    })

    test('should handle null currentAssignment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          characters: mockCharacters,
          currentAssignment: null,
        }),
      })

      const { useCharacters } = await import('~/composables/useCharacters')
      const { fetchCampaignCharacters, currentAssignment } = useCharacters()

      await fetchCampaignCharacters('campaign-1')

      expect(currentAssignment.value).toBeNull()
    })
  })

  describe('assignCharacter', () => {
    test('should assign character successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAssignment,
      })

      const { useCharacters } = await import('~/composables/useCharacters')
      const { assignCharacter, currentAssignment } = useCharacters()

      const result = await assignCharacter('campaign-1', 'char-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/campaign-1/characters/char-1/assign',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      expect(result).toEqual(mockAssignment)
      expect(currentAssignment.value).toEqual(mockAssignment)
    })

    test('should throw error with message from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Character already assigned' }),
      })

      const { useCharacters } = await import('~/composables/useCharacters')
      const { assignCharacter } = useCharacters()

      await expect(assignCharacter('campaign-1', 'char-1')).rejects.toThrow(
        'Character already assigned'
      )
    })

    test('should throw default error when no error message in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      const { useCharacters } = await import('~/composables/useCharacters')
      const { assignCharacter } = useCharacters()

      await expect(assignCharacter('campaign-1', 'char-1')).rejects.toThrow(
        'Failed to assign character'
      )
    })
  })

  describe('unassignCharacter', () => {
    test('should unassign character successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const { useCharacters } = await import('~/composables/useCharacters')
      const { unassignCharacter, currentAssignment } = useCharacters()

      // Set initial assignment
      // @ts-expect-error - accessing internal ref for test
      currentAssignment.value = mockAssignment

      await unassignCharacter('campaign-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/campaign-1/characters/unassign',
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
      expect(currentAssignment.value).toBeNull()
    })

    test('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const { useCharacters } = await import('~/composables/useCharacters')
      const { unassignCharacter } = useCharacters()

      await expect(unassignCharacter('campaign-1')).rejects.toThrow('Failed to unassign character')
    })
  })

  describe('Readonly State', () => {
    test('characters should be readonly (value unchanged after write attempt)', async () => {
      const { useCharacters } = await import('~/composables/useCharacters')
      const { characters } = useCharacters()

      const originalValue = characters.value

      // Attempt to modify - readonly will silently fail in dev mode
      try {
        // @ts-expect-error - testing readonly behavior
        characters.value = [{ id: 'test' }]
      } catch {
        // May throw in strict mode
      }

      // Value should remain unchanged
      expect(characters.value).toEqual(originalValue)
    })

    test('currentAssignment should be readonly (value unchanged after write attempt)', async () => {
      const { useCharacters } = await import('~/composables/useCharacters')
      const { currentAssignment } = useCharacters()

      const originalValue = currentAssignment.value

      try {
        // @ts-expect-error - testing readonly behavior
        currentAssignment.value = { id: 'test' }
      } catch {
        // May throw in strict mode
      }

      expect(currentAssignment.value).toEqual(originalValue)
    })

    test('loading should be readonly (value unchanged after write attempt)', async () => {
      const { useCharacters } = await import('~/composables/useCharacters')
      const { loading } = useCharacters()

      const originalValue = loading.value

      try {
        // @ts-expect-error - testing readonly behavior
        loading.value = true
      } catch {
        // May throw in strict mode
      }

      expect(loading.value).toBe(originalValue)
    })
  })
})
