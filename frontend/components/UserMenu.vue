<template>
  <div ref="menuRef" class="relative flex items-center">
    <!-- Avatar utilisateur avec badge de notification -->
    <button
      @click="isOpen = !isOpen"
      class="group relative flex items-center gap-2 p-1 rounded-lg transition-colors"
      aria-label="Menu utilisateur"
    >
      <div class="relative">
        <div class="relative rounded-full overflow-hidden">
          <TwitchAvatar
            :image-url="user?.streamer?.profileImageUrl"
            :display-name="user?.streamer?.twitchDisplayName || 'User'"
            size="md"
          />
          <!-- Overlay coloré au hover -->
          <div
            class="absolute inset-0 bg-primary-100 opacity-0 group-hover:opacity-60 transition-opacity rounded-full"
          />
        </div>

        <!-- Badge de notification d'invitations -->
        <UBadge
          v-if="hasInvitations"
          color="warning"
          variant="solid"
          size="sm"
          class="absolute -top-1 -right-1"
        >
          {{ invitationCount }}
        </UBadge>
      </div>
    </button>

    <!-- Menu déroulant -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute top-full right-0 mt-2 w-64 origin-top-right rounded-xl bg-(--theme-card-bg) border border-(--theme-border) shadow-lg focus:outline-none z-50"
      >
        <div class="p-1">
          <!-- Header avec infos utilisateur -->
          <div class="px-4 py-3 border-b border-(--theme-border)">
            <div class="flex items-center gap-3">
              <TwitchAvatar
                :image-url="user?.streamer?.profileImageUrl"
                :display-name="user?.streamer?.twitchDisplayName || 'User'"
                size="lg"
              />
              <div class="flex flex-col">
                <span class="font-heading text-lg text-primary uppercase">
                  {{ user?.streamer?.twitchDisplayName }}
                </span>
              </div>
            </div>
          </div>

          <!-- Items du menu -->
          <div class="py-1">
            <!-- Accueil (toujours vers la page dashboard) -->
            <NuxtLink
              to="/dashboard"
              @click="isOpen = false"
              class="flex items-center gap-3 px-4 py-2 text-sm text-(--theme-text-secondary) hover:bg-(--theme-card-bg-hover) rounded-lg transition-colors"
            >
              <UIcon name="i-lucide-home" class="size-4" />
              <span>Accueil</span>
            </NuxtLink>

            <!-- Mes Campagnes -->
            <NuxtLink
              to="/dashboard/campaigns"
              @click="isOpen = false"
              class="flex items-center justify-between px-4 py-2 text-sm text-(--theme-text-secondary) hover:bg-(--theme-card-bg-hover) rounded-lg transition-colors"
            >
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-folder-kanban" class="size-4" />
                <span>Mes Campagnes</span>
              </div>
              <UBadge v-if="hasInvitations" color="warning" variant="solid" size="xs">
                {{ invitationCount }}
              </UBadge>
            </NuxtLink>

            <!-- Installer l'application (PWA) -->
            <button
              v-if="canInstall"
              @click="handleInstallPwa"
              class="w-full flex items-center gap-3 px-4 py-2 text-sm text-(--theme-text-secondary) hover:bg-(--theme-card-bg-hover) rounded-lg transition-colors"
            >
              <UIcon name="i-lucide-download" class="size-4" />
              <span>Installer l'application</span>
            </button>

            <!-- Tableau de bord MJ -->
            <NuxtLink
              to="/mj"
              @click="isOpen = false"
              class="flex items-center gap-3 px-4 py-2 text-sm text-(--theme-text-secondary) hover:bg-(--theme-card-bg-hover) rounded-lg transition-colors"
            >
              <UIcon name="i-lucide-crown" class="size-4" />
              <span>Tableau de bord MJ</span>
            </NuxtLink>

            <!-- Divider -->
            <div class="my-1 border-t border-(--theme-border)"></div>

            <!-- Administration (admin only) -->
            <NuxtLink
              v-if="isAdmin"
              to="/admin"
              @click="isOpen = false"
              class="flex items-center gap-3 px-4 py-2 text-sm text-(--theme-error-text) hover:bg-(--theme-error-bg) rounded-lg transition-colors"
            >
              <UIcon name="i-lucide-shield" class="size-4" />
              <span>Administration</span>
            </NuxtLink>

            <!-- Mon compte -->
            <NuxtLink
              to="/settings"
              @click="isOpen = false"
              class="flex items-center gap-3 px-4 py-2 text-sm text-(--theme-text-secondary) hover:bg-(--theme-card-bg-hover) rounded-lg transition-colors"
            >
              <UIcon name="i-lucide-user" class="size-4" />
              <span>Mon compte</span>
            </NuxtLink>

            <!-- Support -->
            <button
              @click="handleOpenSupport"
              class="w-full flex items-center gap-3 px-4 py-2 text-sm text-(--theme-text-secondary) hover:bg-(--theme-card-bg-hover) rounded-lg transition-colors"
            >
              <UIcon name="i-lucide-life-buoy" class="size-4" />
              <span>Support</span>
            </button>

            <!-- Divider -->
            <div class="my-1 border-t border-(--theme-border)"></div>

            <!-- Color mode toggle -->
            <ColorModeToggle />

            <!-- Divider -->
            <div class="my-1 border-t border-(--theme-border)"></div>

            <!-- Déconnexion -->
            <button
              @click="handleLogout"
              class="w-full flex items-center gap-3 px-4 py-2 text-sm text-(--theme-error-text) hover:bg-(--theme-error-bg) rounded-lg transition-colors"
            >
              <UIcon name="i-lucide-log-out" class="size-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { useAuth } from '@/composables/useAuth'
import { useNotifications } from '@/composables/useNotifications'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { useSupportWidget } from '@/composables/useSupportWidget'

const router = useRouter()
const { user, logout, isAdmin } = useAuth()
const { invitationCount, hasInvitations } = useNotifications()
const { canInstall, install } = usePwaInstall()
const { openSupport } = useSupportWidget()

const isOpen = ref(false)
const menuRef = ref(null)

// Fermer le menu quand on clique en dehors
onClickOutside(menuRef, () => {
  isOpen.value = false
})

/**
 * Gère la déconnexion
 */
const handleLogout = async () => {
  await logout()
  isOpen.value = false
  router.push('/login')
}

/**
 * Gère l'installation de la PWA
 */
const handleInstallPwa = async () => {
  await install()
  isOpen.value = false
}

/**
 * Ouvre le widget de support
 */
const handleOpenSupport = () => {
  isOpen.value = false
  openSupport()
}
</script>
