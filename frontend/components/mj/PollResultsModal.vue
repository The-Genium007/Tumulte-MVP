<script setup lang="ts">
import type { PollInstance, PollResults } from "~/types/api";

const props = defineProps<{
  poll: PollInstance | null;
}>();

const isOpen = defineModel<boolean>({ required: true });

const config = useRuntimeConfig();
const API_URL = config.public.apiBase;

const loading = ref(false);
const results = ref<PollResults | null>(null);
const error = ref<string | null>(null);

/**
 * Charge les résultats détaillés du sondage
 */
const fetchResults = async () => {
  if (!props.poll?.id) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(`${API_URL}/mj/polls/${props.poll.id}/results`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch results");

    const data = await response.json();
    results.value = data.data;
  } catch (err) {
    console.error("Failed to fetch poll results:", err);
    error.value = "Impossible de charger les résultats";
  } finally {
    loading.value = false;
  }
};

/**
 * Calcule le pourcentage de votes pour une option
 */
const getPercentage = (optionName: string): number => {
  if (!results.value?.percentages) return 0;
  return results.value.percentages[optionName] || 0;
};

/**
 * Récupère le nombre de votes pour une option
 */
const getVotes = (optionName: string): number => {
  if (!results.value?.votesByOption) return 0;
  return results.value.votesByOption[optionName] || 0;
};

/**
 * Détermine l'option gagnante
 */
const winningOption = computed(() => {
  if (!results.value?.votesByOption) return null;

  const votes = results.value.votesByOption;
  let maxVotes = 0;
  let winner: string | null = null;

  for (const [option, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      winner = option;
    }
  }

  return winner;
});

/**
 * Vérifie si une option est la gagnante
 */
const isWinner = (optionName: string): boolean => {
  return optionName === winningOption.value;
};

/**
 * Formate une date
 */
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Charger les résultats quand la modale s'ouvre
watch(isOpen, (open) => {
  if (open && props.poll) {
    fetchResults();
  } else {
    results.value = null;
    error.value = null;
  }
});
</script>

<template>
  <UModal v-model:open="isOpen" class="w-full max-w-2xl mx-4">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center shrink-0"
        >
          <UIcon name="i-lucide-bar-chart-2" class="size-5 text-success-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-lg font-semibold text-primary truncate">
            Résultats du sondage
          </h3>
          <p class="text-sm text-muted truncate">{{ poll?.title }}</p>
        </div>
      </div>
    </template>

    <template #body>
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon
          name="i-game-icons-dice-twenty-faces-twenty"
          class="size-10 text-primary animate-spin-slow"
        />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-12">
        <UIcon name="i-lucide-alert-circle" class="size-12 text-error-500 mb-3" />
        <p class="text-error-600">{{ error }}</p>
        <UButton
          color="primary"
          variant="soft"
          label="Réessayer"
          class="mt-4"
          @click="fetchResults"
        />
      </div>

      <!-- Results -->
      <div v-else-if="results && poll" class="space-y-6">
        <!-- Infos générales -->
        <div class="flex flex-wrap gap-4 text-sm">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-calendar" class="size-4" />
            <span>{{ formatDate(poll.endedAt) }}</span>
          </div>
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-users" class="size-4" />
            <span>{{ results.totalVotes || 0 }} vote(s)</span>
          </div>
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-timer" class="size-4" />
            <span>{{ poll.durationSeconds }}s</span>
          </div>
        </div>

        <!-- Résultats par option -->
        <div class="space-y-3">
          <div
            v-for="option in poll.options"
            :key="option"
            class="p-4 rounded-lg transition-colors"
            :class="
              isWinner(option)
                ? 'bg-success-light border border-success-200'
                : 'bg-neutral-50'
            "
          >
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-2">
                <UIcon
                  v-if="isWinner(option)"
                  name="i-lucide-trophy"
                  class="size-4 text-success-600"
                />
                <span
                  class="font-medium"
                  :class="isWinner(option) ? 'text-success-700' : 'text-primary'"
                >
                  {{ option }}
                </span>
              </div>
              <div class="text-right">
                <span class="font-bold text-primary">
                  {{ getVotes(option) }}
                </span>
                <span class="text-muted text-sm ml-1">
                  ({{ Math.round(getPercentage(option)) }}%)
                </span>
              </div>
            </div>

            <!-- Barre de progression -->
            <div class="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
              <div
                class="h-2 rounded-full transition-all duration-500"
                :class="isWinner(option) ? 'bg-success-500' : 'bg-brand-500'"
                :style="{ width: `${getPercentage(option)}%` }"
              />
            </div>
          </div>
        </div>

        <!-- Résultats par chaîne (si plusieurs) -->
        <div
          v-if="results.channels && results.channels.length > 1"
          class="pt-4 border-t border-neutral-200"
        >
          <h4 class="text-sm font-medium text-muted mb-3">Par chaîne</h4>
          <div class="space-y-2">
            <div
              v-for="channel in results.channels"
              :key="channel.streamerId"
              class="flex items-center justify-between text-sm p-2 bg-neutral-50 rounded"
            >
              <span class="font-medium text-primary">{{
                channel.streamerName
              }}</span>
              <span class="text-muted">{{ channel.totalVotes }} vote(s)</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          color="primary"
          variant="solid"
          label="Fermer"
          class="w-full sm:w-auto"
          @click="isOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>
