<template>
  <div class="min-h-screen bg-page flex flex-col">
    <!-- Navigation -->
    <AppHeader />

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- Cookie Consent Banner (RGPD) -->
    <CookieConsentBanner />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import CookieConsentBanner from '@/components/CookieConsentBanner.vue'
</script>
