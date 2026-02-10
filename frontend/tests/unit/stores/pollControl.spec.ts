import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePollControlStore } from '~/stores/pollControl'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// Mock useRuntimeConfig
vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    apiBase: 'http://localhost:3333/api/v2',
  },
}))

// Mock usePollInstance composable
const mockFetchPollInstance = vi.fn()
vi.mock('@/composables/usePollInstance', () => ({
  usePollInstance: () => ({
    fetchPollInstance: mockFetchPollInstance,
  }),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('Poll Control Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  test('should initialize with default state', () => {
    const store = usePollControlStore()

    expect(store.activeSession).toBeNull()
    expect(store.activeSessionPolls).toEqual([])
    expect(store.currentPollIndex).toBe(0)
    expect(store.pollStatus).toBe('idle')
    expect(store.countdown).toBe(0)
    expect(store.pollResults).toBeNull()
    expect(store.launchedPolls).toEqual([])
    expect(store.pollStartTime).toBeNull()
    expect(store.pollDuration).toBeNull()
    expect(store.currentPollInstanceId).toBeNull()
    expect(store.pollStates).toEqual({})
  })

  test('saveState() should persist state to localStorage', async () => {
    const store = usePollControlStore()

    // Set some state
    store.activeSession = { id: 'session-123' }
    store.activeSessionPolls = [{ id: 'poll-1' }, { id: 'poll-2' }]
    store.currentPollIndex = 1
    store.pollStatus = 'running'
    store.pollResults = {
      results: [
        { optionIndex: 0, votes: 10 },
        { optionIndex: 1, votes: 5 },
      ],
      totalVotes: 15,
    }

    // Wait for initialization flag to be cleared
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Manually call saveState
    store.saveState()

    expect(localStorageMock.setItem).toHaveBeenCalledWith('pollControl', expect.any(String))

    // Verify saved data structure
    const savedData = JSON.parse(localStorageMock.getItem('pollControl') as string)
    expect(savedData.activeSession).toEqual({ id: 'session-123' })
    expect(savedData.currentPollIndex).toBe(1)
    expect(savedData.pollStatus).toBe('running')
    expect(savedData.pollResults).toEqual({
      results: [
        { optionIndex: 0, votes: 10 },
        { optionIndex: 1, votes: 5 },
      ],
      totalVotes: 15,
    })
    expect(savedData.timestamp).toBeTypeOf('number')
  })

  test('loadState() should restore state from localStorage', () => {
    // Prepare localStorage data
    const mockState = {
      activeSession: { id: 'session-456' },
      activeSessionPolls: [{ id: 'poll-3' }],
      currentPollIndex: 2,
      pollStatus: 'sent',
      countdown: 0,
      pollResults: {
        results: [{ optionIndex: 0, votes: 20 }],
        totalVotes: 20,
      },
      launchedPolls: [0, 1],
      pollStartTime: Date.now() - 60000,
      pollDuration: 60,
      currentPollInstanceId: 'instance-789',
      pollStates: {
        0: {
          status: 'sent',
          results: null,
          instanceId: 'instance-1',
          startTime: null,
          duration: null,
        },
      },
      timestamp: Date.now(),
    }

    localStorageMock.setItem('pollControl', JSON.stringify(mockState))

    // Create store (loadState is called automatically)
    const store = usePollControlStore()

    expect(store.activeSession).toEqual({ id: 'session-456' })
    expect(store.activeSessionPolls).toEqual([{ id: 'poll-3' }])
    expect(store.currentPollIndex).toBe(2)
    expect(store.pollStatus).toBe('sent')
    expect(store.pollResults).toEqual({
      results: [{ optionIndex: 0, votes: 20 }],
      totalVotes: 20,
    })
    expect(store.launchedPolls).toEqual([0, 1])
    expect(store.currentPollInstanceId).toBe('instance-789')
    expect(store.pollStates).toHaveProperty('0')
  })

  test('loadState() should remove expired data (older than 24 hours)', () => {
    const expiredState = {
      activeSession: { id: 'old-session' },
      activeSessionPolls: [],
      currentPollIndex: 0,
      pollStatus: 'idle',
      countdown: 0,
      pollResults: null,
      launchedPolls: [],
      pollStartTime: null,
      pollDuration: null,
      currentPollInstanceId: null,
      pollStates: {},
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    }

    localStorageMock.setItem('pollControl', JSON.stringify(expiredState))

    // Create store (loadState is called automatically)
    const store = usePollControlStore()

    // State should be reset to defaults (not loaded from expired data)
    expect(store.activeSession).toBeNull()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('pollControl')
  })

  test('clearState() should reset all state and clear localStorage', async () => {
    const store = usePollControlStore()

    // Set some state
    store.activeSession = { id: 'session-123' }
    store.pollStatus = 'running'
    store.pollResults = {
      results: [{ optionIndex: 0, votes: 10 }],
      totalVotes: 10,
    }

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Clear state
    store.clearState()

    expect(store.activeSession).toBeNull()
    expect(store.activeSessionPolls).toEqual([])
    expect(store.currentPollIndex).toBe(0)
    expect(store.pollStatus).toBe('idle')
    expect(store.countdown).toBe(0)
    expect(store.pollResults).toBeNull()
    expect(store.launchedPolls).toEqual([])
    expect(store.pollStartTime).toBeNull()
    expect(store.pollDuration).toBeNull()
    expect(store.currentPollInstanceId).toBeNull()
    expect(store.pollStates).toEqual({})
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('pollControl')
  })

  test('saveCurrentPollState() should save poll state by index', () => {
    const store = usePollControlStore()

    store.currentPollIndex = 0
    store.pollStatus = 'running'
    store.pollResults = {
      results: [{ optionIndex: 0, votes: 5 }],
      totalVotes: 5,
    }
    store.currentPollInstanceId = 'instance-123'
    store.pollStartTime = Date.now()
    store.pollDuration = 60

    store.saveCurrentPollState()

    expect(store.pollStates[0]).toEqual({
      status: 'running',
      results: {
        results: [{ optionIndex: 0, votes: 5 }],
        totalVotes: 5,
      },
      instanceId: 'instance-123',
      startTime: expect.any(Number),
      duration: 60,
    })
  })

  test('restorePollState() should restore poll state by index', () => {
    const store = usePollControlStore()

    // Save state for poll index 1
    store.pollStates = {
      1: {
        status: 'sent',
        results: {
          results: [{ optionIndex: 0, votes: 15 }],
          totalVotes: 15,
        },
        instanceId: 'instance-456',
        startTime: null,
        duration: null,
      },
    }

    // Restore poll state for index 1
    store.restorePollState(1)

    expect(store.pollStatus).toBe('sent')
    expect(store.pollResults).toEqual({
      results: [{ optionIndex: 0, votes: 15 }],
      totalVotes: 15,
    })
    expect(store.currentPollInstanceId).toBe('instance-456')
    expect(store.countdown).toBe(0)
  })

  test('restorePollState() should reset to idle if no saved state exists', () => {
    const store = usePollControlStore()

    // Set some current state
    store.pollStatus = 'running'
    store.pollResults = {
      results: [{ optionIndex: 0, votes: 10 }],
      totalVotes: 10,
    }

    // Try to restore poll index 5 (doesn't exist)
    store.restorePollState(5)

    expect(store.pollStatus).toBe('idle')
    expect(store.pollResults).toBeNull()
    expect(store.currentPollInstanceId).toBeNull()
    expect(store.pollStartTime).toBeNull()
    expect(store.pollDuration).toBeNull()
    expect(store.countdown).toBe(0)
  })

  test('should automatically save state when activeSession changes', async () => {
    const store = usePollControlStore()

    // Wait for initialization flag to be cleared
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Clear previous calls
    vi.clearAllMocks()

    // Change activeSession
    store.activeSession = { id: 'new-session' }

    // Wait for watcher to trigger
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Should have saved to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('pollControl', expect.any(String))
  })

  test('should remove localStorage when activeSession is cleared', async () => {
    const store = usePollControlStore()

    // Set activeSession first
    store.activeSession = { id: 'session-123' }

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Clear previous calls
    vi.clearAllMocks()

    // Clear activeSession
    store.activeSession = null

    // Wait for watcher to trigger
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Should have removed from localStorage
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('pollControl')
  })

  describe('syncWithBackend', () => {
    test('should do nothing if no currentPollInstanceId', async () => {
      const store = usePollControlStore()

      store.currentPollInstanceId = null

      await store.syncWithBackend()

      // No API call should be made
      expect(mockFetchPollInstance).not.toHaveBeenCalled()
    })

    test('should update state when poll is ENDED', async () => {
      const mockPollInstance = {
        status: 'ENDED',
        options: ['Option A', 'Option B'],
        finalVotesByOption: { '0': 10, '1': 5 },
        finalTotalVotes: 15,
      }

      mockFetchPollInstance.mockResolvedValueOnce(mockPollInstance)

      const store = usePollControlStore()
      store.currentPollInstanceId = 'instance-123'
      store.pollStatus = 'sending'

      await store.syncWithBackend()

      expect(store.pollStatus).toBe('sent')
      expect(store.countdown).toBe(0)
      expect(store.pollStartTime).toBeNull()
      expect(store.pollDuration).toBeNull()
      expect(store.pollResults).toEqual({
        results: [
          { optionIndex: 0, votes: 10 },
          { optionIndex: 1, votes: 5 },
        ],
        totalVotes: 15,
      })
    })

    test('should update countdown when poll is RUNNING', async () => {
      const now = Date.now()
      const startedAt = new Date(now - 30000).toISOString() // Started 30s ago

      const mockPollInstance = {
        status: 'RUNNING',
        startedAt,
        durationSeconds: 60,
        options: ['Option A', 'Option B'],
      }

      mockFetchPollInstance.mockResolvedValueOnce(mockPollInstance)

      const store = usePollControlStore()
      store.currentPollInstanceId = 'instance-123'
      store.pollStatus = 'idle'

      await store.syncWithBackend()

      expect(store.pollStatus).toBe('sending')
      expect(store.countdown).toBeGreaterThan(25) // ~30 seconds remaining
      expect(store.countdown).toBeLessThanOrEqual(30)
    })

    test('should handle fetch error gracefully', async () => {
      mockFetchPollInstance.mockRejectedValueOnce(new Error('Network error'))

      const store = usePollControlStore()
      store.currentPollInstanceId = 'instance-123'
      store.pollStatus = 'sending'

      // Should not throw
      await store.syncWithBackend()

      // Should keep local state
      expect(store.pollStatus).toBe('sending')
    })
  })

  describe('validateWithBackend', () => {
    test('should return true when synchronized', async () => {
      const axios = await import('axios')
      vi.mocked(axios.default.get).mockResolvedValueOnce({
        data: {
          data: {
            session: { id: 'session-123' },
            currentPoll: null,
            serverTime: Date.now(),
          },
        },
      })

      const store = usePollControlStore()
      store.pollStatus = 'idle'
      store.currentPollInstanceId = null

      const result = await store.validateWithBackend('campaign-1', 'session-1')

      expect(result).toBe(true)
    })

    test('should detect desync when frontend has poll but backend does not', async () => {
      const axios = await import('axios')
      vi.mocked(axios.default.get).mockResolvedValueOnce({
        data: {
          data: {
            session: { id: 'session-123' },
            currentPoll: null,
            serverTime: Date.now(),
          },
        },
      })

      const store = usePollControlStore()
      store.pollStatus = 'sending'
      store.currentPollInstanceId = 'instance-123'

      const result = await store.validateWithBackend('campaign-1', 'session-1')

      expect(result).toBe(false)
      expect(store.pollStatus).toBe('idle')
      expect(store.currentPollInstanceId).toBeNull()
    })

    test('should detect desync when backend has poll but frontend is idle', async () => {
      const now = Date.now()
      const axios = await import('axios')
      vi.mocked(axios.default.get).mockResolvedValueOnce({
        data: {
          data: {
            session: { id: 'session-123' },
            currentPoll: {
              id: 'poll-123',
              status: 'RUNNING',
              startedAt: new Date(now - 10000).toISOString(),
              durationSeconds: 60,
            },
            serverTime: now,
          },
        },
      })

      const store = usePollControlStore()
      store.pollStatus = 'idle'

      const result = await store.validateWithBackend('campaign-1', 'session-1')

      expect(result).toBe(false)
      expect(store.pollStatus).toBe('sending')
      expect(store.currentPollInstanceId).toBe('poll-123')
      expect(store.countdown).toBeGreaterThan(45) // ~50 seconds remaining
    })

    test("should detect desync when poll IDs don't match", async () => {
      const axios = await import('axios')
      vi.mocked(axios.default.get).mockResolvedValueOnce({
        data: {
          data: {
            session: { id: 'session-123' },
            currentPoll: {
              id: 'different-poll',
              status: 'RUNNING',
            },
            serverTime: Date.now(),
          },
        },
      })

      const store = usePollControlStore()
      store.pollStatus = 'sending'
      store.currentPollInstanceId = 'my-poll'

      const result = await store.validateWithBackend('campaign-1', 'session-1')

      expect(result).toBe(false)
    })

    test('should handle network errors gracefully', async () => {
      const axios = await import('axios')
      vi.mocked(axios.default.get).mockRejectedValueOnce(new Error('Network error'))

      const store = usePollControlStore()
      store.pollStatus = 'sending'

      const result = await store.validateWithBackend('campaign-1', 'session-1')

      // Should return true (keep local state on error)
      expect(result).toBe(true)
      expect(store.pollStatus).toBe('sending')
    })
  })

  describe('startHeartbeat / stopHeartbeat', () => {
    test('startHeartbeat should start interval', async () => {
      vi.useFakeTimers()

      const axios = await import('axios')
      vi.mocked(axios.default.post).mockResolvedValue({
        data: {
          data: {
            currentPoll: null,
            serverTime: Date.now(),
          },
        },
      })

      const store = usePollControlStore()
      store.startHeartbeat('campaign-1', 'session-1')

      // Advance timer by heartbeat interval (30s)
      await vi.advanceTimersByTimeAsync(30000)

      expect(axios.default.post).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-1/sessions/session-1/heartbeat',
        {},
        { withCredentials: true }
      )

      store.stopHeartbeat()
      vi.useRealTimers()
    })

    test('stopHeartbeat should clear interval', async () => {
      vi.useFakeTimers()

      const axios = await import('axios')
      vi.mocked(axios.default.post).mockResolvedValue({
        data: {
          data: {
            currentPoll: null,
            serverTime: Date.now(),
          },
        },
      })

      const store = usePollControlStore()
      store.startHeartbeat('campaign-1', 'session-1')
      store.stopHeartbeat()

      // Advance timer
      await vi.advanceTimersByTimeAsync(60000)

      // Should not have been called (interval was cleared)
      expect(axios.default.post).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    test('startHeartbeat should correct countdown drift', async () => {
      vi.useFakeTimers()

      const now = Date.now()
      const axios = await import('axios')
      vi.mocked(axios.default.post).mockResolvedValue({
        data: {
          data: {
            currentPoll: {
              id: 'poll-123',
              status: 'RUNNING',
              startedAt: new Date(now - 10000).toISOString(),
              durationSeconds: 60,
            },
            serverTime: now,
          },
        },
      })

      const store = usePollControlStore()
      store.pollStatus = 'sending'
      store.countdown = 30 // Local countdown is wrong (should be ~50)
      store.currentPollInstanceId = 'poll-123'

      store.startHeartbeat('campaign-1', 'session-1')

      // Advance timer by heartbeat interval (30s)
      await vi.advanceTimersByTimeAsync(30000)

      // Countdown should be corrected (drift > 2 seconds)
      expect(store.countdown).toBeGreaterThan(40)

      store.stopHeartbeat()
      vi.useRealTimers()
    })

    test('startHeartbeat should detect desync and revalidate', async () => {
      vi.useFakeTimers()

      const axios = await import('axios')
      // First call: heartbeat shows no poll on backend
      vi.mocked(axios.default.post).mockResolvedValueOnce({
        data: {
          data: {
            currentPoll: null,
            serverTime: Date.now(),
          },
        },
      })
      // Second call: validation endpoint
      vi.mocked(axios.default.get).mockResolvedValueOnce({
        data: {
          data: {
            session: { id: 'session-1' },
            currentPoll: null,
            serverTime: Date.now(),
          },
        },
      })

      const store = usePollControlStore()
      store.pollStatus = 'sending' // Frontend thinks poll is running
      store.currentPollInstanceId = 'poll-123'

      store.startHeartbeat('campaign-1', 'session-1')

      // Advance timer by heartbeat interval
      await vi.advanceTimersByTimeAsync(30000)

      // Should have detected desync and reset
      expect(store.pollStatus).toBe('idle')

      store.stopHeartbeat()
      vi.useRealTimers()
    })

    test('startHeartbeat should handle heartbeat errors gracefully', async () => {
      vi.useFakeTimers()

      const axios = await import('axios')
      vi.mocked(axios.default.post).mockRejectedValueOnce(new Error('Network error'))

      const store = usePollControlStore()
      store.pollStatus = 'sending'

      store.startHeartbeat('campaign-1', 'session-1')

      // Should not throw
      await vi.advanceTimersByTimeAsync(30000)

      // State should remain unchanged
      expect(store.pollStatus).toBe('sending')

      store.stopHeartbeat()
      vi.useRealTimers()
    })
  })

  describe('restorePollState - countdown recalculation', () => {
    test('should recalculate countdown for sending poll with time remaining', () => {
      const store = usePollControlStore()

      const startTime = Date.now() - 30000 // Started 30s ago
      store.pollStates = {
        0: {
          status: 'sending',
          results: null,
          instanceId: 'instance-123',
          startTime,
          duration: 60,
        },
      }

      store.restorePollState(0)

      expect(store.pollStatus).toBe('sending')
      expect(store.countdown).toBeGreaterThan(25)
      expect(store.countdown).toBeLessThanOrEqual(30)
    })

    test('should set status to sent when time has elapsed', () => {
      const store = usePollControlStore()

      const startTime = Date.now() - 120000 // Started 2 minutes ago
      store.pollStates = {
        0: {
          status: 'sending',
          results: null,
          instanceId: 'instance-123',
          startTime,
          duration: 60, // Only 60 seconds duration
        },
      }

      store.restorePollState(0)

      expect(store.pollStatus).toBe('sent')
      expect(store.countdown).toBe(0)
    })
  })

  describe('loadState - countdown recalculation', () => {
    test('should recalculate countdown from localStorage for sending poll', () => {
      const startTime = Date.now() - 20000 // Started 20s ago

      const mockState = {
        activeSession: { id: 'session-123' },
        activeSessionPolls: [],
        currentPollIndex: 0,
        pollStatus: 'sending',
        countdown: 60, // Old countdown value
        pollResults: null,
        launchedPolls: [],
        pollStartTime: startTime,
        pollDuration: 60,
        currentPollInstanceId: 'instance-123',
        pollStates: {},
        timestamp: Date.now(),
      }

      localStorageMock.setItem('pollControl', JSON.stringify(mockState))

      const store = usePollControlStore()

      // Countdown should be recalculated
      expect(store.countdown).toBeGreaterThan(35)
      expect(store.countdown).toBeLessThanOrEqual(40)
    })

    test('should mark as sent when time elapsed during offline', () => {
      const startTime = Date.now() - 120000 // Started 2 minutes ago

      const mockState = {
        activeSession: { id: 'session-123' },
        activeSessionPolls: [],
        currentPollIndex: 0,
        pollStatus: 'sending',
        countdown: 60,
        pollResults: null,
        launchedPolls: [],
        pollStartTime: startTime,
        pollDuration: 60, // Only 60 seconds
        currentPollInstanceId: 'instance-123',
        pollStates: {},
        timestamp: Date.now(),
      }

      localStorageMock.setItem('pollControl', JSON.stringify(mockState))

      const store = usePollControlStore()

      expect(store.pollStatus).toBe('sent')
      expect(store.countdown).toBe(0)
      expect(store.pollStartTime).toBeNull()
      expect(store.pollDuration).toBeNull()
    })

    test('should handle invalid JSON in localStorage', () => {
      localStorageMock.setItem('pollControl', 'invalid-json{')

      // Should not throw
      const store = usePollControlStore()

      // Should have default values
      expect(store.activeSession).toBeNull()
      expect(store.pollStatus).toBe('idle')

      // Should have cleared invalid data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pollControl')
    })
  })

  describe('edge cases', () => {
    test('should handle missing pollStates in localStorage', () => {
      const mockState = {
        activeSession: { id: 'session-123' },
        activeSessionPolls: [],
        currentPollIndex: 0,
        pollStatus: 'idle',
        countdown: 0,
        pollResults: null,
        launchedPolls: [],
        pollStartTime: null,
        pollDuration: null,
        currentPollInstanceId: null,
        // pollStates is missing
        timestamp: Date.now(),
      }

      localStorageMock.setItem('pollControl', JSON.stringify(mockState))

      const store = usePollControlStore()

      expect(store.pollStates).toEqual({})
    })

    test('multiple polls can have independent states', () => {
      const store = usePollControlStore()

      // Save state for poll 0
      store.currentPollIndex = 0
      store.pollStatus = 'sent'
      store.pollResults = {
        results: [{ optionIndex: 0, votes: 10 }],
        totalVotes: 10,
      }
      store.saveCurrentPollState()

      // Save state for poll 1
      store.currentPollIndex = 1
      store.pollStatus = 'running'
      store.pollResults = {
        results: [{ optionIndex: 1, votes: 5 }],
        totalVotes: 5,
      }
      store.saveCurrentPollState()

      // Both states should be saved independently
      expect(store.pollStates[0]!.status).toBe('sent')
      expect(store.pollStates[0]!.results?.totalVotes).toBe(10)
      expect(store.pollStates[1]!.status).toBe('running')
      expect(store.pollStates[1]!.results?.totalVotes).toBe(5)

      // Restore poll 0
      store.restorePollState(0)
      expect(store.pollStatus).toBe('sent')
      expect(store.pollResults?.totalVotes).toBe(10)
    })
  })
})
