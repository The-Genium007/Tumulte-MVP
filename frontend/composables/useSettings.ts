export const useSettings = () => {
  const config = useRuntimeConfig();

  /**
   * Révoque l'accès Twitch du streamer
   */
  const revokeTwitchAccess = async () => {
    try {
      const response = await $fetch("/streamer/revoke", {
        method: "POST",
        baseURL: config.public.apiBaseUrl,
        credentials: "include",
      });

      return response;
    } catch (error: any) {
      console.error("Failed to revoke Twitch access:", error);
      throw new Error(error.data?.error || "Erreur lors de la révocation");
    }
  };

  /**
   * Supprime le compte utilisateur (anonymisation)
   */
  const deleteAccount = async () => {
    try {
      const response = await $fetch("/api/v2/account/delete", {
        method: "DELETE",
        baseURL: config.public.apiBaseUrl,
        credentials: "include",
      });

      return response;
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      throw new Error(
        error.data?.error || "Erreur lors de la suppression du compte",
      );
    }
  };

  return {
    revokeTwitchAccess,
    deleteAccount,
  };
};
