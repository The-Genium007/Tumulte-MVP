<template>
  <footer
    class="mt-auto container mx-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6 max-w-7xl safe-area-bottom"
  >
    <div class="bg-(--theme-bg-elevated) rounded-4xl px-8 py-6 text-center space-y-3">
      <!-- Version -->
      <p class="text-sm text-(--theme-text-muted)">v{{ version }}</p>

      <!-- Legal links -->
      <div class="flex flex-wrap justify-center gap-4 text-xs">
        <NuxtLink
          to="/legal/conditions-utilisation"
          class="text-(--theme-text-muted) hover:text-(--theme-text-secondary) hover:underline transition-colors"
        >
          Conditions d'utilisation
        </NuxtLink>
        <span class="text-(--theme-text-muted)">•</span>
        <NuxtLink
          to="/legal/politique-confidentialite"
          class="text-(--theme-text-muted) hover:text-(--theme-text-secondary) hover:underline transition-colors"
        >
          Politique de confidentialité
        </NuxtLink>
        <span class="text-(--theme-text-muted)">•</span>
        <NuxtLink
          to="/about"
          class="text-(--theme-text-muted) hover:text-(--theme-text-secondary) hover:underline transition-colors"
        >
          À propos
        </NuxtLink>
      </div>

      <!-- Copyright -->
      <p class="text-xs text-(--theme-text-muted)">
        &copy; 2026 Tumulte. Propulsé par
        <a
          href="https://lucasgiza.com"
          target="_blank"
          rel="noopener noreferrer"
          class="text-(--theme-text-secondary) hover:underline"
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
