<template>
  <div class="min-h-screen flex items-center justify-center bg-secondary">
    <UIcon
      name="i-game-icons-dice-twenty-faces-twenty"
      class="w-40 h-40 text-primary animate-spin-slow"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const _router = useRouter();
const { fetchMe } = useAuth();

onMounted(async () => {
  try {
    // Essayer de récupérer l'utilisateur connecté
    await fetchMe();

    // Tous les utilisateurs authentifiés vont vers /streamer
    _router.push({ name: "streamer-index" });
  } catch {
    // Si non authentifié, rediriger vers login
    _router.push({ name: "login" });
  }
});
</script>
