<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900 py-6">
    <div class="space-y-6">
      <!-- Header avec bouton retour -->
      <div class="flex items-center gap-4">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-left"
          label="Retour au dashboard"
          @click="$router.push('/mj')"
        />
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-white">Ajouter un sondage</h1>
          <p class="text-gray-400 mt-1">
            Session: {{ sessionName }}
          </p>
        </div>
      </div>

      <!-- Formulaire d'ajout de sondage -->
      <UCard>
        <div class="space-y-6">
          <!-- Question -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Question</label>
            <UInput
              v-model="newPoll.question"
              placeholder="Ex: Quelle direction prendre ?"
              size="lg"
              maxlength="45"
            />
            <p class="text-xs text-gray-400 mt-1">
              {{ newPoll.question.length }}/45 caractères
            </p>
          </div>

          <!-- Type de sondage -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Type de sondage</label>
            <div class="flex gap-2">
              <UButton
                :color="newPoll.type === 'UNIQUE' ? 'primary' : 'neutral'"
                :variant="newPoll.type === 'UNIQUE' ? 'solid' : 'soft'"
                label="Vote unique"
                @click="handlePollTypeChange('UNIQUE')"
              />
              <UButton
                :color="newPoll.type === 'STANDARD' ? 'primary' : 'neutral'"
                :variant="newPoll.type === 'STANDARD' ? 'solid' : 'soft'"
                label="Vote multiple"
                @click="handlePollTypeChange('STANDARD')"
              />
            </div>
            <p class="text-xs text-gray-400 mt-2">
              <span v-if="newPoll.type === 'UNIQUE'">Vote unique : Les viewers ne peuvent voter qu'une seule fois</span>
              <span v-else>Vote multiple : Les viewers peuvent voter plusieurs fois</span>
            </p>
          </div>

          <!-- Réponses -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Réponses (2-5 max)</label>
            <div class="space-y-2">
              <div v-for="(option, idx) in newPollOptions" :key="idx" class="flex gap-2">
                <UInput v-model="newPollOptions[idx]" placeholder="Réponse" size="lg" class="flex-1" />
                <UButton
                  v-if="newPollOptions.length > 2"
                  color="error"
                  variant="soft"
                  icon="i-lucide-x"
                  square
                  @click="removeOption(idx)"
                />
              </div>
            </div>
            <UButton
              v-if="newPollOptions.length < 5"
              color="neutral"
              variant="soft"
              icon="i-lucide-plus"
              label="Ajouter une réponse"
              size="sm"
              class="mt-2"
              @click="addOption"
            />
          </div>

          <!-- Durée -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Durée (secondes) - Optionnel
            </label>
            <UInput
              v-model.number="newPoll.durationSeconds"
              type="number"
              placeholder="Laisser vide pour utiliser la durée par défaut de la session"
              size="lg"
              min="10"
              max="300"
            />
            <p class="text-xs text-gray-400 mt-1">
              Entre 10 et 300 secondes. Si vide, utilisera la durée par défaut de la session.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4 border-t border-gray-700">
            <UButton
              color="neutral"
              variant="soft"
              label="Annuler"
              class="flex-1"
              @click="$router.push('/mj')"
            />
            <UButton
              color="primary"
              icon="i-lucide-plus"
              label="Ajouter ce sondage"
              class="flex-1"
              :disabled="!isFormValid"
              @click="handleAddPoll"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

definePageMeta({
  layout: "authenticated" as const,
  breadcrumbs: computed(() => [
    { label: "Campagnes", to: "/mj/campaigns", icon: "i-lucide-folder-kanban" },
    { label: "Nouveau sondage", to: null, icon: "i-lucide-plus" }
  ])
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const sessionId = computed(() => route.params.sessionId as string);
const sessionName = ref<string>("");

const newPoll = ref({
  question: "",
  type: "UNIQUE" as "UNIQUE" | "STANDARD",
  durationSeconds: null as number | null,
});

const newPollOptions = ref<string[]>(["", ""]);

const isFormValid = computed(() => {
  const hasQuestion = newPoll.value.question.trim().length > 0;
  const hasValidOptions = newPollOptions.value.filter((opt) => opt.trim().length > 0).length >= 2;
  return hasQuestion && hasValidOptions;
});

const handlePollTypeChange = (type: "UNIQUE" | "STANDARD") => {
  newPoll.value.type = type;
};

const addOption = () => {
  if (newPollOptions.value.length < 5) {
    newPollOptions.value.push("");
  }
};

const removeOption = (index: number) => {
  if (newPollOptions.value.length > 2) {
    newPollOptions.value.splice(index, 1);
  }
};

const handleAddPoll = async () => {
  if (!isFormValid.value) return;

  const validOptions = newPollOptions.value.filter((opt) => opt.trim().length > 0);

  try {
    const API_URL = import.meta.env.VITE_API_URL;

    // Récupérer le campaignId depuis la session
    const sessionResponse = await fetch(
      `${API_URL}/mj/campaigns/${route.query.campaignId}/poll-sessions/${sessionId.value}`,
      { credentials: "include" }
    );

    if (!sessionResponse.ok) throw new Error("Failed to fetch session");
    const sessionData = await sessionResponse.json();

    // Ajouter le sondage
    const response = await fetch(
      `${API_URL}/mj/campaigns/${route.query.campaignId}/poll-sessions/${sessionId.value}/polls`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: newPoll.value.question,
          options: validOptions,
          type: newPoll.value.type,
          duration_seconds: newPoll.value.durationSeconds,
        }),
      }
    );

    if (!response.ok) throw new Error("Failed to add poll");

    toast.add({
      title: "Succès",
      description: "Le sondage a été ajouté à la session",
      color: "success",
    });

    // Retour au dashboard
    router.push("/mj");
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: error instanceof Error ? error.message : "Impossible d'ajouter le sondage",
      color: "error",
    });
  }
};

// Charger les informations de la session
onMounted(async () => {
  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(
      `${API_URL}/mj/campaigns/${route.query.campaignId}/poll-sessions/${sessionId.value}`,
      { credentials: "include" }
    );

    if (!response.ok) throw new Error("Failed to fetch session");
    const data = await response.json();
    sessionName.value = data.name;
  } catch (error) {
    console.error("Failed to load session:", error);
  }
});
</script>
