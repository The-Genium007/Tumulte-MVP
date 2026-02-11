<template>
  <!-- Message pour mobile/tablette -->
  <div
    v-if="!isDesktop"
    class="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-page"
  >
    <UIcon name="i-lucide-monitor" class="size-16 text-primary-500 mb-6" />
    <h1 class="text-2xl font-bold text-primary mb-4">Éditeur non disponible</h1>
    <p class="text-muted mb-8 max-w-md">
      L'éditeur d'overlay est optimisé pour les écrans larges. Veuillez utiliser un ordinateur pour
      accéder à cette fonctionnalité.
    </p>
    <UButton to="/dashboard" color="primary" size="lg" icon="i-lucide-arrow-left">
      Retour au tableau de bord
    </UButton>
  </div>

  <!-- Contenu normal pour desktop -->
  <div v-else class="studio-layout">
    <!-- Toolbar -->
    <header class="studio-toolbar">
      <div class="toolbar-left">
        <NuxtLink to="/dashboard" class="back-link">
          <UIcon name="i-lucide-arrow-left" class="size-5" />
        </NuxtLink>
        <h1 class="toolbar-title">Overlay Studio</h1>
        <UBadge color="warning" variant="soft">Beta</UBadge>

        <!-- Bouton Nouveau -->
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-file-plus"
          size="sm"
          title="Nouvelle configuration (vider le canvas)"
          @click="handleNewCanvas"
        />

        <!-- Undo/Redo buttons -->
        <div class="undo-redo-buttons">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-undo-2"
            size="sm"
            :disabled="!canUndo"
            :title="undoLabel || 'Annuler (Ctrl+Z)'"
            @click="handleUndo"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-redo-2"
            size="sm"
            :disabled="!canRedo"
            :title="redoLabel || 'Rétablir (Ctrl+Shift+Z)'"
            @click="handleRedo"
          />
        </div>
      </div>

      <div class="toolbar-center" />

      <div class="toolbar-right">
        <!-- Nom de la configuration chargée -->
        <span v-if="currentConfigName" class="config-name-display" :title="currentConfigName">
          {{ currentConfigName }}
        </span>

        <UPopover v-model:open="showConfigDropdown" :ui="{ content: 'w-80' }">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-folder-open"
            size="sm"
            title="Configurations"
          />

          <template #content>
            <div class="config-dropdown">
              <div class="config-dropdown-header">
                <span class="config-dropdown-title">Mes configurations</span>
                <UButton
                  color="primary"
                  variant="soft"
                  icon="i-lucide-plus"
                  size="xs"
                  title="Nouvelle configuration"
                  @click="startNewConfig"
                />
              </div>

              <div class="config-dropdown-content">
                <div v-if="loading" class="config-dropdown-empty">
                  <UIcon
                    name="i-game-icons-dice-twenty-faces-twenty"
                    class="size-6 animate-spin-slow text-muted"
                  />
                </div>

                <div v-else-if="api.configs.value.length === 0" class="config-dropdown-empty">
                  <UIcon name="i-lucide-folder-open" class="size-8 opacity-50" />
                  <p>Aucune configuration sauvegardée</p>
                </div>

                <div v-else class="config-dropdown-list">
                  <div
                    v-for="config in api.configs.value"
                    :key="config.id"
                    class="config-item"
                    :class="{ active: config.id === currentConfigId }"
                  >
                    <div class="config-info" @click="loadConfig(config.id)">
                      <div class="config-name">
                        {{ config.name }}
                        <UBadge v-if="config.isActive" color="success" variant="soft" size="xs">
                          Active
                        </UBadge>
                      </div>
                      <div class="config-date">
                        {{ new Date(config.updatedAt).toLocaleDateString('fr-FR') }}
                      </div>
                    </div>
                    <div class="config-actions">
                      <UButton
                        v-if="!config.isActive"
                        color="success"
                        variant="ghost"
                        icon="i-lucide-check-circle"
                        size="xs"
                        title="Activer pour l'overlay"
                        @click.stop="activateConfigItem(config.id)"
                      />
                      <UButton
                        v-if="canDeleteConfig(config)"
                        color="error"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        size="xs"
                        title="Supprimer"
                        @click.stop="deleteConfigItem(config.id)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UPopover>

        <UButton
          color="info"
          variant="soft"
          icon="i-lucide-eye"
          label="Prévisualiser"
          size="sm"
          to="/dashboard/overlay-preview"
        />
        <!-- Indicateur de sauvegarde -->
        <div v-if="isDirty || isAutoSaving" class="save-indicator">
          <template v-if="isAutoSaving">
            <UIcon
              name="i-game-icons-dice-twenty-faces-twenty"
              class="size-4 animate-spin text-primary-500"
            />
            <span class="save-indicator-text">Sauvegarde...</span>
          </template>
          <template v-else>
            <span class="save-indicator-dot" />
            <span class="save-indicator-text">Non sauvegardé</span>
          </template>
        </div>

        <UButton
          color="primary"
          icon="i-lucide-save"
          label="Sauvegarder"
          size="sm"
          :loading="saving"
          @click="handleSave"
        />
      </div>
    </header>

    <!-- Modal: Modifications non sauvegardées -->
    <UnsavedChangesModal
      v-model:open="showUnsavedModal"
      @confirm="confirmLeave"
      @cancel="cancelLeave"
    />

    <!-- Modal: Prévisualisation des dés -->
    <UModal v-model:open="showDicePreview" :ui="{ content: 'sm:max-w-2xl' }">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-dice-5" class="size-5 text-primary-500" />
          <h3 class="text-lg font-semibold">Prévisualisation des dés</h3>
        </div>
      </template>

      <template #body>
        <div class="dice-preview-container">
          <ClientOnly>
            <DiceBox
              ref="diceBoxRef"
              :sounds="true"
              :volume="50"
              @roll-complete="handleDiceRollComplete"
              @ready="handleDiceBoxReady"
            />
          </ClientOnly>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-between items-center w-full">
          <div class="text-sm text-muted">
            <span v-if="dicePreviewNotation">{{ dicePreviewNotation }}</span>
          </div>
          <div class="flex gap-2">
            <UButton
              color="primary"
              icon="i-lucide-dice-5"
              label="Relancer"
              :disabled="!diceBoxReady"
              @click="rollDiceAgain"
            />
            <UButton
              color="neutral"
              variant="ghost"
              label="Fermer"
              @click="showDicePreview = false"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal: Nouvelle configuration -->
    <UModal v-model:open="showNewConfigModal">
      <template #header>
        <h3 class="text-lg font-semibold">Nouvelle configuration</h3>
      </template>

      <template #body>
        <UFormField label="Nom de la configuration">
          <UInput
            v-model="newConfigName"
            placeholder="Ma configuration"
            autofocus
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
            }"
            @keyup.enter="createNewConfig"
          />
        </UFormField>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="Annuler"
            @click="showNewConfigModal = false"
          />
          <UButton color="primary" label="Créer" :loading="saving" @click="createNewConfig" />
        </div>
      </template>
    </UModal>

    <!-- Main content -->
    <div class="studio-main">
      <!-- Sidebar gauche - Éléments -->
      <aside class="studio-sidebar">
        <div class="sidebar-section">
          <h3 class="sidebar-title">Éléments</h3>
          <div class="element-grid">
            <button
              v-for="elementType in elementTypes"
              :key="elementType.type"
              class="element-item"
              :title="elementType.label"
              @click="addElement(elementType.type)"
            >
              <UIcon :name="elementType.icon" class="size-6" />
              <span>{{ elementType.label }}</span>
            </button>
          </div>
        </div>

        <div class="sidebar-section">
          <h3 class="sidebar-title">Calques</h3>
          <div v-if="elements.length === 0" class="empty-layers">
            <p class="text-muted text-sm">Aucun élément</p>
          </div>
          <div v-else class="layers-list">
            <div
              v-for="element in elements"
              :key="element.id"
              class="layer-item"
              :class="{ selected: element.id === selectedElementId }"
              @click="selectElement(element.id)"
            >
              <UIcon :name="getElementIcon(element.type)" class="size-4" />
              <span class="layer-name">{{ element.name }}</span>
              <div class="layer-actions">
                <button
                  class="layer-action"
                  :title="element.visible ? 'Masquer' : 'Afficher'"
                  @click.stop="toggleVisibility(element.id)"
                >
                  <UIcon
                    :name="element.visible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                    class="size-4"
                  />
                </button>
                <button
                  class="layer-action"
                  title="Supprimer"
                  @click.stop="removeElement(element.id)"
                >
                  <UIcon name="i-lucide-trash-2" class="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Canvas -->
      <main class="studio-canvas">
        <ClientOnly>
          <StudioCanvas />
        </ClientOnly>
      </main>

      <!-- Sidebar droite - Inspecteur -->
      <aside class="studio-inspector">
        <div v-if="selectedElement" class="inspector-content">
          <!-- Header avec nom du calque et bouton supprimer -->
          <div class="inspector-header">
            <div class="inspector-header-info">
              <UIcon :name="getElementIcon(selectedElement.type)" class="size-5 text-primary-500" />
              <h2 class="inspector-element-name">{{ selectedElement.name }}</h2>
            </div>
            <button class="inspector-delete-btn" title="Supprimer" @click="deleteSelected">
              <UIcon name="i-lucide-trash-2" class="size-4" />
            </button>
          </div>

          <h3 class="sidebar-title inspector-title">Propriétés</h3>

          <!-- Inspecteur spécifique au type d'élément -->
          <template v-if="selectedElement.type === 'dice'">
            <DiceInspector
              :dice-box="(selectedElement.properties as DiceProperties).diceBox"
              :hud="(selectedElement.properties as DiceProperties).hud"
              :colors="(selectedElement.properties as DiceProperties).colors"
              :animations="(selectedElement.properties as DiceProperties).animations"
              :audio="(selectedElement.properties as DiceProperties).audio"
              :mock-data="(selectedElement.properties as DiceProperties).mockData"
              @update-dice-box="updateDiceBox"
              @update-hud="updateDiceHud"
              @update-colors="updateDiceColors"
              @update-animations="updateDiceAnimations"
              @update-audio="updateDiceAudio"
              @update-mock-data="updateDiceMockData"
            />
          </template>

          <template v-else-if="selectedElement.type === 'poll'">
            <PollInspector
              :question-style="(selectedElement.properties as PollProperties).questionStyle"
              :question-box-style="(selectedElement.properties as PollProperties).questionBoxStyle"
              :option-box-style="(selectedElement.properties as PollProperties).optionBoxStyle"
              :option-text-style="(selectedElement.properties as PollProperties).optionTextStyle"
              :option-percentage-style="
                (selectedElement.properties as PollProperties).optionPercentageStyle
              "
              :option-spacing="(selectedElement.properties as PollProperties).optionSpacing"
              :medal-colors="(selectedElement.properties as PollProperties).medalColors"
              :progress-bar="(selectedElement.properties as PollProperties).progressBar"
              :animations="(selectedElement.properties as PollProperties).animations"
              :gamification="(selectedElement.properties as PollProperties).gamification"
              :layout="(selectedElement.properties as PollProperties).layout"
              :mock-data="(selectedElement.properties as PollProperties).mockData"
              @update-question-style="updatePollQuestionStyle"
              @update-question-box-style="updatePollQuestionBoxStyle"
              @update-option-box-style="updatePollOptionBoxStyle"
              @update-option-text-style="updatePollOptionTextStyle"
              @update-percentage-style="updatePollPercentageStyle"
              @update-option-spacing="updatePollOptionSpacing"
              @update-medal-colors="updatePollMedalColors"
              @update-progress-bar="updatePollProgressBar"
              @update-animations="updatePollAnimations"
              @update-gamification="updatePollGamification"
              @update-layout="updatePollLayout"
              @update-mock-data="updatePollMockData"
              @play-preview="playPollPreview"
            />
          </template>

          <template v-else-if="selectedElement.type === 'diceReverse'">
            <DiceReverseInspector
              :goal-bar="(selectedElement.properties as DiceReverseProperties).goalBar"
              :impact-hud="(selectedElement.properties as DiceReverseProperties).impactHud"
              :mock-data="(selectedElement.properties as DiceReverseProperties).mockData"
              @update-goal-bar="updateDiceReverseGoalBar"
              @update-impact-hud="updateDiceReverseImpactHud"
              @update-mock-data="updateDiceReverseMockData"
            />
          </template>

          <template v-else-if="selectedElement.type === 'diceReverseGoalBar'">
            <DiceReverseGoalBarInspector
              :container="(selectedElement.properties as DiceReverseGoalBarProperties).container"
              :progress-bar="
                (selectedElement.properties as DiceReverseGoalBarProperties).progressBar
              "
              :shake="(selectedElement.properties as DiceReverseGoalBarProperties).shake"
              :typography="(selectedElement.properties as DiceReverseGoalBarProperties).typography"
              :audio="(selectedElement.properties as DiceReverseGoalBarProperties).audio"
              :width="(selectedElement.properties as DiceReverseGoalBarProperties).width"
              :mock-data="(selectedElement.properties as DiceReverseGoalBarProperties).mockData"
              @update-container="updateGoalBarContainer"
              @update-progress-bar="updateGoalBarProgressBar"
              @update-shake="updateGoalBarShake"
              @update-typography="updateGoalBarTypography"
              @update-audio="updateGoalBarAudio"
              @update-width="updateGoalBarWidth"
              @update-mock-data="updateGoalBarMockData"
            />
          </template>

          <template v-else-if="selectedElement.type === 'diceReverseImpactHud'">
            <DiceReverseImpactHudInspector
              :container="(selectedElement.properties as DiceReverseImpactHudProperties).container"
              :animations="
                (selectedElement.properties as DiceReverseImpactHudProperties).animations
              "
              :audio="(selectedElement.properties as DiceReverseImpactHudProperties).audio"
              :typography="
                (selectedElement.properties as DiceReverseImpactHudProperties).typography
              "
              :width="(selectedElement.properties as DiceReverseImpactHudProperties).width"
              @update-container="updateImpactHudContainer"
              @update-animations="updateImpactHudAnimations"
              @update-audio="updateImpactHudAudio"
              @update-typography="updateImpactHudTypography"
              @update-width="updateImpactHudWidth"
            />
          </template>
        </div>

        <div v-else class="inspector-empty">
          <UIcon name="i-lucide-mouse-pointer-click" class="size-12 text-gray-600" />
          <p>Sélectionnez un élément pour voir ses propriétés</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useOverlayStudioStore } from '~/overlay-studio/stores/overlayStudio'
