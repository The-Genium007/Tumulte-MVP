<template>
  <nav v-if="hasBreadcrumbs" class="flex items-center gap-2 text-sm mb-6">
    <!-- Icône Home -->
    <NuxtLink
      to="/"
      class="text-gray-400 hover:text-gray-300 transition-colors"
      aria-label="Accueil"
    >
      <UIcon name="i-lucide-home" class="size-4" />
    </NuxtLink>

    <!-- Breadcrumbs -->
    <template v-for="(crumb, index) in breadcrumbs" :key="index">
      <!-- Chevron séparateur -->
      <UIcon name="i-lucide-chevron-right" class="size-4 text-gray-600" />

      <!-- Breadcrumb intermédiaire (cliquable) -->
      <NuxtLink
        v-if="crumb.to"
        :to="crumb.to"
        class="text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1.5"
        :class="{ 'hidden sm:flex': index < breadcrumbs.length - 1 }"
      >
        <UIcon v-if="crumb.icon" :name="crumb.icon" class="size-4" />
        <span>{{ crumb.label }}</span>
      </NuxtLink>

      <!-- Breadcrumb actuel (non cliquable) -->
      <span
        v-else
        class="text-white flex items-center gap-1.5 font-medium"
      >
        <UIcon v-if="crumb.icon" :name="crumb.icon" class="size-4" />
        <span>{{ crumb.label }}</span>
      </span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { useBreadcrumbs } from '~/composables/useBreadcrumbs'

const { breadcrumbs, hasBreadcrumbs } = useBreadcrumbs()
</script>
