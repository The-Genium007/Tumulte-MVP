<template>
  <div class="min-h-screen bg-(--theme-auth-bg) flex flex-col">
    <main class="flex-1 flex items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <!-- Lien retour accueil - aligne a gauche au-dessus de la carte -->
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors mb-4"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4" />
          Retour à l'accueil
        </NuxtLink>

        <slot />
      </div>
    </main>

    <!-- Cookie Consent Banner (RGPD) -->
    <CookieConsentBanner />
  </div>
</template>

<script setup lang="ts">
import CookieConsentBanner from '@/components/CookieConsentBanner.vue'
</script>