import { useOverlayStudioApi } from '~/overlay-studio/composables/useOverlayStudioApi'
import { useUndoRedo, UNDO_REDO_KEY } from '~/overlay-studio/composables/useUndoRedo'
import { useUnsavedChangesGuard } from '~/overlay-studio/composables/useUnsavedChangesGuard'
import { useElementUpdater } from '~/overlay-studio/composables/useElementUpdater'
import { useDevice } from '~/composables/useDevice'
import StudioCanvas from '~/overlay-studio/components/StudioCanvas.vue'
import DiceInspector from '~/overlay-studio/components/inspector/DiceInspector.vue'
import PollInspector from '~/overlay-studio/components/inspector/PollInspector.vue'
import DiceReverseInspector from '~/overlay-studio/components/inspector/DiceReverseInspector.vue'
import DiceReverseGoalBarInspector from '~/overlay-studio/components/inspector/DiceReverseGoalBarInspector.vue'
import DiceReverseImpactHudInspector from '~/overlay-studio/components/inspector/DiceReverseImpactHudInspector.vue'
import UnsavedChangesModal from '~/overlay-studio/components/UnsavedChangesModal.vue'
import type {
  OverlayElementType,
  DiceProperties,
  PollProperties,
  DiceReverseProperties,
  DiceReverseGoalBarProperties,
  DiceReverseImpactHudProperties,
} from '~/overlay-studio/types'

