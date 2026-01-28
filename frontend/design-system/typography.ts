/**
 * Typography Presets - Tumulte Design System
 *
 * Échelle typographique cohérente pour tout le projet.
 *
 * RAPPEL FONTS:
 * - Inter: Texte principal (font-sans)
 * - Aoboshi One: Headings (font-heading, uppercase automatique)
 * - Monospace: Code et valeurs techniques (font-mono)
 */

// =============================================================================
// TEXT SIZES
// =============================================================================
// Référence des tailles Tailwind

export const textSizes = {
  xs: 'text-xs', // 12px - Metadata, timestamps
  sm: 'text-sm', // 14px - Texte secondaire
  base: 'text-base', // 16px - Texte par défaut
  lg: 'text-lg', // 18px - Titres mineurs
  xl: 'text-xl', // 20px - Titres de cards
  '2xl': 'text-2xl', // 24px - Titres de sections
  '3xl': 'text-3xl', // 30px - Titres de pages
  '4xl': 'text-4xl', // 36px - Display
  '5xl': 'text-5xl', // 48px - Hero
  '6xl': 'text-6xl', // 60px - Hero large
} as const

// =============================================================================
// FONT WEIGHTS
// =============================================================================

export const fontWeights = {
  normal: 'font-normal', // 400
  medium: 'font-medium', // 500
  semibold: 'font-semibold', // 600
  bold: 'font-bold', // 700
} as const

// =============================================================================
// HEADING PRESETS
// =============================================================================
// Classes composées pour les titres

export const headingPresets = {
  /** Titre de page principal */
  page: 'text-2xl sm:text-3xl font-bold text-primary',

  /** Titre de section */
  section: 'text-xl sm:text-2xl font-semibold text-primary',

  /** Titre de card */
  card: 'text-lg sm:text-xl font-semibold text-primary',

  /** Titre de sous-section */
  subsection: 'text-base sm:text-lg font-medium text-primary',

  /** Petit titre / label important */
  label: 'text-sm font-semibold text-primary',
} as const

// =============================================================================
// BODY TEXT PRESETS
// =============================================================================
// Classes composées pour le corps de texte

export const bodyPresets = {
  /** Texte par défaut */
  default: 'text-base text-secondary',

  /** Texte plus petit */
  small: 'text-sm text-secondary',

  /** Texte atténué */
  muted: 'text-sm text-muted',

  /** Caption / légende */
  caption: 'text-xs text-muted',

  /** Texte d'erreur */
  error: 'text-sm text-error-600',

  /** Texte de succès */
  success: 'text-sm text-success-600',
} as const

// =============================================================================
// RESPONSIVE TYPOGRAPHY
// =============================================================================
// Échelles responsive standardisées

export const responsiveText = {
  /** Hero - Très grand titre */
  hero: 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl',

  /** H1 - Titre de page */
  h1: 'text-2xl sm:text-3xl lg:text-4xl',

  /** H2 - Titre de section */
  h2: 'text-xl sm:text-2xl lg:text-3xl',

  /** H3 - Titre de card/sous-section */
  h3: 'text-lg sm:text-xl',

  /** Body responsive */
  body: 'text-sm sm:text-base',

  /** Caption responsive */
  caption: 'text-xs sm:text-sm',
} as const

// =============================================================================
// LINE HEIGHT
// =============================================================================

export const lineHeights = {
  none: 'leading-none', // 1
  tight: 'leading-tight', // 1.25
  snug: 'leading-snug', // 1.375
  normal: 'leading-normal', // 1.5
  relaxed: 'leading-relaxed', // 1.625
  loose: 'leading-loose', // 2
} as const

// =============================================================================
// TEXT COLORS
// =============================================================================
// Couleurs de texte sémantiques

export const textColors = {
  primary: 'text-primary', // Texte principal
  secondary: 'text-secondary', // Texte secondaire
  muted: 'text-muted', // Texte atténué
  disabled: 'text-disabled', // Texte désactivé
  inverse: 'text-inverse', // Texte sur fond sombre
  error: 'text-error-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  info: 'text-info-600',
} as const

// =============================================================================
// COMPOSABLE CLASSES
// =============================================================================
// Fonctions utilitaires pour composer des classes

/**
 * Compose une classe de heading complète
 */
export function heading(
  size: keyof typeof textSizes,
  weight: keyof typeof fontWeights = 'semibold',
  color: keyof typeof textColors = 'primary'
): string {
  return `${textSizes[size]} ${fontWeights[weight]} ${textColors[color]}`
}

/**
 * Compose une classe de body text complète
 */
export function body(
  size: keyof typeof textSizes = 'base',
  color: keyof typeof textColors = 'secondary'
): string {
  return `${textSizes[size]} ${textColors[color]}`
}
