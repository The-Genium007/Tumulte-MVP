import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { User, LoginCredentials, RegisterData, AuthError } from '@/types'
import { usePushNotificationsStore } from '@/stores/pushNotifications'
import { storeUser, getStoredUser, clearUserData } from '@/utils/offline-storage'
import { useAnalytics } from '@/composables/useAnalytics'
import { loggers } from '@/utils/logger'

export const useAuthStore = defineStore('auth', () => {
  const _router = useRouter()
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase
  const {
    identify,
    reset: resetAnalytics,
    setUserProperties,
    setUserPropertiesOnce,
    track,
  } = useAnalytics()

  // State
  const user = ref<User | null>(null)
  const loading = ref<boolean>(false)
  const isOfflineData = ref<boolean>(false)
  const authError = ref<AuthError | null>(null)
  const hasFetchedUser = ref<boolean>(false) // Flag pour savoir si fetchMe a été appelé au moins une fois

  // Computed
  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.isAdmin ?? false)
  const isPremium = computed(() => user.value?.isPremium ?? false)
  const isEmailVerified = computed(() => !!user.value?.emailVerifiedAt)

  /**
   * Identify user in PostHog analytics.
   * Links anonymous events to identified user for funnel tracking.
   */
  function identifyUserInAnalytics(userData: User): void {
    // Sentry user context (error tracking)
    import('@/sentry.client.config')
      .then(({ setSentryUser }) => {
        setSentryUser({
          id: userData.id,
          email: userData.email ?? undefined,
          username: userData.displayName,
        })
      })
      .catch(() => {})

    /* eslint-disable camelcase */
    identify(userData.id, {
      // Données de base
      email: userData.email,
      display_name: userData.displayName,
      tier: userData.tier,
      has_twitch: !!userData.streamer,
      is_email_verified: !!userData.emailVerifiedAt,
      created_at: userData.createdAt,

      // Données business enrichies
      is_premium: userData.isPremium,
      is_admin: userData.isAdmin,
      locale: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    })

    // Set properties that may change over time
    setUserProperties({
      tier: userData.tier,
      is_premium: userData.isPremium,
      is_admin: userData.isAdmin,
      last_seen_at: new Date().toISOString(),
    })

    // Propriétés "first time" (ne changent jamais après la première définition)
    setUserPropertiesOnce({
      first_seen_at: new Date().toISOString(),
      initial_referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'unknown',
      acquisition_source: getAcquisitionSource(),
    })
    /* eslint-enable camelcase */
  }

  /**
   * Récupère la source d'acquisition depuis les UTM params
   */
  function getAcquisitionSource(): string {
    if (typeof window === 'undefined') return 'unknown'
    const params = new URLSearchParams(window.location.search)
    return params.get('utm_source') || params.get('ref') || 'organic'
  }

  /**
   * Load user from offline storage (IndexedDB)
   * Called on app initialization before API fetch
   */
  async function loadFromOfflineStorage(): Promise<void> {
    try {
      const storedUser = await getStoredUser()
      if (storedUser && !user.value) {
        user.value = storedUser
        isOfflineData.value = true
      }
    } catch (error) {
      loggers.auth.warn('Failed to load from offline storage:', error)
    }
  }

  // Actions
  async function fetchMe(): Promise<void> {
    loading.value = true

    // First, try to load from offline storage for instant display
    await loadFromOfflineStorage()

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
      })

      // Handle 401 Unauthorized - session expired or invalid
      // CRITICAL: Always clear offline data on 401 to prevent "ghost account" state
      if (response.status === 401) {
        user.value = null
        isOfflineData.value = false
        await clearUserData()
        throw new Error('Session expired')
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      // Backend returns { user: ... } structure
      const freshUser = data.user ?? data
      user.value = freshUser
      isOfflineData.value = false

      // Persist to offline storage
      await storeUser(freshUser)

      // Identify user in PostHog analytics
      identifyUserInAnalytics(freshUser)
    } catch (error) {
      // On network error (offline), keep offline data if available
      // But if we explicitly got a 401, user is already cleared above
      if (!isOfflineData.value) {
        user.value = null
      }
      throw error
    } finally {
      loading.value = false
      hasFetchedUser.value = true
    }
  }

  function loginWithTwitch(): void {
    window.location.href = `${API_URL}/auth/twitch/redirect`
  }

  async function logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      // Reset les stores dépendants de l'authentification
      const pushStore = usePushNotificationsStore()
      pushStore.reset()

      // Reset PostHog analytics (creates new anonymous ID)
      resetAnalytics()

      // Clear Sentry user context
      import('@/sentry.client.config')
        .then(({ setSentryUser }) => setSentryUser(null))
        .catch(() => {})

      // Clear offline storage
      await clearUserData()

      user.value = null
      isOfflineData.value = false
      authError.value = null
      _router.push({ name: 'login' })
    } catch (error) {
      loggers.auth.error('Logout failed:', error)
      throw error
    }
  }

  /**
   * Register a new user with email/password
   */
  async function register(data: RegisterData): Promise<{ success: boolean; error?: AuthError }> {
    loading.value = true
    authError.value = null

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        authError.value = result
        return { success: false, error: result }
      }

      user.value = result.user
      await storeUser(result.user)

      // Track signup completion and identify user
      track('signup_completed', { method: 'email' })
      identifyUserInAnalytics(result.user)

      return { success: true }
    } catch {
      const err = { error: 'Une erreur est survenue. Veuillez réessayer.' }
      authError.value = err
      track('auth_error', { action: 'register', error: 'network_error' })
      return { success: false, error: err }
    } finally {
      loading.value = false
    }
  }

  /**
   * Login with email/password
   */
  async function login(
    credentials: LoginCredentials
  ): Promise<{ success: boolean; emailVerified?: boolean; error?: AuthError }> {
    loading.value = true
    authError.value = null

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      })

      const result = await response.json()

      if (!response.ok) {
        authError.value = result
        return { success: false, error: result }
      }

      user.value = result.user
      await storeUser(result.user)

      // Identify user in analytics after successful login
      identifyUserInAnalytics(result.user)

      return { success: true, emailVerified: result.emailVerified }
    } catch {
      const err = { error: 'Une erreur est survenue. Veuillez réessayer.' }
      authError.value = err
      track('auth_error', { action: 'login', error: 'network_error' })
      return { success: false, error: err }
    } finally {
      loading.value = false
    }
  }

  /**
   * Redirect to OAuth provider for login
   */
  function loginWithOAuth(provider: 'twitch' | 'google'): void {
    window.location.href = `${API_URL}/auth/${provider}/redirect`
  }

  /**
   * Request password reset email
   */
  async function forgotPassword(email: string): Promise<{ success: boolean; error?: AuthError }> {
    loading.value = true

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        return { success: false, error: result }
      }

      return { success: true }
    } catch (error) {
      loggers.auth.error('Forgot password failed:', error)
      return { success: false, error: { error: 'Une erreur est survenue.' } }
    } finally {
      loading.value = false
    }
  }

  /**
   * Reset password with token
   */
  async function resetPassword(
    token: string,
    password: string,
    passwordConfirmation: string
  ): Promise<{ success: boolean; error?: AuthError }> {
    loading.value = true

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, passwordConfirmation }),
      })

      const result = await response.json()

      if (!response.ok) {
        return { success: false, error: result }
      }

      return { success: true }
    } catch (error) {
      loggers.auth.error('Reset password failed:', error)
      return { success: false, error: { error: 'Une erreur est survenue.' } }
    } finally {
      loading.value = false
    }
  }

  /**
   * Resend verification email
   */
  async function resendVerificationEmail(): Promise<{
    success: boolean
    error?: AuthError
    isUnauthorized?: boolean
  }> {
    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        credentials: 'include',
      })

      // Détection explicite de l'erreur 401 (session expirée)
      if (response.status === 401) {
        user.value = null
        return {
          success: false,
          error: { error: 'Votre session a expiré. Veuillez vous reconnecter.' },
          isUnauthorized: true,
        }
      }

      const result = await response.json()

      if (!response.ok) {
        return { success: false, error: result }
      }

      return { success: true }
    } catch (error) {
      loggers.auth.error('Resend verification failed:', error)
      return { success: false, error: { error: 'Une erreur est survenue.' } }
    }
  }

  /**
   * Clear any auth errors
   */
  function clearError(): void {
    authError.value = null
  }

  return {
    // State
    user,
    loading,
    isOfflineData,
    authError,
    hasFetchedUser,

    // Computed
    isAuthenticated,
    isAdmin,
    isPremium,
    isEmailVerified,

    // Actions
    fetchMe,
    loginWithTwitch,
    loginWithOAuth,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    resendVerificationEmail,
    clearError,
  }
})
