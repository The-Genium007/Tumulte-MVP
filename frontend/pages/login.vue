<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950"
  >
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center space-y-3">
          <div class="flex justify-center">
            <div class="bg-primary-500/10 p-4 rounded-2xl">
              <UIcon name="i-lucide-chart-bar" class="size-12 text-primary-500" />
            </div>
          </div>
          <h1 class="text-3xl font-bold text-white">Sondage Multi-Stream</h1>
          <p class="text-sm text-gray-400">
            Système de sondages Twitch synchronisés
          </p>
        </div>
      </template>

      <div class="space-y-6">
        <p class="text-gray-300 text-center">
          Connectez-vous avec votre compte Twitch pour accéder au système de
          sondages multi-streams.
        </p>

        <UButton
          block
          size="xl"
          color="primary"
          icon="i-simple-icons-twitch"
          trailing-icon="i-lucide-arrow-right"
          @click="handleLogin"
        >
          Se connecter avec Twitch
        </UButton>

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          icon="i-lucide-alert-circle"
        />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "@/composables/useAuth";

definePageMeta({
  layout: "default" as const,
});

const route = useRoute();
const { loginWithTwitch } = useAuth();

const error = ref<string | null>(null);

// Vérifier si une erreur est présente dans l'URL
onMounted(() => {
  const errorParam = route.query.error as string;
  if (errorParam === "invalid_state") {
    error.value = "Erreur de validation CSRF. Veuillez réessayer.";
  } else if (errorParam === "oauth_failed") {
    error.value = "Échec de l'authentification OAuth. Veuillez réessayer.";
  } else if (errorParam === "session_failed") {
    error.value = "Erreur de session. Veuillez vous reconnecter.";
  }
});

const handleLogin = () => {
  error.value = null;
  loginWithTwitch();
};
</script>
