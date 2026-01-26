/**
 * Tumulte Design System
 *
 * Export centralisé de tous les design tokens et presets.
 *
 * Usage:
 * ```ts
 * import { gapPresets, headingPresets, radiusPresets } from '~/design-system'
 * ```
 */

// Tokens de base
export * from './tokens'

// Presets d'espacement
export * from './spacing'

// Presets typographiques
export * from './typography'

// =============================================================================
// QUICK REFERENCE - Classes Tailwind Standardisées
// =============================================================================
//
// GAPS (utiliser ces 5 valeurs):
// gap-2  (8px)  → Inline (icône + texte)
// gap-3  (12px) → Inline espacé
// gap-4  (16px) → Groupes
// gap-6  (24px) → Sections
// gap-8  (32px) → Pages
//
// BORDER RADIUS (utiliser ces 3 valeurs):
// rounded-lg      (8px)  → Inputs, buttons
// rounded-[2rem]  (32px) → Cards, modals
// rounded-full    (50%)  → Avatars, badges
//
// HEADINGS:
// .heading-page      → text-2xl sm:text-3xl font-bold text-primary
// .heading-section   → text-xl sm:text-2xl font-semibold text-primary
// .heading-card      → text-lg sm:text-xl font-semibold text-primary
// .heading-subsection → text-base sm:text-lg font-medium text-primary
//
// BODY TEXT:
// .text-body      → text-base text-secondary
// .text-body-sm   → text-sm text-secondary
// .text-muted     → text-sm text-muted
// .text-caption   → text-xs text-muted
//
// SPACING:
// .section-spacing → space-y-6
// .content-spacing → space-y-4
// .inline-spacing  → gap-2
// .group-spacing   → gap-4
//
// CONTAINERS:
// .container-page   → mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl
// .container-narrow → mx-auto px-4 sm:px-6 max-w-3xl
//
// SECTIONS:
// .section-py    → py-8 lg:py-12
// .section-py-lg → py-12 lg:py-20
// =============================================================================
