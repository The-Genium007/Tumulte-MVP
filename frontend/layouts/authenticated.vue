<template>
  <div class="min-h-screen bg-subtle flex flex-col">
    <!-- PWA Install Prompt - DISABLED for Safari debugging -->
    <!-- <PwaInstallPrompt /> -->

    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col pb-20 lg:pb-0">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl flex-1">
        <!-- Indicateur hors-ligne -->
        <OfflineIndicator />

        <!-- Banner de permission notifications push -->
        <div class="pb-2">
          <NotificationsPushPermissionBanner />
        </div>

        <!-- Page Content -->
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- Bottom Navigation (mobile only) -->
    <BottomNavigation />

    <!-- Widgets globaux -->
    <SupportWidget />

    <!-- Modal d'onboarding Twitch (bloquant si non lié) -->
    <OnboardingTwitchModal :open="showTwitchOnboarding" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import SupportWidget from '@/components/SupportWidget.vue'
import { useAuth } from '@/composables/useAuth'
import { usePushNotifications } from '@/composables/usePushNotifications'
import { useVttAutoSync } from '@/composables/useVttAutoSync'
// PWA disabled for Safari debugging
// import { usePwaInstall } from '@/composables/usePwaInstall'

const { fetchMe, user, loading, hasFetchedUser } = useAuth()
// const { shouldShowInstallUI } = usePwaInstall()
const { initialize: initializePushNotifications } = usePushNotifications()
const { initialize: initializeVttSync } = useVttAutoSync()

// Affiche le modal d'onboarding si l'utilisateur est connecté mais n'a pas lié Twitch
// On attend que le fetch initial soit terminé pour éviter les flash
// hasFetchedUser persiste dans le store Pinia, donc reste true entre les navigations
const showTwitchOnboarding = computed(() => {
  if (!hasFetchedUser.value || loading.value) return false
  return user.value !== null && user.value.streamer === null
})

// Charger l'utilisateur au montage initial du layout
// Nécessaire car la page /mj ou /dashboard est la première chargée après login
onMounted(async () => {
  try {
    await fetchMe()

    // Initialiser les notifications push après l'authentification
    // Cela charge : subscriptions backend, preferences, et browserEndpoint
    await initializePushNotifications()

    // Synchroniser les connexions VTT et récupérer les campagnes disponibles
    await initializeVttSync()
  } catch (error) {
    console.error('[AuthenticatedLayout] Failed to load user:', error)
  }
})
</script>
