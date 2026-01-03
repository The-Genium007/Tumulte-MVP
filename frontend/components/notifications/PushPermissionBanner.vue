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
import { ref, computed } from "vue";
import { usePushNotifications } from "@/composables/usePushNotifications";

const {
  loading,
  permissionStatus,
  subscribe,
  shouldShowPermissionBanner,
  dismissPermissionBanner,
} = usePushNotifications();

const showDeniedModal = ref(false);

const showBanner = computed(() => shouldShowPermissionBanner());

const handleEnable = async () => {
  const success = await subscribe();

  if (!success && permissionStatus.value === "denied") {
    // L'utilisateur a refusé, afficher la modale explicative
    showDeniedModal.value = true;
  }

  dismissPermissionBanner();
};

const handleDismiss = () => {
  dismissPermissionBanner();
};
</script>
