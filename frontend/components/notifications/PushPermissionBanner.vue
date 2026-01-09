<template>
  <UAlert
    v-if="showBanner"
    color="info"
    variant="soft"
    icon="i-lucide-bell"
    class="mb-4"
  >
    <template #title> Activer les notifications </template>
    <template #description>
      <p class="mb-3">
        Recevez des notifications pour les invitations aux campagnes, les
        sondages en cours et les alertes importantes.
      </p>
      <div class="flex gap-2">
        <UButton
          color="primary"
          size="sm"
          :loading="loading"
          @click="handleEnable"
        >
          Activer
        </UButton>
        <UButton
          v-if="!persistent"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="handleDismiss"
        >
          Plus tard
        </UButton>
      </div>
    </template>
  </UAlert>

  <!-- Modal de seconde chance si permission refusée -->
  <NotificationsPushDeniedModal v-model:open="showDeniedModal" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { usePushNotifications } from "@/composables/usePushNotifications";

const props = defineProps<{
  persistent?: boolean;
}>();

const {
  loading,
  permissionStatus,
  isSupported,
  isCurrentBrowserSubscribed,
  isPermissionDenied,
  subscribe,
  shouldShowBanner,
  dismissPermissionBanner,
  initialize,
} = usePushNotifications();

// En mode persistent : afficher tant que le navigateur n'est pas inscrit
// En mode normal : utiliser la logique existante (dismissable)
const showBanner = computed(() => {
  if (props.persistent) {
    // Mode persistent : visible si supporté, non inscrit et permission non refusée
    return isSupported.value && !isCurrentBrowserSubscribed.value && !isPermissionDenied.value;
  }
  return shouldShowBanner.value;
});

// S'assurer que l'état du navigateur est à jour en mode persistent
onMounted(async () => {
  if (props.persistent) {
    // initialize() charge subscriptions + browserEndpoint en parallèle
    await initialize();
  }
});

const showDeniedModal = ref(false);

const handleEnable = async () => {
  const success = await subscribe();

  if (!success && permissionStatus.value === "denied") {
    // L'utilisateur a refusé, afficher la modale explicative
    showDeniedModal.value = true;
  }

  // En mode non-persistent, on dismiss simplement le banner
  if (!props.persistent) {
    dismissPermissionBanner();
  }
  // En mode persistent, isCurrentBrowserSubscribed est mis à jour automatiquement
  // par subscribe() qui met à jour browserEndpoint
};

const handleDismiss = () => {
  dismissPermissionBanner();
};
</script>
