/**
 * Utilitaires pour le calcul de la taille du gizmo
 * Centralise les constantes et fonctions partagées entre TransformGizmo et StudioCanvas
 */

import type { PollProperties } from "../types";

// ===== CONSTANTES DE CONFIGURATION DU GIZMO =====

/**
 * Padding de sécurité autour de l'élément pour le gizmo (en pixels canvas)
 */
export const GIZMO_PADDING = 20;

/**
 * Facteurs de conversion CSS → Canvas pour le Poll
 * Le composant Html de TresJS avec scale="50" rend le contenu CSS dans l'espace 3D
 * Ces facteurs sont ajustés empiriquement pour que le gizmo englobe le Poll correctement
 */
export const POLL_CSS_TO_CANVAS_WIDTH = 1.25;
export const POLL_CSS_TO_CANVAS_HEIGHT = 1.7;

// ===== FONCTIONS DE CALCUL =====

/**
 * Calcule la taille CSS théorique du Poll basée sur ses propriétés
 * @param pollProps - Les propriétés du Poll
 * @returns La largeur et hauteur en pixels CSS
 */
export const calculatePollCssSize = (
  pollProps: PollProperties,
): { width: number; height: number } => {
  const optionCount = pollProps.mockData.options.length;
  const qbs = pollProps.questionBoxStyle; // Container padding
  const obs = pollProps.optionBoxStyle;
  const qs = pollProps.questionStyle;
  const ots = pollProps.optionTextStyle;
  const pb = pollProps.progressBar;

  // Largeur = maxWidth configuré
  const width = pollProps.layout.maxWidth;

  // Hauteur = somme de tous les éléments verticaux
  // 1. Padding top/bottom du container
  const paddingTop = qbs.padding.top;
  const paddingBottom = qbs.padding.bottom;

  // 2. Question: fontSize + margin-bottom (24px dans le CSS)
  const questionHeight = qs.fontSize * 1.2 + 24; // line-height ~1.2

  // 3. Options: chaque option = padding + texte + barre + gap
  const optionPaddingV = obs.padding.top + obs.padding.bottom;
  const optionTextHeight = ots.fontSize * 1.2; // line-height ~1.2
  const optionBarMargin = 8; // margin-bottom du texte
  const optionBarHeight = 6; // .option-bar-container height
  const singleOptionHeight =
    optionPaddingV + optionTextHeight + optionBarMargin + optionBarHeight;
  const optionsHeight =
    singleOptionHeight * optionCount +
    pollProps.optionSpacing * (optionCount - 1);

  // 4. Progress bar: margin-top (24px) + height + texte si affiché
  const progressMargin = 24;
  const progressHeight =
    pb.height + (pb.showTimeText ? pb.timeTextStyle.fontSize * 1.2 : 0);

  // Total
  const height =
    paddingTop +
    questionHeight +
    optionsHeight +
    progressMargin +
    progressHeight +
    paddingBottom;

  return { width, height };
};

/**
 * Calcule la taille du gizmo pour un Poll en coordonnées canvas
 * @param pollProps - Les propriétés du Poll
 * @returns La largeur et hauteur du gizmo en coordonnées canvas
 */
export const calculatePollGizmoSize = (
  pollProps: PollProperties,
): { width: number; height: number } => {
  const { width, height } = calculatePollCssSize(pollProps);

  return {
    width: (width + GIZMO_PADDING * 2) * POLL_CSS_TO_CANVAS_WIDTH,
    height: (height + GIZMO_PADDING * 2) * POLL_CSS_TO_CANVAS_HEIGHT,
  };
};

/**
 * Taille du gizmo pour les dés (couvre tout le canvas)
 */
export const DICE_GIZMO_SIZE = {
  width: 1920 / 2,
  height: 1080 / 2,
};

/**
 * Taille par défaut du gizmo pour les types non reconnus
 */
export const DEFAULT_GIZMO_SIZE = {
  width: 100,
  height: 100,
};
