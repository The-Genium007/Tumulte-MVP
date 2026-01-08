import { ref, computed, inject, type InjectionKey } from "vue";
import type { OverlayElement } from "../types";

// Clé d'injection pour provide/inject
export const UNDO_REDO_KEY: InjectionKey<UndoRedoComposable> =
  Symbol("undoRedo");

/**
 * Injecte le composable undo/redo fourni par un parent
 * @throws Error si aucun provider n'est trouvé
 */
export function useInjectedUndoRedo(): UndoRedoComposable {
  const undoRedo = inject(UNDO_REDO_KEY);
  if (!undoRedo) {
    throw new Error(
      "useInjectedUndoRedo must be used within a provider that calls useUndoRedo and provides it",
    );
  }
  return undoRedo;
}

/**
 * Snapshot de l'état des éléments
 */
interface ElementsSnapshot {
  elements: OverlayElement[];
  selectedElementId: string | null;
}

/**
 * Entrée dans l'historique
 */
interface HistoryEntry {
  id: string;
  timestamp: number;
  label: string;
  snapshot: ElementsSnapshot;
}

/**
 * Interface du store Overlay Studio (partie nécessaire pour undo/redo)
 */
interface OverlayStudioStore {
  elements: OverlayElement[];
  selectedElementId: string | null;
  restoreSnapshot: (snapshot: ElementsSnapshot) => void;
}

// Constantes
const MAX_HISTORY_SIZE = 50;

/**
 * Génère un ID unique pour les entrées d'historique
 */
function generateId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Composable pour gérer l'historique undo/redo de l'Overlay Studio
 *
 * @param store - Le store Pinia de l'Overlay Studio
 */
export function useUndoRedo(store: OverlayStudioStore) {
  // === État ===
  const history = ref<HistoryEntry[]>([]);
  const currentIndex = ref(-1);

  // État du grouping (pour les drags)
  const isGrouping = ref(false);
  const groupLabel = ref("");
  const groupStartSnapshot = ref<ElementsSnapshot | null>(null);

  // === Fonctions utilitaires ===

  /**
   * Crée un snapshot profond de l'état actuel
   */
  function createSnapshot(): ElementsSnapshot {
    return {
      elements: JSON.parse(JSON.stringify(store.elements)),
      selectedElementId: store.selectedElementId,
    };
  }

  /**
   * Compare deux snapshots pour détecter les différences
   */
  function snapshotsAreDifferent(
    a: ElementsSnapshot | null,
    b: ElementsSnapshot,
  ): boolean {
    if (!a) return true;
    return JSON.stringify(a.elements) !== JSON.stringify(b.elements);
  }

  // === Actions principales ===

  /**
   * Enregistre l'état actuel dans l'historique
   * @param label - Description de l'action (ex: "Ajouter élément")
   */
  function pushSnapshot(label: string): void {
    // Si on est en mode grouping, ne pas enregistrer directement
    if (isGrouping.value) return;

    const snapshot = createSnapshot();

    // Si on n'est pas à la fin de l'historique, supprimer le "futur"
    if (currentIndex.value < history.value.length - 1) {
      history.value.splice(currentIndex.value + 1);
    }

    // Ajouter la nouvelle entrée
    history.value.push({
      id: generateId(),
      timestamp: Date.now(),
      label,
      snapshot,
    });

    // Limiter la taille de l'historique
    if (history.value.length > MAX_HISTORY_SIZE) {
      history.value.shift();
    } else {
      currentIndex.value++;
    }
  }

  /**
   * Démarre un groupe d'actions (pour les drags)
   * Toutes les modifications jusqu'à endGroup() seront groupées en une seule action
   * @param label - Description du groupe (ex: "Déplacer élément")
   */
  function startGroup(label: string): void {
    if (isGrouping.value) return;

    isGrouping.value = true;
    groupLabel.value = label;
    groupStartSnapshot.value = createSnapshot();
  }

  /**
   * Termine un groupe d'actions et enregistre le snapshot si l'état a changé
   */
  function endGroup(): void {
    if (!isGrouping.value) return;

    isGrouping.value = false;

    const currentSnapshot = createSnapshot();

    // Vérifier si l'état a réellement changé
    if (snapshotsAreDifferent(groupStartSnapshot.value, currentSnapshot)) {
      // Enregistrer le snapshot AVANT le début du groupe (pas l'état actuel)
      // Cela permet à undo de revenir à l'état avant le drag

      // Si on n'est pas à la fin de l'historique, supprimer le "futur"
      if (currentIndex.value < history.value.length - 1) {
        history.value.splice(currentIndex.value + 1);
      }

      // D'abord, enregistrer l'état avant le drag si c'est le premier snapshot
      if (history.value.length === 0) {
        history.value.push({
          id: generateId(),
          timestamp: Date.now() - 1,
          label: "État initial",
          snapshot: groupStartSnapshot.value!,
        });
        currentIndex.value++;
      }

      // Puis enregistrer l'état actuel (après le drag)
      history.value.push({
        id: generateId(),
        timestamp: Date.now(),
        label: groupLabel.value,
        snapshot: currentSnapshot,
      });

      // Limiter la taille de l'historique
      while (history.value.length > MAX_HISTORY_SIZE) {
        history.value.shift();
        if (currentIndex.value > 0) currentIndex.value--;
      }

      currentIndex.value = history.value.length - 1;
    }

    groupStartSnapshot.value = null;
    groupLabel.value = "";
  }

  /**
   * Annule la dernière action (undo)
   */
  function undo(): void {
    if (!canUndo.value) return;

    currentIndex.value--;
    const entry = history.value[currentIndex.value];
    store.restoreSnapshot(entry.snapshot);
  }

  /**
   * Rétablit l'action annulée (redo)
   */
  function redo(): void {
    if (!canRedo.value) return;

    currentIndex.value++;
    const entry = history.value[currentIndex.value];
    store.restoreSnapshot(entry.snapshot);
  }

  /**
   * Vide l'historique
   */
  function clear(): void {
    history.value = [];
    currentIndex.value = -1;
    isGrouping.value = false;
    groupStartSnapshot.value = null;
    groupLabel.value = "";
  }

  /**
   * Initialise l'historique avec l'état actuel
   * À appeler au montage du composant
   */
  function initialize(): void {
    if (history.value.length === 0) {
      history.value.push({
        id: generateId(),
        timestamp: Date.now(),
        label: "État initial",
        snapshot: createSnapshot(),
      });
      currentIndex.value = 0;
    }
  }

  // === Computed ===

  const canUndo = computed(() => currentIndex.value > 0);

  const canRedo = computed(() => currentIndex.value < history.value.length - 1);

  const undoLabel = computed(() => {
    if (!canUndo.value) return "";
    // Le label de l'action à annuler est celui de l'entrée courante
    const entry = history.value[currentIndex.value];
    return entry ? `Annuler: ${entry.label}` : "";
  });

  const redoLabel = computed(() => {
    if (!canRedo.value) return "";
    // Le label de l'action à rétablir est celui de l'entrée suivante
    const entry = history.value[currentIndex.value + 1];
    return entry ? `Rétablir: ${entry.label}` : "";
  });

  const historyLength = computed(() => history.value.length);

  return {
    // État (lecture seule)
    history: computed(() => history.value),
    currentIndex: computed(() => currentIndex.value),
    isGrouping: computed(() => isGrouping.value),

    // Actions
    pushSnapshot,
    startGroup,
    endGroup,
    undo,
    redo,
    clear,
    initialize,

    // Computed
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    historyLength,
  };
}

export type UndoRedoComposable = ReturnType<typeof useUndoRedo>;
