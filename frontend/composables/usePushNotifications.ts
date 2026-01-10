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
    initialized,
    isSupported,
    isSubscribed,
    isPushEnabled,
    canRequestPermission,
    isPermissionDenied,
    shouldShowBanner,
    isCurrentBrowserSubscribed,
  } = storeToRefs(store);

  return {
    // State (refs)
    subscriptions,
    preferences,
    loading,
    permissionStatus,
    bannerDismissed,
    initialized,

    // Computed (refs)
    isSupported,
    isSubscribed,
    isPushEnabled,
    canRequestPermission,
    isPermissionDenied,
    shouldShowBanner,
    isCurrentBrowserSubscribed,

    // Actions
    initialize: store.initialize,
    reset: store.reset,
    refreshBrowserEndpoint: store.refreshBrowserEndpoint,
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
    // Deprecated - use initialize() instead
    checkCurrentBrowserSubscription: store.checkCurrentBrowserSubscription,
  };
}
