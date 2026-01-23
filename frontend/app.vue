<template>
  <UApp>
    <UiLoadingScreen :is-visible="isLoading" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { isLoading, init } = useLoadingScreen()
init()
</script>
