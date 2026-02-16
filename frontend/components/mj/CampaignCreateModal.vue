<script setup lang="ts">
import type { Campaign } from '~/types'
import { useCampaigns } from '~/composables/useCampaigns'

const model = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  created: [campaign: Campaign]
}>()

const toast = useToast()
const { createCampaign } = useCampaigns()

const name = ref('')
const description = ref('')
const creating = ref(false)
const error = ref('')

const isValid = computed(() => name.value.trim().length >= 3 && name.value.trim().length <= 100)

const handleCreate = async () => {
  if (!isValid.value) return

  creating.value = true
  error.value = ''

  try {
    const campaign = await createCampaign({
      name: name.value.trim(),
      description: description.value.trim() || undefined,
    })

    toast.add({
      title: 'Campagne créée',
      description: `La campagne "${campaign.name}" a été créée avec succès`,
      color: 'success',
    })

    emit('created', campaign)
    resetForm()
    model.value = false
  } catch (err) {
    console.error('Failed to create campaign:', err)
    error.value = err instanceof Error ? err.message : 'Impossible de créer la campagne'
  } finally {
    creating.value = false
  }
}

const resetForm = () => {
  name.value = ''
  description.value = ''
  error.value = ''
}

watch(model, (isOpen) => {
  if (!isOpen) {
    resetForm()
  }
})
</script>

<template>
  <UModal v-model:open="model" class="w-full max-w-lg mx-4">
    <template #content>
      <UCard>
        <template #header>
          <div>
            <h3 class="text-lg font-semibold text-primary">Nouvelle campagne</h3>
            <p class="text-sm text-muted">Créez une campagne pour gérer vos sondages</p>
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-primary ml-4 uppercase mb-2">
              Nom de la campagne <span class="text-error-500">*</span>
            </label>
            <UInput
              v-model="name"
              type="text"
              placeholder="Ex: La Quête du Dragon"
              size="lg"
              :disabled="creating"
            />
            <p
              v-if="name.length > 0 && name.trim().length < 3"
              class="text-xs text-error-500 mt-1 ml-4"
            >
              Le nom doit contenir au moins 3 caractères
            </p>
          </div>

          <div>
            <label class="block text-sm font-bold text-primary ml-4 uppercase mb-2">
              Description
            </label>
            <UTextarea
              v-model="description"
              placeholder="Décrivez votre campagne (optionnel)"
              :rows="3"
              :disabled="creating"
            />
            <p v-if="description.length > 500" class="text-xs text-error-500 mt-1 ml-4">
              La description ne peut pas dépasser 500 caractères
            </p>
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            :title="error"
          />
        </div>

        <template #footer>
          <div class="flex flex-col sm:flex-row justify-end gap-3 w-full">
            <UButton
              color="neutral"
              variant="outline"
              label="Annuler"
              class="w-full sm:w-auto"
              :disabled="creating"
              @click="model = false"
            />
            <UButton
              color="primary"
              variant="solid"
              label="Créer la campagne"
              icon="i-lucide-plus"
              class="w-full sm:w-auto"
              :loading="creating"
              :disabled="!isValid || description.length > 500"
              @click="handleCreate"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
