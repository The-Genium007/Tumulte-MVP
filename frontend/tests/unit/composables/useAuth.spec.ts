import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuth } from '~/composables/useAuth'
import { useAuthStore } from '~/stores/auth'
import { createMockUser } from '../../helpers/mockFactory'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('useAuth Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)

    setActivePinia(createPinia())
  })

  test('should expose auth store state', () => {
    const auth = useAuth()

    expect(auth.user).toBeDefined()
    expect(auth.loading).toBeDefined()
    expect(auth.isAuthenticated).toBeDefined()
  })

  test('should expose auth store methods', () => {
    const auth = useAuth()

    expect(typeof auth.fetchMe).toBe('function')
    expect(typeof auth.loginWithTwitch).toBe('function')
    expect(typeof auth.logout).toBe('function')
  })

  test('user should be reactive with store', () => {
    const auth = useAuth()
    const store = useAuthStore()

    expect(auth.user.value).toBeNull()

    // Update store with a specific mock user
    const mockUser = createMockUser()
    store.user = mockUser

    // Composable should reflect the change (same reference)
    expect(auth.user.value).toEqual(mockUser)
  })

  test('isAuthenticated should be reactive with store', () => {
    const auth = useAuth()
    const store = useAuthStore()

    expect(auth.isAuthenticated.value).toBe(false)

    // Update store
    store.user = createMockUser()

    // Composable should reflect the change
    expect(auth.isAuthenticated.value).toBe(true)
  })

  test('loading should be reactive with store', () => {
    const auth = useAuth()
    const store = useAuthStore()

    expect(auth.loading.value).toBe(false)

    store.loading = true

    expect(auth.loading.value).toBe(true)
  })

  test('fetchMe should call store method', async () => {
    const mockUser = createMockUser()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response)

    const auth = useAuth()
    await auth.fetchMe()

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/auth/me', {
      credentials: 'include',
    })
    expect(auth.user.value).toEqual(mockUser)
  })

  test('logout should call store method', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response)

    const auth = useAuth()
    const store = useAuthStore()
    store.user = createMockUser()

    await auth.logout()

    expect(auth.user.value).toBeNull()
  })
})
