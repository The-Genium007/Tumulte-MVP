<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Dashboard Admin</h1>
      <UBadge color="error" variant="subtle">Admin</UBadge>
    </div>

    <!-- Tab Navigation -->
    <nav class="flex gap-2">
      <UButton
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        :variant="isActive(tab.to) ? 'solid' : 'ghost'"
        :color="isActive(tab.to) ? 'primary' : 'neutral'"
        :icon="tab.icon"
        size="sm"
      >
        {{ tab.label }}
      </UButton>
    </nav>

    <!-- Child pages -->
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'authenticated' as const,
  middleware: 'auth',
})

useHead({
  title: 'Admin - Tumulte',
})

useSeoMeta({
  robots: 'noindex, nofollow',
})

const route = useRoute()

const tabs = [
  { label: 'Donnees', to: '/admin', icon: 'i-lucide-bar-chart-3' },
  { label: 'Monitoring', to: '/admin/monitoring', icon: 'i-lucide-activity' },
]

function isActive(to: string): boolean {
  if (to === '/admin') {
    return route.path === '/admin' || route.path === '/admin/'
  }
  return route.path.startsWith(to)
}
</script>