definePageMeta({
  layout: 'studio' as const,
  middleware: ['auth'],
})

useHead({
  title: 'Studio Overlay - Tumulte',
})

const { isDesktop } = useDevice()

const store = useOverlayStudioStore()
const api = useOverlayStudioApi()
const toast = useToast()

// Undo/Redo - utiliser le composable directement ici et le fournir aux enfants
const undoRedo = useUndoRedo(store)
provide(UNDO_REDO_KEY, undoRedo)
const {
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  undo,
  redo,
  pushSnapshot,
  initialize: initializeHistory,
} = undoRedo

// Debounced pushSnapshot pour éviter de créer trop de snapshots lors des changements rapides (sliders, color pickers)
const pendingSnapshots = new Map<string, ReturnType<typeof setTimeout>>()
const SNAPSHOT_DEBOUNCE_MS = 500

const debouncedPushSnapshot = (label: string, debounceKey: string) => {
  // Annuler le timer précédent pour cette clé
  const existing = pendingSnapshots.get(debounceKey)
  if (existing) {
    clearTimeout(existing)
  }

  // Créer un nouveau timer
  const timer = setTimeout(() => {
    pushSnapshot(label)
    pendingSnapshots.delete(debounceKey)
  }, SNAPSHOT_DEBOUNCE_MS)

  pendingSnapshots.set(debounceKey, timer)
}

