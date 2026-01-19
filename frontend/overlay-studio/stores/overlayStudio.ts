import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  OverlayElement,
  OverlayConfig,
  OverlayConfigData,
  EditMode,
  Vector3,
  OverlayElementType,
  ElementProperties,
  PollProperties,
  DiceProperties,
} from "../types";

/**
 * Store principal pour l'Overlay Studio
 * Gère l'état de l'éditeur et les éléments de l'overlay
 */
export const useOverlayStudioStore = defineStore("overlayStudio", () => {
  // ===== État des configurations =====
  const configs = ref<OverlayConfig[]>([]);
  const activeConfigId = ref<string | null>(null);
  const loading = ref(false);
  const saving = ref(false);

  // ===== État de l'éditeur =====
  const elements = ref<OverlayElement[]>([]);
  const selectedElementId = ref<string | null>(null);
  const editMode = ref<EditMode>("translate");
  const gridSnap = ref(0.1);
  const showGrid = ref(true);
  const isDragging = ref(false);

  // ===== État de sauvegarde =====
  const isDirty = ref(false);
  const lastSavedSnapshot = ref<string | null>(null);

  // ===== Canvas =====
  const canvasWidth = ref(1920);
  const canvasHeight = ref(1080);

  // ===== Computed =====
  const selectedElement = computed(() => {
    if (!selectedElementId.value) return null;
    return (
      elements.value.find((el) => el.id === selectedElementId.value) || null
    );
  });

  const activeConfig = computed(() => {
    if (!activeConfigId.value) return null;
    return configs.value.find((c) => c.id === activeConfigId.value) || null;
  });

  const visibleElements = computed(() => {
    return elements.value.filter((el) => el.visible);
  });

  // ===== Actions - Éléments =====

  /**
   * Génère un ID unique pour un nouvel élément
   */
  function generateId(): string {
    return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Crée les propriétés par défaut selon le type d'élément
   * NOTE: Ajouter de nouveaux types ici
   */
  function getDefaultProperties(type: OverlayElementType): ElementProperties {
    switch (type) {
      case "poll":
        return {
          questionStyle: {
            fontFamily: "Inter",
            fontSize: 48,
            fontWeight: 700,
            color: "#ffffff",
            textShadow: {
              enabled: true,
              color: "rgba(0, 0, 0, 0.5)",
              blur: 4,
              offsetX: 0,
              offsetY: 2,
            },
          },
          questionBoxStyle: {
            backgroundColor: "transparent",
            borderColor: "transparent",
            borderWidth: 0,
            borderRadius: 0,
            opacity: 1,
            padding: { top: 0, right: 0, bottom: 16, left: 0 },
          },
          optionBoxStyle: {
            backgroundColor: "rgba(17, 17, 17, 0.9)",
            borderColor: "#9333ea",
            borderWidth: 2,
            borderRadius: 12,
            opacity: 1,
            padding: { top: 16, right: 24, bottom: 16, left: 24 },
          },
          optionTextStyle: {
            fontFamily: "Inter",
            fontSize: 24,
            fontWeight: 600,
            color: "#ffffff",
          },
          optionPercentageStyle: {
            fontFamily: "Inter",
            fontSize: 28,
            fontWeight: 800,
            color: "#e0d0ff",
          },
          optionSpacing: 16,
          medalColors: {
            gold: "#FFD700",
            silver: "#C0C0C0",
            bronze: "#CD7F32",
            base: "#9333ea",
          },
          progressBar: {
            height: 8,
            backgroundColor: "rgba(147, 51, 234, 0.2)",
            fillColor: "#9333ea",
            fillGradient: {
              enabled: true,
              startColor: "#9333ea",
              endColor: "#ec4899",
            },
            borderRadius: 4,
            position: "bottom",
            showTimeText: true,
            timeTextStyle: {
              fontFamily: "Inter",
              fontSize: 20,
              fontWeight: 700,
              color: "#ffffff",
            },
          },
          animations: {
            entry: {
              animation: { duration: 0.5, easing: "ease-out", delay: 0 },
              slideDirection: "up",
              sound: { enabled: true, volume: 0.8 },
              soundLeadTime: 1.5,
            },
            loop: {
              music: { enabled: true, volume: 0.3 },
            },
            exit: {
              animation: { duration: 0.5, easing: "ease-in", delay: 0 },
            },
            result: {
              winnerEnlarge: { scale: 1.1, duration: 0.3 },
              loserFadeOut: { opacity: 0.3, duration: 0.5 },
              sound: { enabled: true, volume: 0.8 },
              displayDuration: 20,
            },
          },
          layout: {
            maxWidth: 600,
            minOptionsToShow: 2,
            maxOptionsToShow: 5,
          },
          mockData: {
            question: "Quelle action pour le héros ?",
            options: ["Attaquer", "Fuir", "Négocier", "Explorer"],
            percentages: [35, 28, 22, 15],
            timeRemaining: 45,
            totalDuration: 60,
          },
        } as PollProperties;

      case "dice":
        return {
          // Configuration DiceBox (rendu 3D)
          diceBox: {
            colors: {
              foreground: "#000000",
              background: "#ffffff",
              outline: "none",
            },
            texture: "none",
            material: "glass",
            lightIntensity: 1.0,
          },
          // Configuration HUD
          hud: {
            container: {
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              borderColor: "rgba(148, 163, 184, 0.3)",
              borderWidth: 2,
              borderRadius: 16,
              padding: { top: 24, right: 24, bottom: 24, left: 24 },
              backdropBlur: 10,
              boxShadow: {
                enabled: true,
                color: "rgba(0, 0, 0, 0.5)",
                blur: 60,
                offsetX: 0,
                offsetY: 20,
              },
            },
            criticalBadge: {
              successBackground: "rgba(34, 197, 94, 0.3)",
              successTextColor: "rgb(74, 222, 128)",
              successBorderColor: "rgba(34, 197, 94, 0.5)",
              failureBackground: "rgba(239, 68, 68, 0.3)",
              failureTextColor: "rgb(252, 165, 165)",
              failureBorderColor: "rgba(239, 68, 68, 0.5)",
            },
            formula: {
              typography: {
                fontFamily: "'Courier New', monospace",
                fontSize: 20,
                fontWeight: 600,
                color: "rgb(148, 163, 184)",
              },
            },
            result: {
              typography: {
                fontFamily: "system-ui",
                fontSize: 48,
                fontWeight: 800,
                color: "rgb(226, 232, 240)",
              },
              criticalSuccessColor: "rgb(74, 222, 128)",
              criticalFailureColor: "rgb(252, 165, 165)",
            },
            diceBreakdown: {
              backgroundColor: "rgba(15, 23, 42, 0.7)",
              borderColor: "rgba(148, 163, 184, 0.3)",
              borderRadius: 6,
              typography: {
                fontFamily: "'Courier New', monospace",
                fontSize: 16,
                fontWeight: 600,
                color: "rgb(203, 213, 225)",
              },
            },
            skillInfo: {
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              borderColor: "rgba(59, 130, 246, 0.3)",
              borderRadius: 8,
              skillTypography: {
                fontFamily: "system-ui",
                fontSize: 16,
                fontWeight: 700,
                color: "rgb(147, 197, 253)",
              },
              abilityTypography: {
                fontFamily: "system-ui",
                fontSize: 14,
                fontWeight: 500,
                color: "rgb(148, 163, 184)",
              },
            },
            minWidth: 320,
            maxWidth: 400,
          },
          // Couleurs des critiques (glow)
          colors: {
            criticalSuccessGlow: "#22c55e",
            criticalFailureGlow: "#ef4444",
          },
          // Audio
          audio: {
            rollSound: { enabled: true, volume: 0.7 },
            criticalSuccessSound: { enabled: true, volume: 0.9 },
            criticalFailureSound: { enabled: true, volume: 0.9 },
          },
          // Animations
          animations: {
            entry: {
              type: "throw",
              duration: 0.5,
            },
            settle: {
              timeout: 5,
            },
            result: {
              glowIntensity: 1.5,
              glowDuration: 0.5,
            },
            exit: {
              type: "fade",
              duration: 0.5,
              delay: 2,
            },
          },
          // Données mock pour prévisualisation
          mockData: {
            rollFormula: "1d20",
            diceTypes: ["d20"],
            diceValues: [18],
            isCritical: false,
            criticalType: null,
          },
        } as DiceProperties;
    }
  }

  /**
   * Ajoute un nouvel élément à la scène
   */
  function addElement(
    type: OverlayElementType,
    position: Vector3 = { x: 0, y: 0, z: 0 },
  ): OverlayElement {
    // Les éléments Dice sont toujours centrés et verrouillés (couvrent tout le canvas)
    const isDice = type === "dice";
    const finalPosition = isDice ? { x: 0, y: 0, z: 0 } : position;

    const element: OverlayElement = {
      id: generateId(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${elements.value.length + 1}`,
      position: finalPosition,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      locked: isDice, // Les Dice sont verrouillés car ils couvrent tout le canvas
      properties: getDefaultProperties(type),
    };

    elements.value.push(element);
    selectedElementId.value = element.id;
    isDirty.value = true;

    return element;
  }

  /**
   * Supprime un élément
   */
  function removeElement(id: string): void {
    const index = elements.value.findIndex((el) => el.id === id);
    if (index !== -1) {
      elements.value.splice(index, 1);
      if (selectedElementId.value === id) {
        selectedElementId.value = null;
      }
      isDirty.value = true;
    }
  }

  /**
   * Met à jour un élément
   * Remplace l'élément entier pour garantir la réactivité Vue sur les propriétés imbriquées
   */
  function updateElement(id: string, updates: Partial<OverlayElement>): void {
    const index = elements.value.findIndex((el) => el.id === id);
    if (index !== -1) {
      const element = elements.value[index];
      // Remplacer l'élément entier pour garantir la réactivité
      elements.value[index] = {
        ...element,
        ...updates,
      };
      isDirty.value = true;
    }
  }

  /**
   * Met à jour la position d'un élément
   */
  function updateElementPosition(id: string, position: Vector3): void {
    updateElement(id, { position });
  }

  /**
   * Met à jour la rotation d'un élément
   */
  function updateElementRotation(id: string, rotation: Vector3): void {
    updateElement(id, { rotation });
  }

  /**
   * Met à jour l'échelle d'un élément
   */
  function updateElementScale(id: string, scale: Vector3): void {
    updateElement(id, { scale });
  }

  /**
   * Duplique un élément
   */
  function duplicateElement(id: string): OverlayElement | null {
    const element = elements.value.find((el) => el.id === id);
    if (!element) return null;

    const duplicate: OverlayElement = {
      ...JSON.parse(JSON.stringify(element)),
      id: generateId(),
      name: `${element.name} (copie)`,
      position: {
        x: element.position.x + 0.5,
        y: element.position.y,
        z: element.position.z,
      },
    };

    elements.value.push(duplicate);
    selectedElementId.value = duplicate.id;

    return duplicate;
  }

  // ===== Actions - Sélection =====

  /**
   * Sélectionne un élément
   */
  function selectElement(id: string | null): void {
    selectedElementId.value = id;
  }

  /**
   * Désélectionne l'élément actuel
   */
  function deselectElement(): void {
    selectedElementId.value = null;
  }

  // ===== Actions - Mode d'édition =====

  /**
   * Change le mode d'édition
   */
  function setEditMode(mode: EditMode): void {
    editMode.value = mode;
  }

  /**
   * Active/désactive la grille
   */
  function toggleGrid(): void {
    showGrid.value = !showGrid.value;
  }

  // ===== Actions - Configuration =====

  /**
   * Retourne la configuration actuelle sous forme sérialisable
   */
  function getCurrentConfig(): OverlayConfigData {
    return {
      version: "1.0",
      canvas: {
        width: canvasWidth.value,
        height: canvasHeight.value,
      },
      elements: JSON.parse(JSON.stringify(elements.value)),
    };
  }

  /**
   * Migre les propriétés d'un élément pour ajouter les valeurs par défaut manquantes
   * Cela garantit la rétrocompatibilité avec les configurations créées avant l'ajout de nouvelles propriétés
   */
  function migrateElementProperties(element: OverlayElement): OverlayElement {
    const defaults = getDefaultProperties(element.type);

    // Pour les éléments poll, s'assurer que questionBoxStyle existe
    if (element.type === "poll") {
      const pollProps = element.properties as PollProperties;
      const pollDefaults = defaults as PollProperties;

      if (!pollProps.questionBoxStyle) {
        pollProps.questionBoxStyle = pollDefaults.questionBoxStyle;
      }
    }

    // Pour les éléments dice, migrer vers la nouvelle structure
    if (element.type === "dice") {
      const diceProps = element.properties as DiceProperties;
      const diceDefaults = defaults as DiceProperties;

      // Si l'ancienne structure existe (colors.baseColor), migrer vers la nouvelle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldProps = diceProps as any;
      if (oldProps.colors?.baseColor !== undefined && !diceProps.diceBox) {
        // Migration de l'ancienne structure vers la nouvelle
        diceProps.diceBox = {
          colors: {
            foreground:
              oldProps.colors?.numberColor ||
              diceDefaults.diceBox.colors.foreground,
            background:
              oldProps.colors?.baseColor ||
              diceDefaults.diceBox.colors.background,
            outline: "none",
          },
          texture: "none",
          material: "glass",
          lightIntensity: diceDefaults.diceBox.lightIntensity,
        };
        diceProps.hud = diceDefaults.hud;
        diceProps.colors = {
          criticalSuccessGlow:
            oldProps.colors?.criticalSuccessGlow ||
            diceDefaults.colors.criticalSuccessGlow,
          criticalFailureGlow:
            oldProps.colors?.criticalFailureGlow ||
            diceDefaults.colors.criticalFailureGlow,
        };
        // Nettoyer les anciennes propriétés
        delete oldProps.textures;
        delete oldProps.physics;
        delete oldProps.resultText;
        delete oldProps.layout;
      }

      // S'assurer que toutes les nouvelles propriétés existent
      if (!diceProps.diceBox) {
        diceProps.diceBox = diceDefaults.diceBox;
      } else if (diceProps.diceBox.lightIntensity === undefined) {
        // Migration pour ajouter lightIntensity aux configs existantes
        diceProps.diceBox.lightIntensity = diceDefaults.diceBox.lightIntensity;
      }
      if (!diceProps.hud) {
        diceProps.hud = diceDefaults.hud;
      }
    }

    return element;
  }

  /**
   * Charge une configuration
   */
  function loadConfig(config: OverlayConfigData): void {
    canvasWidth.value = config.canvas.width;
    canvasHeight.value = config.canvas.height;
    // Migrer les éléments pour ajouter les propriétés manquantes
    elements.value = config.elements.map(migrateElementProperties);
    selectedElementId.value = null;
    // Sauvegarder le snapshot initial et marquer comme propre
    lastSavedSnapshot.value = JSON.stringify(config);
    isDirty.value = false;
  }

  /**
   * Réinitialise l'éditeur
   */
  function resetEditor(): void {
    elements.value = [];
    selectedElementId.value = null;
    editMode.value = "translate";
    canvasWidth.value = 1920;
    canvasHeight.value = 1080;
    lastSavedSnapshot.value = null;
    isDirty.value = false;
  }

  /**
   * Marque la configuration actuelle comme sauvegardée
   */
  function markAsSaved(): void {
    lastSavedSnapshot.value = JSON.stringify(getCurrentConfig());
    isDirty.value = false;
  }

  /**
   * Restaure un snapshot de l'état (pour undo/redo)
   */
  function restoreSnapshot(snapshot: {
    elements: OverlayElement[];
    selectedElementId: string | null;
  }): void {
    elements.value = JSON.parse(JSON.stringify(snapshot.elements));
    selectedElementId.value = snapshot.selectedElementId;
  }

  return {
    // État
    configs,
    activeConfigId,
    loading,
    saving,
    elements,
    selectedElementId,
    editMode,
    gridSnap,
    showGrid,
    isDragging,
    canvasWidth,
    canvasHeight,
    isDirty,

    // Computed
    selectedElement,
    activeConfig,
    visibleElements,

    // Actions - Éléments
    addElement,
    removeElement,
    updateElement,
    updateElementPosition,
    updateElementRotation,
    updateElementScale,
    duplicateElement,

    // Actions - Sélection
    selectElement,
    deselectElement,

    // Actions - Mode
    setEditMode,
    toggleGrid,

    // Actions - Configuration
    getCurrentConfig,
    loadConfig,
    resetEditor,
    restoreSnapshot,
    markAsSaved,
  };
});
