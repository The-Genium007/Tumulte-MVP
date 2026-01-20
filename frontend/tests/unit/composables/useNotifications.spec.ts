import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'

// Mock useCampaigns
const mockFetchInvitations = vi.fn()
vi.stubGlobal('useCampaigns', () => ({
  fetchInvitations: mockFetchInvitations,
}))

// Mock useAuth
const mockIsAuthenticated = ref(true)
vi.stubGlobal('useAuth', () => ({
  isAuthenticated: mockIsAuthenticated,
}))

// Mock useIntervalFn from @vueuse/core
const mockPause = vi.fn()
const mockResume = vi.fn()
const mockIsActive = ref(false)
vi.mock('@vueuse/core', () => ({
  useIntervalFn: vi.fn(() => ({
    pause: mockPause,
    resume: mockResume,
    isActive: mockIsActive,
  })),
}))

describe('useNotifications Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated.value = true
    mockIsActive.value = false
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('Initial State', () => {
    test('should initialize with zero invitation count', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { invitationCount } = useNotifications()

      expect(invitationCount.value).toBe(0)
    })

    test('should initialize with loading false', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { loading } = useNotifications()

      expect(loading.value).toBe(false)
    })

    test('should have hasInvitations as false initially', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { hasInvitations } = useNotifications()

      expect(hasInvitations.value).toBe(false)
    })
  })

  describe('refreshInvitations', () => {
    test('should fetch invitations for authenticated user', async () => {
      const mockInvitations = [
        { id: '1', campaignName: 'Campaign 1' },
        { id: '2', campaignName: 'Campaign 2' },
      ]
      mockFetchInvitations.mockResolvedValueOnce(mockInvitations)

      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, invitationCount } = useNotifications()

      await refreshInvitations()

      expect(mockFetchInvitations).toHaveBeenCalled()
      expect(invitationCount.value).toBe(2)
    })

    test('should not fetch invitations for unauthenticated user', async () => {
      mockIsAuthenticated.value = false

      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, invitationCount } = useNotifications()

      await refreshInvitations()

      expect(mockFetchInvitations).not.toHaveBeenCalled()
      expect(invitationCount.value).toBe(0)
    })

    test('should set loading to true while fetching', async () => {
      let resolvePromise: (value: unknown) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetchInvitations.mockReturnValueOnce(fetchPromise)

      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, loading } = useNotifications()

      const refreshCall = refreshInvitations()

      expect(loading.value).toBe(true)

      resolvePromise!([])

      await refreshCall

      expect(loading.value).toBe(false)
    })

    test('should set invitationCount to 0 on error', async () => {
      mockFetchInvitations.mockRejectedValueOnce(new Error('Network error'))

      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, invitationCount } = useNotifications()

      await refreshInvitations()

      expect(invitationCount.value).toBe(0)
    })

    test('should set loading to false on error', async () => {
      mockFetchInvitations.mockRejectedValueOnce(new Error('Network error'))

      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, loading } = useNotifications()

      await refreshInvitations()

      expect(loading.value).toBe(false)
    })

    test('should handle empty invitations array', async () => {
      mockFetchInvitations.mockResolvedValueOnce([])

      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, invitationCount, hasInvitations } = useNotifications()

      await refreshInvitations()

      expect(invitationCount.value).toBe(0)
      expect(hasInvitations.value).toBe(false)
    })

    test('should reset invitations on auth change to unauthenticated', async () => {
      // First, load invitations as authenticated user
      mockFetchInvitations.mockResolvedValueOnce([{ id: '1' }])

      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, invitationCount } = useNotifications()

      await refreshInvitations()
      expect(invitationCount.value).toBe(1)

      // Now simulate becoming unauthenticated
      mockIsAuthenticated.value = false

      await refreshInvitations()
      expect(invitationCount.value).toBe(0)
    })
  })

  describe('hasInvitations computed', () => {
    test('should be true when invitationCount > 0', async () => {
      mockFetchInvitations.mockResolvedValueOnce([{ id: '1' }])

      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, hasInvitations } = useNotifications()

      await refreshInvitations()

      expect(hasInvitations.value).toBe(true)
    })

    test('should be false when invitationCount is 0', async () => {
      mockFetchInvitations.mockResolvedValueOnce([])

      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, hasInvitations } = useNotifications()

      await refreshInvitations()

      expect(hasInvitations.value).toBe(false)
    })

    test('should update reactively when invitations change', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { refreshInvitations, hasInvitations } = useNotifications()

      // Start with no invitations
      mockFetchInvitations.mockResolvedValueOnce([])
      await refreshInvitations()
      expect(hasInvitations.value).toBe(false)

      // Add invitations
      mockFetchInvitations.mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
      await refreshInvitations()
      expect(hasInvitations.value).toBe(true)
    })
  })

  describe('Polling Controls', () => {
    test('should expose pausePolling function', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { pausePolling } = useNotifications()

      pausePolling()

      expect(mockPause).toHaveBeenCalled()
    })

    test('should expose resumePolling function', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { resumePolling } = useNotifications()

      resumePolling()

      expect(mockResume).toHaveBeenCalled()
    })

    test('should expose isPolling computed', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { isPolling } = useNotifications()

      expect(isPolling.value).toBe(false)

      mockIsActive.value = true

      expect(isPolling.value).toBe(true)
    })

    test('pause and resume should work together', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { pausePolling, resumePolling } = useNotifications()

      pausePolling()
      expect(mockPause).toHaveBeenCalledTimes(1)

      resumePolling()
      expect(mockResume).toHaveBeenCalledTimes(1)

      pausePolling()
      expect(mockPause).toHaveBeenCalledTimes(2)
    })
  })

  describe('Exposed API', () => {
    test('should expose all required properties', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const result = useNotifications()

      expect(result).toHaveProperty('invitationCount')
      expect(result).toHaveProperty('loading')
      expect(result).toHaveProperty('hasInvitations')
      expect(result).toHaveProperty('refreshInvitations')
      expect(result).toHaveProperty('pausePolling')
      expect(result).toHaveProperty('resumePolling')
      expect(result).toHaveProperty('isPolling')
    })

    test('invitationCount should be readonly', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { invitationCount } = useNotifications()

      // In development mode with readonly(), this should warn but not throw
      // We can check that the internal value doesn't actually change
      const originalValue = invitationCount.value

      // Attempt to modify - in strict mode this would throw
      try {
        // @ts-expect-error - testing readonly behavior
        invitationCount.value = 999
      } catch {
        // Expected in strict mode
      }

      // Value should remain unchanged due to readonly
      expect(invitationCount.value).toBe(originalValue)
    })

    test('loading should be readonly', async () => {
      const { useNotifications } = await import('~/composables/useNotifications')
      const { loading } = useNotifications()

      const originalValue = loading.value

      try {
        // @ts-expect-error - testing readonly behavior
        loading.value = true
      } catch {
        // Expected in strict mode
      }

      expect(loading.value).toBe(originalValue)
    })
  })
})
