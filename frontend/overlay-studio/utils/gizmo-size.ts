/**
 * Utilitaires pour le calcul de la taille du gizmo
 * Centralise les constantes et fonctions partagées entre TransformGizmo et StudioCanvas
 */

import type {
  PollProperties,
  DiceReverseGoalBarProperties,
  DiceReverseImpactHudProperties,
} from '../types'

// ===== CONSTANTES DE CONFIGURATION DU GIZMO =====

/**
 * Padding de sécurité autour de l'élément pour le gizmo (en pixels canvas)
 */
export const GIZMO_PADDING = 20

/**
 * Facteurs de conversion CSS → Canvas pour le Poll
 * Le composant Html de TresJS avec scale="50" rend le contenu CSS dans l'espace 3D
 * Ces facteurs sont ajustés empiriquement pour que le gizmo englobe le Poll correctement
 */
export const POLL_CSS_TO_CANVAS_WIDTH = 1.25
export const POLL_CSS_TO_CANVAS_HEIGHT = 1.7

// ===== FONCTIONS DE CALCUL =====

/**
 * Calcule la taille CSS théorique du Poll basée sur ses propriétés
 * @param pollProps - Les propriétés du Poll
 * @returns La largeur et hauteur en pixels CSS
 */
export const calculatePollCssSize = (
  pollProps: PollProperties
): { width: number; height: number } => {
  const optionCount = pollProps.mockData.options.length
  const qbs = pollProps.questionBoxStyle // Container padding
  const obs = pollProps.optionBoxStyle
  const qs = pollProps.questionStyle
  const ots = pollProps.optionTextStyle
  const pb = pollProps.progressBar

  // Largeur = maxWidth configuré
  const width = pollProps.layout.maxWidth

  // Hauteur = somme de tous les éléments verticaux
  // 1. Padding top/bottom du container
  const paddingTop = qbs.padding.top
  const paddingBottom = qbs.padding.bottom

  // 2. Question: fontSize + margin-bottom (24px dans le CSS)
  const questionHeight = qs.fontSize * 1.2 + 24 // line-height ~1.2

  // 3. Options: chaque option = padding + texte + barre + gap
  const optionPaddingV = obs.padding.top + obs.padding.bottom
  const optionTextHeight = ots.fontSize * 1.2 // line-height ~1.2
  const optionBarMargin = 8 // margin-bottom du texte
  const optionBarHeight = 6 // .option-bar-container height
  const singleOptionHeight = optionPaddingV + optionTextHeight + optionBarMargin + optionBarHeight
  const optionsHeight =
    singleOptionHeight * optionCount + pollProps.optionSpacing * (optionCount - 1)

  // 4. Progress bar: margin-top (24px) + height + texte si affiché
  const progressMargin = 24
  const progressHeight = pb.height + (pb.showTimeText ? pb.timeTextStyle.fontSize * 1.2 : 0)

  // Total
  const height =
    paddingTop + questionHeight + optionsHeight + progressMargin + progressHeight + paddingBottom

  return { width, height }
}

/**
 * Calcule la taille du gizmo pour un Poll en coordonnées canvas
 * @param pollProps - Les propriétés du Poll
 * @returns La largeur et hauteur du gizmo en coordonnées canvas
 */
export const calculatePollGizmoSize = (
  pollProps: PollProperties
): { width: number; height: number } => {
  const { width, height } = calculatePollCssSize(pollProps)

  return {
    width: (width + GIZMO_PADDING * 2) * POLL_CSS_TO_CANVAS_WIDTH,
    height: (height + GIZMO_PADDING * 2) * POLL_CSS_TO_CANVAS_HEIGHT,
  }
}

/**
 * Taille du gizmo pour les dés (couvre tout le canvas 1920x1080)
 * Les dés utilisent l'espace complet comme arène de simulation 3D
 */
export const DICE_GIZMO_SIZE = {
  width: 1920,
  height: 1080,
}

/**
 * Taille de base du HUD des dés pour le calcul du gizmo
 * Dimensions ajustées pour englober correctement le panneau de résultats
 */
export const HUD_BASE_SIZE = {
  width: 380,
  height: 210,
}

/**
 * Facteur de conversion CSS → Canvas pour le HUD
 * Similaire au Poll, ajusté pour que le gizmo englobe correctement le HUD
 */
export const HUD_CSS_TO_CANVAS = 1.0

/**
 * Taille par défaut du gizmo pour les types non reconnus
 */
export const DEFAULT_GIZMO_SIZE = {
  width: 100,
  height: 100,
}

// ===== DICE REVERSE GIZMO SIZES =====

/**
 * Facteurs de conversion CSS → Canvas pour les éléments DiceReverse
 * Similaire au Poll, ajustés empiriquement pour que le gizmo englobe correctement les éléments
 * Le composant Html de TresJS avec scale="50" affecte le rendu
 */
export const DICE_REVERSE_CSS_TO_CANVAS_WIDTH = 1.25
export const DICE_REVERSE_CSS_TO_CANVAS_HEIGHT = 1.7

/**
 * Calcule la taille du gizmo pour une Goal Bar
 * @param props - Les propriétés de la Goal Bar
 * @returns La largeur et hauteur du gizmo en coordonnées canvas
 */
export const calculateGoalBarGizmoSize = (
  props: DiceReverseGoalBarProperties
): { width: number; height: number } => {
  // La Goal Bar a une structure CSS avec:
  // - padding: 16px 20px dans .goal-container
  // - hauteur = header (titre ~28px + stats) + progress bar (height prop) + marges
  const cssWidth = props.width
  // Calculer la hauteur CSS approximative basée sur le contenu
  const headerHeight = 28 + 14 // titre + margin-bottom
  const progressBarHeight = props.progressBar.height
  const containerPadding = 16 * 2 // top + bottom padding
  const cssHeight = headerHeight + progressBarHeight + containerPadding

  return {
    width: (cssWidth + GIZMO_PADDING * 2) * DICE_REVERSE_CSS_TO_CANVAS_WIDTH,
    height: (cssHeight + GIZMO_PADDING * 2) * DICE_REVERSE_CSS_TO_CANVAS_HEIGHT,
  }
}

/**
 * Calcule la taille du gizmo pour un Impact HUD
 * @param props - Les propriétés de l'Impact HUD
 * @returns La largeur et hauteur du gizmo en coordonnées canvas
 */
export const calculateImpactHudGizmoSize = (
  props: DiceReverseImpactHudProperties
): { width: number; height: number } => {
  // L'Impact HUD a une structure CSS avec:
  // - padding: 20px 32px dans .impact-container
  // - titre (fontSize + margin-bottom) + detail (fontSize)
  const cssWidth = props.width
  // Calculer la hauteur CSS approximative basée sur la typographie
  const titleHeight = props.typography.title.fontSize * 1.2 + 8 // line-height + margin-bottom
  const detailHeight = props.typography.detail.fontSize * 1.2
  const containerPadding = 20 * 2 // top + bottom padding
  const cssHeight = titleHeight + detailHeight + containerPadding

  return {
    width: (cssWidth + GIZMO_PADDING * 2) * DICE_REVERSE_CSS_TO_CANVAS_WIDTH,
    height: (cssHeight + GIZMO_PADDING * 2) * DICE_REVERSE_CSS_TO_CANVAS_HEIGHT,
  }
}
