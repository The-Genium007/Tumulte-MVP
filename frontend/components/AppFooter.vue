<template>
  <footer class="mt-auto pb-24 lg:pb-6 safe-area-bottom">
    <div class="container-page py-4">
      <nav class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <img
            src="~/assets/images/logo.png"
            alt="Tumulte"
            class="size-8 sm:size-10 transition-transform group-hover:scale-105"
          />
          <span
            class="text-base sm:text-lg font-bold text-primary uppercase"
            style="font-family: var(--font-heading)"
            >TUMULTE</span
          >
        </NuxtLink>

        <!-- Navigation centrale -->
        <div class="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
          <NuxtLink
            to="/about"
            class="text-sm text-(--theme-text-secondary) hover:text-(--theme-text-primary) transition-colors"
          >
            À propos
          </NuxtLink>
          <NuxtLink
            to="/legal/conditions-utilisation"
            class="text-sm text-(--theme-text-secondary) hover:text-(--theme-text-primary) transition-colors"
          >
            CGU
          </NuxtLink>
          <NuxtLink
            to="/legal/politique-confidentialite"
            class="text-sm text-(--theme-text-secondary) hover:text-(--theme-text-primary) transition-colors"
          >
            Confidentialité
          </NuxtLink>
          <button
            type="button"
            class="text-sm text-(--theme-text-secondary) hover:text-(--theme-text-primary) transition-colors"
            @click="handleOpenSupport"
          >
            Support
          </button>
        </div>

        <!-- Infos -->
        <div class="flex items-center gap-4 text-xs text-(--theme-text-muted)">
          <span>v{{ version }}</span>
          <span class="hidden sm:inline">•</span>
          <a
            href="https://lucasgiza.com"
            target="_blank"
            rel="noopener noreferrer"
            class="hidden sm:inline hover:text-(--theme-text-secondary) transition-colors"
          >
            Lucas GIZA
          </a>
        </div>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useAppVersion } from '~/composables/useAppVersion'
import { useSupportWidget } from '~/composables/useSupportWidget'

const { version } = useAppVersion()
const { openSupport } = useSupportWidget()

function handleOpenSupport() {
  openSupport()
}
</script>
