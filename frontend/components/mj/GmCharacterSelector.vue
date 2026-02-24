<script setup lang="ts">
import { useGmCharacters, type GmCharacter } from '@/composables/useGmCharacters'

const props = defineProps<{
  campaignId: string
}>()

const {
  characters,
  activeCharacter,
  loading,
  updating,
  initialize,
  setActiveCharacter,
  toggleCharacterType,
} = useGmCharacters()

const toast = useToast()

// État pour le modal "voir plus"
const showAllCharactersModal = ref(false)

// Initialize on mount
onMounted(async () => {
  if (props.campaignId) {
    await initialize(props.campaignId)
  }
})

// Re-fetch when campaign changes
watch(
  () => props.campaignId,
  async (newId) => {
    if (newId) {
      await initialize(newId)
    }
  }
)

// Handle character selection
const handleSelectCharacter = async (character: GmCharacter | null) => {
  try {
    await setActiveCharacter(props.campaignId, character?.id || null)
    // Fermer le modal si ouvert
    showAllCharactersModal.value = false
  } catch (error) {
    console.error('Failed to set active character:', error)
  }
}

// Group characters by type for display
const groupedCharacters = computed(() => {
  const pcs = characters.value.filter((c) => c.characterType === 'pc')
  const npcs = characters.value.filter((c) => c.characterType === 'npc')
  const monsters = characters.value.filter((c) => c.characterType === 'monster')
  return { pcs, npcs, monsters }
})

// Personnages à afficher dans la barre (limité)
const MAX_VISIBLE_CHARACTERS = 6
const visibleCharacters = computed(() => {
  return characters.value.slice(0, MAX_VISIBLE_CHARACTERS)
})

const hasMoreCharacters = computed(() => characters.value.length > MAX_VISIBLE_CHARACTERS)
const hiddenCount = computed(() => Math.max(0, characters.value.length - MAX_VISIBLE_CHARACTERS))

// Check if a character is currently active
const isActive = (character: GmCharacter) => activeCharacter.value?.id === character.id

// Check if a character is assigned to a streamer (not selectable by GM)
const isAssignedToStreamer = (character: GmCharacter) => character.assignedToStreamer !== null