// Guard pour les modifications non sauvegardées
const { showUnsavedModal, confirmLeave, cancelLeave } = useUnsavedChangesGuard()

// État dirty du store
const isDirty = computed(() => store.isDirty)
const isAutoSaving = computed(() => api.autoSaving.value)

// Undo/Redo handlers
const handleUndo = () => {
  undo()
}

const handleRedo = () => {
  redo()
}

// État local
const currentConfigId = ref<string | null>(null)
const currentConfigName = ref('Nouvelle configuration')
const showConfigDropdown = ref(false)
const showNewConfigModal = ref(false)
const newConfigName = ref('')

// État pour la prévisualisation des dés
const showDicePreview = ref(false)
const diceBoxRef = ref<{ roll: (notation: string) => Promise<void>; clear: () => void } | null>(
  null
)
const diceBoxReady = ref(false)
const dicePreviewNotation = ref('')

// État du store
const elements = computed(() => store.elements)
const selectedElementId = computed(() => store.selectedElementId)
const selectedElement = computed(() => store.selectedElement)
const saving = computed(() => api.saving.value)
const loading = computed(() => api.loading.value)

// Types d'éléments disponibles
// NOTE: Ajouter de nouveaux types ici
const elementTypes = [
  { type: 'poll' as const, label: 'Sondage', icon: 'i-lucide-bar-chart-3' },
  { type: 'dice' as const, label: 'Dés 3D', icon: 'i-lucide-dice-5' },
  { type: 'diceReverse' as const, label: 'Inversion', icon: 'i-lucide-refresh-ccw' },
]

