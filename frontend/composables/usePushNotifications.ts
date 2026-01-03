import { storeToRefs } from "pinia";
import { usePushNotificationsStore } from "@/stores/pushNotifications";

/**
 * Composable pour gérer les notifications push
 * Wrapper autour du store avec initialisation automatique
 */
export function usePushNotifications() {
  const store = usePushNotificationsStore();

  const {
    subscriptions,
    preferences,
    loading,
    permissionStatus,
    bannerDismissed,
    isSupported,
    isSubscribed,
    isPushEnabled,
    canRequestPermission,
    isPermissionDenied,
  } = storeToRefs(store);

  // Initialiser le statut de permission au montage
  onMounted(() => {
    store.checkPermissionStatus();
  });

  return {
    // State (refs)
    subscriptions,
    preferences,
    loading,
    permissionStatus,
    bannerDismissed,

    // Computed (refs)
    isSupported,
    isSubscribed,
    isPushEnabled,
    canRequestPermission,
    isPermissionDenied,

    // Actions
    subscribe: store.subscribe,
    unsubscribe: store.unsubscribe,
    fetchSubscriptions: store.fetchSubscriptions,
    fetchPreferences: store.fetchPreferences,
    updatePreferences: store.updatePreferences,
    deleteSubscription: store.deleteSubscription,
    shouldShowPermissionBanner: store.shouldShowPermissionBanner,
    dismissPermissionBanner: store.dismissPermissionBanner,
    resetBannerDismissal: store.resetBannerDismissal,
    checkPermissionStatus: store.checkPermissionStatus,
  };
}
