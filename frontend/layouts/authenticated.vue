<template>
  <div class="min-h-screen bg-subtle flex flex-col">
    <!-- PWA Install Prompt -->
    <PwaInstallPrompt />

    <!-- Header flottant -->
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 max-w-7xl">
      <AppHeader />
    </div>

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
    <DevModeIndicator />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import SupportWidget from '@/components/SupportWidget.vue'
import DevModeIndicator from '@/components/DevModeIndicator.vue'
import { useAuth } from '@/composables/useAuth'
import { usePushNotifications } from '@/composables/usePushNotifications'

const { fetchMe } = useAuth()
const { initialize: initializePushNotifications } = usePushNotifications()

// Charger l'utilisateur au montage initial du layout
// Nécessaire car la page /mj ou /streamer est la première chargée après login
onMounted(async () => {
  try {
    await fetchMe()
    // Initialiser les notifications push après l'authentification
    // Cela charge : subscriptions backend, preferences, et browserEndpoint
    await initializePushNotifications()
  } catch (error) {
    console.error('[AuthenticatedLayout] Failed to load user:', error)
  }
})
</script>
