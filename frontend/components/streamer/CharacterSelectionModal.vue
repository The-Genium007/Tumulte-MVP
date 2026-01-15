<script setup lang="ts">
import type { Character } from "~/types";

const props = defineProps<{
  characters: Character[];
  currentCharacterId?: string | null;
  title?: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
}>();

const model = defineModel<boolean>({ default: false });

const emit = defineEmits<{
  confirm: [characterId: string];
  cancel: [];
}>();

const selectedCharacterId = ref<string | null>(props.currentCharacterId || null);

// Réinitialiser la sélection quand le modal s'ouvre
watch(model, (isOpen) => {
  if (isOpen) {
    selectedCharacterId.value = props.currentCharacterId || null;
  }
});

// Mettre à jour si currentCharacterId change
watch(
  () => props.currentCharacterId,
  (newValue) => {
    selectedCharacterId.value = newValue || null;
  },
);

const handleConfirm = () => {
  if (selectedCharacterId.value) {
    emit("confirm", selectedCharacterId.value);
  }
};

const handleCancel = () => {
  emit("cancel");
  model.value = false;
};
</script>

<template>
  <UModal v-model:open="model" class="w-full max-w-lg mx-4">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary-50 rounded-lg">
              <UIcon name="i-lucide-user-circle" class="size-5 text-primary-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-primary">
                {{ title || "Choisir un personnage" }}
              </h3>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-muted">
            {{ description || "Sélectionnez le personnage que vous souhaitez jouer." }}
          </p>

          <!-- Liste des personnages -->
          <div v-if="characters.length > 0" class="space-y-2 max-h-80 overflow-y-auto">
            <button
              v-for="character in characters"
              :key="character.id"
              type="button"
              class="w-full flex items-center gap-4 p-3 rounded-lg border-2 transition-all text-left hover:border-primary-400"
              :class="{
                'border-primary-500 bg-primary-50': selectedCharacterId === character.id,
                'border-neutral-200 bg-white': selectedCharacterId !== character.id,
              }"
              @click="selectedCharacterId = character.id"
            >
              <!-- Avatar -->
              <div class="shrink-0">
                <img
                  v-if="character.avatarUrl"
                  :src="character.avatarUrl"
                  :alt="character.name"
                  class="size-12 rounded-full object-cover"
                />
                <div
                  v-else
                  class="size-12 rounded-full bg-primary-100 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="size-6 text-primary-500" />
                </div>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-primary truncate">{{ character.name }}</h4>
                <p class="text-sm text-muted">Personnage joueur</p>
              </div>

              <!-- Radio indicator -->
              <div class="shrink-0">
                <div
                  class="size-5 rounded-full border-2 flex items-center justify-center"
                  :class="{
                    'border-primary-500 bg-primary-500': selectedCharacterId === character.id,
                    'border-neutral-300': selectedCharacterId !== character.id,
                  }"
                >
                  <UIcon
                    v-if="selectedCharacterId === character.id"
                    name="i-lucide-check"
                    class="size-3 text-white"
                  />
                </div>
              </div>
            </button>
          </div>

          <!-- Empty state -->
          <div v-else class="py-8 text-center">
            <div class="bg-neutral-100 p-4 rounded-2xl mb-4 inline-block">
              <UIcon name="i-lucide-users" class="size-10 text-neutral-400" />
            </div>
            <p class="text-muted">Aucun personnage disponible</p>
            <p class="text-sm text-muted mt-1">
              Le MJ doit d'abord importer des personnages depuis le VTT.
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex flex-col sm:flex-row justify-end gap-3 w-full">
            <UButton
              color="neutral"
              variant="outline"
              label="Annuler"
              class="w-full sm:w-auto"
              :disabled="loading"
              @click="handleCancel"
            />
            <UButton
              color="primary"
              variant="solid"
              :label="confirmLabel || 'Confirmer'"
              icon="i-lucide-check"
              class="w-full sm:w-auto"
              :loading="loading"
              :disabled="!selectedCharacterId || characters.length === 0"
              @click="handleConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
