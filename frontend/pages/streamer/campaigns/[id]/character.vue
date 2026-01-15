<template>
  <div class="min-h-screen">
    <div class="max-w-300 mx-auto space-y-6">
      <!-- Header -->
      <UCard>
        <div class="flex items-center gap-4">
          <div>
            <!-- Bouton retour -->
            <UButton
              color="neutral"
              variant="soft"
              size="xl"
              square
              class="group"
              @click="_router.push('/streamer/campaigns')"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-12 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-primary">Mon personnage</h1>
            <p class="text-muted mt-1">
              Choisissez votre personnage pour cette campagne
            </p>
          </div>
        </div>
      </UCard>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin text-primary"
        />
      </div>

      <template v-else>
        <!-- Current Assignment Card -->
        <UCard v-if="currentAssignment">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-primary">
                Personnage actuel
              </h2>
              <UButton
                color="error"
                variant="soft"
                label="Retirer l'assignation"
                icon="i-lucide-x"
                :loading="unassigning"
                @click="handleUnassign"
              />
            </div>
          </template>

          <div class="flex items-center gap-4">
            <!-- Avatar -->
            <div
              class="flex items-center justify-center size-20 rounded-full bg-primary-100"
            >
              <img
                v-if="currentAssignment.character?.avatarUrl"
                :src="currentAssignment.character.avatarUrl"
                :alt="currentAssignment.character.name"
                class="size-20 rounded-full object-cover"
              />
              <UIcon
                v-else
                name="i-lucide-user"
                class="size-10 text-primary-500"
              />
            </div>

            <!-- Character Info -->
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-primary">
                {{ currentAssignment.character?.name }}
              </h3>
              <p class="text-sm text-muted mt-1">
                Assigné le
                {{ new Date(currentAssignment.assignedAt).toLocaleDateString() }}
              </p>
            </div>
          </div>

          <UAlert
            color="success"
            variant="soft"
            title="Personnage actif"
            description="Les lancés de dés de ce personnage seront affichés sur votre overlay Twitch."
            icon="i-lucide-check-circle"
            class="mt-6"
          />
        </UCard>

        <!-- Characters List -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-primary">
              Personnages disponibles ({{ characters.length }})
            </h2>
          </template>

          <!-- Empty State -->
          <div v-if="characters.length === 0" class="text-center py-12">
            <UIcon
              name="i-lucide-users"
              class="size-16 text-muted mx-auto mb-4"
            />
            <h3 class="text-xl font-semibold text-primary mb-2">
              Aucun personnage disponible
            </h3>
            <p class="text-muted mb-6">
              Le MJ n'a pas encore créé de personnages pour cette campagne
            </p>
          </div>

          <!-- Characters Grid -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="character in characters"
              :key="character.id"
              class="relative p-4 rounded-lg border-2 transition-all cursor-pointer"
              :class="
                isAssigned(character.id)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              "
              @click="handleAssign(character.id)"
            >
              <!-- Assigned Badge -->
              <div
                v-if="isAssigned(character.id)"
                class="absolute top-2 right-2"
              >
                <UBadge color="success" size="xs">Actuel</UBadge>
              </div>

              <div class="flex items-center gap-4">
                <!-- Avatar -->
                <div
                  class="flex items-center justify-center size-16 rounded-full bg-primary-100 shrink-0"
                >
                  <img
                    v-if="character.avatarUrl"
                    :src="character.avatarUrl"
                    :alt="character.name"
                    class="size-16 rounded-full object-cover"
                  />
                  <UIcon
                    v-else
                    name="i-lucide-user"
                    class="size-8 text-primary-500"
                  />
                </div>

                <!-- Character Info -->
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-semibold text-primary truncate">
                    {{ character.name }}
                  </h3>
                  <p class="text-xs text-muted mt-1">
                    {{ character.vttCharacterId }}
                  </p>
                </div>
              </div>

              <!-- Select Button -->
              <UButton
                v-if="!isAssigned(character.id)"
                color="primary"
                variant="soft"
                label="Sélectionner"
                size="sm"
                class="w-full mt-4"
                :loading="assigning === character.id"
                @click.stop="handleAssign(character.id)"
              />
            </div>
          </div>
        </UCard>

        <!-- Info Alert -->
        <UAlert
          color="primary"
          variant="soft"
          title="Comment ça marche ?"
          icon="i-lucide-info"
        >
          <template #description>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li>
                Sélectionnez le personnage que vous incarnez dans cette
                campagne
              </li>
              <li>
                Les lancés de dés de ce personnage seront affichés sur votre
                overlay
              </li>
              <li>Vous pouvez changer de personnage à tout moment</li>
              <li>
                Les lancés critiques sont affichés sur tous les streams de la
                campagne
              </li>
            </ul>
          </template>
        </UAlert>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useCharacters } from "@/composables/useCharacters";
import { useToast } from "#ui/composables/useToast";

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

const _router = useRouter();
const route = useRoute();
const {
  characters,
  currentAssignment,
  loading,
  fetchCampaignCharacters,
  assignCharacter,
  unassignCharacter,
} = useCharacters();
const toast = useToast();

const assigning = ref<string | null>(null);
const unassigning = ref(false);

const campaignId = computed(() => route.params.id as string);

const isAssigned = (characterId: string): boolean => {
  return currentAssignment.value?.characterId === characterId;
};

onMounted(async () => {
  try {
    await fetchCampaignCharacters(campaignId.value);
  } catch (error) {
    console.error("Failed to fetch characters:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de charger les personnages",
      color: "error",
    });
    _router.push("/streamer/campaigns");
  }
});

const handleAssign = async (characterId: string) => {
  if (isAssigned(characterId)) {
    return;
  }

  assigning.value = characterId;
  try {
    await assignCharacter(campaignId.value, characterId);
    toast.add({
      title: "Personnage assigné",
      description: "Votre personnage a été sélectionné avec succès",
      color: "success",
    });
  } catch (error: unknown) {
    console.error("Failed to assign character:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";
    toast.add({
      title: "Erreur",
      description: errorMessage,
      color: "error",
    });
  } finally {
    assigning.value = null;
  }
};

const handleUnassign = async () => {
  unassigning.value = true;
  try {
    await unassignCharacter(campaignId.value);
    toast.add({
      title: "Assignation retirée",
      description: "Vous n'êtes plus assigné à un personnage",
      color: "success",
    });
  } catch (error) {
    console.error("Failed to unassign character:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de retirer l'assignation",
      color: "error",
    });
  } finally {
    unassigning.value = false;
  }
};
</script>
