<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl flex-1">
        <!-- Banner de permission notifications push -->
        <NotificationsPushPermissionBanner />

        <!-- Page Content -->
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <AppFooter />

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

const { fetchMe } = useAuth()

// Charger l'utilisateur au montage initial du layout
// Nécessaire car la page /mj ou /streamer est la première chargée après login
onMounted(async () => {
  try {
    await fetchMe()
  } catch (error) {
    console.error('[AuthenticatedLayout] Failed to load user:', error)
  }
})
</script>
