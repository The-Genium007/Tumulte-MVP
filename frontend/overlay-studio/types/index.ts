/**
 * Types pour l'Overlay Studio
 */

// Réexporter DiceRollEvent depuis les types principaux
export type { DiceRollEvent } from '~/types'

/**
 * Types d'éléments disponibles dans l'éditeur
 * NOTE: Structure extensible - ajouter de nouveaux types ici
 *
 * diceReverseGoalBar et diceReverseImpactHud sont des sous-types de diceReverse
 * Quand on ajoute "Inversion" dans le sidebar, les deux sont créés ensemble
 */
export type OverlayElementType =
  | 'poll'
  | 'dice'
  | 'diceReverse' // Legacy/parent type (kept for backward compatibility)
  | 'diceReverseGoalBar' // Goal Bar - barre de progression style Twitch
  | 'diceReverseImpactHud' // Impact HUD - animation slam

/**
 * Position 3D d'un élément
 */
export interface Vector3 {
  x: number
  y: number
  z: number
}

// ===== INTERFACES RÉUTILISABLES =====

/**
 * Configuration de typographie - réutilisable pour tout texte
 */
export interface TypographySettings {
  fontFamily: string
  fontSize: number
  fontWeight: number
  color: string
  textShadow?: {
    enabled: boolean
    color: string
    blur: number
    offsetX: number
    offsetY: number
  }
}

/**
 * Configuration de style de boîte - réutilisable pour tout conteneur
 */
