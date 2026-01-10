import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { PushSubscription, NotificationPreferences } from "@/types";
import { useSupportTrigger } from "@/composables/useSupportTrigger";

/**
 * Helper pour convertir une clé base64 URL-safe en Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/**
 * Helper pour convertir un ArrayBuffer en base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const usePushNotificationsStore = defineStore(
  "pushNotifications",
  () => {
    const config = useRuntimeConfig();
    const API_URL = config.public.apiBase;
    const { triggerSupportForError } = useSupportTrigger();

    // State
    const vapidPublicKey = ref<string | null>(null);
    const subscriptions = ref<PushSubscription[]>([]);
    const preferences = ref<NotificationPreferences | null>(null);
    const loading = ref(false);
    const permissionStatus = ref<NotificationPermission>("default");
    const bannerDismissed = ref(false);

    // État interne pour suivre l'endpoint du navigateur actuel
    // Cet endpoint est récupéré directement depuis le PushManager du navigateur
    const browserEndpoint = ref<string | null>(null);

    // Flag pour savoir si l'initialisation a été faite
    const initialized = ref(false);

    // Computed
    const isSupported = computed(
      () =>
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );

    const isSubscribed = computed(() => subscriptions.value.length > 0);
    const isPushEnabled = computed(
      () => preferences.value?.pushEnabled ?? true,
    );
    const canRequestPermission = computed(
      () => isSupported.value && permissionStatus.value === "default",
    );
    const isPermissionDenied = computed(
      () => permissionStatus.value === "denied",
    );

    /**
     * Vérifie si le navigateur actuel a une subscription push active ET enregistrée côté backend.
     * Cette computed se base sur :
     * 1. browserEndpoint : l'endpoint du navigateur (depuis PushManager)
     * 2. subscriptions : la liste des subscriptions du backend
     */
    const isCurrentBrowserSubscribed = computed(() => {
      if (!browserEndpoint.value) return false;
      return subscriptions.value.some(
        (s) => s.endpoint === browserEndpoint.value,
      );
    });

    // Actions

    /**
     * Récupère l'endpoint push du navigateur actuel depuis le PushManager.
     * Cette fonction ne fait AUCUNE comparaison avec le backend, elle récupère juste l'état local.
     */
    async function refreshBrowserEndpoint(): Promise<void> {
      if (!isSupported.value) {
        browserEndpoint.value = null;
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const pushSubscription =
          await registration.pushManager.getSubscription();

        browserEndpoint.value = pushSubscription?.endpoint ?? null;
      } catch {
        browserEndpoint.value = null;
      }
    }

    /**
     * Initialise le store : charge les données backend et l'état du navigateur.
     * Cette fonction doit être appelée une seule fois au démarrage de l'app (après authentification).
     */
    async function initialize(): Promise<void> {
      if (initialized.value) return;

      try {
        // Charger en parallèle :
        // 1. L'état du navigateur (endpoint local)
        // 2. Les données backend (subscriptions, preferences)
        await Promise.all([
          refreshBrowserEndpoint(),
          fetchSubscriptions(),
          fetchPreferences(),
        ]);

        // Mettre à jour le statut de permission
        checkPermissionStatus();

        initialized.value = true;
      } catch (error) {
        console.error("Failed to initialize push notifications:", error);
        // On ne throw pas, l'app peut fonctionner sans les notifications
      }
    }

    /**
     * Reset le store (à appeler lors de la déconnexion)
     */
    function reset(): void {
      subscriptions.value = [];
      preferences.value = null;
      initialized.value = false;
      // On ne reset PAS browserEndpoint car il est lié au navigateur, pas à l'utilisateur
    }

    async function fetchVapidPublicKey(): Promise<string> {
      if (vapidPublicKey.value) return vapidPublicKey.value;

      const response = await fetch(
        `${API_URL}/notifications/vapid-public-key`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "[Push] VAPID key fetch failed:",
          response.status,
          errorData,
        );
        throw new Error(errorData.error || "Failed to fetch VAPID public key");
      }

      const data = await response.json();

      if (!data.publicKey) {
        console.error("[Push] VAPID public key is empty");
        throw new Error("VAPID public key is not configured");
      }

      vapidPublicKey.value = data.publicKey;
      return data.publicKey;
    }

    async function fetchSubscriptions(): Promise<void> {
      try {
        console.log("[Push] fetchSubscriptions() - calling backend...");
        const response = await fetch(`${API_URL}/notifications/subscriptions`, {
          credentials: "include",
        });

        console.log(
          "[Push] fetchSubscriptions() - response status:",
          response.status,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch subscriptions");
        }

        const data = await response.json();
        console.log("[Push] fetchSubscriptions() - raw data:", data);
        subscriptions.value = data.data;
        console.log(
          "[Push] fetchSubscriptions() - subscriptions set:",
          subscriptions.value?.length,
        );
      } catch (error) {
        triggerSupportForError("push_subscriptions_fetch", error);
        throw error;
      }
    }

    async function fetchPreferences(): Promise<void> {
      try {
        const response = await fetch(`${API_URL}/notifications/preferences`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch preferences");
        }

        const data = await response.json();
        preferences.value = data.data;
      } catch (error) {
        triggerSupportForError("push_preferences_update", error);
        throw error;
      }
    }

    async function updatePreferences(
      updates: Partial<NotificationPreferences>,
    ): Promise<void> {
      try {
        const response = await fetch(`${API_URL}/notifications/preferences`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error("Failed to update preferences");
        }

        const data = await response.json();
        preferences.value = data.data;
      } catch (error) {
        triggerSupportForError("push_preferences_update", error);
        throw error;
      }
    }

    async function subscribe(deviceName?: string): Promise<boolean> {
      console.log("[Push] subscribe() called, isSupported:", isSupported.value);
      if (!isSupported.value) {
        console.log("[Push] Not supported, returning false");
        return false;
      }

      try {
        loading.value = true;
        console.log("[Push] Requesting notification permission...");

        // Demander la permission
        const permission = await Notification.requestPermission();
        permissionStatus.value = permission;
        console.log("[Push] Permission result:", permission);

        if (permission !== "granted") {
          console.log("[Push] Permission not granted, returning false");
          return false;
        }

        // Attendre que le service worker soit prêt (avec timeout de 10s)
        console.log("[Push] Waiting for service worker...");
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Service Worker timeout - vérifiez la validité du certificat SSL",
                  ),
                ),
              10000,
            ),
          ),
        ]);
        console.log("[Push] Service worker ready");

        // Récupérer la clé VAPID
        console.log("[Push] Fetching VAPID key...");
        const publicKey = await fetchVapidPublicKey();
        console.log(
          "[Push] VAPID key received:",
          publicKey?.substring(0, 20) + "...",
        );

        // S'inscrire aux notifications push
        let pushSubscription;
        try {
          console.log("[Push] Subscribing to push manager...");
          pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
          console.log(
            "[Push] Push subscription created:",
            pushSubscription?.endpoint?.substring(0, 50) + "...",
          );
        } catch (subscribeError) {
          console.error("[Push] Subscribe error:", subscribeError);
          // Si l'erreur est due à un changement de clé VAPID, désabonner et réessayer
          if (
            subscribeError instanceof Error &&
            subscribeError.message.includes("applicationServerKey")
          ) {
            const existingSubscription =
              await registration.pushManager.getSubscription();
            if (existingSubscription) {
              await existingSubscription.unsubscribe();
            }
            // Réessayer avec la nouvelle clé
            pushSubscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
          } else {
            throw subscribeError;
          }
        }

        // Extraire les clés
        console.log("[Push] Extracting keys...");
        const p256dhKey = pushSubscription.getKey("p256dh");
        const authKey = pushSubscription.getKey("auth");

        if (!p256dhKey || !authKey) {
          console.error("[Push] Failed to get keys:", {
            p256dhKey: !!p256dhKey,
            authKey: !!authKey,
          });
          throw new Error("Failed to get subscription keys");
        }
        console.log("[Push] Keys extracted successfully");

        // Envoyer au backend
        console.log("[Push] Sending to backend...");
        const response = await fetch(`${API_URL}/notifications/subscribe`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: pushSubscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(p256dhKey),
              auth: arrayBufferToBase64(authKey),
            },
            deviceName,
          }),
        });

        console.log("[Push] Backend response status:", response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Push] Backend error:", errorText);
          throw new Error("Failed to register subscription");
        }

        // Mettre à jour l'endpoint du navigateur
        browserEndpoint.value = pushSubscription.endpoint;
        console.log("[Push] browserEndpoint updated");

        // Recharger les subscriptions pour avoir l'ID et autres infos
        console.log("[Push] Fetching subscriptions...");
        await fetchSubscriptions();
        console.log(
          "[Push] Subscribe complete! Subscriptions count:",
          subscriptions.value.length,
        );

        return true;
      } catch (error) {
        console.error("Failed to subscribe to push notifications:", error);
        triggerSupportForError("push_subscribe", error);
        return false;
      } finally {
        loading.value = false;
      }
    }

    async function unsubscribe(): Promise<boolean> {
      try {
        loading.value = true;

        const registration = await navigator.serviceWorker.ready;
        const pushSubscription =
          await registration.pushManager.getSubscription();

        if (pushSubscription) {
          // Supprimer du backend d'abord
          await fetch(`${API_URL}/notifications/subscribe`, {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: pushSubscription.endpoint }),
          });

          // Puis désinscrire du navigateur
          await pushSubscription.unsubscribe();
        }

        // Mettre à jour l'état local
        browserEndpoint.value = null;
        await fetchSubscriptions();

        return true;
      } catch (error) {
        console.error("Failed to unsubscribe:", error);
        triggerSupportForError("push_unsubscribe", error);
        return false;
      } finally {
        loading.value = false;
      }
    }

    async function deleteSubscription(id: string): Promise<void> {
      try {
        // Trouver la subscription pour vérifier si c'est le navigateur actuel
        const subscriptionToDelete = subscriptions.value.find(
          (s) => s.id === id,
        );

        await fetch(`${API_URL}/notifications/subscriptions/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        // Si c'est le navigateur actuel, désabonner aussi localement
        if (
          subscriptionToDelete &&
          browserEndpoint.value &&
          subscriptionToDelete.endpoint === browserEndpoint.value
        ) {
          try {
            const registration = await navigator.serviceWorker.ready;
            const pushSubscription =
              await registration.pushManager.getSubscription();
            if (pushSubscription) {
              await pushSubscription.unsubscribe();
            }
          } catch (unsubError) {
            console.warn("Failed to unsubscribe browser locally:", unsubError);
          }
          browserEndpoint.value = null;
        }

        await fetchSubscriptions();
      } catch (error) {
        triggerSupportForError("push_subscription_delete", error);
        throw error;
      }
    }

    function checkPermissionStatus(): void {
      if (typeof Notification !== "undefined") {
        permissionStatus.value = Notification.permission;
      }

      // Vérifier le localStorage pour le banner dismiss
      if (typeof localStorage !== "undefined") {
        bannerDismissed.value =
          localStorage.getItem("pushNotificationBannerDismissed") === "true";
      }
    }

    const shouldShowBanner = computed(() => {
      if (!isSupported.value) return false;
      if (permissionStatus.value !== "default") return false;
      if (bannerDismissed.value) return false;
      return true;
    });

    // Fonction legacy pour compatibilité
    function shouldShowPermissionBanner(): boolean {
      return shouldShowBanner.value;
    }

    function dismissPermissionBanner(): void {
      bannerDismissed.value = true;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("pushNotificationBannerDismissed", "true");
      }
    }

    function resetBannerDismissal(): void {
      bannerDismissed.value = false;
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("pushNotificationBannerDismissed");
      }
    }

    /**
     * @deprecated Utiliser initialize() à la place qui charge tout correctement
     * Conservé pour compatibilité avec le code existant
     */
    async function checkCurrentBrowserSubscription(): Promise<void> {
      await refreshBrowserEndpoint();
    }

    return {
      // State
      vapidPublicKey,
      subscriptions,
      preferences,
      loading,
      permissionStatus,
      bannerDismissed,
      initialized,

      // Computed
      isSupported,
      isSubscribed,
      isPushEnabled,
      canRequestPermission,
      isPermissionDenied,
      shouldShowBanner,
      isCurrentBrowserSubscribed,

      // Actions
      initialize,
      reset,
      refreshBrowserEndpoint,
      fetchVapidPublicKey,
      fetchSubscriptions,
      fetchPreferences,
      updatePreferences,
      subscribe,
      unsubscribe,
      deleteSubscription,
      checkPermissionStatus,
      shouldShowPermissionBanner,
      dismissPermissionBanner,
      resetBannerDismissal,
      checkCurrentBrowserSubscription, // deprecated
    };
  },
);
