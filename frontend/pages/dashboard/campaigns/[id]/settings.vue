<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import CharacterSelectionModal from '@/components/dashboard/CharacterSelectionModal.vue'
import { useCampaignCharacters } from '@/composables/useCampaignCharacters'
import type { CampaignSettings } from '@/types'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})

const router = useRouter()
const route = useRoute()
const toast = useToast()

const { characters, fetchCharacters, getCampaignSettings, updateCharacter, updateOverlay } =
  useCampaignCharacters()

const campaignId = computed(() => route.params.id as string)

const settings = ref<CampaignSettings | null>(null)
const loading = ref(true)
const showCharacterModal = ref(false)
const updateLoading = ref(false)
const overlayLoading = ref(false)
const selectedOverlayId = ref<string | null>(null)
// ID de l'overlay actuellement sauvegardé (pour détecter les changements)
const savedOverlayId = ref<string | null>(null)

onMounted(async () => {
  await loadSettings()
})

const loadSettings = async () => {
  loading.value = true
  try {
    settings.value = await getCampaignSettings(campaignId.value)
    // Initialiser la sélection d'overlay et la valeur sauvegardée
    const currentId = settings.value.overlay?.current.id ?? null
    selectedOverlayId.value = currentId
    savedOverlayId.value = currentId
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger les paramètres',
      color: 'error',
    })
    // Rediriger vers la liste des campagnes en cas d'erreur
    router.push('/dashboard/campaigns')
  } finally {
    loading.value = false
  }
}

const handleChangeCharacter = async () => {
  if (!settings.value?.canChangeCharacter) return

  try {
    await fetchCharacters(campaignId.value)
    showCharacterModal.value = true
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger les personnages',
      color: 'error',
    })
  }
}

const handleConfirmChange = async (characterId: string) => {
  updateLoading.value = true
  try {
    await updateCharacter(campaignId.value, characterId)

    toast.add({
      title: 'Personnage modifié',
      description: 'Votre personnage a été mis à jour avec succès',
      color: 'success',
    })

    showCharacterModal.value = false
    await loadSettings()
  } catch (error) {
    toast.add({
      title: 'Erreur',
      description: error instanceof Error ? error.message : 'Impossible de modifier le personnage',
      color: 'error',
    })
  } finally {
    updateLoading.value = false
  }
}

// Options pour le dropdown d'overlay
const overlayOptions = computed(() => {
  if (!settings.value?.overlay?.available) return []
  return settings.value.overlay.available.map((overlay) => ({
    label: overlay.name + (overlay.isDefault ? ' (Défaut)' : overlay.isActive ? ' (Actif)' : ''),
    value: overlay.id,
  }))
})

// Nom du thème actuellement sauvegardé
const savedOverlayName = computed(() => {
  return settings.value?.overlay?.current.name ?? 'Tumulte Default'
})

// Vérifie si la sélection a changé par rapport à la valeur sauvegardée
const hasOverlayChanged = computed(() => {
  return selectedOverlayId.value !== savedOverlayId.value
})

// URL de prévisualisation de l'overlay
const previewUrl = computed(() => {
  if (selectedOverlayId.value === null) {
    return `/dashboard/overlay-preview?config=default`
  }
  return `/dashboard/overlay-preview?config=${selectedOverlayId.value}`
})

// Valider et sauvegarder le changement d'overlay
const handleOverlaySave = async () => {
  overlayLoading.value = true
  try {
    await updateOverlay(campaignId.value, selectedOverlayId.value)

    toast.add({
      title: 'Overlay modifié',
      description: "L'overlay de cette campagne a été mis à jour",
      color: 'success',
    })

    // Mettre à jour la valeur sauvegardée et recharger les settings
    savedOverlayId.value = selectedOverlayId.value
    await loadSettings()
  } catch (error) {
    toast.add({
      title: 'Erreur',
      description: error instanceof Error ? error.message : "Impossible de modifier l'overlay",
      color: 'error',
    })
    // Restaurer la valeur précédente en cas d'erreur
    selectedOverlayId.value = savedOverlayId.value
  } finally {
    overlayLoading.value = false
  }
}

