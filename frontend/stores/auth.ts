import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import type { User } from "@/types";
import { useSupportTrigger } from "@/composables/useSupportTrigger";
import { usePushNotificationsStore } from "@/stores/pushNotifications";

export const useAuthStore = defineStore("auth", () => {
  const _router = useRouter();
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;
  const { triggerSupportForError } = useSupportTrigger();

  // State
  const user = ref<User | null>(null);
  const loading = ref<boolean>(false);

  // Computed
  const isAuthenticated = computed(() => user.value !== null);

  // Actions
  async function fetchMe(): Promise<void> {
    loading.value = true;
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      user.value = await response.json();
    } catch (error) {
      user.value = null;
      triggerSupportForError("auth_fetch_me", error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function loginWithTwitch(): void {
    window.location.href = `${API_URL}/auth/twitch/redirect`;
  }

  async function logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      // Reset les stores dépendants de l'authentification
      const pushStore = usePushNotificationsStore();
      pushStore.reset();

      user.value = null;
      _router.push({ name: "login" });
    } catch (error) {
      console.error("Logout failed:", error);
      triggerSupportForError("auth_logout", error);
      throw error;
    }
  }

  return {
    // State
    user,
    loading,

    // Computed
    isAuthenticated,

    // Actions
    fetchMe,
    loginWithTwitch,
    logout,
  };
});
