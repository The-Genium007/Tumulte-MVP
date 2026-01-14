import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import type { User } from "@/types";
import { useSupportTrigger } from "@/composables/useSupportTrigger";
import { usePushNotificationsStore } from "@/stores/pushNotifications";
import {
  storeUser,
  getStoredUser,
  clearUserData,
} from "@/utils/offline-storage";

export const useAuthStore = defineStore("auth", () => {
  const _router = useRouter();
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;
  const { triggerSupportForError } = useSupportTrigger();

  // State
  const user = ref<User | null>(null);
  const loading = ref<boolean>(false);
  const isOfflineData = ref<boolean>(false);

  // Computed
  const isAuthenticated = computed(() => user.value !== null);

  /**
   * Load user from offline storage (IndexedDB)
   * Called on app initialization before API fetch
   */
  async function loadFromOfflineStorage(): Promise<void> {
    try {
      const storedUser = await getStoredUser();
      if (storedUser && !user.value) {
        user.value = storedUser;
        isOfflineData.value = true;
      }
    } catch (error) {
      console.warn("[AuthStore] Failed to load from offline storage:", error);
    }
  }

  // Actions
  async function fetchMe(): Promise<void> {
    loading.value = true;

    // First, try to load from offline storage for instant display
    await loadFromOfflineStorage();

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      const freshUser = await response.json();
      user.value = freshUser;
      isOfflineData.value = false;

      // Persist to offline storage
      await storeUser(freshUser);
    } catch (error) {
      // If we have offline data, don't clear the user
      if (!isOfflineData.value) {
        user.value = null;
      }
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

      // Clear offline storage
      await clearUserData();

      user.value = null;
      isOfflineData.value = false;
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
    isOfflineData,

    // Computed
    isAuthenticated,

    // Actions
    fetchMe,
    loginWithTwitch,
    logout,
  };
});
