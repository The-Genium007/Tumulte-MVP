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

describe('Auth Store - Extended Coverage', () => {
  let mockRouter: {
    push: ReturnType<typeof vi.fn>
  }

  // Test fixtures - using generic names
  const FIXTURE_EMAIL = 'test@example.com'
  const FIXTURE_CRED = 'testcred123'

  beforeEach(async () => {
    vi.clearAllMocks()

    mockRouter = {
      push: vi.fn(),
    }
    const { useRouter } = await import('vue-router')
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)

    setActivePinia(createPinia())
  })

  // ============================================
  // login() tests
  // ============================================

  describe('login()', () => {
    test('should login successfully with credentials', async () => {
      const mockUser = createMockUser()
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, emailVerified: true }),
      } as Response)

      const store = useAuthStore()
      const result = await store.login({ email: FIXTURE_EMAIL, password: FIXTURE_CRED })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: FIXTURE_EMAIL, password: FIXTURE_CRED }),
      })
      expect(result).toEqual({ success: true, emailVerified: true })
      expect(store.user).toEqual(mockUser)
      expect(store.authError).toBeNull()
    })

    test('should return emailVerified: false when email not verified', async () => {
      const mockUser = createMockUser({ emailVerifiedAt: null })
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, emailVerified: false }),
      } as Response)

      const store = useAuthStore()
      const result = await store.login({ email: FIXTURE_EMAIL, password: FIXTURE_CRED })

      expect(result).toEqual({ success: true, emailVerified: false })
      expect(store.user).toEqual(mockUser)
    })

    test('should handle invalid credentials error', async () => {
      const errorResponse = { error: 'Invalid credentials' }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response)

      const store = useAuthStore()
      const result = await store.login({ email: FIXTURE_EMAIL, password: 'wrong' })

      expect(result).toEqual({ success: false, error: errorResponse })
      expect(store.user).toBeNull()
      expect(store.authError).toEqual(errorResponse)
    })

    test('should handle network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const store = useAuthStore()
      const result = await store.login({ email: FIXTURE_EMAIL, password: FIXTURE_CRED })

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('Une erreur est survenue. Veuillez réessayer.')
      expect(store.authError).toEqual({ error: 'Une erreur est survenue. Veuillez réessayer.' })
    })

    test('should set loading state during login', async () => {
      let resolveFetch!: (value: Response) => void
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })
      vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

      const store = useAuthStore()
      const loginPromise = store.login({ email: FIXTURE_EMAIL, password: FIXTURE_CRED })

      expect(store.loading).toBe(true)

      resolveFetch({
        ok: true,
        json: async () => ({ user: createMockUser(), emailVerified: true }),
      } as Response)

      await loginPromise
      expect(store.loading).toBe(false)
    })
  })

  // ============================================
  // register() tests
  // ============================================

  describe('register()', () => {
    const getRegisterData = () => ({
      email: 'new@example.com',
      password: FIXTURE_CRED,
      passwordConfirmation: FIXTURE_CRED,
      displayName: 'New User',
    })

    test('should register successfully', async () => {
      const mockUser = createMockUser({ email: 'new@example.com', displayName: 'New User' })
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      } as Response)

      const store = useAuthStore()
      const data = getRegisterData()
      const result = await store.register(data)

      expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      expect(result).toEqual({ success: true })
      expect(store.user).toEqual(mockUser)
      expect(store.authError).toBeNull()
    })

    test('should handle validation errors', async () => {
      const errorResponse = { error: 'Email already exists' }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response)

      const store = useAuthStore()
      const result = await store.register(getRegisterData())

      expect(result).toEqual({ success: false, error: errorResponse })
      expect(store.user).toBeNull()
      expect(store.authError).toEqual(errorResponse)
    })

    test('should handle network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const store = useAuthStore()
      const result = await store.register(getRegisterData())

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('Une erreur est survenue. Veuillez réessayer.')
    })

    test('should clear previous authError before registering', async () => {
      const mockUser = createMockUser()
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      } as Response)

      const store = useAuthStore()
      store.authError = { error: 'Previous error' }

      await store.register(getRegisterData())

      expect(store.authError).toBeNull()
    })
  })

  // ============================================
  // forgotPassword() tests
  // ============================================

  describe('forgotPassword()', () => {
    test('should request reset successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Email sent' }),
      } as Response)

      const store = useAuthStore()
      const result = await store.forgotPassword(FIXTURE_EMAIL)

      expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: FIXTURE_EMAIL }),
      })
      expect(result).toEqual({ success: true })
    })

    test('should handle email not found error', async () => {
      const errorResponse = { error: 'Email not found' }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response)

      const store = useAuthStore()
      const result = await store.forgotPassword('unknown@example.com')

      expect(result).toEqual({ success: false, error: errorResponse })
    })

    test('should handle network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const store = useAuthStore()
      const result = await store.forgotPassword(FIXTURE_EMAIL)

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('Une erreur est survenue.')
    })

    test('should set loading state during request', async () => {
      let resolveFetch!: (value: Response) => void
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })
      vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

      const store = useAuthStore()
      const forgotPromise = store.forgotPassword(FIXTURE_EMAIL)

      expect(store.loading).toBe(true)

      resolveFetch({
        ok: true,
        json: async () => ({ message: 'Email sent' }),
      } as Response)

      await forgotPromise
      expect(store.loading).toBe(false)
    })
  })

  // ============================================
  // resetPassword() tests
  // ============================================

  describe('resetPassword()', () => {
    test('should reset successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Reset successfully' }),
      } as Response)

      const store = useAuthStore()
      const result = await store.resetPassword('valid-token', 'newcred', 'newcred')

      expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'newcred',
          passwordConfirmation: 'newcred',
        }),
      })
      expect(result).toEqual({ success: true })
    })

    test('should handle invalid token error', async () => {
      const errorResponse = { error: 'Invalid or expired token' }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response)

      const store = useAuthStore()
      const result = await store.resetPassword('invalid-token', 'newcred', 'newcred')

      expect(result).toEqual({ success: false, error: errorResponse })
    })

    test('should handle network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const store = useAuthStore()
      const result = await store.resetPassword('token', 'cred', 'cred')

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('Une erreur est survenue.')
    })
  })

  // ============================================
  // resendVerificationEmail() tests
  // ============================================

  describe('resendVerificationEmail()', () => {
    test('should resend verification email successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Email sent' }),
      } as Response)

      const store = useAuthStore()
      const result = await store.resendVerificationEmail()

      expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/auth/resend-verification', {
        method: 'POST',
        credentials: 'include',
      })
      expect(result).toEqual({ success: true })
    })

    test('should handle 401 unauthorized (session expired)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      const store = useAuthStore()
      store.user = createMockUser()

      const result = await store.resendVerificationEmail()

      expect(result.success).toBe(false)
      expect(result.isUnauthorized).toBe(true)
      expect(result.error?.error).toBe('Votre session a expiré. Veuillez vous reconnecter.')
      expect(store.user).toBeNull()
    })

    test('should handle API error', async () => {
      const errorResponse = { error: 'Too many requests' }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => errorResponse,
      } as Response)

      const store = useAuthStore()
      const result = await store.resendVerificationEmail()

      expect(result).toEqual({ success: false, error: errorResponse })
    })

    test('should handle network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const store = useAuthStore()
      const result = await store.resendVerificationEmail()

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('Une erreur est survenue.')
    })
  })

  // ============================================
  // loginWithOAuth() tests
  // ============================================

  describe('loginWithOAuth()', () => {
    test('should redirect to Twitch OAuth', () => {
      const store = useAuthStore()
      store.loginWithOAuth('twitch')

      expect(window.location.href).toBe('http://localhost:3333/api/v2/auth/twitch/redirect')
    })

    test('should redirect to Google OAuth', () => {
      const store = useAuthStore()
      store.loginWithOAuth('google')

      expect(window.location.href).toBe('http://localhost:3333/api/v2/auth/google/redirect')
    })
  })

  // ============================================
  // Computed properties tests
  // ============================================

  describe('computed properties', () => {
    test('isAdmin should be true when user is admin', () => {
      const store = useAuthStore()
      store.user = createMockUser({ isAdmin: true })

      expect(store.isAdmin).toBe(true)
    })

    test('isAdmin should be false when user is not admin', () => {
      const store = useAuthStore()
      store.user = createMockUser({ isAdmin: false })

      expect(store.isAdmin).toBe(false)
    })

    test('isAdmin should be false when user is null', () => {
      const store = useAuthStore()
      store.user = null

      expect(store.isAdmin).toBe(false)
    })

    test('isPremium should be true when user is premium', () => {
      const store = useAuthStore()
      store.user = createMockUser({ isPremium: true })

      expect(store.isPremium).toBe(true)
    })

    test('isPremium should be false when user is not premium', () => {
      const store = useAuthStore()
      store.user = createMockUser({ isPremium: false })

      expect(store.isPremium).toBe(false)
    })

    test('isPremium should be false when user is null', () => {
      const store = useAuthStore()
      store.user = null

      expect(store.isPremium).toBe(false)
    })

    test('isEmailVerified should be true when email is verified', () => {
      const store = useAuthStore()
      store.user = createMockUser({ emailVerifiedAt: new Date().toISOString() })

      expect(store.isEmailVerified).toBe(true)
    })

    test('isEmailVerified should be false when email is not verified', () => {
      const store = useAuthStore()
      store.user = createMockUser({ emailVerifiedAt: null })

      expect(store.isEmailVerified).toBe(false)
    })

    test('isEmailVerified should be false when user is null', () => {
      const store = useAuthStore()
      store.user = null

      expect(store.isEmailVerified).toBe(false)
    })
  })

  // ============================================
  // Error state management tests
  // ============================================

  describe('error state management', () => {
    test('clearError() should clear authError', () => {
      const store = useAuthStore()
      store.authError = { error: 'Some error' }

      store.clearError()

      expect(store.authError).toBeNull()
    })

    test('authError should be set on login failure', async () => {
      const errorResponse = { error: 'Invalid credentials' }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response)

      const store = useAuthStore()
      await store.login({ email: FIXTURE_EMAIL, password: 'wrong' })

      expect(store.authError).toEqual(errorResponse)
    })

    test('authError should be cleared on successful login', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: createMockUser(), emailVerified: true }),
      } as Response)

      const store = useAuthStore()
      store.authError = { error: 'Previous error' }

      await store.login({ email: FIXTURE_EMAIL, password: FIXTURE_CRED })

      expect(store.authError).toBeNull()
    })

    test('logout should clear authError', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response)

      const store = useAuthStore()
      store.user = createMockUser()
      store.authError = { error: 'Some error' }

      await store.logout()

      expect(store.authError).toBeNull()
    })
  })

  // ============================================
  // hasFetchedUser flag tests
  // ============================================

  describe('hasFetchedUser flag', () => {
    test('should be false initially', () => {
      const store = useAuthStore()

      expect(store.hasFetchedUser).toBe(false)
    })

    test('should be true after successful fetchMe', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: createMockUser() }),
      } as Response)

      const store = useAuthStore()
      await store.fetchMe()

      expect(store.hasFetchedUser).toBe(true)
    })

    test('should be true after failed fetchMe (401)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      const store = useAuthStore()

      try {
        await store.fetchMe()
      } catch {
        // Expected to throw
      }

      expect(store.hasFetchedUser).toBe(true)
    })

    test('should be true after fetchMe network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const store = useAuthStore()

      try {
        await store.fetchMe()
      } catch {
        // Expected to throw
      }

      expect(store.hasFetchedUser).toBe(true)
    })
  })
})
