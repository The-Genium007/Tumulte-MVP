# Plan d'Uniformisation CSS - Frontend Tumulte

## 📊 Diagnostic Initial

### Note Globale : 6.4/10

| Catégorie | Note | État |
|-----------|------|------|
| Couleurs | 8/10 | ✅ Très cohérent |
| Shadows | 9/10 | ✅ Minimal et cohérent |
| Animations | 8/10 | ✅ Bien structuré |
| Dark Mode | 9/10 | ✅ Préparé (non activé) |
| Typographie | 6/10 | ⚠️ Inconsistances |
| Border Radius | 6/10 | ⚠️ Trop de valeurs |
| Responsive | 5/10 | ⚠️ Pas standardisé |
| **Espacements** | **4/10** | ❌ **Critique** |

---

## 🎯 Objectifs

1. **Cohérence visuelle** : Tous les composants utilisent les mêmes valeurs
2. **Maintenabilité** : Changements faciles depuis un fichier centralisé
3. **Documentation** : Règles claires pour les nouveaux composants
4. **Performance** : Réduction de la duplication CSS

---

## 📁 Fichiers à Créer

```
frontend/
├── design-system/
│   ├── tokens.ts              # Design tokens centralisés
│   ├── typography.ts          # Presets typographiques
│   ├── spacing.ts             # Presets d'espacement
│   └── index.ts               # Export unifié
├── assets/css/
│   └── components.css         # Classes utilitaires Tailwind
└── DESIGN_SYSTEM.md           # Documentation
```

---

## Phase 1 : Infrastructure Design Tokens

### 1.1 Créer `design-system/tokens.ts`

**Objectif** : Centraliser toutes les valeurs de design

```typescript
// Spacing Scale (basé sur 4px)
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
} as const

// Border Radius (3 valeurs seulement)
export const radius = {
  sm: '0.5rem',     // 8px - inputs, buttons
  lg: '2rem',       // 32px - cards, modals
  full: '9999px',   // avatars, badges
} as const

// Breakpoints (Tailwind defaults)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const
```

### 1.2 Créer `design-system/spacing.ts`

**Objectif** : Presets d'espacement réutilisables

```typescript
// Règles d'espacement standardisées
export const gapPresets = {
  inline: 'gap-2',      // 8px - icône + texte, éléments serrés
  group: 'gap-4',       // 16px - groupes d'éléments
  section: 'gap-6',     // 24px - sections dans un container
  page: 'gap-8',        // 32px - grandes sections
} as const

export const paddingPresets = {
  card: 'p-6',                          // 24px - intérieur des cards
  section: 'py-8 lg:py-12',             // sections de page
  container: 'px-4 sm:px-6 lg:px-8',    // padding horizontal responsive
} as const

export const spacePresets = {
  content: 'space-y-4',    // contenu général
  section: 'space-y-6',    // entre sections
  page: 'space-y-8',       // entre grandes sections
} as const
```

### 1.3 Créer `design-system/typography.ts`

**Objectif** : Échelle typographique cohérente

```typescript
// Tailles de texte standardisées
export const textSizes = {
  xs: 'text-xs',        // 12px - metadata, timestamps
  sm: 'text-sm',        // 14px - texte secondaire
  base: 'text-base',    // 16px - texte par défaut
  lg: 'text-lg',        // 18px - titres de cards mineurs
  xl: 'text-xl',        // 20px - titres de cards
  '2xl': 'text-2xl',    // 24px - titres de sections
  '3xl': 'text-3xl',    // 30px - titres de pages
} as const

// Presets pour les headings
export const headingPresets = {
  page: 'text-2xl sm:text-3xl font-bold text-primary',
  section: 'text-xl sm:text-2xl font-semibold text-primary',
  card: 'text-lg sm:text-xl font-semibold text-primary',
  subsection: 'text-base sm:text-lg font-medium text-primary',
} as const

// Presets pour le corps de texte
export const bodyPresets = {
  default: 'text-base text-secondary',
  small: 'text-sm text-secondary',
  muted: 'text-sm text-muted',
  caption: 'text-xs text-muted',
} as const

// Responsive typography scale
export const responsiveText = {
  hero: 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl',
  h1: 'text-2xl sm:text-3xl lg:text-4xl',
  h2: 'text-xl sm:text-2xl lg:text-3xl',
  h3: 'text-lg sm:text-xl',
  body: 'text-sm sm:text-base',
} as const
```

