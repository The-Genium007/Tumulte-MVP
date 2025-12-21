<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
    <!-- Main Content (pas de header pour pages publiques) -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer public -->
    <AppFooter />

    <!-- Widgets globaux -->
    <SupportWidget />
    <DevModeIndicator />
  </div>
</template>

<script setup lang="ts">
import AppFooter from '@/components/AppFooter.vue'
import SupportWidget from '@/components/SupportWidget.vue'
import DevModeIndicator from '@/components/DevModeIndicator.vue'
</script>
