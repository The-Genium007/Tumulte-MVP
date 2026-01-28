<template>
  <UAlert v-if="showBanner" color="primary" variant="soft" icon="i-lucide-bell" class="">
    <template #title> Activer les notifications </template>
    <template #description>
      <p class="mb-3">
        Recevez des notifications pour les invitations aux campagnes, les sondages en cours et les
        alertes importantes.
      </p>
      <div class="flex gap-2">
        <UButton color="primary" variant="solid" size="sm" :loading="loading" @click="handleEnable">
          Activer
        </UButton>
        <UButton color="neutral" variant="ghost" size="sm" @click="handleDismiss">
          Plus tard
        </UButton>
      </div>
    </template>
  </UAlert>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePushNotifications } from '@/composables/usePushNotifications'

defineProps<{
  /**
   * Mode persistent : le banner réapparaît à chaque refresh/visite
   * tant que l'utilisateur n'a pas accepté les notifications.
   * Le bouton "Plus tard" masque temporairement (session seulement).
   */
  persistent?: boolean
}>()

const {
  loading,
  permissionStatus,
  isSupported,
  isCurrentBrowserSubscribed,
  isPermissionDenied,
  subscribe,
  initialize,
} = usePushNotifications()

// État local pour masquer temporairement le banner pendant la session
// Se réinitialise à chaque refresh de page
const sessionDismissed = ref(false)

// Le banner s'affiche si :
// - Le navigateur supporte les notifications push
// - Le navigateur actuel n'est pas déjà inscrit
// - L'utilisateur n'a pas refusé les permissions
// - L'utilisateur n'a pas cliqué "Plus tard" pendant cette session
const showBanner = computed(() => {
  if (sessionDismissed.value) return false
  return isSupported.value && !isCurrentBrowserSubscribed.value && !isPermissionDenied.value
})

// S'assurer que l'état du navigateur est à jour
onMounted(async () => {
  // initialize() charge subscriptions + browserEndpoint en parallèle
  await initialize()
})

const showDeniedModal = ref(false)

const handleEnable = async () => {
  const success = await subscribe()

  if (!success && permissionStatus.value === 'denied') {
    // L'utilisateur a refusé, afficher la modale explicative
    showDeniedModal.value = true
  }
  // isCurrentBrowserSubscribed est mis à jour automatiquement
  // par subscribe() qui met à jour browserEndpoint
}

const handleDismiss = () => {
  // Masquer temporairement pour cette session uniquement
  // Le banner réapparaîtra au prochain refresh/visite
  sessionDismissed.value = true
}
</script>