---

## Phase 2 : Classes Utilitaires Tailwind

### 2.1 Ajouter dans `assets/css/main.css`

**Objectif** : Composants Tailwind réutilisables

```css
@layer components {
  /* ============================================
     CONTAINERS
     ============================================ */
  .container-page {
    @apply mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl;
  }

  .container-narrow {
    @apply mx-auto px-4 sm:px-6 max-w-3xl;
  }

  /* ============================================
     TYPOGRAPHY PRESETS
     ============================================ */
  .heading-page {
    @apply text-2xl sm:text-3xl font-bold text-primary;
  }

  .heading-section {
    @apply text-xl sm:text-2xl font-semibold text-primary;
  }

  .heading-card {
    @apply text-lg sm:text-xl font-semibold text-primary;
  }

  .heading-subsection {
    @apply text-base sm:text-lg font-medium text-primary;
  }

  .text-body {
    @apply text-base text-secondary;
  }

  .text-body-sm {
    @apply text-sm text-secondary;
  }

  .text-muted {
    @apply text-sm text-muted;
  }

  .text-caption {
    @apply text-xs text-muted;
  }

  /* ============================================
     SPACING PRESETS
     ============================================ */
  .section-spacing {
    @apply space-y-6;
  }

  .content-spacing {
    @apply space-y-4;
  }

  .inline-spacing {
    @apply gap-2;
  }

  .group-spacing {
    @apply gap-4;
  }

  /* ============================================
     CARD VARIANTS
     ============================================ */
  .card-padding {
    @apply p-6;
  }

  .card-padding-sm {
    @apply p-4;
  }

  /* ============================================
     RESPONSIVE SECTION PADDING
     ============================================ */
  .section-py {
    @apply py-8 lg:py-12;
  }

  .section-py-lg {
    @apply py-12 lg:py-20;
  }
}
```

---

## Phase 3 : Refactorisation des Composants

### 3.1 Composants Prioritaires (Haute Fréquence)

| Composant | Problème | Action |
|-----------|----------|--------|
| `PollControlCard.vue` | 4 valeurs de gap différentes | Standardiser sur `gap-2/4/6` |
| `EventRow.vue` | Spacing responsive inconsistant | Appliquer presets |
| `AppHeader.vue` | Padding complexe | Utiliser `container-page` |
| `CampaignDashboard.vue` | `gap-6` et `gap-3` mélangés | Uniformiser |

### 3.2 Règles de Refactorisation

**Gap standardisé :**
```
gap-2 (8px)  → Éléments inline (icône + texte)
gap-4 (16px) → Groupes d'éléments
gap-6 (24px) → Sections dans un container
gap-8 (32px) → Grandes sections de page
```

**Border radius standardisé :**
```
rounded-lg      → Inputs, buttons, petits containers
rounded-[2rem]  → Cards, modals (UCard)
rounded-full    → Avatars, badges
```

**Typography standardisée :**
```
.heading-page      → Titres de pages
.heading-section   → Titres de sections
.heading-card      → Titres dans les cards
.text-body         → Texte principal
.text-muted        → Texte secondaire
```

### 3.3 Fichiers à Refactoriser

#### Priorité 1 - Critique
- [ ] `components/PollControlCard.vue`
- [ ] `components/mj/EventRow.vue`
- [ ] `components/mj/CampaignDashboard.vue`
- [ ] `components/AppHeader.vue`

#### Priorité 2 - Important
- [ ] `pages/mj/index.vue`
- [ ] `pages/mj/campaigns/[id]/index.vue`
- [ ] `pages/streamer/index.vue`
- [ ] `pages/dashboard/index.vue`

#### Priorité 3 - Landing
- [ ] `components/landing/LandingHero.vue`
- [ ] `components/landing/LandingFeatures.vue`
- [ ] `components/landing/LandingCTA.vue`

#### Priorité 4 - Auth
- [ ] `pages/auth/login.vue`
- [ ] `pages/auth/register.vue`
- [ ] `pages/auth/forgot-password.vue`

---

## Phase 4 : Nettoyage CSS

### 4.1 Supprimer les Classes Dupliquées

