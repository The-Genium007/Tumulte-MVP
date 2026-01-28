# Tumulte Design System

Guide de référence pour garantir la cohérence visuelle du frontend.

## Table des Matières

1. [Principes](#principes)
2. [Espacement](#espacement)
3. [Typographie](#typographie)
4. [Border Radius](#border-radius)
5. [Couleurs](#couleurs)
6. [Classes Utilitaires](#classes-utilitaires)
7. [Exemples](#exemples)

---

## Principes

### Design Épuré
- Pas de rings/outlines sur les composants
- Shadows minimales
- Couleurs douces (palette beige/marron)

### Cohérence
- Utiliser les presets définis plutôt que des valeurs arbitraires
- Maximum 5 valeurs de gap différentes
- Maximum 3 valeurs de border-radius

### Responsive
- Mobile-first
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)

---

## Espacement

### Règle d'Or - Gap

| Classe | Pixels | Usage |
|--------|--------|-------|
| `gap-2` | 8px | Éléments inline (icône + texte) |
| `gap-3` | 12px | Éléments inline espacés |
| `gap-4` | 16px | Groupes d'éléments |
| `gap-6` | 24px | Sections dans un container |
| `gap-8` | 32px | Grandes sections de page |

### Pattern Décroissant

Dans un composant, le gap doit **décroître** en profondeur :

```vue
<!-- Container principal -->
<div class="flex gap-6">
  <!-- Groupe -->
  <div class="flex gap-4">
    <!-- Éléments inline -->
    <div class="flex gap-2">
      <Icon />
      <span>Texte</span>
    </div>
  </div>
</div>
```

### Classes Utilitaires

| Classe | Équivalent | Usage |
|--------|------------|-------|
| `.section-spacing` | `space-y-6` | Entre sections |
| `.content-spacing` | `space-y-4` | Contenu général |
| `.inline-spacing` | `gap-2` | Éléments inline |
| `.group-spacing` | `gap-4` | Groupes |

### Padding de Sections

| Classe | Équivalent | Usage |
|--------|------------|-------|
| `.section-py` | `py-8 lg:py-12` | Sections standard |
| `.section-py-lg` | `py-12 lg:py-20` | Sections hero |
| `.card-padding` | `p-6` | Intérieur des cards |
| `.card-padding-sm` | `p-4` | Cards compactes |

---

## Typographie

### Fonts

| Variable | Font | Usage |
|----------|------|-------|
| `font-sans` | Inter | Texte principal |
| `font-heading` | Aoboshi One | Titres (uppercase auto) |
| `font-mono` | System mono | Code, valeurs |

### Headings

| Classe | Style | Usage |
|--------|-------|-------|
| `.heading-page` | `text-2xl sm:text-3xl font-bold text-primary` | Titre H1 |
| `.heading-section` | `text-xl sm:text-2xl font-semibold text-primary` | Titre H2 |
| `.heading-card` | `text-lg sm:text-xl font-semibold text-primary` | Titre H3 |
| `.heading-subsection` | `text-base sm:text-lg font-medium text-primary` | Titre H4 |
| `.heading-label` | `text-sm font-semibold text-primary` | Labels importants |

### Body Text

| Classe | Style | Usage |
|--------|-------|-------|
| `.text-body` | `text-base text-secondary` | Texte principal |
| `.text-body-sm` | `text-sm text-secondary` | Texte secondaire |
| `.text-muted` | `text-sm text-muted` | Texte atténué |
| `.text-caption` | `text-xs text-muted` | Légendes, metadata |

### Échelle Responsive

```
Hero:  text-3xl sm:text-4xl lg:text-5xl xl:text-6xl
H1:    text-2xl sm:text-3xl lg:text-4xl
H2:    text-xl sm:text-2xl lg:text-3xl
H3:    text-lg sm:text-xl
Body:  text-sm sm:text-base
```

---

## Border Radius

### Seulement 3 Valeurs

| Classe | Pixels | Usage |
|--------|--------|-------|
| `rounded-lg` | 8px | Inputs, buttons, petits containers |
| `rounded-[2rem]` | 32px | Cards, modals (UCard default) |
| `rounded-full` | 50% | Avatars, badges, pills |

### Mapping Composants

| Composant | Radius |
|-----------|--------|
| UInput, UTextarea | `rounded-lg` |
| UButton | `rounded-lg` |
| UCard | `rounded-[2rem]` |
| UModal | `rounded-[2rem]` |
| Avatar | `rounded-full` |
| UBadge | `rounded-full` |

---

## Couleurs

### Palette Sémantique

| Variable | Hex | Usage |
|----------|-----|-------|
| `primary` | `#0f0b04` | Marron foncé (brand) |
| `secondary` | `#d8b790` | Beige doré |
| `success` | `#22c55e` | Vert |
| `error` | `#dc2626` | Rouge |
| `warning` | `#f59e0b` | Ambre |
| `info` | `#3b82f6` | Bleu |

### Backgrounds

| Classe | Usage |
|--------|-------|
| `bg-page` | Fond de page (`#f2e4d4`) |
| `bg-elevated` | Cards, surfaces (`#ffffff`) |
| `bg-muted` | Backgrounds secondaires |
| `bg-primary-50` | Fond clair brand |

### Textes

| Classe | Usage |
|--------|-------|
| `text-primary` | Texte principal |
| `text-secondary` | Texte secondaire |
| `text-muted` | Texte atténué |
| `text-disabled` | Texte désactivé |

---

## Classes Utilitaires

### Containers

```vue
<!-- Container de page standard (max-width: 1280px) -->
<div class="container-page">

<!-- Container étroit (max-width: 768px) -->
<div class="container-narrow">

<!-- Container très étroit (max-width: 448px) -->
<div class="container-xs">
```

### Sections

```vue
<!-- Section avec padding vertical standard -->
<section class="section-py">

<!-- Section avec padding vertical large (hero) -->
<section class="section-py-lg">

<!-- Contenu avec espacement vertical -->
<div class="section-spacing">  <!-- space-y-6 -->
<div class="content-spacing">  <!-- space-y-4 -->
```

### Cards

```vue
<!-- Padding standard (24px) -->
<div class="card-padding">

<!-- Padding compact (16px) -->
<div class="card-padding-sm">

<!-- Padding responsive -->
<div class="card-padding-responsive">  <!-- p-4 sm:p-6 -->
```

---

## Exemples

### Card Standard

```vue
<UCard>
  <template #header>
    <h2 class="heading-card">Titre de la Card</h2>
  </template>

  <div class="content-spacing">
    <p class="text-body">Contenu principal...</p>
    <p class="text-muted">Texte secondaire...</p>
  </div>

  <template #footer>
    <div class="flex justify-end gap-4">
      <UButton variant="ghost">Annuler</UButton>
      <UButton>Confirmer</UButton>
    </div>
  </template>
</UCard>
```

### Page Layout

```vue
<template>
  <div class="container-page section-py">
    <header class="section-spacing">
      <h1 class="heading-page">Titre de Page</h1>
      <p class="text-body">Description de la page...</p>
    </header>

    <main class="section-spacing">
      <!-- Contenu -->
    </main>
  </div>
</template>
```

### Flex avec Gap Hiérarchique

```vue
<div class="flex items-center gap-6">
  <!-- Groupe gauche -->
  <div class="flex items-center gap-4">
    <Avatar />
    <div class="flex flex-col gap-1">
      <span class="heading-subsection">Nom</span>
      <span class="text-caption">Rôle</span>
    </div>
  </div>

  <!-- Actions -->
  <div class="flex items-center gap-2">
    <UButton icon="i-lucide-edit" variant="ghost" />
    <UButton icon="i-lucide-trash" variant="ghost" />
  </div>
</div>
```

### Formulaire

```vue
<form class="content-spacing">
  <div class="space-y-2">
    <label class="heading-label">Email</label>
    <UInput type="email" placeholder="exemple@email.com" />
    <p class="text-caption">Nous ne partagerons jamais votre email.</p>
  </div>

  <div class="space-y-2">
    <label class="heading-label">Mot de passe</label>
    <UInput type="password" />
  </div>

  <UButton type="submit" class="w-full">Se connecter</UButton>
</form>
```

---

## Import des Tokens (TypeScript)

```ts
import {
  gapPresets,
  paddingPresets,
  headingPresets,
  bodyPresets,
  radiusPresets,
} from '~/design-system'

// Utilisation
const cardClass = `${radiusPresets.card} ${paddingPresets.card}`
```

---

## Checklist de Review

Avant de merger, vérifier :

- [ ] Gap utilise uniquement `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`
- [ ] Border-radius utilise uniquement `rounded-lg`, `rounded-[2rem]`, `rounded-full`
- [ ] Headings utilisent les classes `.heading-*`
- [ ] Pas de valeurs hardcodées (hex colors, px values)
- [ ] Pattern de gap décroissant respecté
- [ ] Responsive testé (mobile, tablet, desktop)
