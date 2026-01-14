<template>
  <footer class="mt-auto container mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-6 max-w-7xl">
    <div class="bg-muted rounded-[2rem] px-8 py-6 text-center space-y-2">
      <!-- Version -->
      <p class="text-sm text-muted">v{{ version }}</p>

      <!-- Copyright -->
      <p class="text-xs text-muted">
        &copy; 2026 Tumulte. Propulsé par
        <a
          href="https://lucasgiza.com"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-500 hover:underline"
        >Lucas GIZA</a>
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useAppVersion } from '~/composables/useAppVersion'

const { version } = useAppVersion()
</script>