**Dans `main.css` :**
```css
/* SUPPRIMER - Utiliser bg-primary-50 à la place */
.bg-brand-light { ... }
.bg-primary-light { ... }

/* SUPPRIMER - Utiliser border-primary-200 */
.border-brand-light { ... }
```

### 4.2 Consolider les Variables CSS

**Garder uniquement :**
- Variables sémantiques (`--theme-bg`, `--theme-text`)
- Palettes Tailwind (`--color-primary-*`)

**Supprimer :**
- Alias redondants (`--color-bg-brand-light` = `--color-primary-50`)

---

## Phase 5 : Documentation

### 5.1 Créer `DESIGN_SYSTEM.md`

**Contenu :**
1. Principes de design
2. Palette de couleurs
3. Échelle typographique
4. Système d'espacement
5. Composants UI standards
6. Exemples d'utilisation

### 5.2 Mise à Jour `CLAUDE.md`

Ajouter une section référençant le design system.

---

## 📋 Checklist d'Implémentation

### Phase 1 : Infrastructure ✅ COMPLÉTÉ
- [x] Créer `design-system/tokens.ts`
- [x] Créer `design-system/spacing.ts`
- [x] Créer `design-system/typography.ts`
- [x] Créer `design-system/index.ts`

### Phase 2 : Classes Utilitaires ✅ COMPLÉTÉ
- [x] Ajouter composants Tailwind dans `main.css`
- [ ] Tester les nouvelles classes

### Phase 3 : Refactorisation ✅ EN COURS
- [x] Refactoriser composants priorité 1 (PollControlCard, EventRow, CampaignDashboard, AppHeader)
- [x] Refactoriser pages principales (mj/index, dashboard/index)
- [ ] Refactoriser landing pages
- [ ] Refactoriser pages auth

### Phase 4 : Nettoyage (À FAIRE)
- [ ] Supprimer classes CSS dupliquées
- [ ] Consolider variables CSS
- [ ] Vérifier pas de régression visuelle

### Phase 5 : Documentation ✅ COMPLÉTÉ
- [x] Créer `DESIGN_SYSTEM.md`
- [ ] Mettre à jour `CLAUDE.md`

---

## 🔧 Exemples de Refactorisation

### Avant/Après : PollControlCard

**Avant :**
```vue
<div class="flex items-center justify-between gap-6">
  <div class="flex items-center gap-4 flex-1">
    <div class="flex items-center gap-2">
      <div class="flex flex-col gap-1">
```

**Après :**
```vue
<div class="flex items-center justify-between gap-6">
  <div class="flex items-center gap-4 flex-1">
    <div class="flex items-center gap-2">
      <div class="flex flex-col gap-1">
<!-- Pas de changement car suit déjà le pattern décroissant 6→4→2→1 -->
```

### Avant/Après : Heading de Card

**Avant :**
```vue
<h2 class="text-xl font-semibold text-primary">Titre</h2>
<!-- ou parfois -->
<h3 class="text-lg font-semibold">Titre</h3>
```

**Après :**
```vue
<h2 class="heading-card">Titre</h2>
```

### Avant/Après : Container de Page

**Avant :**
```vue
<div class="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
```

**Après :**
```vue
<div class="container-page">
```

---

## 📊 Métriques de Succès

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Valeurs de gap distinctes | 8+ | 4 (2, 4, 6, 8) |
| Valeurs de border-radius | 5+ | 3 (lg, 2rem, full) |
| Classes heading différentes | 10+ | 4 presets |
| Duplication CSS | Élevée | Minimale |
| Note cohérence globale | 6.4/10 | 8.5/10 |

---

## ⏱️ Estimation

| Phase | Complexité |
|-------|-----------|
| Phase 1 : Infrastructure | Faible |
| Phase 2 : Classes Utilitaires | Faible |
| Phase 3 : Refactorisation | Moyenne |
| Phase 4 : Nettoyage | Faible |
| Phase 5 : Documentation | Faible |

---

## 🚨 Points d'Attention

1. **Tests visuels** : Vérifier chaque composant après refactorisation
2. **Responsive** : Tester sur mobile, tablet, desktop
3. **Dark mode** : Les classes doivent supporter le futur dark mode
4. **Nuxt UI** : Ne pas casser la configuration `app.config.ts`
5. **Progressive** : Refactoriser par petits lots, pas tout d'un coup
