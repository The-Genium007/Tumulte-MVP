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
      handleUnauthorized,
    },
  }
})
