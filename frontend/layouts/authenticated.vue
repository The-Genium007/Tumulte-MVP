<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
    <!-- Header -->
    <AppHeader />

    <!-- Breadcrumbs + Main Content -->
    <main class="flex-1 flex flex-col">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl flex-1">
        <!-- Breadcrumbs -->
        <AppBreadcrumbs />

        <!-- Page Content -->
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- Widgets globaux -->
    <SupportWidget />
    <DevModeIndicator />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppBreadcrumbs from '@/components/AppBreadcrumbs.vue'
import SupportWidget from '@/components/SupportWidget.vue'
import DevModeIndicator from '@/components/DevModeIndicator.vue'
</script>
