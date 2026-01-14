<template>
  <Transition name="slide-down">
    <UAlert
      v-if="isOffline"
      color="warning"
      variant="soft"
      icon="i-lucide-wifi-off"
      class="mb-4"
    >
      <template #title>Vous êtes hors-ligne</template>
      <template #description>
        <p>
          Les données affichées peuvent être obsolètes. Certaines fonctionnalités
          ne sont pas disponibles sans connexion internet.
        </p>
      </template>
    </UAlert>
  </Transition>

  <!-- Toast de reconnexion -->
  <Transition name="slide-up">
    <div
      v-if="showReconnectedToast"
      class="fixed bottom-6 right-6 z-50"
    >
      <UAlert
        color="success"
        variant="soft"
        icon="i-lucide-wifi"
        class="max-w-sm shadow-xl"
        closable
        @close="dismissReconnectedToast"
      >
        <template #title>Connexion rétablie</template>
        <template #description>
          <p>Vous êtes de nouveau en ligne.</p>
        </template>
      </UAlert>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { useOnlineStatus } from "@/composables/useOnlineStatus";

const { isOffline, wasOffline, acknowledgeReconnection } = useOnlineStatus();

const showReconnectedToast = ref(false);
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// Watch for reconnection
watch(wasOffline, (reconnected) => {
  if (reconnected) {
    showReconnectedToast.value = true;

    // Auto-dismiss after 5 seconds
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      dismissReconnectedToast();
    }, 5000);
  }
});

const dismissReconnectedToast = () => {
  showReconnectedToast.value = false;
  acknowledgeReconnection();
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
};

// Cleanup on unmount
onUnmounted(() => {
  if (toastTimeout) clearTimeout(toastTimeout);
});
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
