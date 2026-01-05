<template>
  <div class="min-h-screen py-6">
    <!-- Contenu à venir -->
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth", "streamer-only"],
});
</script>
