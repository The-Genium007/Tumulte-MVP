<template>
  <div class="min-h-screen bg-page flex flex-col">
    <!-- Main Content (pas de header pour pages publiques) -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer public -->
    <AppFooter />

    <!-- Widgets globaux -->
    <SupportWidget v-if="showSupportWidget" />

    <!-- Cookie Consent Banner (RGPD) -->
    <CookieConsentBanner />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppFooter from '@/components/AppFooter.vue'
import SupportWidget from '@/components/SupportWidget.vue'
import CookieConsentBanner from '@/components/CookieConsentBanner.vue'

const route = useRoute()
const showSupportWidget = computed(() => route.name !== 'login')
</script>
