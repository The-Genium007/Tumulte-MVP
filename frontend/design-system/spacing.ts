/**
 * Spacing Presets - Tumulte Design System
 *
 * Classes Tailwind standardisées pour l'espacement.
 * Utiliser ces presets plutôt que des valeurs arbitraires.
 *
 * RÈGLE D'OR:
 * - gap-2 (8px)  → Éléments inline (icône + texte)
 * - gap-3 (12px) → Éléments inline espacés
 * - gap-4 (16px) → Groupes d'éléments
 * - gap-6 (24px) → Sections dans un container
 * - gap-8 (32px) → Grandes sections de page
 */

// =============================================================================
// GAP PRESETS
// =============================================================================
// Pour flex et grid layouts

export const gapPresets = {
  /** 8px - Éléments très proches (icône + texte) */
  inline: 'gap-2',

  /** 12px - Éléments inline avec plus d'espace */
  inlineLoose: 'gap-3',

  /** 16px - Groupes d'éléments */
  group: 'gap-4',

  /** 24px - Sections dans un container */
  section: 'gap-6',

  /** 32px - Grandes sections */
  page: 'gap-8',

  /** 48px - Séparation majeure */
  major: 'gap-12',
} as const

// Classes Tailwind directes
export const gap = {
  2: 'gap-2', // 8px
  3: 'gap-3', // 12px
  4: 'gap-4', // 16px
  6: 'gap-6', // 24px
  8: 'gap-8', // 32px
  12: 'gap-12', // 48px
} as const

// =============================================================================
// PADDING PRESETS
// =============================================================================

export const paddingPresets = {
  /** Cards standards - aligné avec rounded-[2rem] */
  card: 'p-6',

  /** Cards compactes */
  cardSm: 'p-4',

  /** Sections de page */
  section: 'py-8 lg:py-12',

  /** Sections hero */
  sectionLg: 'py-12 lg:py-20',

  /** Container horizontal responsive */
  containerX: 'px-4 sm:px-6 lg:px-8',

  /** Inputs et boutons */
  input: 'px-4 py-2',

  /** Boutons compacts */
  buttonSm: 'px-3 py-1.5',
} as const

// =============================================================================
// SPACE-Y PRESETS
// =============================================================================
// Pour espacement vertical entre éléments

export const spacePresets = {
  /** Contenu serré */
  tight: 'space-y-2',

  /** Contenu standard */
  content: 'space-y-4',

  /** Entre sections */
  section: 'space-y-6',

  /** Entre grandes sections */
  page: 'space-y-8',

  /** Séparation majeure */
  major: 'space-y-12',
} as const

// =============================================================================
// RESPONSIVE SPACING
// =============================================================================
// Patterns responsive standardisés

export const responsiveSpacing = {
  /** Padding horizontal de container */
  containerPx: 'px-4 sm:px-6 lg:px-8',

  /** Padding vertical de section */
  sectionPy: 'py-8 lg:py-12',

  /** Padding vertical de section large */
  sectionPyLg: 'py-12 lg:py-20',

  /** Gap de grid responsive */
  gridGap: 'gap-4 sm:gap-6',

  /** Gap de grid large */
  gridGapLg: 'gap-6 sm:gap-8',

  /** Padding de card responsive */
  cardPadding: 'p-4 sm:p-6',
} as const

// =============================================================================
// MARGIN PRESETS
// =============================================================================

export const marginPresets = {
  /** Centrage horizontal */
  centerX: 'mx-auto',

  /** Espacement entre éléments de liste */
  listItem: 'mb-4',

  /** Séparation de section */
  sectionBottom: 'mb-8',

  /** Séparation de page */
  pageBottom: 'mb-12',
} as const
