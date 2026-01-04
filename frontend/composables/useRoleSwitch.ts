import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * Composable pour gérer le switch entre les rôles MJ et Streamer
 */
export const useRoleSwitch = () => {
  const route = useRoute();
  const router = useRouter();
  const { user, switchRole } = useAuth();

  const switching = ref(false);
  const isStreamerMode = ref(false);

  // Synchroniser isStreamerMode avec la route ET le rôle de l'utilisateur
  watch(
    [() => user.value?.role, () => route.path],
    ([role, path]) => {
      // Prioriser la route actuelle pour la synchronisation
      if (path?.startsWith("/streamer")) {
        isStreamerMode.value = true;
      } else if (path?.startsWith("/mj")) {
        isStreamerMode.value = false;
      } else {
        // Sinon, se baser sur le rôle
        isStreamerMode.value = role === "STREAMER";
      }
    },
    { immediate: true },
  );

  // Rôle actuel et cible
  const currentRole = computed(() => user.value?.role);
  const targetRole = computed(() => (isStreamerMode.value ? "MJ" : "STREAMER"));
  const targetRoleLabel = computed(() =>
    targetRole.value === "MJ" ? "mode MJ" : "mode Streamer",
  );

  /**
   * Change le rôle de l'utilisateur
   */
  const handleSwitch = async (newRole: "MJ" | "STREAMER") => {
    if (switching.value) return;

    switching.value = true;

    try {
      await switchRole(newRole);

      // Rediriger vers la page appropriée
      const targetPath = newRole === "MJ" ? "/mj" : "/streamer";
      await router.push(targetPath);
    } catch {
      // Revenir à l'état précédent en cas d'erreur
      isStreamerMode.value = user.value?.role === "STREAMER";
    } finally {
      switching.value = false;
    }
  };

  /**
   * Toggle entre MJ et Streamer (pour compatibilité avec RoleToggle.vue)
   */
  const handleToggle = async (value: boolean) => {
    const newRole = value ? "STREAMER" : "MJ";
    await handleSwitch(newRole);
  };

  /**
   * Switch vers le rôle opposé (pratique pour le menu dropdown)
   */
  const switchToOppositeRole = async () => {
    await handleSwitch(targetRole.value);
  };

  return {
    // État
    switching,
    isStreamerMode,

    // Computed
    currentRole,
    targetRole,
    targetRoleLabel,

    // Actions
    handleSwitch,
    handleToggle,
    switchToOppositeRole,
  };
};
