<template>
  <div
    class="min-h-screen flex items-center justify-center bg-page px-4"
  >
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center space-y-3">
          <div class="flex justify-center">
            <img src="~/assets/images/logo.png" alt="Tumulte" class="size-24" />
          </div>
          <h1 class="text-3xl font-bold text-primary">Tumulte</h1>
          <p class="text-sm text-muted">
            Système de Table-Top Twitch synchronisés
          </p>
        </div>
      </template>

      <div class="space-y-6">
        <p class="text-secondary text-center">
          Connectez-vous avec votre compte Twitch pour accéder a Tumulte.
        </p>

        <UButton
          block
          size="xl"
          color="neutral"
          variant="solid"
          icon="i-simple-icons-twitch"
          trailing-icon="i-lucide-arrow-right"
          class="bg-[#9146FF] hover:bg-[#7c3aed] text-white"
          @click="handleLogin"
        >
          Se connecter avec Twitch
        </UButton>

        <UAlert
          v-if="_error"
          color="error"
          variant="soft"
          :title="_error"
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

const _error = ref<string | null>(null);

// Vérifier si une erreur est présente dans l'URL
onMounted(() => {
  const errorParam = route.query.error as string;
  if (errorParam === "invalid_state") {
    _error.value = "Erreur de validation CSRF. Veuillez réessayer.";
  } else if (errorParam === "oauth_failed") {
    _error.value = "Échec de l'authentification OAuth. Veuillez réessayer.";
  } else if (errorParam === "session_failed") {
    _error.value = "Erreur de session. Veuillez vous reconnecter.";
  }
});

const handleLogin = () => {
  _error.value = null;
  loginWithTwitch();
};
</script>
