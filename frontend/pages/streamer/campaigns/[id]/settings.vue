<script setup lang="ts">
import { ref, onMounted } from "vue";
import CharacterSelectionModal from "@/components/streamer/CharacterSelectionModal.vue";
import { useCampaignCharacters } from "@/composables/useCampaignCharacters";
import type { Character, CampaignSettings } from "@/types";

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

const router = useRouter();
const route = useRoute();
const toast = useToast();

const {
  characters,
  fetchCharacters,
  getCampaignSettings,
  updateCharacter,
} = useCampaignCharacters();

const campaignId = computed(() => route.params.id as string);

const settings = ref<CampaignSettings | null>(null);
const loading = ref(true);
const showCharacterModal = ref(false);
const updateLoading = ref(false);

onMounted(async () => {
  await loadSettings();
});

const loadSettings = async () => {
  loading.value = true;
  try {
    settings.value = await getCampaignSettings(campaignId.value);
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de charger les paramètres",
      color: "error",
    });
    // Rediriger vers la liste des campagnes en cas d'erreur
    router.push("/streamer/campaigns");
  } finally {
    loading.value = false;
  }
};

const handleChangeCharacter = async () => {
  if (!settings.value?.canChangeCharacter) return;

  try {
    await fetchCharacters(campaignId.value);
    showCharacterModal.value = true;
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de charger les personnages",
      color: "error",
    });
  }
};

const handleConfirmChange = async (characterId: string) => {
  updateLoading.value = true;
  try {
    await updateCharacter(campaignId.value, characterId);

    toast.add({
      title: "Personnage modifié",
      description: "Votre personnage a été mis à jour avec succès",
      color: "success",
    });

    showCharacterModal.value = false;
    await loadSettings();
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: error instanceof Error ? error.message : "Impossible de modifier le personnage",
      color: "error",
    });
  } finally {
    updateLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen">
    <div class="space-y-6">
      <!-- Header -->
      <UCard>
        <div class="flex items-center gap-4">
          <UButton
            color="neutral"
            variant="soft"
            size="xl"
            square
            class="group shrink-0"
            to="/streamer/campaigns"
          >
            <template #leading>
              <UIcon
                name="i-lucide-arrow-left"
                class="size-6 sm:size-12 transition-transform duration-200 group-hover:-translate-x-1"
              />
            </template>
          </UButton>
          <div>
            <h1 class="text-xl sm:text-3xl font-bold text-primary">
              Paramètres de campagne
            </h1>
            <p v-if="settings?.campaign" class="text-muted mt-1">
              {{ settings.campaign.name }}
            </p>
          </div>
        </div>
      </UCard>

      <!-- Loading State -->
      <UCard v-if="loading">
        <div class="flex items-center justify-center py-12">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-12 text-primary animate-spin-slow"
          />
        </div>
      </UCard>

      <!-- Settings Content -->
      <template v-else-if="settings">
        <!-- Section : Mon Personnage -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary-50 rounded-lg">
                <UIcon name="i-lucide-user-circle" class="size-5 text-primary-500" />
              </div>
              <h2 class="text-xl font-semibold text-primary">Mon personnage</h2>
            </div>
          </template>

          <!-- Personnage assigné -->
          <div v-if="settings.assignedCharacter" class="space-y-6">
            <div class="flex items-center gap-4 p-4 rounded-lg bg-primary-50">
              <!-- Avatar -->
              <div class="shrink-0">
                <img
                  v-if="settings.assignedCharacter.avatarUrl"
                  :src="settings.assignedCharacter.avatarUrl"
                  :alt="settings.assignedCharacter.name"
                  class="size-16 rounded-full object-cover"
                />
                <div
                  v-else
                  class="size-16 rounded-full bg-primary-100 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="size-8 text-primary-500" />
                </div>
              </div>

              <!-- Info -->
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-primary">
                  {{ settings.assignedCharacter.name }}
                </h3>
                <p class="text-sm text-muted">Personnage joueur</p>
              </div>
            </div>

            <!-- Bouton Changer -->
            <div>
              <UButton
                color="primary"
                variant="soft"
                icon="i-lucide-refresh-cw"
                label="Changer de personnage"
                :disabled="!settings.canChangeCharacter"
                @click="handleChangeCharacter"
              />

              <UAlert
                v-if="!settings.canChangeCharacter"
                color="warning"
                variant="soft"
                icon="i-lucide-alert-circle"
                class="mt-4"
                title="Changement impossible"
                description="Vous ne pouvez pas changer de personnage pendant qu'un sondage est actif."
              />
            </div>
          </div>

          <!-- Aucun personnage assigné -->
          <div v-else class="py-12 text-center space-y-6">
            <div>
              <div class="bg-neutral-100 p-4 rounded-2xl mb-4 inline-block">
                <UIcon name="i-lucide-user-x" class="size-12 text-neutral-400" />
              </div>
              <h3 class="text-xl font-semibold text-primary mb-2">
                Aucun personnage assigné
              </h3>
              <p class="text-muted max-w-md mx-auto">
                Vous devez choisir un personnage pour participer aux sondages de cette campagne.
              </p>
            </div>

            <UButton
              color="primary"
              icon="i-lucide-user-plus"
              label="Choisir un personnage"
              size="lg"
              @click="handleChangeCharacter"
            />
          </div>
        </UCard>
      </template>
    </div>

    <!-- Modal de sélection de personnage -->
    <CharacterSelectionModal
      v-model="showCharacterModal"
      :characters="characters"
      :current-character-id="settings?.assignedCharacter?.id"
      :loading="updateLoading"
      title="Changer de personnage"
      description="Sélectionnez le personnage que vous souhaitez jouer dans cette campagne."
      confirm-label="Confirmer le changement"
      @confirm="handleConfirmChange"
      @cancel="showCharacterModal = false"
    />
  </div>
</template>
