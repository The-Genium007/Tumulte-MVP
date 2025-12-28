<template>
  <div ref="menuRef" class="relative">
    <!-- Avatar utilisateur avec badge de notification -->
    <button
      @click="isOpen = !isOpen"
      class="relative flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800/50 transition-colors"
      aria-label="Menu utilisateur"
    >
      <div class="relative">
        <TwitchAvatar
          :image-url="user?.streamer?.profile_image_url"
          :display-name="user?.streamer?.twitch_display_name || 'User'"
          size="md"
        />

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
        class="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-gray-800 shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
      >
        <div class="p-1">
          <!-- Header avec infos utilisateur -->
          <div class="px-4 py-3 border-b border-gray-700">
            <div class="flex items-center gap-3">
              <TwitchAvatar
                :image-url="user?.streamer?.profile_image_url"
                :display-name="user?.streamer?.twitch_display_name || 'User'"
                size="lg"
              />
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-white">
                  {{ user?.streamer?.twitch_display_name }}
                </span>
                <span class="text-xs text-gray-400">
                  Mode {{ currentRole }}
                </span>
              </div>
            </div>
          </div>

          <!-- Items du menu -->
          <div class="py-1">
            <!-- Accueil -->
            <NuxtLink
              :to="homePath"
              @click="isOpen = false"
              class="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <UIcon name="i-lucide-home" class="size-4" />
              <span>Accueil</span>
            </NuxtLink>

            <!-- Mes Campagnes -->
            <NuxtLink
              to="/streamer/campaigns"
              @click="isOpen = false"
              class="flex items-center justify-between px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-folder-kanban" class="size-4" />
                <span>Mes Campagnes</span>
              </div>
              <UBadge
                v-if="hasInvitations"
                color="yellow"
                variant="solid"
                size="xs"
              >
                {{ invitationCount }}
              </UBadge>
            </NuxtLink>

            <!-- Divider -->
            <div class="my-1 border-t border-gray-700"></div>

            <!-- Switch Mode -->
            <button
              @click="handleSwitchMode"
              :disabled="switching"
              class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UIcon name="i-lucide-repeat" class="size-4" />
              <span>Passer en {{ targetRoleLabel }}</span>
            </button>

            <!-- Réglages -->
            <NuxtLink
              to="/settings"
              @click="isOpen = false"
              class="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <UIcon name="i-lucide-settings" class="size-4" />
              <span>Réglages</span>
            </NuxtLink>

            <!-- Divider -->
            <div class="my-1 border-t border-gray-700"></div>

            <!-- Déconnexion -->
            <button
              @click="handleLogout"
              class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { useAuth } from '@/composables/useAuth'
import { useRoleSwitch } from '@/composables/useRoleSwitch'
import { useNotifications } from '@/composables/useNotifications'

const router = useRouter()
const { user, logout } = useAuth()
const { switching, currentRole, targetRoleLabel, switchToOppositeRole } = useRoleSwitch()
const { invitationCount, hasInvitations } = useNotifications()

const isOpen = ref(false)
const menuRef = ref(null)

// DEBUG: Log user data to check profile_image_url
watch(() => user.value, (newUser) => {
  console.log('UserMenu - User data:', newUser)
  console.log('UserMenu - Profile image URL:', newUser?.streamer?.profile_image_url)
}, { immediate: true })

// Computed property for home path based on current role
const homePath = computed(() => currentRole.value === 'MJ' ? '/mj' : '/streamer')

// Fermer le menu quand on clique en dehors
onClickOutside(menuRef, () => {
  isOpen.value = false
})

/**
 * Gère le switch de mode
 */
const handleSwitchMode = async () => {
  await switchToOppositeRole()
  isOpen.value = false
}

/**
 * Gère la déconnexion
 */
const handleLogout = async () => {
  await logout()
  isOpen.value = false
  router.push('/login')
}
</script>
