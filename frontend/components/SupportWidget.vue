<template>
  <!-- Alertes feedback (toujours en bas à droite) -->
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
  </div>

  <!-- Modal Support (pleine page sur mobile, card sur desktop) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="closeSupport"
        />

        <!-- Card -->
        <UCard
          class="relative w-full sm:w-lg sm:max-w-[95vw] max-h-dvh sm:max-h-[90vh] overflow-y-auto bg-elevated border border-default shadow-2xl rounded-t-2xl sm:rounded-2xl"
        >
          <div class="space-y-4">
            <header>
              <h2 class="text-xl font-semibold">Support & Feedback</h2>
              <p class="text-sm text-muted mt-1">
                Signalez un bug ou proposez une amélioration.
              </p>
            </header>

            <!-- Tabs -->
            <UTabs
              v-model="activeTab"
              :items="tabs"
              class="w-full"
              :ui="{
                trigger: 'data-[state=inactive]:bg-primary-100 data-[state=inactive]:text-primary-500',
              }"
            />

            <!-- Bug Tab Content -->
            <div v-if="activeTab === 'bug'" class="space-y-3">
              <div class="space-y-2">
                <label class="text-sm font-semibold text-secondary">
                  Titre du bug <span class="text-error-400">*</span>
                </label>
                <UInput
                  v-model="bugTitle"
                  placeholder="Ex: Impossible de lancer un sondage"
                  class="w-full"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-semibold text-secondary">
                  Description <span class="text-error-400">*</span>
                </label>
                <UTextarea
                  v-model="bugDescription"
                  :rows="4"
                  placeholder="Ce qui s'est passé, étapes pour reproduire..."
                  class="w-full"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                />
              </div>

              <div class="space-y-1">
                <UCheckbox
                  v-model="includeDiagnostics"
                  label="Joindre les données techniques (logs, session)"
                />
                <p class="text-xs text-muted pl-8">
                  Aide à diagnostiquer le problème plus rapidement.
                </p>
              </div>

              <div class="rounded-2xl border border-default bg-muted p-3 space-y-2">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-link" class="text-brand-500 size-4" />
                  <p class="text-sm font-medium">Session ID pour corrélation Sentry</p>
                </div>
                <code class="text-xs text-muted block truncate">{{ sessionId }}</code>
              </div>
            </div>

            <!-- Suggestion Tab Content -->
            <div v-if="activeTab === 'suggestion'" class="space-y-3">
              <div class="space-y-2">
                <label class="text-sm font-semibold text-secondary">
                  Titre de la suggestion <span class="text-error-400">*</span>
                </label>
                <UInput
                  v-model="suggestionTitle"
                  placeholder="Ex: Ajouter un mode sombre"
                  class="w-full"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-semibold text-secondary">
                  Description <span class="text-error-400">*</span>
                </label>
                <UTextarea
                  v-model="suggestionDescription"
                  :rows="4"
                  placeholder="Décris ton idée en détail..."
                  class="w-full"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                />
              </div>

              <div class="rounded-2xl border border-default bg-muted p-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-message-circle" class="text-brand-500 size-4" />
                  <p class="text-sm text-secondary">
                    Une discussion GitHub sera créée automatiquement.
                  </p>
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <span class="text-xs text-muted order-2 sm:order-1 text-center sm:text-left">
                Les tokens/mots de passe ne sont jamais inclus.
              </span>
              <div class="flex gap-2 order-1 sm:order-2">
                <UButton
                  color="neutral"
                  variant="ghost"
                  label="Annuler"
                  class="flex-1 sm:flex-none"
                  @click="closeSupport"
                  :disabled="isSending"
                />
                <UButton
                  color="primary"
                  :loading="isSending"
                  :disabled="!canSend"
                  :icon="activeTab === 'bug' ? 'i-lucide-bug' : 'i-lucide-lightbulb'"
                  :label="activeTab === 'bug' ? 'Signaler' : 'Proposer'"
                  class="flex-1 sm:flex-none"
                  @click="handleSend"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useSupportReporter } from "@/composables/useSupportReporter";
import { useSupportWidget } from "@/composables/useSupportWidget";
import { getSupportSnapshot } from "@/utils/supportTelemetry";

const authStore = useAuthStore();
const { sendBugReport, sendSuggestion } = useSupportReporter();
const { isSupportWidgetOpen: open, closeSupport } = useSupportWidget();
const router = useRouter();

// Tabs
const tabs = [
  { label: "Bug", value: "bug", icon: "i-lucide-bug" },
  { label: "Suggestion", value: "suggestion", icon: "i-lucide-lightbulb" },
];
const activeTab = ref<"bug" | "suggestion">("bug");

// Bug form
const bugTitle = ref("");
const bugDescription = ref("");
const includeDiagnostics = ref(true);

// Suggestion form
const suggestionTitle = ref("");
const suggestionDescription = ref("");

// State
const isSending = ref(false);
const feedback = ref<{ type: "success" | "error" | ""; message: string }>({
  type: "",
  message: "",
});

const sessionId = computed(() => getSupportSnapshot().sessionId || "n/a");

const canSend = computed(() => {
  if (isSending.value) return false;

  if (activeTab.value === "bug") {
    return (
      bugTitle.value.trim().length >= 5 &&
      bugDescription.value.trim().length >= 10
    );
  } else {
    return (
      suggestionTitle.value.trim().length >= 5 &&
      suggestionDescription.value.trim().length >= 10
    );
  }
});

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
    closeSupport();
  },
);

const handleSend = async () => {
  if (!canSend.value) return;

  isSending.value = true;
  feedback.value = { type: "", message: "" };

  try {
    if (activeTab.value === "bug") {
      const result = await sendBugReport(bugTitle.value, bugDescription.value, {
        includeDiagnostics: includeDiagnostics.value,
      });
      const message = result.githubIssueUrl
        ? "Bug signalé et issue GitHub créée !"
        : "Bug signalé sur Discord.";
      feedback.value = { type: "success", message };
      bugTitle.value = "";
      bugDescription.value = "";
    } else {
      const result = await sendSuggestion(
        suggestionTitle.value,
        suggestionDescription.value
      );
      const message = result.githubDiscussionUrl
        ? "Suggestion envoyée et discussion GitHub créée !"
        : "Suggestion envoyée sur Discord.";
      feedback.value = { type: "success", message };
      suggestionTitle.value = "";
      suggestionDescription.value = "";
    }
    closeSupport();
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
