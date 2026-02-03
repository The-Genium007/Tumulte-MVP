<script setup lang="ts">
import type { Character } from '~/types'

const props = defineProps<{
  characters: Character[]
  currentCharacterId?: string | null
  title?: string
  description?: string
  confirmLabel?: string
  skipLabel?: string
  loading?: boolean
  allowSkip?: boolean
}>()

const model = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  confirm: [characterId: string | null]
  cancel: []
  skip: []
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

const handleSkip = () => {
  emit('skip')
  model.value = false
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
                'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-950':
                  selectedCharacterId === character.id,
                'border-primary-300 dark:border-primary-700 bg-elevated':
                  selectedCharacterId !== character.id,
              }"
              @click="selectedCharacterId = character.id"
            >
              <!-- Avatar -->
              <div
                class="size-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-user" class="size-6 text-primary-500 dark:text-primary-300" />
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
                    'border-primary-500 dark:border-primary-400 bg-primary-500 dark:bg-primary-400':
                      selectedCharacterId === character.id,
                    'border-primary-300 dark:border-primary-600':
                      selectedCharacterId !== character.id,
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
            <UIcon name="i-lucide-users" class="size-12 text-muted mb-4" />
            <p class="text-base font-normal text-muted">Aucun personnage disponible</p>
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
              v-if="allowSkip"
              color="neutral"
              variant="soft"
              :label="skipLabel || 'Choisir plus tard'"
              class="w-full sm:w-auto"
              :disabled="loading"
              @click="handleSkip"
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
