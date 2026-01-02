<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
    <UAlert
      v-if="feedback.type === 'success'"
      icon="i-lucide-check-circle-2"
      color="success"
      variant="soft"
      :description="feedback.message"
      class="max-w-sm shadow-xl"
      @close="feedback = { type: '', message: '' }"
      closable
    />

    <UAlert
      v-if="feedback.type === 'error'"
      icon="i-lucide-alert-triangle"
      color="error"
      variant="soft"
      :description="feedback.message"
      class="max-w-sm shadow-xl"
      @close="feedback = { type: '', message: '' }"
      closable
    />

    <UCard
      v-if="open"
      class="w-210 max-w-[95vw] bg-gray-950 border border-gray-800 text-white shadow-2xl"
    >
      <div class="space-y-4">
        <header class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-400">Support Discord</p>
            <h2 class="text-xl font-semibold">{{ modalTitle }}</h2>
            <p class="text-sm text-gray-400 mt-1">
              {{ modalDescription }}
            </p>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            @click="open = false"
            aria-label="Fermer"
            square
          />
        </header>

        <div class="space-y-3">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-200">
              Décris le problème <span class="text-error-400">*</span>
            </label>
            <UTextarea
              v-model="description"
              :rows="8"
              placeholder="Ce qui s'est passé, étapes pour reproduire..."
              class="w-full"
            />
          </div>

          <div class="space-y-1">
            <UCheckbox
              v-model="includeDiagnostics"
              label="Joindre automatiquement les logs et métadonnées"
            />
            <p class="text-xs text-gray-500 pl-8">
              Logs front, erreurs JS, snapshot de store, contexte navigateur, compte connecté et traces côté backend.
            </p>
          </div>

          <div class="rounded-2xl border border-gray-800/80 bg-gray-900/80 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-list" class="text-primary-400 size-5" />
              <p class="text-sm font-semibold">Ce qui sera envoyé</p>
            </div>
            <ul class="space-y-2 text-sm text-gray-300">
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-dot" class="text-primary-400 mt-1" />
                <span>Métadonnées navigateur (URL, UA, locale, viewport, timezone) + session {{ sessionId }}</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-dot" class="text-primary-400 mt-1" />
                <span>Contexte utilisateur (id, rôle, email, streamer éventuel) + compte connecté : {{ userLabel }}</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-dot" class="text-primary-400 mt-1" />
                <span>Snapshot store (auth + contrôles de sondage) et performances récentes</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-dot" class="text-primary-400 mt-1" />
                <span>Derniers logs console et erreurs JS tamponnés (50/20 max)</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-dot" class="text-primary-400 mt-1" />
                <span>Contexte backend (IP, méthode, env, campagnes/membres liés à ton compte)</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">
            Les tokens/mots de passe ne sont jamais inclus. Vérifie le message avant envoi.
          </span>
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Annuler"
              @click="open = false"
              :disabled="isSending"
            />
            <UButton
              color="primary"
              :loading="isSending"
              :disabled="!canSend"
              icon="i-lucide-send"
              label="Envoyer"
              @click="handleSend"
            />
          </div>
        </div>
      </div>
    </UCard>

    <UButton
      v-if="!open"
      color="primary"
      variant="solid"
      icon="i-lucide-life-buoy"
      class="shadow-lg"
      @click="open = true"
      label="Support"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useSupportReporter } from "@/composables/useSupportReporter";
import { useSupportWidget } from "@/composables/useSupportWidget";
import { getSupportSnapshot } from "@/utils/supportTelemetry";

const authStore = useAuthStore();
const { sendSupportReport } = useSupportReporter();
const { isSupportWidgetOpen: open } = useSupportWidget();
const router = useRouter();
const description = ref("");
const includeDiagnostics = ref(true);
const isSending = ref(false);
const feedback = ref<{ type: "success" | "error" | ""; message: string }>({
  type: "",
  message: "",
});
const modalTitle = "Déclarer un bug";
const modalDescription = "Envoi automatique vers le salon des tickets via webhook.";

const sessionId = computed(() => getSupportSnapshot().sessionId || "n/a");
const userLabel = computed(() => {
  if (authStore.user?.displayName) return authStore.user.displayName;
  if (authStore.user?.streamer?.twitchDisplayName) {
    return authStore.user.streamer.twitchDisplayName;
  }
  return "Inconnu";
});

const canSend = computed(() => description.value.trim().length > 5 && !isSending.value);

onMounted(async () => {
  if (!authStore.user) {
    try {
      await authStore.fetchMe();
    } catch {
      // ignore, l'appel renverra 401 si non connecté
    }
  }
});

watch(
  () => router.currentRoute.value.fullPath,
  () => {
    // Refermer si on change de page
    open.value = false;
  },
);

const handleSend = async () => {
  if (!canSend.value) return;

  isSending.value = true;
  feedback.value = { type: "", message: "" };

  try {
    await sendSupportReport(description.value, { includeDiagnostics: includeDiagnostics.value });
    feedback.value = { type: "success", message: "Ticket envoyé sur Discord." };
    description.value = "";
    open.value = false;
  } catch (error: unknown) {
    feedback.value = {
      type: "error",
      message: (error as Error)?.message || "Envoi impossible pour le moment.",
    };
  } finally {
    isSending.value = false;
  }
};
</script>
