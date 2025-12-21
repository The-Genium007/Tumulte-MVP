<script setup lang="ts">
import TheWelcome from '../components/TheWelcome.vue'

definePageMeta({
  layout: "default" as const,
});
</script>

<template>
  <main>
    <TheWelcome />
  </main>
</template>
