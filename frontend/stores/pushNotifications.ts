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
    const currentBrowserEndpoint = ref<string | null>(null);

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

    // Vérifie si le navigateur actuel a une subscription push active
    // On vérifie simplement si currentBrowserEndpoint est défini (= le navigateur a une subscription)
    const isCurrentBrowserSubscribed = computed(() => {
      return !!currentBrowserEndpoint.value;
    });

    // Actions
    async function fetchVapidPublicKey(): Promise<string> {
      if (vapidPublicKey.value) return vapidPublicKey.value;

      const response = await fetch(
        `${API_URL}/notifications/vapid-public-key`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch VAPID public key");
      }

      const data = await response.json();
      vapidPublicKey.value = data.publicKey;
      return data.publicKey;
    }

    async function fetchSubscriptions(): Promise<void> {
      try {
        const response = await fetch(`${API_URL}/notifications/subscriptions`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch subscriptions");
        }

        const data = await response.json();
        subscriptions.value = data.data;
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
      if (!isSupported.value) return false;

      try {
        loading.value = true;

        // Demander la permission
        const permission = await Notification.requestPermission();
        permissionStatus.value = permission;

        if (permission !== "granted") {
          return false;
        }

        // Attendre que le service worker soit prêt
        const registration = await navigator.serviceWorker.ready;

        // Récupérer la clé VAPID
        const publicKey = await fetchVapidPublicKey();

        // S'inscrire aux notifications push
        let pushSubscription;
        try {
          pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        } catch (subscribeError) {
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
        const p256dhKey = pushSubscription.getKey("p256dh");
        const authKey = pushSubscription.getKey("auth");

        if (!p256dhKey || !authKey) {
          throw new Error("Failed to get subscription keys");
        }

        // Envoyer au backend
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

        if (!response.ok) {
          throw new Error("Failed to register subscription");
        }

        await fetchSubscriptions();
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
          // Désinscrire du navigateur
          await pushSubscription.unsubscribe();

          // Supprimer du backend
          await fetch(`${API_URL}/notifications/subscribe`, {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: pushSubscription.endpoint }),
          });
        }

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
        await fetch(`${API_URL}/notifications/subscriptions/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

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
     * Vérifie si le navigateur actuel a une subscription push active
     * et stocke l'endpoint pour comparaison
     */
    async function checkCurrentBrowserSubscription(): Promise<void> {
      if (!isSupported.value) {
        currentBrowserEndpoint.value = null;
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const pushSubscription =
          await registration.pushManager.getSubscription();

        if (pushSubscription) {
          currentBrowserEndpoint.value = pushSubscription.endpoint;
        } else {
          currentBrowserEndpoint.value = null;
        }
      } catch (error) {
        console.error("Failed to check browser subscription:", error);
        currentBrowserEndpoint.value = null;
      }
    }

    return {
      // State
      vapidPublicKey,
      subscriptions,
      preferences,
      loading,
      permissionStatus,
      bannerDismissed,

      // Computed
      isSupported,
      isSubscribed,
      isPushEnabled,
      canRequestPermission,
      isPermissionDenied,
      shouldShowBanner,
      isCurrentBrowserSubscribed,

      // Actions
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
      checkCurrentBrowserSubscription,
    };
  },
);
