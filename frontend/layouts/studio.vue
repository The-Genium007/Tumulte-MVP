<template>
  <div class="studio-layout-root">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { fetchMe } = useAuth()

// Charger l'utilisateur au montage
onMounted(async () => {
  try {
    await fetchMe()
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
  background: #0f0f1a;
}
</style>
