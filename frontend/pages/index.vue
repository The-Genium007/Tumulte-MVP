<script setup lang="ts">
import { useAuth } from "@/composables/useAuth";

definePageMeta({
  middleware: async () => {
    const { fetchMe } = useAuth();

    try {
      // Essayer de récupérer l'utilisateur connecté
      await fetchMe();

      // Tous les utilisateurs authentifiés vont vers /streamer
      return navigateTo("/streamer");
    } catch {
      // Si non authentifié, rediriger vers login
      return navigateTo("/login");
    }
  },
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-secondary">
    <UIcon
      name="i-game-icons-dice-twenty-faces-twenty"
      class="w-40 h-40 text-primary animate-spin-slow"
    />
  </div>
</template>
