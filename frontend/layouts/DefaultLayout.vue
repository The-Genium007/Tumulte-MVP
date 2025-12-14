<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <slot />
    <SupportWidget />
    <DevModeIndicator />
  </div>
</template>

<script setup lang="ts">
import DevModeIndicator from '@/components/DevModeIndicator.vue'
import SupportWidget from '@/components/SupportWidget.vue'
</script>
