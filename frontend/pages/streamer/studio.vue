<template>
  <!-- Message pour mobile/tablette -->
  <div v-if="!isDesktop" class="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-page">
    <UIcon name="i-lucide-monitor" class="size-16 text-primary-500 mb-6" />
    <h1 class="text-2xl font-bold text-primary mb-4">Éditeur non disponible</h1>
    <p class="text-muted mb-8 max-w-md">
      L'éditeur d'overlay est optimisé pour les écrans larges.
      Veuillez utiliser un ordinateur pour accéder à cette fonctionnalité.
    </p>
    <UButton
      to="/streamer"
      color="primary"
      size="lg"
      icon="i-lucide-arrow-left"
    >
      Retour au tableau de bord
    </UButton>
  </div>

  <!-- Contenu normal pour desktop -->
  <div v-else class="studio-layout">
    <!-- Toolbar -->
    <header class="studio-toolbar">
      <div class="toolbar-left">
        <NuxtLink to="/streamer" class="back-link">
          <UIcon name="i-lucide-arrow-left" class="size-5" />
        </NuxtLink>
        <h1 class="toolbar-title">Overlay Studio</h1>
        <UBadge color="warning" variant="soft">Beta</UBadge>

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
                  <UIcon name="i-game-icons-dice-twenty-faces-twenty" class="size-6 animate-spin-slow text-muted" />
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
                        {{ new Date(config.updatedAt).toLocaleDateString("fr-FR") }}
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
          to="/streamer/overlay-preview"
        />
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

    <!-- Modal: Nouvelle configuration -->
    <UModal v-model:open="showNewConfigModal">
      <template #header>
        <h3 class="text-lg font-semibold">Nouvelle configuration</h3>
      </template>

      <div class="p-4">
        <UFormField label="Nom de la configuration">
          <UInput
            v-model="newConfigName"
            placeholder="Ma configuration"
            autofocus
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
            }"
            @keyup.enter="createNewConfig"
          />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="Annuler"
            @click="showNewConfigModal = false"
          />
          <UButton
            color="primary"
            label="Créer"
            :loading="saving"
            @click="createNewConfig"
          />
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

      <!-- Bouton toggle inspecteur -->
      <button
        class="inspector-toggle"
        :class="{ 'inspector-closed': !showInspector }"
        @click="showInspector = !showInspector"
      >
        <UIcon :name="showInspector ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'" class="size-4" />
      </button>

      <!-- Sidebar droite - Inspecteur -->
      <aside class="studio-inspector" :class="{ collapsed: !showInspector }">
        <div v-if="selectedElement" class="inspector-content">
          <h3 class="sidebar-title">Propriétés</h3>

          <!-- Nom -->
          <div class="inspector-field">
            <label>Nom</label>
            <UInput
              :model-value="selectedElement.name"
              size="sm"
              :ui="{
                root: 'ring-0 border-0 rounded-lg overflow-hidden',
                base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
              }"
              @update:model-value="updateName"
            />
          </div>

          <!-- Position -->
          <div class="inspector-group">
            <label>Position</label>
            <div class="vector-inputs">
              <div class="vector-input">
                <span>X</span>
                <UInput
                  type="number"
                  :model-value="selectedElement.position.x"
                  size="sm"
                  step="0.1"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                  @update:model-value="(v: string | number) => updatePosition('x', Number(v))"
                />
              </div>
              <div class="vector-input">
                <span>Y</span>
                <UInput
                  type="number"
                  :model-value="selectedElement.position.y"
                  size="sm"
                  step="0.1"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                  @update:model-value="(v: string | number) => updatePosition('y', Number(v))"
                />
              </div>
            </div>
          </div>

          <!-- Scale -->
          <div class="inspector-group">
            <label>Échelle</label>
            <div class="vector-inputs">
              <div class="vector-input">
                <span>X</span>
                <UInput
                  type="number"
                  :model-value="selectedElement.scale.x"
                  size="sm"
                  step="0.1"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                  @update:model-value="(v: string | number) => updateScale('x', Number(v))"
                />
              </div>
              <div class="vector-input">
                <span>Y</span>
                <UInput
                  type="number"
                  :model-value="selectedElement.scale.y"
                  size="sm"
                  step="0.1"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                  }"
                  @update:model-value="(v: string | number) => updateScale('y', Number(v))"
                />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="inspector-actions">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-copy"
              label="Dupliquer"
              size="sm"
              block
              @click="duplicateSelected"
            />
            <UButton
              color="error"
              variant="soft"
              icon="i-lucide-trash-2"
              label="Supprimer"
              size="sm"
              block
              @click="deleteSelected"
            />
          </div>
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
import { computed, onMounted, onUnmounted, provide, ref } from "vue";
import { useOverlayStudioStore } from "~/overlay-studio/stores/overlayStudio";
import { useOverlayStudioApi } from "~/overlay-studio/composables/useOverlayStudioApi";
import { useUndoRedo, UNDO_REDO_KEY } from "~/overlay-studio/composables/useUndoRedo";
import { useDevice } from "~/composables/useDevice";
import StudioCanvas from "~/overlay-studio/components/StudioCanvas.vue";
import type { OverlayElementType } from "~/overlay-studio/types";

