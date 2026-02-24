# Tumulte Design System

Reference guide for ensuring visual consistency across the frontend.

## Table of Contents

1. [Principles](#principles)
2. [Spacing](#spacing)
3. [Typography](#typography)
4. [Border Radius](#border-radius)
5. [Colors](#colors)
6. [Utility Classes](#utility-classes)
7. [Examples](#examples)

---

## Principles

### Clean Design
- No rings/outlines on components
- Minimal shadows
- Soft colors (beige/brown palette)

### Consistency
- Use defined presets rather than arbitrary values
- Maximum 5 different gap values
- Maximum 3 border-radius values

### Responsive
- Mobile-first
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)

---

## Spacing

### Golden Rule - Gap

| Class | Pixels | Usage |
|--------|--------|-------|
| `gap-2` | 8px | Inline elements (icon + text) |
| `gap-3` | 12px | Spaced inline elements |
| `gap-4` | 16px | Element groups |
| `gap-6` | 24px | Sections within a container |
| `gap-8` | 32px | Large page sections |

### Decreasing Pattern

Within a component, the gap must **decrease** with depth:

```vue
<!-- Main container -->
<div class="flex gap-6">
  <!-- Group -->
  <div class="flex gap-4">
    <!-- Inline elements -->
    <div class="flex gap-2">
      <Icon />
      <span>Text</span>
    </div>
  </div>
</div>
```

### Utility Classes

| Class | Equivalent | Usage |
|--------|------------|-------|
| `.section-spacing` | `space-y-6` | Between sections |
| `.content-spacing` | `space-y-4` | General content |
| `.inline-spacing` | `gap-2` | Inline elements |
| `.group-spacing` | `gap-4` | Groups |

### Section Padding

| Class | Equivalent | Usage |
|--------|------------|-------|
| `.section-py` | `py-8 lg:py-12` | Standard sections |
| `.section-py-lg` | `py-12 lg:py-20` | Hero sections |
| `.card-padding` | `p-6` | Card interiors |
| `.card-padding-sm` | `p-4` | Compact cards |

---

## Typography

### Fonts

| Variable | Font | Usage |
|----------|------|-------|
| `font-sans` | Inter | Body text |
| `font-heading` | Aoboshi One | Headings (auto-uppercase) |
| `font-mono` | System mono | Code, values |

### Headings

| Class | Style | Usage |
|--------|-------|-------|
| `.heading-page` | `text-2xl sm:text-3xl font-bold text-primary` | H1 Title |
| `.heading-section` | `text-xl sm:text-2xl font-semibold text-primary` | H2 Title |
| `.heading-card` | `text-lg sm:text-xl font-semibold text-primary` | H3 Title |
| `.heading-subsection` | `text-base sm:text-lg font-medium text-primary` | H4 Title |
| `.heading-label` | `text-sm font-semibold text-primary` | Important labels |

### Body Text

| Class | Style | Usage |
|--------|-------|-------|
| `.text-body` | `text-base text-secondary` | Main text |
| `.text-body-sm` | `text-sm text-secondary` | Secondary text |
| `.text-muted` | `text-sm text-muted` | Muted text |
| `.text-caption` | `text-xs text-muted` | Captions, metadata |

### Responsive Scale

```
Hero:  text-3xl sm:text-4xl lg:text-5xl xl:text-6xl
H1:    text-2xl sm:text-3xl lg:text-4xl
H2:    text-xl sm:text-2xl lg:text-3xl
H3:    text-lg sm:text-xl
Body:  text-sm sm:text-base
```

---

## Border Radius

### Only 3 Values

| Class | Pixels | Usage |
|--------|--------|-------|
| `rounded-lg` | 8px | Inputs, buttons, small containers |
| `rounded-[2rem]` | 32px | Cards, modals (UCard default) |
| `rounded-full` | 50% | Avatars, badges, pills |

### Component Mapping

| Component | Radius |
|-----------|--------|
| UInput, UTextarea | `rounded-lg` |
| UButton | `rounded-lg` |
| UCard | `rounded-[2rem]` |
| UModal | `rounded-[2rem]` |
| Avatar | `rounded-full` |
| UBadge | `rounded-full` |

---

## Colors

### Semantic Palette

| Variable | Hex | Usage |
|----------|-----|-------|
| `primary` | `#0f0b04` | Dark brown (brand) |
| `secondary` | `#d8b790` | Golden beige |
| `success` | `#22c55e` | Green |
| `error` | `#dc2626` | Red |
| `warning` | `#f59e0b` | Amber |
| `info` | `#3b82f6` | Blue |

### Backgrounds

| Class | Usage |
|--------|-------|
| `bg-page` | Page background (`#f2e4d4`) |
| `bg-elevated` | Cards, surfaces (`#ffffff`) |
| `bg-muted` | Secondary backgrounds |
| `bg-primary-50` | Light brand background |

### Text

| Class | Usage |
|--------|-------|
| `text-primary` | Main text |
| `text-secondary` | Secondary text |
| `text-muted` | Muted text |
| `text-disabled` | Disabled text |

---

## Utility Classes

### Containers

```vue
<!-- Standard page container (max-width: 1280px) -->
<div class="container-page">

<!-- Narrow container (max-width: 768px) -->
<div class="container-narrow">

<!-- Extra narrow container (max-width: 448px) -->
<div class="container-xs">
```

### Sections

```vue
<!-- Section with standard vertical padding -->
<section class="section-py">

<!-- Section with large vertical padding (hero) -->
<section class="section-py-lg">

<!-- Content with vertical spacing -->
<div class="section-spacing">  <!-- space-y-6 -->
<div class="content-spacing">  <!-- space-y-4 -->
```

### Cards

```vue
<!-- Standard padding (24px) -->
<div class="card-padding">

<!-- Compact padding (16px) -->
<div class="card-padding-sm">

<!-- Responsive padding -->
<div class="card-padding-responsive">  <!-- p-4 sm:p-6 -->
```

---

## Examples

### Standard Card

```vue
<UCard>
  <template #header>
    <h2 class="heading-card">Card Title</h2>
  </template>

  <div class="content-spacing">
    <p class="text-body">Main content...</p>
    <p class="text-muted">Secondary text...</p>
  </div>

  <template #footer>
    <div class="flex justify-end gap-4">
      <UButton variant="ghost">Cancel</UButton>
      <UButton>Confirm</UButton>
    </div>
  </template>
</UCard>
```

### Page Layout

```vue
<template>
  <div class="container-page section-py">
    <header class="section-spacing">
      <h1 class="heading-page">Page Title</h1>
      <p class="text-body">Page description...</p>
    </header>

    <main class="section-spacing">
      <!-- Content -->
    </main>
  </div>
</template>
```

### Flex with Hierarchical Gap

```vue
<div class="flex items-center gap-6">
  <!-- Left group -->
  <div class="flex items-center gap-4">
    <Avatar />
    <div class="flex flex-col gap-1">
      <span class="heading-subsection">Name</span>
      <span class="text-caption">Role</span>
    </div>
  </div>

  <!-- Actions -->
  <div class="flex items-center gap-2">
    <UButton icon="i-lucide-edit" variant="ghost" />
    <UButton icon="i-lucide-trash" variant="ghost" />
  </div>
</div>
```

### Form

```vue
<form class="content-spacing">
  <div class="space-y-2">
    <label class="heading-label">Email</label>
    <UInput type="email" placeholder="example@email.com" />
    <p class="text-caption">We will never share your email.</p>
  </div>

  <div class="space-y-2">
    <label class="heading-label">Password</label>
    <UInput type="password" />
  </div>

  <UButton type="submit" class="w-full">Sign In</UButton>
</form>
```

---

## Token Import (TypeScript)

```ts
import {
  gapPresets,
  paddingPresets,
  headingPresets,
  bodyPresets,
  radiusPresets,
} from '~/design-system'

// Usage
const cardClass = `${radiusPresets.card} ${paddingPresets.card}`
```

---

## Review Checklist

Before merging, verify:

- [ ] Gap uses only `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`
- [ ] Border-radius uses only `rounded-lg`, `rounded-[2rem]`, `rounded-full`
- [ ] Headings use `.heading-*` classes
- [ ] No hardcoded values (hex colors, px values)
- [ ] Decreasing gap pattern respected
- [ ] Responsive tested (mobile, tablet, desktop)
