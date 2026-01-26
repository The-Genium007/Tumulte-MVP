<template>
  <UApp>
    <UiLoadingScreen :is-visible="isLoading" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
// Color mode is auto-detected from system preference (see nuxt.config.ts)

const { isLoading, init } = useLoadingScreen()
init()
</script>
