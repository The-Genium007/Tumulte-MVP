import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { CampaignReadiness } from '@/types'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock readiness data
const mockReadinessData: CampaignReadiness = {
  campaignId: 'campaign-1',
  allReady: false,
  readyCount: 2,
  totalCount: 3,
  streamers: [
    {
      streamerId: 'streamer-1',
      streamerName: 'Streamer One',
      streamerAvatar: 'https://example.com/avatar1.png',
      twitchUserId: 'twitch-1',
      isReady: true,
      issues: [],
      tokenValid: true,
      authorizationActive: true,
      authorizationExpiresAt: null,
    },
    {
      streamerId: 'streamer-2',
      streamerName: 'Streamer Two',
      streamerAvatar: 'https://example.com/avatar2.png',
      twitchUserId: 'twitch-2',
      isReady: true,
      issues: [],
      tokenValid: true,
      authorizationActive: true,
      authorizationExpiresAt: null,
    },
    {
      streamerId: 'streamer-3',
      streamerName: 'Streamer Three',
      streamerAvatar: 'https://example.com/avatar3.png',
      twitchUserId: 'twitch-3',
      isReady: false,
      issues: ['authorization_missing'],
      tokenValid: true,
      authorizationActive: false,
      authorizationExpiresAt: null,
    },
  ],
}

describe('useReadiness Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)
  })

  describe('Initial State', () => {
    test('should initialize with null error', async () => {
      const { useReadiness } = await import('~/composables/useReadiness')
      const { error } = useReadiness()

      expect(error.value).toBeNull()
    })

    test('should expose store', async () => {
      const { useReadiness } = await import('~/composables/useReadiness')
      const { store } = useReadiness()

      expect(store).toBeDefined()
      expect(store.readiness).toBeNull()
    })
  })

  describe('fetchReadiness', () => {
    test('should fetch readiness successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockReadinessData }),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { fetchReadiness, store } = useReadiness()

      const result = await fetchReadiness('campaign-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-1/dashboards/readiness',
        { credentials: 'include' }
      )
      expect(result).toEqual(mockReadinessData)
      expect(store.readiness).toEqual(mockReadinessData)
    })

    test('should set loading state via store', async () => {
      let resolvePromise: (value: unknown) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(fetchPromise)

      const { useReadiness } = await import('~/composables/useReadiness')
      const { fetchReadiness, store } = useReadiness()

      const fetchCall = fetchReadiness('campaign-1')

      expect(store.isLoading).toBe(true)

      resolvePromise!({
        ok: true,
        json: async () => ({ data: mockReadinessData }),
      })

      await fetchCall

      expect(store.isLoading).toBe(false)
    })

    test('should set loading to false on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { fetchReadiness, store } = useReadiness()

      await expect(fetchReadiness('campaign-1')).rejects.toThrow()

      expect(store.isLoading).toBe(false)
    })

    test('should set error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { fetchReadiness, error } = useReadiness()

      await expect(fetchReadiness('campaign-1')).rejects.toThrow()

      expect(error.value).toBe('Failed to fetch readiness')
    })

    test('should clear error before fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockReadinessData }),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { fetchReadiness, error } = useReadiness()

      // Set initial error
      error.value = 'Previous error'

      await fetchReadiness('campaign-1')

      expect(error.value).toBeNull()
    })
  })

  describe('notifyUnready', () => {
    test('should notify unready streamers successfully', async () => {
      const notifyResponse = {
        notified: 2,
        streamers: ['Streamer Two', 'Streamer Three'],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: notifyResponse }),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { notifyUnready } = useReadiness()

      const result = await notifyUnready('campaign-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-1/notify-unready',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      expect(result).toEqual(notifyResponse)
    })

    test('should set error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { notifyUnready, error } = useReadiness()

      await expect(notifyUnready('campaign-1')).rejects.toThrow()

      expect(error.value).toBe('Failed to notify streamers')
    })

    test('should clear error before notify', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { notified: 0, streamers: [] } }),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { notifyUnready, error } = useReadiness()

      error.value = 'Previous error'

      await notifyUnready('campaign-1')

      expect(error.value).toBeNull()
    })
  })

  describe('launchSession', () => {
    test('should launch session successfully', async () => {
      const launchResponse = { sessionId: 'session-1', status: 'active' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: launchResponse }),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { launchSession } = useReadiness()

      const result = await launchSession('campaign-1', 'session-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-1/sessions/session-1/launch',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      expect(result).toEqual({ success: true, data: launchResponse })
    })

    test('should open modal on 503 with readinessDetails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ readinessDetails: mockReadinessData }),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { launchSession, store } = useReadiness()

      const result = await launchSession('campaign-1', 'session-1')

      expect(result).toEqual({ success: false })
      expect(store.isModalOpen).toBe(true)
      expect(store.pendingCampaignId).toBe('campaign-1')
      expect(store.pendingSessionId).toBe('session-1')
      expect(store.readiness).toEqual(mockReadinessData)
    })

    test('should throw error on 503 without readinessDetails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service unavailable' }),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { launchSession } = useReadiness()

      await expect(launchSession('campaign-1', 'session-1')).rejects.toThrow('Service unavailable')
    })

    test('should throw error on 503 with default message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { launchSession } = useReadiness()

      await expect(launchSession('campaign-1', 'session-1')).rejects.toThrow('Health check failed')
    })

    test('should throw error on other failure status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid session' }),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { launchSession } = useReadiness()

      await expect(launchSession('campaign-1', 'session-1')).rejects.toThrow('Invalid session')
    })

    test('should use default error message on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { launchSession } = useReadiness()

      await expect(launchSession('campaign-1', 'session-1')).rejects.toThrow(
        'Failed to launch session'
      )
    })

    test('should set error on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { useReadiness } = await import('~/composables/useReadiness')
      const { launchSession, error } = useReadiness()

      await expect(launchSession('campaign-1', 'session-1')).rejects.toThrow()

      expect(error.value).toBe('Network error')
    })
  })

  describe('retryLaunch', () => {
    test('should retry launch with pending session', async () => {
      // First, simulate a 503 to set pending state
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ readinessDetails: mockReadinessData }),
      })

      const { useReadiness } = await import('~/composables/useReadiness')
      const { launchSession, retryLaunch } = useReadiness()

      await launchSession('campaign-1', 'session-1')

      // Now retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { status: 'active' } }),
      })

      const result = await retryLaunch()

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-1/sessions/session-1/launch',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      expect(result).toEqual({ success: true, data: { status: 'active' } })
    })

    test('should throw error when no pending session', async () => {
      const { useReadiness } = await import('~/composables/useReadiness')
      const { retryLaunch } = useReadiness()

      await expect(retryLaunch()).rejects.toThrow('No pending session to retry')
    })

    test('should throw error when no pending campaign', async () => {
      const { useReadiness } = await import('~/composables/useReadiness')
      const { retryLaunch, store } = useReadiness()

      // Set only session, not campaign
      store.pendingSessionId = 'session-1'

      await expect(retryLaunch()).rejects.toThrow('No pending session to retry')
    })
  })
})
