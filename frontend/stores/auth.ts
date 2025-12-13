import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";
import { useRouter } from "vue-router";
import type { User } from "@/types";

const API_URL = import.meta.env.VITE_API_URL;

export const useAuthStore = defineStore("auth", () => {
  const router = useRouter();

  // State
  const user = ref<User | null>(null);
  const loading = ref<boolean>(false);

  // Computed
  const isAuthenticated = computed(() => user.value !== null);
  const isMJ = computed(() => user.value?.role === "MJ");
  const isStreamer = computed(() => user.value?.role === "STREAMER");

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

      user.value = null;
      router.push({ name: "login" });
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  async function switchRole(newRole: "MJ" | "STREAMER"): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/auth/switch-role`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch role");
      }

      user.value = await response.json();

      // Rediriger vers la page appropriée
      if (newRole === "MJ") {
        router.push("/mj");
      } else {
        router.push("/streamer");
      }
    } catch (error) {
      console.error("Switch role failed:", error);
      throw error;
    }
  }

  return {
    // State (readonly pour l'extérieur)
    user: readonly(user),
    loading: readonly(loading),

    // Computed
    isAuthenticated,
    isMJ,
    isStreamer,

    // Actions
    fetchMe,
    loginWithTwitch,
    logout,
    switchRole,
  };
});