// Context menu items for NPC/Monster type toggle
const getContextMenuItems = (character: GmCharacter) => {
  if (character.characterType === 'pc') return []

  const targetType = character.characterType === 'npc' ? 'monster' : 'npc'
  const label = character.characterType === 'npc' ? 'Basculer en Monstre' : 'Basculer en PNJ'
  const icon = character.characterType === 'npc' ? 'i-lucide-skull' : 'i-lucide-user-round'

  return [
    [
      {
        label,
        icon,
        onSelect: async () => {
          try {
            await toggleCharacterType(props.campaignId, character.id, targetType)
            toast.add({
              title: 'Type modifié',
              description: `${character.name} est maintenant ${targetType === 'monster' ? 'un Monstre' : 'un PNJ'}`,
              color: 'success' as const,
            })
          } catch (error) {
            toast.add({
              title: 'Erreur',
              description: error instanceof Error ? error.message : 'Impossible de changer le type',
              color: 'error' as const,
            })
          }
        },
      },
    ],
  ]
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-primary">Incarnation</h3>
          <p class="text-xs text-muted">Sélectionnez le personnage que vous incarnez</p>
        </div>

        <!-- Bouton d'information -->
        <div class="flex items-center">
          <UPopover>
            <UButton color="info" variant="soft" icon="i-lucide-help-circle" size="sm" />
            <template #content>
              <div class="p-4 max-w-xs space-y-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-info" class="size-4 text-info-500" />
                  <span class="font-semibold text-primary">Comment ça fonctionne ?</span>
                </div>

                <p class="text-sm text-secondary">
                  Le système d'incarnation permet d'attribuer automatiquement les interactions du
                  chat (jets de dés, sondages...) au personnage que vous incarnez en tant que MJ.
                </p>

                <div class="space-y-2">
                  <p class="text-xs font-medium text-muted uppercase tracking-wide">
                    Signification des pastilles
                  </p>

                  <div class="flex items-center gap-2">
                    <div
                      class="size-5 rounded-full bg-success-500 flex items-center justify-center text-[10px] font-bold text-white"
                    >
                      J
                    </div>
                    <span class="text-sm text-secondary"
                      ><strong>Joueur</strong> — Personnage joué par un joueur (PJ)</span
                    >
                  </div>

                  <div class="flex items-center gap-2">
                    <div
                      class="size-5 rounded-full bg-warning-500 flex items-center justify-center text-[10px] font-bold text-white"
                    >
                      N
                    </div>
                    <span class="text-sm text-secondary"
                      ><strong>Non-joueur</strong> — Personnage contrôlé par le MJ (PNJ)</span
                    >
                  </div>

                  <div class="flex items-center gap-2">
                    <div
                      class="size-5 rounded-full bg-error-500 flex items-center justify-center text-[10px] font-bold text-white"
                    >
                      M
                    </div>
                    <span class="text-sm text-secondary"
                      ><strong>Monstre</strong> — Créature ou adversaire</span
                    >
                  </div>

                  <div class="flex items-center gap-2">
                    <div class="size-5 rounded-full bg-info-500 flex items-center justify-center">
                      <UIcon name="i-lucide-user" class="size-3 text-white" />
                    </div>
                    <span class="text-sm text-secondary"
                      ><strong>Assigné</strong> — PJ contrôlé par un streamer (non
                      sélectionnable)</span
                    >
                  </div>
                </div>

                <div
                  class="pt-2 border-t border-default text-xs text-muted flex items-start gap-1.5"
                >
                  <UIcon name="i-lucide-lightbulb" class="size-3.5 text-warning-500 mt-0.5" />
                  <span>
                    Sélectionnez "Aucun" pour attribuer manuellement les jets via le modal
                    d'attribution.
                  </span>
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </template>

    <!-- Contenu -->
    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Zone gauche: Personnage actif -->
      <div class="lg:w-48 shrink-0">
        <p class="text-xs font-medium text-muted uppercase tracking-wide mb-2">Actif</p>
        <div
          class="flex items-center gap-3 p-3 rounded-lg border-2"
          :class="
            activeCharacter
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600'
              : 'bg-subtle border-dashed border-default'
          "
        >
          <template v-if="activeCharacter">
            <CharacterAvatar
              :src="activeCharacter.avatarUrl"
              :alt="activeCharacter.name"
              size="md"
              class="ring-2 ring-primary-500 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-primary truncate">
                {{ activeCharacter.name }}
              </p>
              <UBadge
                :color="
                  activeCharacter.characterType === 'pc'
                    ? 'success'
                    : activeCharacter.characterType === 'npc'
                      ? 'warning'
                      : 'error'
                "
                variant="soft"
                size="xs"
              >
                {{
                  activeCharacter.characterType === 'pc'
                    ? 'Joueur'
                    : activeCharacter.characterType === 'npc'
                      ? 'Non-joueur'
                      : 'Monstre'
                }}
              </UBadge>
            </div>
          </template>
          <template v-else>
            <div class="size-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-user-x" class="size-5 text-muted" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-secondary">Aucun</p>
              <p class="text-xs text-muted">Attribution manuelle</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Séparateur vertical (desktop) -->
      <div class="hidden lg:block w-px bg-default self-stretch" />

      <!-- Séparateur horizontal (mobile) -->
      <div class="lg:hidden h-px bg-default" />

      <!-- Zone droite: Sélection des personnages -->
      <div class="flex-1 min-w-0">
        <p class="text-xs font-medium text-muted uppercase tracking-wide mb-2">Sélection</p>

        <!-- Loading state -->
        <div
          v-if="loading"
          class="flex items-center justify-center py-6 rounded-lg border border-dashed border-default bg-subtle"
        >
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-5 animate-spin-slow text-muted"
          />
          <span class="ml-2 text-sm text-muted">Chargement des personnages...</span>
        </div>

        <!-- No characters -->
        <div
          v-else-if="characters.length === 0"
          class="flex flex-col items-center justify-center py-6 rounded-lg border border-dashed border-default bg-subtle text-center"
        >
          <UIcon name="i-lucide-users" class="size-8 text-muted mb-2" />
          <p class="text-sm font-medium text-secondary">Aucun personnage synchronisé</p>
          <p class="text-xs text-muted mt-1">
            Connectez Foundry VTT pour synchroniser les personnages
          </p>
        </div>

        <!-- Liste des personnages -->
        <div
          v-else
          class="flex items-center gap-2 p-2 overflow-x-auto rounded-lg border border-default bg-subtle scrollbar-thin"
        >
          <!-- Option "Aucun personnage" -->
          <button
            class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all border-2 shrink-0"
            :class="
              !activeCharacter
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 dark:border-primary-500'
                : 'bg-elevated border-transparent hover:border-muted'
            "
            :disabled="updating"
            @click="handleSelectCharacter(null)"
          >
            <div class="size-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-user-x" class="size-4 text-muted" />
            </div>
            <span class="text-xs font-medium whitespace-nowrap">Aucun</span>
            <UIcon v-if="!activeCharacter" name="i-lucide-check" class="size-4 text-primary-500" />
          </button>

          <!-- Personnages visibles (clic droit = menu contextuel pour NPC/Monster) -->
          <UContextMenu
            v-for="character in visibleCharacters"
            :key="character.id"
            :items="getContextMenuItems(character)"
            :disabled="character.characterType === 'pc'"
          >
            <button
              class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all border-2 shrink-0"
              :class="[
                isAssignedToStreamer(character)
                  ? 'bg-muted/30 border-transparent opacity-60 cursor-not-allowed'
                  : isActive(character)
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 dark:border-primary-500'
                    : 'bg-elevated border-transparent hover:border-muted',
              ]"
              :disabled="updating || isAssignedToStreamer(character)"
              :title="
                isAssignedToStreamer(character)
                  ? `Joué par ${character.assignedToStreamer?.streamerName}`
                  : ''
              "
              @click="!isAssignedToStreamer(character) && handleSelectCharacter(character)"
            >
              <div class="relative shrink-0">
                <CharacterAvatar
                  :src="character.avatarUrl"
                  :alt="character.name"
                  size="xs"
                  :class="isAssignedToStreamer(character) ? 'grayscale' : ''"
                />
                <!-- Badge type ou icône assigné -->
                <div
                  v-if="isAssignedToStreamer(character)"
                  class="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-info-500 flex items-center justify-center"
                  :title="`Joué par ${character.assignedToStreamer?.streamerName}`"
                >
                  <UIcon name="i-lucide-user" class="size-2.5 text-white" />
                </div>
                <div
                  v-else
                  class="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                  :class="{
                    'bg-success-500 text-white': character.characterType === 'pc',
                    'bg-warning-500 text-white': character.characterType === 'npc',
                    'bg-error-500 text-white': character.characterType === 'monster',
                  }"
                >
                  {{
                    character.characterType === 'pc'
                      ? 'J'
                      : character.characterType === 'npc'
                        ? 'N'
                        : 'M'
                  }}
                </div>
              </div>
              <div class="flex flex-col items-start min-w-0">
                <span class="text-xs font-medium whitespace-nowrap max-w-20 truncate">
                  {{ character.name }}
                </span>
                <span
                  v-if="isAssignedToStreamer(character)"
                  class="text-[10px] text-info-500 whitespace-nowrap max-w-20 truncate"
                >
                  {{ character.assignedToStreamer?.streamerName }}
                </span>
              </div>
              <UIcon
                v-if="isActive(character)"
                name="i-lucide-check"
                class="size-4 text-primary-500"
              />
            </button>
          </UContextMenu>

          <!-- Bouton "+N" inline si plus de personnages -->
          <button
            v-if="hasMoreCharacters"
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all border-2 border-transparent shrink-0 bg-elevated hover:border-muted"
            @click="showAllCharactersModal = true"
          >
            <UIcon name="i-lucide-more-horizontal" class="size-4 text-muted" />
            <span class="text-xs font-medium text-muted">+{{ hiddenCount }}</span>
          </button>
        </div>

        <!-- Indicateur de mise à jour -->
        <div v-if="updating" class="flex items-center gap-2 mt-2 text-xs text-muted">
          <UIcon name="i-game-icons-dice-twenty-faces-twenty" class="size-4 animate-spin" />
          <span>Changement en cours...</span>
        </div>
      </div>
    </div>
  </UCard>

  <!-- Modal "Tous les personnages" -->
  <UModal v-model:open="showAllCharactersModal" class="w-full max-w-2xl mx-4">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-primary">Tous les personnages</h3>
              <p class="text-xs text-muted">{{ characters.length }} personnage(s) disponible(s)</p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              size="sm"
              @click="showAllCharactersModal = false"
            />
          </div>
        </template>

        <div class="space-y-6">
          <!-- Option "Aucun personnage" -->
          <button
            class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors border-2"
            :class="
              !activeCharacter
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600'
                : 'bg-elevated border-default hover:border-muted'
            "
            :disabled="updating"
            @click="handleSelectCharacter(null)"
          >
            <div
              class="size-12 rounded-full bg-muted/50 flex items-center justify-center shrink-0"
              :class="!activeCharacter ? 'ring-2 ring-primary-500' : ''"
            >
              <UIcon name="i-lucide-user-x" class="size-6 text-muted" />
            </div>
            <div class="text-left flex-1">
              <p class="text-sm font-medium">Aucun personnage</p>
              <p class="text-xs text-muted">Les jets seront attribués manuellement</p>
            </div>
            <UIcon
              v-if="!activeCharacter"
              name="i-lucide-check-circle"
              class="size-5 text-primary-500"
            />
          </button>

          <!-- PJs -->
          <div v-if="groupedCharacters.pcs.length > 0">
            <div class="flex items-center gap-2 mb-3">
              <UIcon name="i-lucide-sword" class="size-4 text-success-500" />
              <span class="text-sm font-semibold text-primary">Personnages joueurs (PJ)</span>
              <UBadge color="success" variant="soft" size="xs">{{
                groupedCharacters.pcs.length
              }}</UBadge>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="character in groupedCharacters.pcs"
                :key="character.id"
                class="flex flex-col items-center gap-2 p-3 rounded-lg transition-colors border-2"
                :class="[
                  isAssignedToStreamer(character)
                    ? 'bg-muted/20 border-default opacity-60 cursor-not-allowed'
                    : isActive(character)
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600'
                      : 'bg-elevated border-default hover:border-muted',
                ]"
                :disabled="updating || isAssignedToStreamer(character)"
                @click="!isAssignedToStreamer(character) && handleSelectCharacter(character)"
              >
                <div class="relative">
                  <CharacterAvatar
                    :src="character.avatarUrl"
                    :alt="character.name"
                    size="lg"
                    :class="[
                      isActive(character) ? 'ring-2 ring-primary-500' : '',
                      isAssignedToStreamer(character) ? 'grayscale' : '',
                    ]"
                  />
                  <!-- Badge "joué par" si assigné -->
                  <div
                    v-if="isAssignedToStreamer(character)"
                    class="absolute -bottom-1 -right-1 size-5 rounded-full bg-info-500 flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-user" class="size-3 text-white" />
                  </div>
                  <div
                    v-else-if="isActive(character)"
                    class="absolute -bottom-1 -right-1 size-5 rounded-full bg-primary-500 flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-check" class="size-3 text-white" />
                  </div>
                </div>
                <div class="flex flex-col items-center w-full">
                  <span class="text-xs font-medium text-center truncate w-full">
                    {{ character.name }}
                  </span>
                  <span
                    v-if="isAssignedToStreamer(character)"
                    class="text-[10px] text-info-500 truncate w-full text-center"
                  >
                    Joué par {{ character.assignedToStreamer?.streamerName }}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- PNJs -->
          <div v-if="groupedCharacters.npcs.length > 0">
            <div class="flex items-center gap-2 mb-3">
              <UIcon name="i-lucide-user-round" class="size-4 text-warning-500" />
              <span class="text-sm font-semibold text-primary">Personnages non-joueurs (PNJ)</span>
              <UBadge color="warning" variant="soft" size="xs">{{
                groupedCharacters.npcs.length
              }}</UBadge>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="character in groupedCharacters.npcs"
                :key="character.id"
                class="flex flex-col items-center gap-2 p-3 rounded-lg transition-colors border-2"
                :class="
                  isActive(character)
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600'
                    : 'bg-elevated border-default hover:border-muted'
                "
                :disabled="updating"
                @click="handleSelectCharacter(character)"
              >
                <div class="relative">
                  <CharacterAvatar
                    :src="character.avatarUrl"
                    :alt="character.name"
                    size="lg"
                    :class="isActive(character) ? 'ring-2 ring-primary-500' : ''"
                  />
                  <div
                    v-if="isActive(character)"
                    class="absolute -bottom-1 -right-1 size-5 rounded-full bg-primary-500 flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-check" class="size-3 text-white" />
                  </div>
                </div>
                <span class="text-xs font-medium text-center truncate w-full">
                  {{ character.name }}
                </span>
              </button>
            </div>
          </div>

          <!-- Monstres -->
          <div v-if="groupedCharacters.monsters.length > 0">
            <div class="flex items-center gap-2 mb-3">
              <UIcon name="i-lucide-skull" class="size-4 text-error-500" />
              <span class="text-sm font-semibold text-primary">Monstres</span>
              <UBadge color="error" variant="soft" size="xs">{{
                groupedCharacters.monsters.length
              }}</UBadge>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="character in groupedCharacters.monsters"
                :key="character.id"
                class="flex flex-col items-center gap-2 p-3 rounded-lg transition-colors border-2"
                :class="
                  isActive(character)
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600'
                    : 'bg-elevated border-default hover:border-muted'
                "
                :disabled="updating"
                @click="handleSelectCharacter(character)"
              >
                <div class="relative">
                  <CharacterAvatar
                    :src="character.avatarUrl"
                    :alt="character.name"
                    size="lg"
                    :class="isActive(character) ? 'ring-2 ring-primary-500' : ''"
                  />
                  <div
                    v-if="isActive(character)"
                    class="absolute -bottom-1 -right-1 size-5 rounded-full bg-primary-500 flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-check" class="size-3 text-white" />
                  </div>
                </div>
                <span class="text-xs font-medium text-center truncate w-full">
                  {{ character.name }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted">
              Le personnage actif recevra automatiquement les jets de dés
            </p>
            <UButton
              color="neutral"
              variant="soft"
              label="Fermer"
              @click="showAllCharactersModal = false"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<style scoped>
/* Scrollbar fine pour la liste horizontale */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: var(--color-muted) transparent;
}
.scrollbar-thin::-webkit-scrollbar {
  height: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: var(--color-muted);
  border-radius: 2px;
}
</style>