export interface BoxStyleSettings {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius:
    | number
    | {
        topLeft: number
        topRight: number
        bottomRight: number
        bottomLeft: number
      }
  opacity: number
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

/**
 * Configuration d'animation - réutilisable
 */
export interface AnimationSettings {
  duration: number
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  delay: number
}

/**
 * Configuration audio - réutilisable
 */
export interface AudioSettings {
  enabled: boolean
  volume: number
}

// ===== INTERFACES SPÉCIFIQUES AU POLL =====

/**
 * Couleurs des médailles selon le classement
 */
export interface MedalColors {
  gold: string
  silver: string
  bronze: string
  base: string
}

/**
 * Configuration de la barre de progression
 */
export interface ProgressBarConfig {
  height: number
  backgroundColor: string
  fillColor: string
  fillGradient?: {
    enabled: boolean
    startColor: string
    endColor: string
  }
  borderRadius: number
  position: 'top' | 'bottom'
  showTimeText: boolean
  timeTextStyle: TypographySettings
}

/**
 * Configuration des animations du poll
 */
export interface PollAnimationsConfig {
  entry: {
    animation: AnimationSettings
    slideDirection: 'up' | 'down' | 'left' | 'right'
    sound: AudioSettings
    soundLeadTime: number
  }
  loop: {
    music: AudioSettings
  }
  exit: {
    animation: AnimationSettings
  }
  result: {
    winnerEnlarge: {
      scale: number
      duration: number
    }
    loserFadeOut: {
      opacity: number
      duration: number
    }
    sound: AudioSettings
    displayDuration: number
  }
}

/**
 * Données mock pour l'aperçu dans le studio
 */
export interface PollMockData {
  question: string
  options: string[]
  percentages: number[]
  timeRemaining: number
  totalDuration: number
}

// ===== INTERFACES GAMIFICATION POLL =====

/**
 * Configuration du timer gamifié
 */
export interface PollTimerConfig {
  showBadge: boolean // Afficher le badge ⏱ visible
  urgentThreshold: number // Seuil en secondes pour mode urgent (défaut: 10)
  urgentColor: string // Couleur du timer en mode urgent
}

/**
 * Configuration de la barre de temps gamifiée
 */
export interface PollTimeBarConfig {
  enabled: boolean // Afficher la barre de temps
  shimmerEnabled: boolean // Effet shimmer sur la barre
  glowEdgeEnabled: boolean // Glow au bord de la progression
  shakeWhenUrgent: boolean // Tremblement quand < urgentThreshold
  shakeIntensity: number // Intensité du shake (1-10)
}

/**
 * Configuration du leader (option en tête)
 */
export interface PollLeaderConfig {
  showCrown: boolean // Afficher 👑 sur le leader
  pulseAnimation: boolean // Animation de pulsation sur le leader
  changeSound: AudioSettings // Son quand le leader change
}

/**
 * Configuration de l'affichage des résultats
 */
export interface PollResultConfig {
  displayDuration: number // Durée d'affichage en ms (défaut: 5000)
  winnerColor: string // Couleur du/des gagnant(s) (défaut: #FFD700 doré)
  winnerScale: number // Zoom sur le gagnant (défaut: 1.05)
  winnerGlow: boolean // Glow doré autour du gagnant
  winnerGlowColor: string // Couleur du glow (défaut: #FFD700)
  loserFadeOut: boolean // Fade-out des perdants
  loserFadeDuration: number // Durée du fade en ms
  loserFinalOpacity: number // Opacité finale des perdants (0 = invisible)
}

/**
 * Configuration des ex-aequo
 */
export interface PollTieBreakerConfig {
  showAllWinners: boolean // Afficher tous les ex-aequo en doré
  titleText: string // Texte affiché (défaut: "EX-ÆQUO !")
}

/**
 * Configuration complète de la gamification du poll
 */
export interface PollGamificationConfig {
  timer: PollTimerConfig
  timeBar: PollTimeBarConfig
  leader: PollLeaderConfig
  result: PollResultConfig
  tieBreaker: PollTieBreakerConfig
}

/**
 * Propriétés spécifiques pour un élément poll (sondage)
 */
export interface PollProperties {
  questionStyle: TypographySettings
  questionBoxStyle: BoxStyleSettings
  optionBoxStyle: BoxStyleSettings
  optionTextStyle: TypographySettings
  optionPercentageStyle: TypographySettings
  optionSpacing: number
  medalColors: MedalColors
  progressBar: ProgressBarConfig
  animations: PollAnimationsConfig
  gamification: PollGamificationConfig
  layout: {
    maxWidth: number
    minOptionsToShow: number
    maxOptionsToShow: number
  }
  mockData: PollMockData
}

// ===== INTERFACES SPÉCIFIQUES AU DICE =====

/**
 * Types de dés supportés
 * Standard: d4, d6, d8, d10, d12, d20, d100 (Zocchihedron)
 * Exotiques: d3, d5, d7, d14, d16, d24, d30
 */
export type DiceType =
  | 'd4'
  | 'd6'
  | 'd8'
  | 'd10'
  | 'd12'
  | 'd20'
  | 'd100'
  | 'd3'
  | 'd5'
  | 'd7'
  | 'd14'
  | 'd16'
  | 'd24'
  | 'd30'

/**
 * Textures disponibles pour les dés (dice-box-threejs)
 */
export type DiceTexture =
  | 'none'
  | ''
  | 'cloudy'
  | 'cloudy_2'
  | 'fire'
  | 'marble'
  | 'water'
  | 'ice'
  | 'paper'
  | 'speckles'
  | 'glitter'
  | 'glitter_2'
  | 'stars'
  | 'stainedglass'
  | 'wood'
  | 'metal'
  | 'skulls'
  | 'leopard'
  | 'tiger'
  | 'cheetah'
  | 'dragon'
  | 'lizard'
  | 'bird'
  | 'astral'

/**
 * Matériaux disponibles pour les dés
 */
export type DiceMaterial = 'none' | 'metal' | 'wood' | 'glass'

/**
 * Configuration des couleurs personnalisées du dé
 */
export interface DiceCustomColors {
  foreground: string // Couleur des chiffres
  background: string // Couleur du dé
  outline: string // Contour ("none" ou couleur)
}

/**
 * Configuration DiceBox (rendu 3D des dés)
 */
export interface DiceBoxConfig {
  colors: DiceCustomColors
  texture: DiceTexture
  material: DiceMaterial
  lightIntensity: number
}

/**
 * Configuration des couleurs des critiques (glow animations)
 */
export interface DiceCriticalColors {
  criticalSuccessGlow: string
  criticalFailureGlow: string
}

/**
 * Configuration audio des dés
 */
export interface DiceAudioConfig {
  rollSound: AudioSettings
  criticalSuccessSound: AudioSettings
  criticalFailureSound: AudioSettings
}

/**
 * Configuration des animations des dés
 */
export interface DiceAnimationsConfig {
  entry: {
    type: 'drop' | 'throw' | 'appear'
    duration: number
  }
  settle: {
    timeout: number
  }
  result: {
    glowIntensity: number
    glowDuration: number
  }
  exit: {
    type: 'fade' | 'fall'
    duration: number
    delay: number
  }
}

/**
 * Données mock pour l'aperçu des dés dans le studio
 */
export interface DiceMockData {
  rollFormula: string
  diceTypes: DiceType[]
  diceValues: number[]
  isCritical: boolean
  criticalType: 'success' | 'failure' | null
}

// ===== INTERFACES HUD DICE =====

/**
 * Style du conteneur HUD
 */
export interface HudContainerStyle {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
  backdropBlur: number
  boxShadow: {
    enabled: boolean
    color: string
    blur: number
    offsetX: number
    offsetY: number
  }
}

/**
 * Style des badges critiques
 */
export interface HudCriticalBadgeStyle {
  successBackground: string
  successTextColor: string
  successBorderColor: string
  failureBackground: string
  failureTextColor: string
  failureBorderColor: string
}

/**
 * Style de la formule de lancer
 */
export interface HudFormulaStyle {
  typography: TypographySettings
}

/**
 * Style du résultat principal
 */
export interface HudResultStyle {
  typography: TypographySettings
  criticalSuccessColor: string
  criticalFailureColor: string
}

/**
 * Style du breakdown des dés
 */
export interface HudDiceBreakdownStyle {
  backgroundColor: string
  borderColor: string
  borderRadius: number
  typography: TypographySettings
}

/**
 * Style des infos de compétence
 */
export interface HudSkillInfoStyle {
  backgroundColor: string
  borderColor: string
  borderRadius: number
  skillTypography: TypographySettings
  abilityTypography: TypographySettings
}

/**
 * Configuration complète du HUD Dice
 */
export interface DiceHudConfig {
  container: HudContainerStyle
  criticalBadge: HudCriticalBadgeStyle
  formula: HudFormulaStyle
  result: HudResultStyle
  diceBreakdown: HudDiceBreakdownStyle
  skillInfo: HudSkillInfoStyle
  minWidth: number
  maxWidth: number
}

/**
 * Transform indépendant pour le HUD (position et scale)
 * Permet de positionner le HUD séparément de la zone 3D des dés
 */
export interface HudTransform {
  position: {
    x: number // Position X en coordonnées canvas (-960 à 960)
    y: number // Position Y en coordonnées canvas (-540 à 540, Y inversé)
  }
  scale: number // Scale uniforme (1 = 100%)
}

/**
 * Propriétés spécifiques pour un élément dice (dés 3D)
 */
export interface DiceProperties {
  diceBox: DiceBoxConfig
  hud: DiceHudConfig
  hudTransform: HudTransform
  colors: DiceCriticalColors
  audio: DiceAudioConfig
  animations: DiceAnimationsConfig
  mockData: DiceMockData
}

// ===== INTERFACES SPÉCIFIQUES AU DICE REVERSE =====

/**
 * Configuration du conteneur de la Goal Bar
 */
export interface DiceReverseContainerStyle {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  opacity: number
}

/**
 * Configuration de la barre de progression dice reverse
 */
export interface DiceReverseProgressBarStyle {
  height: number
  backgroundColor: string
  fillColor: string
  fillGradientEnabled: boolean
  fillGradientStart: string
  fillGradientEnd: string
  glowColor: string
}

/**
 * Configuration du shake de la Goal Bar
 */
export interface DiceReverseShakeConfig {
  startPercent: number // À quel % de progression le shake commence (0-100)
  maxIntensity: number // Intensité maximale du shake en pixels
}

/**
 * Configuration de l'animation d'entrée/sortie de la Goal Bar
 */
export interface DiceReverseGoalBarAnimationsConfig {
  entry: {
    duration: number
    easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  }
  exit: {
    duration: number
    easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  }
  success: {
    displayDuration: number // Durée d'affichage de l'animation de succès
  }
}

/**
 * Configuration audio de la Goal Bar
 */
export interface DiceReverseGoalBarAudioConfig {
  progressSound: AudioSettings
  successSound: AudioSettings
}

/**
 * Configuration du conteneur de l'Impact HUD
 */
export interface DiceReverseImpactContainerStyle {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
}

/**
 * Configuration de l'animation de l'Impact HUD
 */
export interface DiceReverseImpactAnimationsConfig {
  dropDistance: number // Distance de chute en pixels
  dropDuration: number // Durée de la chute en ms
  displayDuration: number // Durée d'affichage en ms
}

/**
 * Configuration audio de l'Impact HUD
 */
export interface DiceReverseImpactAudioConfig {
  impactSound: AudioSettings
}

/**
 * Typographie de la Goal Bar
 */
export interface DiceReverseGoalBarTypography {
  title: TypographySettings
  progress: TypographySettings
  timer: TypographySettings
}

/**
 * Typographie de l'Impact HUD
 */
export interface DiceReverseImpactTypography {
  title: TypographySettings
  detail: TypographySettings
}

/**
 * Transform de la Goal Bar (position indépendante)
 */
export interface DiceReverseGoalBarTransform {
  position: {
    x: number // Position X en coordonnées canvas (-960 à 960)
    y: number // Position Y en coordonnées canvas (-540 à 540)
  }
  scale: number
}

/**
 * Transform de l'Impact HUD (position indépendante)
 */
export interface DiceReverseImpactTransform {
  position: {
    x: number
    y: number
  }
  scale: number
}

/**
 * Données mock pour l'aperçu du dice reverse dans le studio
 */
export interface DiceReverseMockData {
  eventName: string
  currentProgress: number
  objectiveTarget: number
  timeRemaining: number
  isComplete: boolean
}

/**
 * Propriétés spécifiques pour un élément dice reverse (Goal Bar + Impact HUD)
 * @deprecated Utilisé uniquement pour la rétrocompatibilité, préférer DiceReverseGoalBarProperties et DiceReverseImpactHudProperties
 */
export interface DiceReverseProperties {
  // Goal Bar (barre de progression style Twitch Goal)
  goalBar: {
    container: DiceReverseContainerStyle
    progressBar: DiceReverseProgressBarStyle
    shake: DiceReverseShakeConfig
    animations: DiceReverseGoalBarAnimationsConfig
    audio: DiceReverseGoalBarAudioConfig
    typography: DiceReverseGoalBarTypography
    transform: DiceReverseGoalBarTransform
    width: number // Largeur de la Goal Bar en pixels
  }
  // Impact HUD (animation slam quand l'action s'exécute)
  impactHud: {
    container: DiceReverseImpactContainerStyle
    animations: DiceReverseImpactAnimationsConfig
    audio: DiceReverseImpactAudioConfig
    typography: DiceReverseImpactTypography
    transform: DiceReverseImpactTransform
  }
  // Données mock pour l'aperçu
  mockData: DiceReverseMockData
}

/**
 * Propriétés pour l'élément Goal Bar (barre de progression style Twitch)
 * Élément indépendant avec son propre gizmo et position
 */
export interface DiceReverseGoalBarProperties {
  container: DiceReverseContainerStyle
  progressBar: DiceReverseProgressBarStyle
  shake: DiceReverseShakeConfig
  animations: DiceReverseGoalBarAnimationsConfig
  audio: DiceReverseGoalBarAudioConfig
  typography: DiceReverseGoalBarTypography
  width: number // Largeur de la Goal Bar en pixels (base size for gizmo)
  height: number // Hauteur calculée de la Goal Bar en pixels
  mockData: DiceReverseMockData
}

/**
 * Propriétés pour l'élément Impact HUD (animation slam)
 * Élément indépendant avec son propre gizmo et position
 */
export interface DiceReverseImpactHudProperties {
  container: DiceReverseImpactContainerStyle
  animations: DiceReverseImpactAnimationsConfig
  audio: DiceReverseImpactAudioConfig
  typography: DiceReverseImpactTypography
  width: number // Largeur du HUD en pixels (base size for gizmo)
  height: number // Hauteur du HUD en pixels
}

/**
 * Union des propriétés possibles
 * NOTE: Ajouter de nouveaux types de propriétés ici
 */
export type ElementProperties =
  | PollProperties
  | DiceProperties
  | DiceReverseProperties
  | DiceReverseGoalBarProperties
  | DiceReverseImpactHudProperties

/**
 * Élément dans l'overlay
 */
export interface OverlayElement {
  id: string
  type: OverlayElementType
  name: string
  position: Vector3
  rotation: Vector3
  scale: Vector3
  visible: boolean
  locked: boolean
  zIndex: number // Ordre des calques (0 = base, valeurs plus hautes = au-dessus)
  properties: ElementProperties
}

/**
 * Configuration du canvas
 */
export interface CanvasConfig {
  width: number
  height: number
}

/**
 * Configuration complète d'un overlay
 */
export interface OverlayConfigData {
  version: string
  canvas: CanvasConfig
  elements: OverlayElement[]
}

/**
 * Configuration d'overlay avec métadonnées
 */
export interface OverlayConfig {
  id: string
  streamerId: string
  name: string
  config: OverlayConfigData
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Mode d'édition pour les TransformControls
 */
export type EditMode = 'translate' | 'rotate' | 'scale'

/**
 * État de l'éditeur
 */
export interface EditorState {
  selectedElementId: string | null
  editMode: EditMode
  gridSnap: number
  showGrid: boolean
  isDragging: boolean
}
