# VTT Feature Matrix

Reference for the Foundry VTT compatibility section displayed on the public About page (`frontend/pages/about.vue`).

---

## Overview

Tumulte tracks **6 features** across **4 support levels** for each of the **3 system tiers**. This matrix drives the per-system compatibility score and the hover popover on the About page.

---

## Features

Each feature maps to a Tumulte capability:

| Feature Key | Label | Description |
|-------------|-------|-------------|
| `characters` | Personnages | Character sync (name, HP, AC, stats) from Foundry VTT |
| `criticals` | Critiques | Critical success/failure detection (nat 20, fumble, etc.) |
| `inversion` | Inversion | Dice inversion action (reverse a roll result) |
| `stats` | Stats | Advanced stat extraction (ability scores, skills, conditions) |
| `spells` | Sorts | Spell interaction actions (disable, buff, debuff) |
| `combat` | Combat | Combat interaction actions (monster buff, monster debuff) |

### TypeScript Interface

```typescript
type FeatureKey = 'characters' | 'criticals' | 'inversion' | 'stats' | 'spells' | 'combat'

interface TumulteFeatureMatrix {
  characters: SupportLevel
  criticals: SupportLevel
  inversion: SupportLevel
  stats: SupportLevel
  spells: SupportLevel
  combat: SupportLevel
}
```

---

## Support Levels

| Level | Icon | Color | Score | Description |
|-------|------|-------|-------|-------------|
| `full` | ✓ | Green | 100 | Automatic detection, no configuration needed |
| `partial` | ~ | Yellow | 50 | Generic or limited detection, may miss edge cases |
| `manual` | ⚙ | Blue | 25 | GM must configure manually, but the feature works once set up |
| `none` | ✗ | Gray | 0 | Feature not available for this system |

### Score Calculation

Per-system score = average of all 6 feature scores:

```
score = round(sum(SUPPORT_LEVEL_SCORE[feature]) / 6)
```

### Score Color Thresholds

| Score Range | Color Key | Visual |
|-------------|-----------|--------|
| >= 90% | `excellent` | Green |
| >= 60% | `good` | Yellow |
| >= 30% | `moderate` | Orange |
| < 30% | `limited` | Gray |

---

## Feature Categories

Features are grouped for display in the hover popover:

| Category | Label | Features |
|----------|-------|----------|
| `base` | Base | `characters`, `criticals`, `stats` |
| `dice` | Des | `inversion` |
| `magic` | Magie | `spells` |
| `combat` | Combat | `combat` |

---

## System Tiers

Systems are classified by level of Tumulte integration (see `docs/architecture/system-presets.md` for full details):

| Tier | Count | Users | Adapter | Backend Preset |
|------|-------|-------|---------|----------------|
| **Tier 1** | 15 | ~85% | Dedicated | Yes |
| **Tier 2** | ~19 | ~10% | Generic | No |
| **Tier 3** | 320+ | ~5% | Generic | No |

### Tier → Feature Level Guidelines

| Tier | characters | criticals | inversion | stats | spells | combat |
|------|-----------|-----------|-----------|-------|--------|--------|
| **1** | full | full | full/partial | full/partial | Varies by `hasSpells` + events | Varies by combat support |
| **2a (d20)** | partial | partial | partial | none | manual (if magic system) | none |
| **2b-d** | partial | manual | manual | none | none | none |
| **3** | manual | manual | manual | none | none | none |

### Mapping Backend Capabilities to Feature Levels

For Tier 1 systems, the `spells` and `combat` levels are derived from the backend registry:

**Spells:**
- `hasSpells: true` AND spell events in `recommendedEvents` → `full`
- `hasSpells: true` AND spell events in `availableWithWarning` → `partial`
- `hasSpells: false` AND spell events in `availableWithWarning` → `manual`
- `hasSpells: false` AND no spell events → `none`

**Combat:**
- Monster events in `recommendedEvents` → `full`
- Monster events in `availableWithWarning` or system has combat mechanics → `partial`
- No combat support → `none`

---

## Checklists

### Adding a New Feature

1. Add the field to `TumulteFeatureMatrix` interface in `about.vue`
2. Add to `FeatureKey` union type
3. Add entry in `FEATURE_DEFINITIONS` constant
4. Add to the appropriate `FEATURE_CATEGORIES` entry (or create a new category)
5. Add to `FEATURE_KEYS` array
6. Assign the support level for ALL systems in `tierGroups`
7. Update this documentation
8. *(Future)* Add corresponding field in backend `SystemCapabilities` interface

### Adding a New System

1. Determine the tier:
   - Dedicated adapter in `system-adapters.js` AND preset in `system_preset_registry.ts` → **Tier 1**
   - No dedicated adapter, uses GenericAdapter → **Tier 2** (subcategorize by dice type: 2a/2b/2c/2d)
   - Untested → **Tier 3** (don't add individually, covered by the "320+" message)
2. Add the system entry in the appropriate `tierGroups[].systems` array
3. Assign all 6 features using the tier guidelines above
4. If Tier 1: also add in `system_preset_registry.ts` and `system-adapters.js`
5. Include `installPercent` and `primaryDie` if known

### Adding a New Support Level

1. Add to `SupportLevel` type
2. Add to `SUPPORT_LEVEL_SCORE` with a score value
3. Add CSS class `.status-{level}` with color
4. Add to `getStatusIcon()` helper
5. Update the legend in the template
6. Update this documentation

---

## Data Source

The About page currently uses **frontend-hardcoded data** structured to mirror the backend's `SystemCapabilities`. This is the "hybrid" approach:

- **Tier 1** feature levels are derived from `system_preset_registry.ts` capabilities and event recommendations
- **Tier 2** feature levels follow the tier guidelines in this document
- **Tier 3** is not listed individually (320+ systems)

When the backend exposes a public API for system capabilities, the About page can fetch Tier 1 data dynamically while keeping Tier 2/3 hardcoded.
