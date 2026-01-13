<script setup lang="ts">
import { usePollsStore } from "~/stores/polls";
import type { Poll } from "~/types";

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

const config = useRuntimeConfig();
const API_URL = config.public.apiBase;

const route = useRoute();
const router = useRouter();
const toast = useToast();
const pollsStore = usePollsStore();

const _campaignId = computed(() => route.params.id as string);
const pollId = computed(() => route.params.pollId as string);

// Loading state
const loading = ref(true);
const poll = ref<Poll | null>(null);

// Form state
const form = ref({
  question: "",
  durationSeconds: 60,
});

const options = ref<string[]>(["", ""]);
const isSubmitting = ref(false);
const useCustomDuration = ref(false);
const customDurationSeconds = ref(60);

// Validation
const isFormValid = computed(() => {
  const hasQuestion = form.value.question.trim().length > 0;
  const validOptions = options.value.filter((opt) => opt.trim().length > 0);
  const validDuration = form.value.durationSeconds >= 15 && form.value.durationSeconds <= 1800;
  return hasQuestion && validOptions.length >= 2 && validDuration;
});

const questionLength = computed(() => form.value.question.length);

// Duration presets
const durationPresets = [
  { label: "30s", value: 30 },
  { label: "1min", value: 60 },
  { label: "2min", value: 120 },
  { label: "3min", value: 180 },
  { label: "5min", value: 300 },
];

/**
 * Check if duration matches a preset
 */
const isPresetDuration = (duration: number): boolean => {
  return durationPresets.some((p) => p.value === duration);
};

const selectDuration = (value: number) => {
  useCustomDuration.value = false;
  form.value.durationSeconds = value;
};

const enableCustomDuration = () => {
  useCustomDuration.value = true;
  customDurationSeconds.value = form.value.durationSeconds;
};

// Watch custom duration changes
watch(customDurationSeconds, (val) => {
  if (useCustomDuration.value) {
    form.value.durationSeconds = Math.max(15, Math.min(1800, val));
  }
});

// Options management
const addOption = () => {
  if (options.value.length < 5) {
    options.value.push("");
  }
};

const removeOption = (index: number) => {
  if (options.value.length > 2) {
    options.value.splice(index, 1);
  }
};

// Navigation
const goBack = () => {
  router.push("/mj");
};

