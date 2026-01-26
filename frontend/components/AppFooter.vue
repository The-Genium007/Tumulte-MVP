<template>
  <footer
    class="mt-auto container mx-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6 max-w-7xl safe-area-bottom"
  >
    <div class="bg-muted rounded-4xl px-8 py-6 text-center space-y-2">
      <!-- Version -->
      <p class="text-sm text-primary-500">v{{ version }}</p>

      <!-- Copyright -->
      <p class="text-xs text-primary-500">
        &copy; 2026 Tumulte. Propulsé par
        <a
          href="https://lucasgiza.com"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-500 hover:underline"
          >Lucas GIZA</a
        >
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useAppVersion } from '~/composables/useAppVersion'

const { version } = useAppVersion()
</script>
