import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'

/**
 * Composable pour l'authentification
 * Wrapper autour du store Pinia pour compatibilité avec l'ancien code Nuxt
 */
export function useAuth() {
  const authStore = useAuthStore()
  const {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isPremium,
    isEmailVerified,
    authError,
    hasFetchedUser,
  } = storeToRefs(authStore)

  return {
    // State
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isPremium,
    isEmailVerified,
    authError,
    hasFetchedUser,

    // Actions
    fetchMe: authStore.fetchMe,
    loginWithTwitch: authStore.loginWithTwitch,
    loginWithOAuth: authStore.loginWithOAuth,
    login: authStore.login,
    register: authStore.register,
    logout: authStore.logout,
    forgotPassword: authStore.forgotPassword,
    resetPassword: authStore.resetPassword,
    resendVerificationEmail: authStore.resendVerificationEmail,
    clearError: authStore.clearError,
  }
}
