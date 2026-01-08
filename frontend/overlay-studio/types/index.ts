/**
 * Types pour l'Overlay Studio
 */

/**
 * Types d'éléments disponibles dans l'éditeur
 * NOTE: Structure extensible - ajouter de nouveaux types ici
 */
export type OverlayElementType = "poll";

/**
 * Position 3D d'un élément
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// ===== INTERFACES RÉUTILISABLES =====

/**
 * Configuration de typographie - réutilisable pour tout texte
 */
export interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textShadow?: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

/**
 * Configuration de style de boîte - réutilisable pour tout conteneur
 */
export interface BoxStyleSettings {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Configuration d'animation - réutilisable
 */
export interface AnimationSettings {
  duration: number;
  easing: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
  delay: number;
}

/**
 * Configuration audio - réutilisable
 */
export interface AudioSettings {
  enabled: boolean;
  volume: number;
}

// ===== INTERFACES SPÉCIFIQUES AU POLL =====

/**
 * Couleurs des médailles selon le classement
 */
export interface MedalColors {
  gold: string;
  silver: string;
  bronze: string;
  base: string;
}

/**
 * Configuration de la barre de progression
 */
export interface ProgressBarConfig {
  height: number;
  backgroundColor: string;
  fillColor: string;
  fillGradient?: {
    enabled: boolean;
    startColor: string;
    endColor: string;
  };
  borderRadius: number;
  position: "top" | "bottom";
  showTimeText: boolean;
  timeTextStyle: TypographySettings;
}

/**
 * Configuration des animations du poll
 */
export interface PollAnimationsConfig {
  entry: {
    animation: AnimationSettings;
    slideDirection: "up" | "down" | "left" | "right";
    sound: AudioSettings;
    soundLeadTime: number;
  };
  loop: {
    music: AudioSettings;
  };
  exit: {
    animation: AnimationSettings;
  };
  result: {
    winnerEnlarge: {
      scale: number;
      duration: number;
    };
    loserFadeOut: {
      opacity: number;
      duration: number;
    };
    sound: AudioSettings;
    displayDuration: number;
  };
}

/**
 * Données mock pour l'aperçu dans le studio
 */
export interface PollMockData {
  question: string;
  options: string[];
  percentages: number[];
  timeRemaining: number;
  totalDuration: number;
}

/**
 * Propriétés spécifiques pour un élément poll (sondage)
 */
export interface PollProperties {
  questionStyle: TypographySettings;
  optionBoxStyle: BoxStyleSettings;
  optionTextStyle: TypographySettings;
  optionPercentageStyle: TypographySettings;
  optionSpacing: number;
  medalColors: MedalColors;
  progressBar: ProgressBarConfig;
  animations: PollAnimationsConfig;
  layout: {
    maxWidth: number;
    minOptionsToShow: number;
    maxOptionsToShow: number;
  };
  mockData: PollMockData;
}

/**
 * Union des propriétés possibles
 * NOTE: Ajouter de nouveaux types de propriétés ici
 */
export type ElementProperties = PollProperties;

/**
 * Élément dans l'overlay
 */
export interface OverlayElement {
  id: string;
  type: OverlayElementType;
  name: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  visible: boolean;
  locked: boolean;
  properties: ElementProperties;
}

/**
 * Configuration du canvas
 */
export interface CanvasConfig {
  width: number;
  height: number;
}

/**
 * Configuration complète d'un overlay
 */
export interface OverlayConfigData {
  version: string;
  canvas: CanvasConfig;
  elements: OverlayElement[];
}

/**
 * Configuration d'overlay avec métadonnées
 */
export interface OverlayConfig {
  id: string;
  streamerId: string;
  name: string;
  config: OverlayConfigData;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mode d'édition pour les TransformControls
 */
export type EditMode = "translate" | "rotate" | "scale";

/**
 * État de l'éditeur
 */
export interface EditorState {
  selectedElementId: string | null;
  editMode: EditMode;
  gridSnap: number;
  showGrid: boolean;
  isDragging: boolean;
}
