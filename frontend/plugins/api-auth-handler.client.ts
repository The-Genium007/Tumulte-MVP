/**
 * API Authentication Handler Plugin
 *
 * This plugin provides a global fetch wrapper that handles 401 responses
 * by clearing the auth state and redirecting to login.
 *
 * It prevents "ghost account" states where the frontend thinks the user
 * is logged in but the session has actually expired on the backend.
 */

import { clearUserData } from '@/utils/offline-storage'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  /**
   * Create an authenticated fetch wrapper that handles 401 responses globally
   */
  function createAuthenticatedFetch() {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = await fetch(input, {
        ...init,
        credentials: 'include',
      })

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        // Check if this is an API request (not a third-party request)
        const url = typeof input === 'string' ? input : input.toString()
        if (url.startsWith(API_URL)) {
          await handleUnauthorized()
        }
      }

      return response
    }
  }

  /**
   * Handle unauthorized response by clearing state and redirecting
   */
  async function handleUnauthorized(): Promise<void> {
    // Clear offline storage
    await clearUserData()

    // Clear auth store state (if available)
    try {
      const authStore = useAuthStore()
      authStore.user = null
      authStore.isOfflineData = false
    } catch {
      // Store might not be available yet
    }

    // Redirect to login with return URL
    const router = useRouter()
    const currentRoute = router.currentRoute.value

    // Don't redirect if already on auth pages
    const authPages = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
    ]
    if (!authPages.some((page) => currentRoute.path.startsWith(page))) {
      await navigateTo({
        path: '/login',
        query: { redirect: currentRoute.fullPath },
      })
    }
  }

  return {
    provide: {
      authFetch: createAuthenticatedFetch(),
      handleUnauthorized,
    },
  }
})
