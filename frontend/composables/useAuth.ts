import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";

/**
 * Composable pour l'authentification
 * Wrapper autour du store Pinia pour compatibilité avec l'ancien code Nuxt
 */
export function useAuth() {
  const authStore = useAuthStore();
  const { user, loading, isAuthenticated, isMJ, isStreamer } =
    storeToRefs(authStore);

  return {
    user,
    loading,
    isAuthenticated,
    isMJ,
    isStreamer,
    fetchMe: authStore.fetchMe,
    loginWithTwitch: authStore.loginWithTwitch,
    logout: authStore.logout,
    switchRole: authStore.switchRole,
  };
}
