<template>
  <div class="min-h-screen bg-subtle">
    <slot />
    <SupportWidget />
    <DevModeIndicator />
  </div>
</template>

<script setup lang="ts">
import DevModeIndicator from '@/components/DevModeIndicator.vue'
import SupportWidget from '@/components/SupportWidget.vue'
</script>
