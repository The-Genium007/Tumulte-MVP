<script setup lang="ts">
import { useGmDiceAttribution, type PendingDiceRoll } from '@/composables/useGmDiceAttribution'
import { useGmCharacters, type GmCharacter } from '@/composables/useGmCharacters'

const props = defineProps<{
  campaignId: string
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Composables
const {
  pendingRolls,
  loading: pendingLoading,
  attributing,
  fetchPendingRolls,
  attributeRoll,
  hasPendingRolls,
  oldestPendingRoll,
} = useGmDiceAttribution()

const { characters, loading: charactersLoading, fetchCharacters } = useGmCharacters()

// Local state
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Current roll being attributed
const currentRoll = computed(() => oldestPendingRoll.value)

// Initialize data when modal opens
watch(isOpen, async (open) => {
  if (open && props.campaignId) {
    await Promise.all([fetchPendingRolls(props.campaignId), fetchCharacters(props.campaignId)])
  }
})

// Also fetch on campaign change
watch(
  () => props.campaignId,
  async (newId) => {
    if (newId && isOpen.value) {
      await Promise.all([fetchPendingRolls(newId), fetchCharacters(newId)])
    }
  }
)

// Handle character selection
const handleSelectCharacter = async (character: GmCharacter | null) => {
  if (!currentRoll.value) return

  try {
    await attributeRoll(props.campaignId, currentRoll.value.id, character?.id || null)

    // If no more pending rolls, close modal
    if (!hasPendingRolls.value) {
      isOpen.value = false
    }
  } catch (error) {
    console.error('Failed to attribute roll:', error)
  }
}

// Handle ignore (no attribution)
const handleIgnore = async () => {
  await handleSelectCharacter(null)
}

// Group characters by type
const groupedCharacters = computed(() => {
  const pcs = characters.value.filter((c) => c.characterType === 'pc')
  const npcs = characters.value.filter((c) => c.characterType === 'npc')
  return { pcs, npcs }
})

// Format roll result for display
const formatRollResult = (roll: PendingDiceRoll) => {
  const parts = []
  if (roll.skill) parts.push(roll.skill)
  if (roll.ability) parts.push(`(${roll.ability})`)
  return parts.join(' ') || roll.rollType || 'Jet de dé'
}
</script>

<template>
  <UModal v-model:open="isOpen" class="w-full max-w-2xl mx-4">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-warning-light">
                <UIcon name="i-lucide-dice-5" class="size-6 text-warning-500" />
              </div>
              <div>
                <h3 class="heading-card">Jet en attente d'attribution</h3>
                <p class="text-caption mt-0.5">{{ pendingRolls.length }} jet(s) en attente</p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              size="sm"
              @click="isOpen = false"
            />
          </div>
        </template>

        <!-- Loading state -->
        <div
          v-if="pendingLoading || charactersLoading"
          class="flex items-center justify-center py-8"
        >
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
        </div>

        <!-- No pending rolls -->
        <div v-else-if="!currentRoll" class="text-center py-8">
          <UIcon name="i-lucide-check-circle" class="size-12 text-success-500 mb-3" />
          <p class="text-body">Tous les jets ont été attribués</p>
        </div>

        <!-- Current roll to attribute -->
        <div v-else class="space-y-6">
          <!-- Roll info -->
          <div class="p-4 rounded-lg bg-elevated border border-default">
            <div class="flex items-center justify-between mb-3">
              <span class="text-body-sm font-medium">{{ formatRollResult(currentRoll) }}</span>
              <UBadge
                v-if="currentRoll.isCritical"
                :color="currentRoll.criticalType === 'success' ? 'success' : 'error'"
                variant="soft"
              >
                {{ currentRoll.criticalType === 'success' ? 'Critique !' : 'Échec critique' }}
              </UBadge>
            </div>

            <div class="flex items-center gap-4">
              <!-- Dice results -->
              <div class="flex items-center gap-2">
                <div
                  v-for="(die, index) in currentRoll.diceResults"
                  :key="index"
                  class="size-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-bold text-lg"
                  :class="{
                    'bg-success-100 dark:bg-success-900/30 text-success-600':
                      currentRoll.isCritical && currentRoll.criticalType === 'success',
                    'bg-error-100 dark:bg-error-900/30 text-error-600':
                      currentRoll.isCritical && currentRoll.criticalType === 'failure',
                  }"
                >
                  {{ die }}
                </div>
              </div>

              <!-- Total -->
              <div class="text-right">
                <p class="text-caption">Total</p>
                <p class="text-2xl font-bold">{{ currentRoll.result }}</p>
              </div>
            </div>

            <p class="text-caption mt-2">
              {{ currentRoll.rollFormula }}
            </p>
          </div>

          <!-- Character selection -->
          <div class="space-y-4">
            <p class="text-body-sm font-medium">Attribuer à quel personnage ?</p>

            <!-- PCs -->
            <div v-if="groupedCharacters.pcs.length > 0">
              <p class="text-caption mb-2 flex items-center gap-1">
                <UIcon name="i-lucide-sword" class="size-3" />
                Personnages joueurs
              </p>
              <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <button
                  v-for="character in groupedCharacters.pcs"
                  :key="character.id"
                  class="flex flex-col items-center gap-2 p-3 rounded-lg transition-colors border bg-elevated border-default hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                  :disabled="attributing"
                  @click="handleSelectCharacter(character)"
                >
                  <CharacterAvatar :src="character.avatarUrl" :alt="character.name" size="lg" />
                  <span class="text-xs font-medium text-center truncate w-full">
                    {{ character.name }}
                  </span>
                </button>
              </div>
            </div>

            <!-- NPCs -->
            <div v-if="groupedCharacters.npcs.length > 0">
              <p class="text-caption mb-2 flex items-center gap-1">
                <UIcon name="i-lucide-skull" class="size-3" />
                Personnages non-joueurs
              </p>
              <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <button
                  v-for="character in groupedCharacters.npcs"
                  :key="character.id"
                  class="flex flex-col items-center gap-2 p-3 rounded-lg transition-colors border bg-elevated border-default hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                  :disabled="attributing"
                  @click="handleSelectCharacter(character)"
                >
                  <CharacterAvatar :src="character.avatarUrl" :alt="character.name" size="lg" />
                  <span class="text-xs font-medium text-center truncate w-full">
                    {{ character.name }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-between">
            <UButton
              color="neutral"
              variant="soft"
              label="Ignorer ce jet"
              icon="i-lucide-x"
              :loading="attributing"
              @click="handleIgnore"
            />
            <p class="text-caption">Le jet sera enregistré sans personnage</p>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