// Fetch poll data
const fetchPoll = async () => {
  loading.value = true;
  try {
    const response = await fetch(`${API_URL}/mj/polls/${pollId.value}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Poll not found");
    }

    const data = await response.json();
    poll.value = data.data;

    // Populate form
    form.value = {
      question: data.data.question,
      durationSeconds: data.data.durationSeconds,
    };
    options.value = [...data.data.options];

    // Check if duration is a preset or custom
    if (!isPresetDuration(data.data.durationSeconds)) {
      useCustomDuration.value = true;
      customDurationSeconds.value = data.data.durationSeconds;
    }
  } catch (err) {
    console.error("Failed to fetch poll:", err);
    toast.add({
      title: "Erreur",
      description: "Impossible de charger le sondage",
      color: "error",
    });
    router.push("/mj");
  } finally {
    loading.value = false;
  }
};

// Submit
const handleSubmit = async () => {
  if (!isFormValid.value || isSubmitting.value) return;

  isSubmitting.value = true;

  const validOptions = options.value
    .filter((opt) => opt.trim().length > 0)
    .map((opt) => opt.trim());

  try {
    await pollsStore.updatePoll(pollId.value, {
      question: form.value.question.trim(),
      options: validOptions,
      type: "UNIQUE",
      durationSeconds: form.value.durationSeconds,
    });

    toast.add({
      title: "Sondage modifié",
      description: "Les modifications ont été enregistrées.",
      color: "success",
    });

    router.push("/mj");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    toast.add({
      title: "Erreur",
      description: message,
      color: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Fetch on mount
onMounted(() => {
  fetchPoll();
});
</script>

<template>
  <div class="min-h-screen">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <UCard class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <UButton
              color="neutral"
              variant="soft"
              size="xl"
              square
              class="group"
              @click="goBack"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-12 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
            <div>
              <h1 class="text-3xl font-bold text-primary">Modifier le sondage</h1>
              <p class="text-muted">
                Modifiez les paramètres de votre sondage
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Loading -->
      <UCard v-if="loading">
        <div class="flex flex-col items-center justify-center py-12">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-8 text-primary animate-spin-slow mb-3"
          />
          <p class="text-muted text-sm">Chargement...</p>
        </div>
      </UCard>

      <!-- Form -->
      <UCard v-else>
        <form class="space-y-8" @submit.prevent="handleSubmit">
          <!-- Question -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-secondary uppercase">
              Question
            </label>
            <UInput
              v-model="form.question"
              placeholder="Ex: Quelle direction prendre ?"
              size="xl"
              maxlength="45"
              :ui="{
                root: 'ring-0 border-0 rounded-lg overflow-hidden',
                base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
              }"
            />
            <p class="text-xs text-muted">{{ questionLength }}/45 caractères</p>
          </div>

          <!-- Options -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-secondary uppercase">
              Réponses (2-5 max)
            </label>
            <div class="space-y-3">
              <div
                v-for="(_, idx) in options"
                :key="idx"
                class="flex items-center gap-3"
              >
                <span
                  class="flex items-center justify-center size-10 rounded-full bg-neutral-100 text-sm font-medium text-muted shrink-0"
                >
                  {{ idx + 1 }}
                </span>
                <UInput
                  v-model="options[idx]"
                  :placeholder="`Réponse ${idx + 1}`"
                  size="xl"
                  maxlength="25"
                  class="flex-1"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                />
                <UButton
                  v-if="options.length > 2"
                  color="error"
                  variant="soft"
                  icon="i-lucide-x"
                  size="md"
                  square
                  @click="removeOption(idx)"
                />
              </div>
            </div>
            <UButton
              v-if="options.length < 5"
              color="neutral"
              variant="soft"
              icon="i-lucide-plus"
              label="Ajouter une réponse"
              size="md"
              class="mt-3"
              @click="addOption"
            />
          </div>

          <!-- Duration -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-secondary uppercase">
              Durée
            </label>
            <div class="flex flex-wrap items-center gap-3">
              <!-- Presets - 2 par ligne sur mobile, 5 sur desktop -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  v-for="preset in durationPresets"
                  :key="preset.value"
                  type="button"
                  class="px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
                  :class="
                    !useCustomDuration && form.durationSeconds === preset.value
                      ? 'bg-primary text-white'
                      : 'bg-neutral-100 text-secondary hover:bg-neutral-200'
                  "
                  @click="selectDuration(preset.value)"
                >
                  {{ preset.label }}
                </button>
              </div>

              <!-- Custom toggle -->
              <div class="w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  type="button"
                  class="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
                  :class="
                    useCustomDuration
                      ? 'bg-primary text-white'
                      : 'bg-neutral-100 text-secondary hover:bg-neutral-200'
                  "
                  @click="enableCustomDuration"
                >
                  Personnalisé
                </button>
              </div>

              <!-- Custom input -->
              <div v-if="useCustomDuration" class="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <UInput
                  v-model.number="customDurationSeconds"
                  type="number"
                  :min="15"
                  :max="1800"
                  size="md"
                  class="w-24 flex-1 sm:flex-none"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                />
                <span class="text-muted text-sm sm:text-base">secondes</span>
              </div>
            </div>
            <p class="text-xs text-muted">
              Entre 15 secondes et 30 minutes (1800 secondes)
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end pt-6">
            <UButton
              type="submit"
              color="primary"
              icon="i-lucide-save"
              size="lg"
              :loading="isSubmitting"
              :disabled="!isFormValid || isSubmitting"
              class="w-full sm:w-auto"
            >
              <span class="hidden sm:inline">Enregistrer les modifications</span>
              <span class="sm:hidden">Enregistrer</span>
            </UButton>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>
