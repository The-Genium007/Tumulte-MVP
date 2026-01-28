import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { createMockUser } from '../../helpers/mockFactory'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}))

// Mock offline-storage utilities
vi.mock('@/utils/offline-storage', () => ({
  storeUser: vi.fn(),
  getStoredUser: vi.fn(),
  clearUserData: vi.fn(),
}))

// Mock useAnalytics composable
vi.mock('@/composables/useAnalytics', () => ({
  useAnalytics: vi.fn(() => ({
    identify: vi.fn(),
    reset: vi.fn(),
    setUserProperties: vi.fn(),
    track: vi.fn(),
  })),
}))

// Mock usePushNotificationsStore
vi.mock('@/stores/pushNotifications', () => ({
  usePushNotificationsStore: vi.fn(() => ({
    reset: vi.fn(),
  })),
}))

// Mock fetch globally
global.fetch = vi.fn()

// Mock window.location
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).location = { href: '' }

describe('Auth Store', () => {
  let mockRouter: {
    push: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock useRouter from vue-router
    mockRouter = {
      push: vi.fn(),
    }
    const { useRouter } = await import('vue-router')
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>)

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)

    // Initialize Pinia AFTER mocks are configured
    setActivePinia(createPinia())
  })

  test('should initialize with null user and loading false', () => {
    const store = useAuthStore()

    expect(store.user).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })

  test('fetchMe() should fetch current user successfully', async () => {
    const mockUser = createMockUser()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response)

    const store = useAuthStore()
    await store.fetchMe()

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/auth/me', {
      credentials: 'include',
    })
    expect(store.user).toEqual(mockUser)
    expect(store.isAuthenticated).toBe(true)
    expect(store.loading).toBe(false)
  })

  test('fetchMe() should handle 401 unauthorized', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response)

    const store = useAuthStore()

    // 401 now throws "Session expired" to clearly indicate authentication failure
    await expect(store.fetchMe()).rejects.toThrow('Session expired')
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.loading).toBe(false)
  })

  test('fetchMe() should set loading state correctly', async () => {
    const mockUser = createMockUser()
    let resolveFetch!: (value: Response) => void
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

    const store = useAuthStore()
    const fetchMePromise = store.fetchMe()

    // Loading should be true while fetching
    expect(store.loading).toBe(true)

    // Resolve the fetch
    resolveFetch({
      ok: true,
      json: async () => mockUser,
    } as Response)

    await fetchMePromise

    // Loading should be false after fetch completes
    expect(store.loading).toBe(false)
  })

  test('loginWithTwitch() should redirect to Twitch OAuth', () => {
    const store = useAuthStore()
    store.loginWithTwitch()

    expect(window.location.href).toBe('http://localhost:3333/api/v2/auth/twitch/redirect')
  })

  test('logout() should clear user state and redirect to login', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response)

    const store = useAuthStore()
    // Set user first
    store.user = createMockUser()

    await store.logout()

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    expect(store.user).toBeNull()
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'login' })
  })

  test('logout() should handle errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const store = useAuthStore()
    store.user = createMockUser()

    await expect(store.logout()).rejects.toThrow('Network error')
  })

  test('isAuthenticated should be true when user exists', () => {
    const store = useAuthStore()
    store.user = createMockUser()

    expect(store.isAuthenticated).toBe(true)
  })

  test('isAuthenticated should be false when user is null', () => {
    const store = useAuthStore()
    store.user = null

    expect(store.isAuthenticated).toBe(false)
  })
})