// Annuler le changement et restaurer la valeur sauvegardée
const handleOverlayCancel = () => {
  selectedOverlayId.value = savedOverlayId.value
}
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
            to="/dashboard/campaigns"
          >
            <template #leading>
              <UIcon
                name="i-lucide-arrow-left"
                class="size-6 sm:size-12 transition-transform duration-200 group-hover:-translate-x-1"
              />
            </template>
          </UButton>
          <div>
            <h1 class="text-xl sm:text-3xl font-bold text-primary">Paramètres de campagne</h1>
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
            <h2 class="text-xl font-semibold text-primary">Mon personnage</h2>
          </template>

          <!-- Personnage assigné -->
          <div v-if="settings.assignedCharacter" class="space-y-6">
            <div class="flex items-center gap-4 p-4 rounded-lg bg-primary-50 dark:bg-primary-950">
              <!-- Avatar -->
              <div
                class="size-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-user" class="size-8 text-primary-500 dark:text-primary-300" />
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
                variant="solid"
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
          <div v-else class="flex flex-col items-center justify-center py-12 text-center">
            <UIcon name="i-lucide-user-x" class="size-12 text-neutral-400 mb-4" />
            <p class="text-base font-normal text-neutral-400">Aucun personnage assigné</p>
            <p class="text-sm text-neutral-400 mt-1 max-w-md mx-auto mb-6">
              Vous devez choisir un personnage pour participer aux sondages de cette campagne.
            </p>
            <UButton
              color="primary"
              icon="i-lucide-user-plus"
              label="Choisir un personnage"
              size="lg"
              @click="handleChangeCharacter"
            />
          </div>
        </UCard>

        <!-- Section : Overlay OBS -->
        <UCard v-if="settings.overlay">
          <template #header>
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-semibold text-primary">Overlay OBS</h2>
              <UBadge color="warning" variant="soft" size="sm"> Bêta </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Thème actuellement sauvegardé -->
            <div
              class="flex items-center gap-3 p-3 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-400 dark:border-emerald-700"
            >
              <div
                class="flex items-center justify-center size-10 rounded-full bg-emerald-200 dark:bg-emerald-900"
              >
                <UIcon
                  name="i-lucide-check-circle"
                  class="size-5 text-emerald-700 dark:text-emerald-400"
                />
              </div>
              <div class="flex-1">
                <p
                  class="text-xs font-medium text-emerald-800 dark:text-emerald-300 uppercase tracking-wide"
                >
                  Thème actif
                </p>
                <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  {{ savedOverlayName }}
                </p>
              </div>
            </div>

            <p class="text-sm text-muted">
              Sélectionnez l'overlay à utiliser pour cette campagne. Vous pouvez créer des overlays
              personnalisés dans l'Overlay Studio.
            </p>

            <div class="flex flex-col gap-3">
              <!-- Dropdown de sélection -->
              <USelect
                v-model="selectedOverlayId"
                :items="overlayOptions"
                placeholder="Sélectionner un overlay"
                size="lg"
                class="w-full"
                :ui="{
                  base: 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 border-primary-300 dark:border-primary-600',
                  trailingIcon: 'text-primary-500 dark:text-primary-400',
                }"
              />

              <!-- Boutons d'action -->
              <div class="flex flex-col sm:flex-row gap-2">
                <!-- Bouton Prévisualiser -->
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-eye"
                  size="lg"
                  :to="previewUrl"
                  target="_blank"
                  class="flex-1 sm:flex-none"
                >
                  <span class="hidden sm:inline">Prévisualiser</span>
                  <span class="sm:hidden">Aperçu</span>
                </UButton>

                <!-- Bouton Annuler (visible si changement) -->
                <UButton
                  v-if="hasOverlayChanged"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-x"
                  size="lg"
                  class="flex-1 sm:flex-none"
                  @click="handleOverlayCancel"
                >
                  Annuler
                </UButton>

                <!-- Bouton Valider (visible si changement) -->
                <UButton
                  v-if="hasOverlayChanged"
                  color="success"
                  variant="solid"
                  icon="i-lucide-check"
                  size="lg"
                  :loading="overlayLoading"
                  class="flex-1 sm:flex-none"
                  @click="handleOverlaySave"
                >
                  Valider le changement
                </UButton>
              </div>
            </div>

            <!-- Lien vers Overlay Studio -->
            <div class="pt-4 border-t border-default">
              <UAlert color="primary" variant="soft" icon="i-lucide-palette">
                <template #description>
                  <div
                    class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <p class="text-sm">Créez des overlays personnalisés avec l'Overlay Studio</p>
                    <UButton
                      color="primary"
                      variant="solid"
                      size="sm"
                      to="/dashboard/studio"
                      icon="i-lucide-external-link"
                      class="w-full sm:w-auto"
                    >
                      Ouvrir le Studio
                    </UButton>
                  </div>
                </template>
              </UAlert>
            </div>
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
