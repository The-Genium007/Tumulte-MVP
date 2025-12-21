<template>
  <header class="sticky top-0 z-40 bg-gray-900 border-b border-gray-800 shadow-lg">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-7xl">
      <div class="flex items-center justify-between">
        <!-- Logo et titre -->
        <NuxtLink to="/" class="flex items-center gap-3 sm:gap-4 group">
          <div
            class="bg-primary-500/10 p-2 sm:p-3 rounded-xl group-hover:bg-primary-500/20 transition-colors"
          >
            <UIcon name="i-lucide-terminal" class="size-6 sm:size-8 text-primary-500" />
          </div>
          <div class="hidden sm:block">
            <h1 class="text-xl sm:text-2xl font-bold text-white">Tumulte</h1>
            <p class="text-xs sm:text-sm text-gray-400 hidden md:block">
              Gérez vos sondages Twitch multistream
            </p>
          </div>
        </NuxtLink>

        <!-- User Menu -->
        <UserMenu />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import UserMenu from '@/components/UserMenu.vue'
</script>
