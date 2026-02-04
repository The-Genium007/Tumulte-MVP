import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useGmCharacters } from '~/composables/useGmCharacters'
import type { GmCharacter } from '~/composables/useGmCharacters'

// Mock fetch globally
global.fetch = vi.fn()

describe('useGmCharacters Composable', () => {
  const mockCharacters: GmCharacter[] = [
    {
      id: 'char-1',
      name: 'Hero',
      avatarUrl: 'https://example.com/hero.png',
      characterType: 'pc',
      vttCharacterId: 'vtt-1',
      stats: { hp: 100 },
      lastSyncAt: '2024-01-01T00:00:00Z',
      assignedToStreamer: null,
    },
    {
      id: 'char-2',
      name: 'Villain',
      avatarUrl: null,
      characterType: 'npc',
      vttCharacterId: 'vtt-2',
      stats: null,
      lastSyncAt: null,
      assignedToStreamer: { streamerId: 'streamer-1', streamerName: 'TestStreamer' },
    },
    {
      id: 'char-3',
      name: 'Dragon',
      avatarUrl: 'https://example.com/dragon.png',
      characterType: 'monster',
      vttCharacterId: 'vtt-3',
      stats: { hp: 500 },
      lastSyncAt: '2024-01-02T00:00:00Z',
      assignedToStreamer: null,
    },
  ]

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

  test('should initialize with default state', () => {
    const { characters, activeCharacter, loading, updating } = useGmCharacters()

    expect(characters.value).toEqual([])
    expect(activeCharacter.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(updating.value).toBe(false)
  })

  test('computed playerCharacters should filter PCs', () => {
    const { characters, playerCharacters } = useGmCharacters()

    characters.value = mockCharacters

    expect(playerCharacters.value).toHaveLength(1)
    expect(playerCharacters.value[0]?.characterType).toBe('pc')
    expect(playerCharacters.value[0]?.name).toBe('Hero')
  })

  test('computed nonPlayerCharacters should filter NPCs', () => {
    const { characters, nonPlayerCharacters } = useGmCharacters()

    characters.value = mockCharacters

    expect(nonPlayerCharacters.value).toHaveLength(1)
    expect(nonPlayerCharacters.value[0]?.characterType).toBe('npc')
    expect(nonPlayerCharacters.value[0]?.name).toBe('Villain')
  })

  test('computed monsterCharacters should filter monsters', () => {
    const { characters, monsterCharacters } = useGmCharacters()

    characters.value = mockCharacters

    expect(monsterCharacters.value).toHaveLength(1)
    expect(monsterCharacters.value[0]?.characterType).toBe('monster')
    expect(monsterCharacters.value[0]?.name).toBe('Dragon')
  })

  describe('fetchCharacters', () => {
    test('should fetch characters successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCharacters }),
      } as Response)

      const { fetchCharacters, characters, loading } = useGmCharacters()

      await fetchCharacters('campaign-123')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-123/characters',
        { credentials: 'include' }
      )
      expect(characters.value).toEqual(mockCharacters)
      expect(loading.value).toBe(false)
    })

    test('should handle fetch error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { fetchCharacters, characters } = useGmCharacters()

      await expect(fetchCharacters('campaign-123')).rejects.toThrow('Failed to fetch characters')
      expect(characters.value).toEqual([])

      consoleErrorSpy.mockRestore()
    })

    test('should set loading state during fetch', async () => {
      let resolveFetch!: (value: Response) => void
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })

      vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

      const { fetchCharacters, loading } = useGmCharacters()
      const fetchPromiseResult = fetchCharacters('campaign-123')

      expect(loading.value).toBe(true)

      resolveFetch({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      await fetchPromiseResult

      expect(loading.value).toBe(false)
    })
  })

  describe('fetchActiveCharacter', () => {
    test('should fetch active character successfully', async () => {
      const activeChar = mockCharacters[0]
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: activeChar }),
      } as Response)

      const { fetchActiveCharacter, activeCharacter } = useGmCharacters()

      await fetchActiveCharacter('campaign-123')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-123/active-character',
        { credentials: 'include' }
      )
      expect(activeCharacter.value).toEqual(activeChar)
    })

    test('should handle fetch error and set activeCharacter to null', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { fetchActiveCharacter, activeCharacter } = useGmCharacters()

      await expect(fetchActiveCharacter('campaign-123')).rejects.toThrow(
        'Failed to fetch active character'
      )
      expect(activeCharacter.value).toBeNull()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('setActiveCharacter', () => {
    test('should set active character successfully', async () => {
      const newActiveChar = mockCharacters[1]
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: newActiveChar }),
      } as Response)

      const { setActiveCharacter, activeCharacter, updating } = useGmCharacters()

      await setActiveCharacter('campaign-123', 'char-2')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-123/active-character',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: 'char-2' }),
        }
      )
      expect(activeCharacter.value).toEqual(newActiveChar)
      expect(updating.value).toBe(false)
    })

    test('should clear active character when characterId is null', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      } as Response)

      const { setActiveCharacter, activeCharacter } = useGmCharacters()

      await setActiveCharacter('campaign-123', null)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-123/active-character',
        expect.objectContaining({
          body: JSON.stringify({ characterId: null }),
        })
      )
      expect(activeCharacter.value).toBeNull()
    })

    test('should handle set error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Character not found' }),
      } as Response)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { setActiveCharacter, updating } = useGmCharacters()

      await expect(setActiveCharacter('campaign-123', 'invalid-id')).rejects.toThrow(
        'Character not found'
      )
      expect(updating.value).toBe(false)

      consoleErrorSpy.mockRestore()
    })

    test('should set updating state during operation', async () => {
      let resolveFetch!: (value: Response) => void
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })

      vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

      const { setActiveCharacter, updating } = useGmCharacters()
      const setPromise = setActiveCharacter('campaign-123', 'char-1')

      expect(updating.value).toBe(true)

      resolveFetch({
        ok: true,
        json: async () => ({ data: mockCharacters[0] }),
      } as Response)

      await setPromise

      expect(updating.value).toBe(false)
    })
  })

  describe('clearActiveCharacter', () => {
    test('should call setActiveCharacter with null', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      } as Response)

      const { clearActiveCharacter, activeCharacter } = useGmCharacters()

      await clearActiveCharacter('campaign-123')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-123/active-character',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ characterId: null }),
        })
      )
      expect(activeCharacter.value).toBeNull()
    })
  })

  describe('initialize', () => {
    test('should fetch both characters and active character', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockCharacters }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockCharacters[0] }),
        } as Response)

      const { initialize, characters, activeCharacter } = useGmCharacters()

      await initialize('campaign-123')

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(characters.value).toEqual(mockCharacters)
      expect(activeCharacter.value).toEqual(mockCharacters[0])
    })
  })

  describe('returned values', () => {
    test('should return all state and methods', () => {
      const gmCharacters = useGmCharacters()

      // State
      expect(gmCharacters.characters).toBeDefined()
      expect(gmCharacters.activeCharacter).toBeDefined()
      expect(gmCharacters.loading).toBeDefined()
      expect(gmCharacters.updating).toBeDefined()

      // Computed
      expect(gmCharacters.playerCharacters).toBeDefined()
      expect(gmCharacters.nonPlayerCharacters).toBeDefined()
      expect(gmCharacters.monsterCharacters).toBeDefined()

      // Methods
      expect(gmCharacters.fetchCharacters).toBeDefined()
      expect(gmCharacters.fetchActiveCharacter).toBeDefined()
      expect(gmCharacters.setActiveCharacter).toBeDefined()
      expect(gmCharacters.clearActiveCharacter).toBeDefined()
      expect(gmCharacters.initialize).toBeDefined()
    })
  })
})
