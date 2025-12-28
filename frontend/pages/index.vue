<template>
  <div
    class="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-950 via-purple-950/20 to-gray-950"
  >
    <div class="text-center">
      <div class="bg-primary-500/10 p-8 rounded-3xl mb-6 inline-block">
        <UIcon name="i-lucide-loader" class="size-16 text-primary-500 animate-spin" />
      </div>
      <h2 class="text-2xl font-bold text-white mb-2">Redirection en cours</h2>
      <p class="text-gray-400">Veuillez patienter...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const _router = useRouter();
const { fetchMe, isMJ, isStreamer } = useAuth();

onMounted(async () => {
  try {
    // Essayer de récupérer l'utilisateur connecté
    await fetchMe();

    // Rediriger selon le rôle
    if (isMJ.value) {
      _router.push({ name: "mj-index" });
    } else if (isStreamer.value) {
      _router.push({ name: "streamer-index" });
    } else {
      _router.push({ name: "login" });
    }
  } catch {
    // Si non authentifié, rediriger vers login
    _router.push({ name: "login" });
  }
});
</script>
