import { useSupportTrigger } from "@/composables/useSupportTrigger";

export const useSettings = () => {
  const config = useRuntimeConfig();
  const { triggerSupportForError } = useSupportTrigger();

  /**
   * Révoque l'accès Twitch du streamer
   */
  const revokeTwitchAccess = async () => {
    try {
      const response = await $fetch("/streamer/revoke", {
        method: "POST",
        baseURL: config.public.apiBase as string,
        credentials: "include",
      });

      return response;
    } catch (error: unknown) {
      console.error("Failed to revoke Twitch access:", error);
      triggerSupportForError("twitch_revoke_all", error);
      const errorData = error as { data?: { error?: string } };
      throw new Error(errorData.data?.error || "Erreur lors de la révocation");
    }
  };

  /**
   * Supprime le compte utilisateur (anonymisation)
   */
  const deleteAccount = async () => {
    try {
      const response = await $fetch("/account/delete", {
        method: "DELETE",
        baseURL: config.public.apiBase as string,
        credentials: "include",
      });

      return response;
    } catch (error: unknown) {
      console.error("Failed to delete account:", error);
      triggerSupportForError("account_delete", error);
      const errorData = error as { data?: { error?: string } };
      throw new Error(
        errorData.data?.error || "Erreur lors de la suppression du compte",
      );
    }
  };

  return {
    revokeTwitchAccess,
    deleteAccount,
  };
};
