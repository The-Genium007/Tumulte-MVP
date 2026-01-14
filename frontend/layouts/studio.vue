<template>
  <div class="studio-layout-root">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { usePushNotifications } from '@/composables/usePushNotifications'

const { fetchMe } = useAuth()
const { initialize: initializePushNotifications } = usePushNotifications()

// Charger l'utilisateur au montage
onMounted(async () => {
  try {
    await fetchMe()
    // Initialiser les notifications push après l'authentification
    await initializePushNotifications()
  } catch (error) {
    console.error('[StudioLayout] Failed to load user:', error)
  }
})
</script>

<style scoped>
.studio-layout-root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--color-dark-bg-base);
}
</style>
