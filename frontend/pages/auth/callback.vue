<template>
  <div
    class="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-950 via-purple-950/20 to-gray-950"
  >
    <div class="text-center">
      <div class="bg-primary-500/10 p-8 rounded-3xl mb-6 inline-block">
        <UIcon name="i-lucide-loader" class="size-16 text-primary-500 animate-spin" />
      </div>
      <h2 class="text-2xl font-bold text-white mb-2">Connexion en cours</h2>
      <p class="text-gray-400">
        Veuillez patienter pendant que nous vous connectons...
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const route = useRoute();
const _router = useRouter();
const { fetchMe } = useAuth();

onMounted(async () => {
  try {
    // Récupérer l'utilisateur connecté
    await fetchMe();

    // Récupérer la destination de redirection
    const redirect = (route.query.redirect as string) || "/";

    // Rediriger vers la page appropriée
    _router.push(redirect);
  } catch {
    // Si erreur, rediriger vers login
    _router.push("/login?error=session_failed");
  }
});
</script>