// Auto-save: surveiller les modifications et sauvegarder automatiquement
watch(
  () => store.isDirty,
  (dirty) => {
    if (dirty && currentConfigId.value) {
      // Déclencher l'auto-save (debounced dans le composable API)
      api.autoSave(currentConfigId.value, store.getCurrentConfig())
    }
  }
)

// Icône selon le type
const getElementIcon = (type: OverlayElementType): string => {
  // Icônes pour les types non présents dans elementTypes (sous-types)
  const iconMap: Partial<Record<OverlayElementType, string>> = {
    diceReverseGoalBar: 'i-lucide-goal',
    diceReverseImpactHud: 'i-lucide-zap',
  }
  if (iconMap[type]) return iconMap[type]!

  const found = elementTypes.find((t) => t.type === type)
  return found?.icon || 'i-lucide-box'
}

// Actions
const addElement = (type: OverlayElementType) => {
  // Pour "Inversion", créer les deux éléments séparés (Goal Bar + Impact HUD)
  if (type === 'diceReverse') {
    store.addDiceReverseElements()
    pushSnapshot('Ajouter Inversion (Goal Bar + Impact HUD)')
    return
  }

  store.addElement(type)
  pushSnapshot(`Ajouter ${type}`)
}

const removeElement = (id: string) => {
  store.removeElement(id)
  pushSnapshot('Supprimer élément')
}

const selectElement = (id: string) => {
  store.selectElement(id)
}

const toggleVisibility = (id: string) => {
  const element = elements.value.find((e) => e.id === id)
  if (element) {
    store.updateElement(id, { visible: !element.visible })
    pushSnapshot(element.visible ? 'Masquer élément' : 'Afficher élément')
  }
}

const duplicateSelected = () => {
  if (selectedElementId.value) {
    store.duplicateElement(selectedElementId.value)
    pushSnapshot('Dupliquer élément')
  }
}

const deleteSelected = () => {
  if (selectedElementId.value) {
    store.removeElement(selectedElementId.value)
    pushSnapshot('Supprimer élément')
  }
}

