<template>
  <nav
    class="fixed bottom-0 inset-x-0 lg:hidden bg-elevated border-t border-default z-40"
    style="height: calc(64px + env(safe-area-inset-bottom))"
  >
    <div class="h-16 flex items-center justify-around px-2 safe-area-bottom">
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center gap-1 touch-target flex-1 transition-colors"
        :class="isActive(item.to) ? 'text-primary-600' : 'text-neutral-500'"
      >
        <UIcon :name="item.icon" class="size-5" />
        <span class="text-xs font-medium">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

/**
 * BottomNavigation component provides mobile navigation bar.
 * Displays role-specific navigation items (MJ or Streamer).
 * Only visible on mobile devices (< lg breakpoint).
 *
 * @example
 * <BottomNavigation />
 */

interface NavigationItem {
  to: string
  icon: string
  label: string
}

const route = useRoute()

/**
 * Static navigation items - same menu on all pages.
 */
const navigationItems: NavigationItem[] = [
  {
    to: '/streamer',
    icon: 'i-lucide-home',
    label: 'Accueil'
  },
  {
    to: '/streamer/campaigns',
    icon: 'i-lucide-mail',
    label: 'Invitations'
  },
  {
    to: '/mj',
    icon: 'i-lucide-crown',
    label: 'MJ'
  },
  {
    to: '/settings',
    icon: 'i-lucide-settings',
    label: 'Réglages'
  }
]

/**
 * Checks if a navigation item is active.
 *
 * @param path - The path to check
 * @returns True if the current route matches the path
 */
function isActive(path: string): boolean {
  if (path === '/mj' || path === '/streamer') {
    // Exact match for home pages
    return route.path === path
  }
  // Starts with for sub-pages
  return route.path.startsWith(path)
}
</script>
