<template>
  <UApp>
    <UiLoadingScreen :is-visible="isLoading" @transition-end="onTransitionEnd" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
// Color mode is auto-detected from system preference (see nuxt.config.ts)
// LoadingScreen uses useColorMode() for reactive theme detection

const { isLoading, init, onTransitionEnd } = useLoadingScreen()
init()
</script>
