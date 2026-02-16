<template>
  <nav
    class="fixed bottom-0 inset-x-0 lg:hidden bg-elevated border-t border-default z-40"
    style="height: calc(64px + env(safe-area-inset-bottom))"
  >
    <div class="h-16 flex items-center justify-around px-2 safe-area-bottom">
      <!-- Navigation items -->
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center gap-1 touch-target flex-1 transition-colors"
        :class="isActive(item.to) ? 'text-primary-600' : 'text-neutral-500'"
      >
        <div class="relative">
          <UIcon :name="item.icon" class="size-5" />
          <!-- Badge for invitations -->
          <span
            v-if="item.badge && item.badge > 0"
            class="absolute -top-1.5 -right-2 min-w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-warning-500 text-white rounded-full px-1"
          >
            {{ item.badge > 9 ? '9+' : item.badge }}
          </span>
        </div>
        <span class="text-xs font-medium">{{ item.label }}</span>
      </NuxtLink>

      <!-- Avatar menu -->
      <div ref="menuRef" class="relative flex-1 flex justify-center">
        <button
          class="flex flex-col items-center justify-center gap-1 touch-target transition-colors"
          :class="isMenuActive ? 'text-primary-600' : 'text-neutral-500'"
          @click="isOpen = !isOpen"
        >
          <div class="relative">
            <TwitchAvatar
              :image-url="user?.streamer?.profileImageUrl"
              :display-name="user?.streamer?.twitchDisplayName || 'User'"
              size="sm"
              class="ring-2"
              :class="isMenuActive ? 'ring-primary-600' : 'ring-transparent'"
            />
          </div>
          <span class="text-xs font-medium">Compte</span>
        </button>

        <!-- Dropdown menu -->
        <Transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="transform opacity-0 scale-95 translate-y-2"
          enter-to-class="transform opacity-100 scale-100 translate-y-0"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100 translate-y-0"
          leave-to-class="transform opacity-0 scale-95 translate-y-2"
        >
          <div
            v-if="isOpen"
            class="absolute bottom-full right-0 mb-2 w-48 origin-bottom-right rounded-xl bg-elevated border border-default shadow-lg z-50"
          >
            <div class="p-1">
              <!-- Mon compte -->
              <NuxtLink
                to="/settings"
                class="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-muted/50 rounded-lg transition-colors"
                @click="isOpen = false"
              >
                <UIcon name="i-lucide-user" class="size-4" />
                <span>Mon compte</span>
              </NuxtLink>

              <!-- Support -->
              <button
                class="w-full flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-muted/50 rounded-lg transition-colors"
                @click="handleOpenSupport"
              >
                <UIcon name="i-lucide-life-buoy" class="size-4" />
                <span>Support</span>
              </button>

              <!-- Color mode toggle -->
              <ColorModeToggle />

              <!-- Divider -->
              <div class="my-1 border-t border-default"></div>

              <!-- Administration (admin only) -->
              <NuxtLink
                v-if="isAdmin"
                to="/admin"
                class="flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
                @click="isOpen = false"
              >
                <UIcon name="i-lucide-shield" class="size-4" />
                <span>Administration</span>
              </NuxtLink>

              <!-- Déconnexion -->
              <button
                class="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
                @click="handleLogout"
              >
                <UIcon name="i-lucide-log-out" class="size-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { useAuth } from '@/composables/useAuth'
import { useNotifications } from '@/composables/useNotifications'
import { useSupportWidget } from '@/composables/useSupportWidget'

interface NavigationItem {
  to: string
  icon: string
  label: string
  badge?: number
}

const route = useRoute()
const router = useRouter()
const { user, logout, isAdmin } = useAuth()
const { invitationCount } = useNotifications()
const { openSupport } = useSupportWidget()

const isOpen = ref(false)
const menuRef = ref(null)

// Close menu when clicking outside
onClickOutside(menuRef, () => {
  isOpen.value = false
})

/**
 * Navigation items with dynamic badge for invitations
 */
const navigationItems = computed<NavigationItem[]>(() => [
  {
    to: '/dashboard',
    icon: 'i-lucide-home',
    label: 'Accueil',
  },
  {
    to: '/dashboard/campaigns',
    icon: 'i-lucide-folder-kanban',
    label: 'Campagnes',
    badge: invitationCount.value,
  },
  {
    to: '/mj',
    icon: 'i-lucide-crown',
    label: 'MJ',
  },
])

/**
 * Check if menu-related routes are active
 */
const isMenuActive = computed(() => {
  return route.path.startsWith('/settings')
})

/**
 * Checks if a navigation item is active.
 */
function isActive(path: string): boolean {
  if (path === '/mj' || path === '/dashboard') {
    return route.path === path
  }
  return route.path.startsWith(path)
}

/**
 * Handle logout
 */
async function handleLogout() {
  isOpen.value = false
  await logout()
  router.push('/login')
}

/**
 * Open support widget
 */
function handleOpenSupport() {
  isOpen.value = false
  openSupport()
}
</script>
