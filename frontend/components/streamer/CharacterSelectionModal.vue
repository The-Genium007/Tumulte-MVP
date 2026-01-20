<script setup lang="ts">
import type { Character } from '~/types'

const props = defineProps<{
  characters: Character[]
  currentCharacterId?: string | null
  title?: string
  description?: string
  confirmLabel?: string
  loading?: boolean
}>()

const model = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  confirm: [characterId: string]
  cancel: []
}>()

const selectedCharacterId = ref<string | null>(props.currentCharacterId || null)

// Réinitialiser la sélection quand le modal s'ouvre
watch(model, (isOpen) => {
  if (isOpen) {
    selectedCharacterId.value = props.currentCharacterId || null
  }
})

// Mettre à jour si currentCharacterId change
watch(
  () => props.currentCharacterId,
  (newValue) => {
    selectedCharacterId.value = newValue || null
  }
)

const handleConfirm = () => {
  if (selectedCharacterId.value) {
    emit('confirm', selectedCharacterId.value)
  }
}

const handleCancel = () => {
  emit('cancel')
  model.value = false
}
</script>

<template>
  <UModal v-model:open="model" class="w-full max-w-lg mx-4">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-primary">
            {{ title || 'Choisir un personnage' }}
          </h3>
        </template>

        <div class="space-y-4">
          <p class="text-muted">
            {{ description || 'Sélectionnez le personnage que vous souhaitez jouer.' }}
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
              <div
                class="size-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-user" class="size-6 text-primary-500" />
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
          <div v-else class="flex flex-col items-center justify-center py-12 text-center">
            <UIcon name="i-lucide-users" class="size-12 text-neutral-400 mb-4" />
            <p class="text-base font-normal text-neutral-400">Aucun personnage disponible</p>
            <p class="text-sm text-neutral-400 mt-1">
              Le MJ doit d'abord importer des personnages depuis le VTT.
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex flex-col sm:flex-row justify-end gap-3 w-full">
            <UButton
              color="primary"
              variant="solid"
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
