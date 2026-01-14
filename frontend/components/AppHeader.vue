<template>
  <header class="bg-white rounded-[2rem]">
    <div class="p-6">
      <div class="flex items-center justify-between">
        <!-- Logo et titre -->
        <div class="flex items-center gap-3 sm:gap-4">
          <img
            src="~/assets/images/logo.png"
            alt="Tumulte"
            class="size-10 sm:size-12"
          />
          <h1 class="text-lg sm:text-2xl font-bold text-primary">Tumulte</h1>
        </div>

        <!-- User Menu -->
        <UserMenu />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import UserMenu from '@/components/UserMenu.vue'
</script>