// Mise à jour des propriétés d'éléments via composable
const {
  // Dice
  updateDiceBox,
  updateDiceHud,
  updateDiceColors,
  updateDiceAnimations,
  updateDiceAudio,
  updateDiceMockData,
  // Poll
  updatePollQuestionStyle,
  updatePollQuestionBoxStyle,
  updatePollOptionBoxStyle,
  updatePollOptionTextStyle,
  updatePollPercentageStyle,
  updatePollOptionSpacing,
  updatePollMedalColors,
  updatePollProgressBar,
  updatePollAnimations,
  updatePollGamification,
  updatePollLayout,
  updatePollMockData,
  // Dice Reverse (legacy)
  updateDiceReverseGoalBar,
  updateDiceReverseImpactHud,
  updateDiceReverseMockData,
  // Goal Bar (separate element)
  updateGoalBarContainer,
  updateGoalBarProgressBar,
  updateGoalBarShake,
  updateGoalBarMockData,
  updateGoalBarTypography,
  updateGoalBarWidth,
  updateGoalBarAudio,
  // Impact HUD (separate element)
  updateImpactHudContainer,
  updateImpactHudAnimations,
  updateImpactHudAudio,
  updateImpactHudTypography,
  updateImpactHudWidth,
} = useElementUpdater(selectedElement, store.updateElement, debouncedPushSnapshot)

// Prévisualisation du sondage
const playPollPreview = () => {
  // TODO: Implémenter la prévisualisation du sondage
  console.log('[Studio] Poll preview requested')
}

const handleDiceBoxReady = () => {
  diceBoxReady.value = true
  // Si on a une notation en attente, lancer les dés
  if (dicePreviewNotation.value && diceBoxRef.value) {
    rollDice(dicePreviewNotation.value)
  }
}

const handleDiceRollComplete = (results: unknown) => {
  console.log('[Studio] Dice roll complete:', results)
}

const rollDice = async (notation: string) => {
  if (!diceBoxRef.value) return

  // Clear les dés précédents avant de lancer
  if (diceBoxRef.value.clear) {
    diceBoxRef.value.clear()
  }

  try {
    await diceBoxRef.value.roll(notation)
  } catch (error) {
    console.error('[Studio] Error rolling dice:', error)
  }
}

const rollDiceAgain = () => {
  if (dicePreviewNotation.value) {
    rollDice(dicePreviewNotation.value)
  }
}

// Nouvelle configuration vierge (bouton "Nouveau" dans la toolbar)
const handleNewCanvas = () => {
  store.resetEditor()
  currentConfigId.value = null
  currentConfigName.value = ''
  // Réinitialiser l'historique undo/redo
  initializeHistory()
}