definePageMeta({
  layout: "studio" as const,
  middleware: ["auth"],
});

const { isDesktop } = useDevice();

const store = useOverlayStudioStore();
const api = useOverlayStudioApi();
const toast = useToast();

// Undo/Redo - utiliser le composable directement ici et le fournir aux enfants
const undoRedo = useUndoRedo(store);
provide(UNDO_REDO_KEY, undoRedo);
const { canUndo, canRedo, undoLabel, redoLabel, undo, redo, pushSnapshot, initialize: initializeHistory } = undoRedo;

// Undo/Redo handlers
const handleUndo = () => {
  undo();
};

const handleRedo = () => {
  redo();
};

// État local
const currentConfigId = ref<string | null>(null);
const currentConfigName = ref("Nouvelle configuration");
const showConfigDropdown = ref(false);
const showNewConfigModal = ref(false);
const newConfigName = ref("");
const showInspector = ref(false);

// État du store
const elements = computed(() => store.elements);
const selectedElementId = computed(() => store.selectedElementId);
const selectedElement = computed(() => store.selectedElement);
const saving = computed(() => api.saving.value);
const loading = computed(() => api.loading.value);

// Types d'éléments disponibles
// NOTE: Ajouter de nouveaux types ici
const elementTypes = [
  { type: "poll" as const, label: "Sondage", icon: "i-lucide-bar-chart-3" },
];

// Icône selon le type
const getElementIcon = (type: OverlayElementType): string => {
  const found = elementTypes.find((t) => t.type === type);
  return found?.icon || "i-lucide-box";
};

// Actions
const addElement = (type: OverlayElementType) => {
  store.addElement(type);
  pushSnapshot(`Ajouter ${type}`);
};

const removeElement = (id: string) => {
  store.removeElement(id);
  pushSnapshot("Supprimer élément");
};

const selectElement = (id: string) => {
  store.selectElement(id);
};

const toggleVisibility = (id: string) => {
  const element = elements.value.find((e) => e.id === id);
  if (element) {
    store.updateElement(id, { visible: !element.visible });
    pushSnapshot(element.visible ? "Masquer élément" : "Afficher élément");
  }
};

const duplicateSelected = () => {
  if (selectedElementId.value) {
    store.duplicateElement(selectedElementId.value);
    pushSnapshot("Dupliquer élément");
  }
};

const deleteSelected = () => {
  if (selectedElementId.value) {
    store.removeElement(selectedElementId.value);
    pushSnapshot("Supprimer élément");
  }
};

// Mise à jour des propriétés
const updateName = (value: string | number) => {
  if (selectedElementId.value) {
    store.updateElement(selectedElementId.value, { name: String(value) });
  }
};

const updatePosition = (axis: "x" | "y" | "z", value: number) => {
  if (selectedElement.value) {
    store.updateElementPosition(selectedElement.value.id, {
      ...selectedElement.value.position,
      [axis]: value,
    });
  }
};

const updateScale = (axis: "x" | "y" | "z", value: number) => {
  if (selectedElement.value) {
    store.updateElementScale(selectedElement.value.id, {
      ...selectedElement.value.scale,
      [axis]: value,
    });
  }
};

