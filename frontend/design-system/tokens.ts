/**
 * Design Tokens - Tumulte Design System
 *
 * Valeurs centralisées pour garantir la cohérence visuelle.
 * Ces tokens sont la source de vérité pour tous les composants.
 */

// =============================================================================
// SPACING SCALE
// =============================================================================
// Basé sur une échelle de 4px (0.25rem)
// Utiliser ces valeurs pour tous les paddings, margins, gaps

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
} as const

// =============================================================================
// BORDER RADIUS
// =============================================================================
// Limité à 3 valeurs principales pour la cohérence

export const radius = {
  none: '0',
  sm: '0.5rem', // 8px  - Inputs, buttons, petits containers
  md: '0.75rem', // 12px - Usage intermédiaire (rarement utilisé)
  lg: '1rem', // 16px - Cards secondaires
  xl: '1.5rem', // 24px - Cards moyennes
  '2xl': '2rem', // 32px - Cards principales, modals (UCard default)
  full: '9999px', // Avatars, badges, pills
} as const

// Presets sémantiques
export const radiusPresets = {
  input: 'rounded-lg', // 8px
  button: 'rounded-lg', // 8px
  card: 'rounded-[2rem]', // 32px - Aligné avec UCard
  cardSmall: 'rounded-xl', // 24px
  modal: 'rounded-[2rem]', // 32px
  avatar: 'rounded-full', // 50%
  badge: 'rounded-full', // 50%
  chip: 'rounded-full', // 50%
} as const

// =============================================================================
// BREAKPOINTS
// =============================================================================
// Tailwind defaults - pour référence

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  max: 9999,
} as const

// =============================================================================
// SHADOWS
// =============================================================================
// Usage minimal pour design épuré

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  // Brand shadow (doré)
  brand: '0 20px 40px rgba(216, 183, 144, 0.15)',
} as const

// =============================================================================
// TRANSITIONS
// =============================================================================

export const transitions = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const

export const easings = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const