// Sauvegarde
const handleSave = async () => {
  try {
    const configData = store.getCurrentConfig()

    if (currentConfigId.value) {
      // Mode modification : sauvegarde directe
      await api.updateConfig(currentConfigId.value, {
        name: currentConfigName.value,
        config: configData,
      })
      // Marquer comme sauvegardé (reset du dirty state)
      store.markAsSaved()
      toast.add({
        title: 'Sauvegardé',
        color: 'success',
        icon: 'i-lucide-check',
      })
    } else {
      // Nouvelle config : ouvrir modale pour nommer
      newConfigName.value = ''
      showNewConfigModal.value = true
    }
  } catch (error) {
    toast.add({
      title: 'Erreur de sauvegarde',
      description: error instanceof Error ? error.message : 'Une erreur est survenue',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

// Créer une nouvelle configuration
const createNewConfig = async () => {
  if (!newConfigName.value.trim()) {
    toast.add({
      title: 'Nom requis',
      description: 'Veuillez entrer un nom pour la configuration',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  const name = newConfigName.value.trim()

  // Vérifier si une config avec ce nom existe déjà
  const existingConfig = api.configs.value.find((c) => c.name === name)
  if (existingConfig) {
    toast.add({
      title: 'Nom déjà utilisé',
      description: 'Une configuration avec ce nom existe déjà. Veuillez choisir un autre nom.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  try {
    const configData = store.getCurrentConfig()
    const newConfig = await api.createConfig({
      name,
      config: configData,
    })

    currentConfigId.value = newConfig.id
    currentConfigName.value = newConfig.name
    showNewConfigModal.value = false
    newConfigName.value = ''

    // Marquer comme sauvegardé (la config vient d'être créée)
    store.markAsSaved()

    toast.add({
      title: 'Configuration créée',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error) {
    toast.add({
      title: 'Erreur de création',
      description: error instanceof Error ? error.message : 'Une erreur est survenue',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

// Charger une configuration
const loadConfig = async (configId: string) => {
  try {
    const fullConfig = await api.fetchConfig(configId)
    store.loadConfig(fullConfig.config)
    currentConfigId.value = fullConfig.id
    currentConfigName.value = fullConfig.name
    showConfigDropdown.value = false

    toast.add({
      title: 'Configuration chargée',
      description: fullConfig.name,
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error) {
    toast.add({
      title: 'Erreur de chargement',
      description: error instanceof Error ? error.message : 'Une erreur est survenue',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

// Nouvelle configuration vierge
const startNewConfig = () => {
  store.resetEditor()
  currentConfigId.value = null
  currentConfigName.value = 'Nouvelle configuration'
  showConfigDropdown.value = false
}

// Supprimer une configuration
const deleteConfigItem = async (id: string) => {
  try {
    await api.deleteConfig(id)
    if (currentConfigId.value === id) {
      startNewConfig()
    }
    toast.add({
      title: 'Configuration supprimée',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error) {
    toast.add({
      title: 'Erreur de suppression',
      description: error instanceof Error ? error.message : 'Une erreur est survenue',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

// Vérifier si une configuration peut être supprimée
// La configuration par défaut (la seule restante) ne peut pas être supprimée
const canDeleteConfig = (_config: { id: string; isActive: boolean }): boolean => {
  // On ne peut pas supprimer s'il n'y a qu'une seule configuration
  if (api.configs.value.length <= 1) {
    return false
  }
  return true
}

// Activer une configuration pour l'overlay
const activateConfigItem = async (id: string) => {
  try {
    await api.activateConfig(id)
    toast.add({
      title: 'Configuration activée',
      description: 'Cette configuration sera utilisée dans votre overlay OBS',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error) {
    toast.add({
      title: "Erreur d'activation",
      description: error instanceof Error ? error.message : 'Une erreur est survenue',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

// Charger la liste des configurations au démarrage et charger la dernière modifiée
const loadConfigs = async () => {
  try {
    const configs = await api.fetchConfigs()

    if (configs.length === 0) return

    // Trouver la dernière configuration modifiée (par updatedAt)
    const sortedConfigs = [...configs].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    const lastModifiedConfig = sortedConfigs[0]

    if (lastModifiedConfig) {
      const fullConfig = await api.fetchConfig(lastModifiedConfig.id)
      store.loadConfig(fullConfig.config)
      currentConfigId.value = fullConfig.id
      currentConfigName.value = fullConfig.name
    }
  } catch (error) {
    console.error('Failed to load configs:', error)
  }
}

// Raccourcis clavier
const handleKeydown = (event: KeyboardEvent) => {
  // Ignorer si l'utilisateur est dans un input
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
    return

  // Undo: Ctrl+Z (Windows/Linux) ou Cmd+Z (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault()
    handleUndo()
    return
  }

  // Redo: Ctrl+Shift+Z ou Ctrl+Y (Windows/Linux) ou Cmd+Shift+Z (Mac)
  if (
    (event.ctrlKey || event.metaKey) &&
    ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y')
  ) {
    event.preventDefault()
    handleRedo()
    return
  }

  switch (event.key.toLowerCase()) {
    case 'delete':
    case 'backspace':
      if (selectedElementId.value) {
        deleteSelected()
      }
      break
    case 'd':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        duplicateSelected()
      }
      break
    case 'escape':
      store.deselectElement()
      break
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)

  // Charger les propriétés par défaut depuis l'API (en parallèle)
  store.loadDefaults()

  loadConfigs()

  // Initialiser l'historique
  initializeHistory()
})

onUnmounted(() => {
  // Cleanup des timers de snapshot en attente pour éviter les memory leaks
  pendingSnapshots.forEach((timer) => clearTimeout(timer))
  pendingSnapshots.clear()

  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.studio-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ui-bg);
  overflow: hidden;
}

/* Toolbar */
.studio-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--ui-bg-elevated);
  border-bottom: 1px solid var(--ui-border);
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Indicateur de sauvegarde */
.save-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background: var(--ui-warning-muted);
  border: 1px solid var(--ui-warning);
  border-radius: 9999px;
  font-size: 0.75rem;
  color: var(--ui-warning);
}

.save-indicator-dot {
  width: 6px;
  height: 6px;
  background: var(--ui-warning);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.save-indicator-text {
  font-weight: 500;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--ui-text-muted);
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--ui-bg-accented);
  color: var(--ui-text);
}

.toolbar-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ui-text);
}

.undo-redo-buttons {
  display: flex;
  gap: 2px;
  margin-left: 0.5rem;
  padding-left: 0.75rem;
  border-left: 1px solid var(--ui-border);
}

/* Configuration name display */
.config-name-display {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0.25rem 0.5rem;
  background: var(--ui-bg-accented);
  border-radius: 6px;
  border: 1px solid var(--ui-border);
}

/* Main */
.studio-main {
  position: relative;
  display: grid;
  grid-template-columns: 240px 1fr auto;
  flex: 1;
  overflow: hidden;
}

/* Sidebars */
.studio-sidebar,
.studio-inspector {
  background: var(--ui-bg-elevated);
  border-right: 1px solid var(--ui-border);
}

.studio-sidebar {
  overflow-y: auto;
  overflow-x: hidden;
}

.studio-inspector {
  border-right: none;
  border-left: 1px solid var(--ui-border);
  width: 350px;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-section {
  padding: 1rem;
  border-bottom: 1px solid var(--ui-border);
}

.sidebar-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ui-text);
  margin-bottom: 0.75rem;
}

/* Elements grid */
.element-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.element-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.element-item:hover {
  background: var(--ui-bg-elevated);
  border-color: var(--ui-primary);
  color: var(--ui-text);
}

/* Layers */
.empty-layers {
  padding: 1rem;
  text-align: center;
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  color: var(--ui-text-muted);
  transition: all 0.2s;
}

.layer-item:hover {
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
}

.layer-item.selected {
  background: var(--ui-bg-accented);
  color: var(--ui-text);
}

.layer-name {
  flex: 1;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.layer-item:hover .layer-actions {
  opacity: 1;
}

.layer-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--ui-text-muted);
  transition: all 0.2s;
}

.layer-action:hover {
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
}

/* Canvas */
.studio-canvas {
  background: var(--ui-bg-muted);
  padding: 1.5rem;
  min-width: 0; /* Permet au flex de réduire si nécessaire */
}

/* Inspector */
.inspector-content {
  padding: 0;
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0;
  padding: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ui-border);
}

.inspector-header-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.inspector-element-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--ui-error);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.inspector-delete-btn:hover {
  background: var(--ui-error-muted);
  color: var(--ui-error);
}

.inspector-title {
  padding: 1rem 1rem 0 1rem;
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ui-border);
}

.inspector-header-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.inspector-element-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--ui-error);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.inspector-delete-btn:hover {
  background: var(--ui-error-muted);
  color: var(--ui-error);
}

.inspector-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: var(--ui-text-dimmed);
  gap: 1rem;
}

/* Config list items */
.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--ui-bg-accented);
  cursor: pointer;
  transition: all 0.2s;
}

.config-item:hover {
  background: var(--ui-bg-elevated);
}

.config-item.active {
  background: var(--ui-primary-muted);
  border: 1px solid var(--ui-primary);
}

.config-info {
  flex: 1;
  min-width: 0;
}

.config-name {
  font-weight: 500;
  color: var(--ui-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.config-date {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  margin-top: 0.25rem;
}

.config-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.config-item:hover .config-actions {
  opacity: 1;
}

/* Config Dropdown */
.config-dropdown {
  padding: 0.5rem;
}

.config-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid var(--ui-border);
  margin-bottom: 0.5rem;
}

.config-dropdown-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ui-text);
}

.config-dropdown-content {
  max-height: 300px;
  overflow-y: auto;
}

.config-dropdown-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  text-align: center;
  color: var(--ui-text-dimmed);
  gap: 0.5rem;
  font-size: 0.875rem;
}

.config-dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Dice Preview Container */
.dice-preview-container {
  position: relative;
  width: 100%;
  height: 400px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 8px;
  overflow: hidden;
}
</style>
