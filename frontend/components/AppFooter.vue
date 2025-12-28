<template>
  <footer class="bg-gray-900 border-t border-gray-800 mt-auto">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        <!-- Version -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Version
          </h3>
          <div class="flex items-center gap-2">
            <UBadge color="primary" variant="soft">v{{ version }}</UBadge>
          </div>
        </div>

        <!-- Changelog -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Nouveautés
          </h3>
          <UButton
            to="https://github.com/The-Genium007/Tumulte/releases"
            target="_blank"
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-scroll-text"
            trailing-icon="i-lucide-external-link"
          >
            Changelog
          </UButton>
        </div>

        <!-- Service Status -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Statut
          </h3>
          <div class="flex items-center gap-2">
            <div
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-green-500': status === 'operational',
                'bg-yellow-500': status === 'degraded',
                'bg-gray-500': status === 'unknown',
              }"
            />
            <span class="text-sm text-gray-300">
              {{ statusLabel }}
            </span>
          </div>
        </div>

        <!-- GitHub -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            GitHub
          </h3>
          <a
            href="https://github.com/The-Genium007/Tumulte"
            target="_blank"
            class="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors group"
          >
            <UIcon name="i-simple-icons-github" class="size-5" />
            <span class="group-hover:underline">The-Genium007/Tumulte</span>
          </a>

          <!-- Stats GitHub -->
          <div
            v-if="!githubLoading && !githubError && (stats.stars || stats.lastRelease)"
            class="flex items-center gap-4 text-xs text-gray-400 mt-2"
          >
            <div v-if="stats.stars !== null" class="flex items-center gap-1">
              <UIcon name="i-lucide-star" class="size-3" />
              <span>{{ stats.stars }}</span>
            </div>
            <div v-if="stats.lastRelease" class="flex items-center gap-1">
              <UIcon name="i-lucide-tag" class="size-3" />
              <span>{{ stats.lastRelease }}</span>
            </div>
          </div>

          <!-- Skeleton pendant chargement -->
          <div v-if="githubLoading" class="flex items-center gap-4 mt-2">
            <div class="h-3 w-12 bg-gray-800 rounded animate-pulse" />
            <div class="h-3 w-16 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <!-- Copyright -->
      <div class="mt-6 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
        <p>&copy; {{ new Date().getFullYear() }} Tumulte. Propulsé par Twitch.</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppVersion } from '~/composables/useAppVersion'
import { useServiceStatus } from '~/composables/useServiceStatus'
import { useGitHubStats } from '~/composables/useGitHubStats'

const { version } = useAppVersion()
const { status } = useServiceStatus()
const { stats, loading: githubLoading, error: githubError } = useGitHubStats()

const statusLabel = computed(() => {
  switch (status.value) {
    case 'operational':
      return 'Opérationnel'
    case 'degraded':
      return 'Dégradé'
    default:
      return 'Statut inconnu'
  }
})
</script>