// Sauvegarde
const handleSave = async () => {
  try {
    const configData = store.getCurrentConfig();

    if (currentConfigId.value) {
      // Mise à jour d'une configuration existante
      await api.updateConfig(currentConfigId.value, {
        name: currentConfigName.value,
        config: configData,
      });
      toast.add({
        title: "Configuration sauvegardée",
        color: "success",
        icon: "i-lucide-check",
      });
    } else {
      // Nouvelle configuration - ouvrir le modal pour le nom
      showNewConfigModal.value = true;
    }
  } catch (error) {
    toast.add({
      title: "Erreur de sauvegarde",
      description:
        error instanceof Error ? error.message : "Une erreur est survenue",
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
};

// Créer une nouvelle configuration
const createNewConfig = async () => {
  if (!newConfigName.value.trim()) {
    toast.add({
      title: "Nom requis",
      description: "Veuillez entrer un nom pour la configuration",
      color: "warning",
      icon: "i-lucide-alert-triangle",
    });
    return;
  }

  try {
    const configData = store.getCurrentConfig();
    const newConfig = await api.createConfig({
      name: newConfigName.value.trim(),
      config: configData,
    });

    currentConfigId.value = newConfig.id;
    currentConfigName.value = newConfig.name;
    showNewConfigModal.value = false;
    newConfigName.value = "";

    toast.add({
      title: "Configuration créée",
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error) {
    toast.add({
      title: "Erreur de création",
      description:
        error instanceof Error ? error.message : "Une erreur est survenue",
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
};

// Charger une configuration
const loadConfig = async (configId: string) => {
  try {
    const fullConfig = await api.fetchConfig(configId);
    store.loadConfig(fullConfig.config);
    currentConfigId.value = fullConfig.id;
    currentConfigName.value = fullConfig.name;
    showConfigDropdown.value = false;

    toast.add({
      title: "Configuration chargée",
      description: fullConfig.name,
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error) {
    toast.add({
      title: "Erreur de chargement",
      description:
        error instanceof Error ? error.message : "Une erreur est survenue",
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
};

// Nouvelle configuration vierge
const startNewConfig = () => {
  store.resetEditor();
  currentConfigId.value = null;
  currentConfigName.value = "Nouvelle configuration";
  showConfigDropdown.value = false;
};

// Supprimer une configuration
const deleteConfigItem = async (id: string) => {
  try {
    await api.deleteConfig(id);
    if (currentConfigId.value === id) {
      startNewConfig();
    }
    toast.add({
      title: "Configuration supprimée",
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error) {
    toast.add({
      title: "Erreur de suppression",
      description:
        error instanceof Error ? error.message : "Une erreur est survenue",
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
};

// Vérifier si une configuration peut être supprimée
// La configuration par défaut (la seule restante) ne peut pas être supprimée
const canDeleteConfig = (_config: { id: string; isActive: boolean }): boolean => {
  // On ne peut pas supprimer s'il n'y a qu'une seule configuration
  if (api.configs.value.length <= 1) {
    return false;
  }
  return true;
};

// Activer une configuration pour l'overlay
const activateConfigItem = async (id: string) => {
  try {
    await api.activateConfig(id);
    toast.add({
      title: "Configuration activée",
      description: "Cette configuration sera utilisée dans votre overlay OBS",
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error) {
    toast.add({
      title: "Erreur d'activation",
      description:
        error instanceof Error ? error.message : "Une erreur est survenue",
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
};

// Charger la liste des configurations au démarrage et charger la config active
const loadConfigs = async () => {
  try {
    const configs = await api.fetchConfigs();

    // Charger automatiquement la configuration active
    const activeConfig = configs.find((c) => c.isActive);
    if (activeConfig) {
      const fullConfig = await api.fetchConfig(activeConfig.id);
      store.loadConfig(fullConfig.config);
      currentConfigId.value = fullConfig.id;
      currentConfigName.value = fullConfig.name;
    }
  } catch (error) {
    console.error("Failed to load configs:", error);
  }
};

// Raccourcis clavier
const handleKeydown = (event: KeyboardEvent) => {
  // Ignorer si l'utilisateur est dans un input
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

  // Undo: Ctrl+Z (Windows/Linux) ou Cmd+Z (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
    event.preventDefault();
    handleUndo();
    return;
  }

  // Redo: Ctrl+Shift+Z ou Ctrl+Y (Windows/Linux) ou Cmd+Shift+Z (Mac)
  if ((event.ctrlKey || event.metaKey) && (
    (event.key.toLowerCase() === "z" && event.shiftKey) ||
    event.key.toLowerCase() === "y"
  )) {
    event.preventDefault();
    handleRedo();
    return;
  }

  switch (event.key.toLowerCase()) {
    case "delete":
    case "backspace":
      if (selectedElementId.value) {
        deleteSelected();
      }
      break;
    case "d":
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        duplicateSelected();
      }
      break;
    case "escape":
      store.deselectElement();
      break;
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  loadConfigs();

  // Initialiser l'historique
  initializeHistory();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.studio-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-page);
  overflow: hidden;
}

/* Toolbar */
.studio-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--color-bg-muted);
  border-bottom: 1px solid var(--color-neutral-200);
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--color-text-muted);
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--color-neutral-100);
  color: var(--color-text-primary);
}

.toolbar-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.undo-redo-buttons {
  display: flex;
  gap: 2px;
  margin-left: 0.5rem;
  padding-left: 0.75rem;
  border-left: 1px solid var(--color-neutral-200);
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
  background: var(--color-bg-muted);
  border-right: 1px solid var(--color-neutral-200);
  overflow-y: auto;
}

.studio-inspector {
  position: relative;
  border-right: none;
  border-left: 1px solid var(--color-neutral-200);
  width: 280px;
  transition: width 0.3s ease;
  overflow: hidden;
}

.studio-inspector.collapsed {
  width: 0;
  border-left: none;
}

.studio-inspector.collapsed .inspector-content,
.studio-inspector.collapsed .inspector-empty {
  opacity: 0;
  pointer-events: none;
}

.inspector-toggle {
  position: absolute;
  right: 280px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-neutral-200);
  border-right: none;
  border-radius: 6px 0 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: right 0.3s ease, background 0.2s, color 0.2s;
  z-index: 20;
}

.inspector-toggle.inspector-closed {
  right: 0;
}

.inspector-toggle:hover {
  background: var(--color-neutral-100);
  color: var(--color-text-primary);
}

.sidebar-section {
  padding: 1rem;
  border-bottom: 1px solid var(--color-neutral-200);
}

.sidebar-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
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
  background: var(--color-bg-page);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.element-item:hover {
  background: var(--color-neutral-100);
  border-color: var(--color-primary-400);
  color: var(--color-text-primary);
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
  color: var(--color-text-muted);
  transition: all 0.2s;
}

.layer-item:hover {
  background: var(--color-neutral-100);
  color: var(--color-text-primary);
}

.layer-item.selected {
  background: var(--color-primary-100);
  color: var(--color-text-primary);
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
  color: var(--color-text-muted);
  transition: all 0.2s;
}

.layer-action:hover {
  background: var(--color-neutral-200);
  color: var(--color-text-primary);
}

/* Canvas */
.studio-canvas {
  background: var(--color-neutral-300);
  padding: 1.5rem;
  min-width: 0; /* Permet au flex de réduire si nécessaire */
}

/* Inspector */
.inspector-content {
  padding: 1rem;
}

.inspector-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-disabled);
  gap: 1rem;
}

.inspector-field {
  margin-bottom: 1rem;
}

.inspector-field label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.inspector-group {
  margin-bottom: 1rem;
}

.inspector-group > label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.vector-inputs {
  display: flex;
  gap: 0.5rem;
}

.vector-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.vector-input span {
  font-size: 0.75rem;
  color: var(--color-text-disabled);
  width: 16px;
}

.inspector-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-neutral-200);
}

/* Config list items */
.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--color-neutral-100);
  cursor: pointer;
  transition: all 0.2s;
}

.config-item:hover {
  background: var(--color-neutral-200);
}

.config-item.active {
  background: var(--color-primary-100);
  border: 1px solid var(--color-primary-300);
}

.config-info {
  flex: 1;
  min-width: 0;
}

.config-name {
  font-weight: 500;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.config-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
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
  border-bottom: 1px solid var(--color-neutral-200);
  margin-bottom: 0.5rem;
}

.config-dropdown-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
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
  color: var(--color-text-disabled);
  gap: 0.5rem;
  font-size: 0.875rem;
}

.config-dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
