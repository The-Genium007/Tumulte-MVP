<template>
  <div class="min-h-screen py-6">
    <div class="space-y-6">
      <!-- Header avec bouton retour -->
      <div class="space-y-4">
        <UButton
          variant="soft"
          color="neutral"
          icon="i-lucide-arrow-left"
          label="Retour au dashboard"
          @click="$router.push('/mj')"
        />
        <div>
          <h1 class="text-2xl font-bold text-white">Ajouter un sondage</h1>
          <p class="text-gray-400 mt-1">
            Session: {{ sessionName }}
          </p>
        </div>
      </div>

      <!-- Grille avec formulaire et liste -->
      <div class="grid grid-cols-10 gap-6">
        <!-- Formulaire d'ajout de sondage (60% - 6 colonnes) -->
        <UCard class="col-span-6">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-file-plus" class="size-6 text-primary-500" />
              <h2 class="text-xl font-semibold text-white">Créer un nouveau sondage</h2>
            </div>
          </template>
        <div class="space-y-6">
          <!-- Question -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Question</label>
            <div class="flex gap-2">
              <UInput
                v-model="newPoll.question"
                placeholder="Ex: Quelle direction prendre ?"
                size="lg"
                maxlength="45"
                class="flex-1"
              />
            </div>
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
            <div class="flex gap-2">
              <UInput
                v-model.number="newPoll.durationSeconds"
                type="number"
                placeholder="30 secondes"
                size="lg"
                min="10"
                max="300"
                class="w-40"
              />
            </div>
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

        <!-- Liste des sondages créés (40% - 4 colonnes) -->
        <UCard class="col-span-4">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-list-checks" class="size-6 text-primary-500" />
                <h2 class="text-lg font-semibold text-white">Sondages</h2>
                <UBadge color="primary" variant="soft">{{ pollsStore.polls.length }}</UBadge>
              </div>
            </div>
          </template>

          <!-- Empty state -->
          <div v-if="pollsStore.polls.length === 0" class="text-center py-12">
            <div class="bg-gray-800/50 p-4 rounded-2xl mb-4 inline-block">
              <UIcon name="i-lucide-inbox" class="size-12 text-gray-600" />
            </div>
            <p class="text-gray-400 text-sm">Aucun sondage créé</p>
            <p class="text-gray-500 text-xs mt-1">Les sondages apparaîtront ici</p>
          </div>

          <!-- Liste des sondages -->
          <div v-else class="space-y-3">
            <div
              v-for="(poll, index) in pollsStore.polls"
              :key="poll.id"
              class="p-3 rounded-lg bg-gray-800/30 border border-gray-700 hover:bg-gray-800/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary-500/10 text-primary-500 font-semibold text-xs shrink-0">
                  {{ index + 1 }}
                </div>
                <div class="flex-1 min-w-0 space-y-1.5">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-message-square" class="size-4 text-primary-500 shrink-0" />
                    <h3 class="font-semibold text-white text-sm truncate">{{ capitalizeFirst(poll.question) }}</h3>
                  </div>
                  <div class="flex items-center gap-2 ml-6">
                    <UBadge
                      :color="poll.type === 'UNIQUE' ? 'blue' : 'purple'"
                      variant="soft"
                      size="xs"
                    >
                      {{ poll.type === 'UNIQUE' ? 'Unique' : 'Multiple' }}
                    </UBadge>
                    <span v-if="poll.duration_seconds" class="flex items-center gap-1 text-xs text-gray-400">
                      <UIcon name="i-lucide-clock" class="size-3" />
                      {{ poll.duration_seconds }}s
                    </span>
                  </div>
                  <div class="ml-6">
                    <div class="flex items-center gap-2 mb-1">
                      <UIcon name="i-lucide-list" class="size-3 text-gray-500 shrink-0" />
                      <span class="text-xs font-medium text-gray-400">Réponses</span>
                    </div>
                    <ul class="space-y-0.5 ml-5">
                      <li v-for="(option, idx) in poll.options" :key="idx" class="text-xs text-gray-300">
                        • {{ capitalizeFirst(option) }}
                      </li>
                    </ul>
                  </div>
                </div>
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  size="xs"
                  square
                  @click="handleDeletePoll(poll.id)"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionPollsStore } from "@/stores/sessionPolls";

definePageMeta({
  layout: "authenticated" as const,
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const pollsStore = useSessionPollsStore();

const sessionId = computed(() => route.params.sessionId as string);
const campaignId = computed(() => route.query.campaignId as string);
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

const capitalizeFirst = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

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

const resetForm = () => {
  newPoll.value = {
    question: "",
    type: "UNIQUE",
    durationSeconds: null,
  };
  newPollOptions.value = ["", ""];
};

const handleAddPoll = async () => {
  if (!isFormValid.value) return;

  const validOptions = newPollOptions.value.filter((opt) => opt.trim().length > 0);

  try {
    await pollsStore.addPoll(campaignId.value, sessionId.value, {
      question: newPoll.value.question,
      options: validOptions,
      type: newPoll.value.type,
      duration_seconds: newPoll.value.durationSeconds,
    });

    toast.add({
      title: "Succès",
      description: "Le sondage a été ajouté à la session",
      color: "success",
    });

    // Réinitialiser le formulaire
    resetForm();
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: error instanceof Error ? error.message : "Impossible d'ajouter le sondage",
      color: "error",
    });
  }
};

const handleDeletePoll = async (pollId: string) => {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce sondage ?")) {
    return;
  }

  try {
    await pollsStore.deletePoll(campaignId.value, sessionId.value, pollId);

    toast.add({
      title: "Succès",
      description: "Le sondage a été supprimé",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer le sondage",
      color: "error",
    });
  }
};

// Charger les informations de la session et les sondages
onMounted(async () => {
  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(
      `${API_URL}/mj/campaigns/${campaignId.value}/poll-sessions/${sessionId.value}`,
      { credentials: "include" }
    );

    if (!response.ok) throw new Error("Failed to fetch session");
    const data = await response.json();
    sessionName.value = data.data.name;

    // Charger les sondages existants
    await pollsStore.fetchPolls(campaignId.value, sessionId.value);
  } catch (error) {
    console.error("Failed to load session:", error);
  }
});
</script>
