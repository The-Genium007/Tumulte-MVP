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
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">Ajouter un sondage</h1>
            <p class="text-gray-400 mt-1">
              Session: {{ sessionName }}
            </p>
          </div>
          <UButton
            variant="soft"
            color="error"
            icon="i-lucide-trash-2"
            label="Supprimer"
            @click="() => { console.log('Bouton cliqué'); showDeleteModal = true; }"
          />
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

          <!-- Points de chaîne (seulement pour vote multiple) -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div v-if="newPoll.type === 'STANDARD'" class="p-4 rounded-lg bg-primary-500/10 border border-primary-500/30 space-y-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-coins" class="size-5 text-primary-400" />
                <h3 class="text-sm font-semibold text-primary-300">Points de chaîne pour votes multiples</h3>
              </div>

              <div class="flex items-center gap-3">
                <UToggle v-model="newPoll.channelPointsEnabled" />
                <label class="text-sm text-gray-300">
                  Activer les points de chaîne
                </label>
              </div>

              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div v-if="newPoll.channelPointsEnabled" class="space-y-2">
                  <label class="block text-xs font-medium text-gray-400">
                    Coût en points de chaîne par vote supplémentaire
                  </label>
                  <div class="flex items-center gap-2">
                    <UInput
                      v-model.number="newPoll.channelPointsAmount"
                      type="number"
                      placeholder="50"
                      min="1"
                      max="1000000"
                      size="lg"
                      class="flex-1"
                    >
                      <template #trailing>
                        <span class="text-xs text-gray-400">points</span>
                      </template>
                    </UInput>
                  </div>
                  <p class="text-xs text-gray-400">
                    Le premier vote est gratuit, les suivants coûtent {{ newPoll.channelPointsAmount || 50 }} points
                  </p>
                </div>
              </Transition>

              <div class="bg-gray-800/50 p-3 rounded border border-gray-700">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-info" class="size-4 text-blue-400 mt-0.5 shrink-0" />
                  <p class="text-xs text-gray-400">
                    <span class="font-semibold text-blue-400">Note :</span>
                    Les points de chaîne fonctionnent uniquement pour les streamers affiliés/partenaires.
                    Pour les streamers non-affiliés (vote par chat IRC), cette option sera ignorée.
                  </p>
                </div>
              </div>
            </div>
          </Transition>

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
                      :color="poll.type === 'UNIQUE' ? 'info' : 'primary'"
                      variant="soft"
                      size="xs"
                    >
                      {{ poll.type === 'UNIQUE' ? 'Unique' : 'Multiple' }}
                    </UBadge>
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

    <!-- Modale de confirmation de suppression de session -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          @click.self="showDeleteModal = false"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <UCard v-if="showDeleteModal" class="max-w-lg mx-4">
              <template #header>
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-error-500/10">
                    <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-white">Supprimer la session</h3>
                    <p class="text-sm text-gray-400 mt-0.5">Cette action est irréversible</p>
                  </div>
                </div>
              </template>

              <div class="space-y-4">
                <div class="p-4 rounded-lg bg-error-500/10 border border-error-500/30">
                  <p class="text-sm text-gray-300">
                    Vous êtes sur le point de supprimer la session
                    <span class="font-semibold text-white">{{ sessionName }}</span>.
                  </p>
                  <p class="text-sm text-gray-400 mt-2">
                    Cette action supprimera définitivement :
                  </p>
                  <ul class="list-disc list-inside text-sm text-gray-400 mt-2 space-y-1 ml-2">
                    <li>La session et tous ses paramètres</li>
                    <li>Les {{ pollsStore.polls.length }} sondage(s) associé(s)</li>
                    <li>Toutes les données liées à cette session</li>
                  </ul>
                </div>

                <div class="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div class="flex items-start gap-2">
                    <UIcon name="i-lucide-info" class="size-4 text-blue-400 mt-0.5 shrink-0" />
                    <p class="text-xs text-gray-400">
                      Les sondages déjà lancés ne seront pas affectés, seule la session sera supprimée.
                    </p>
                  </div>
                </div>
              </div>

              <template #footer>
                <div class="flex items-center justify-end gap-3">
                  <UButton
                    variant="soft"
                    color="neutral"
                    label="Annuler"
                    @click="showDeleteModal = false"
                  />
                  <UButton
                    color="error"
                    icon="i-lucide-trash-2"
                    label="Supprimer définitivement"
                    :loading="isDeleting"
                    @click="handleDeleteSession"
                  />
                </div>
              </template>
            </UCard>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionPollsStore } from "@/stores/sessionPolls";

definePageMeta({
  layout: "authenticated" as const,
});

const config = useRuntimeConfig();
const API_URL = config.public.apiBase;

const route = useRoute();
const router = useRouter();
const toast = useToast();
const pollsStore = useSessionPollsStore();

const sessionId = computed(() => route.params.sessionId as string);
const campaignId = computed(() => route.query.campaignId as string);
const sessionName = ref<string>("");
const showDeleteModal = ref(false);
const isDeleting = ref(false);

const newPoll = ref({
  question: "",
  type: "UNIQUE" as "UNIQUE" | "STANDARD",
  channelPointsEnabled: false,
  channelPointsAmount: 50,
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
    channelPointsEnabled: false,
    channelPointsAmount: 50,
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
      channelPointsEnabled: newPoll.value.channelPointsEnabled,
      channelPointsAmount: newPoll.value.channelPointsAmount || 50,
    });

    toast.add({
      title: "Succès",
      description: "Le sondage a été ajouté à la session",
      color: "success",
    });

    // Réinitialiser le formulaire
    resetForm();
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible d'ajouter le sondage",
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
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer le sondage",
      color: "error",
    });
  }
};

const handleDeleteSession = async () => {
  isDeleting.value = true;

  try {
    const response = await fetch(
      `${API_URL}/mj/campaigns/${campaignId.value}/sessions/${sessionId.value}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete session");
    }

    toast.add({
      title: "Succès",
      description: "La session a été supprimée avec succès",
      color: "success",
    });

    showDeleteModal.value = false;

    // Rediriger vers le dashboard MJ
    router.push("/mj");
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer la session",
      color: "error",
    });
  } finally {
    isDeleting.value = false;
  }
};

// Charger les informations de la session et les sondages
onMounted(async () => {
  try {
    const response = await fetch(
      `${API_URL}/mj/sessions/${sessionId.value}`,
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
