# Plan : Personnalisation complète du Dice dans l'Overlay Studio

## Objectif

Permettre une personnalisation avancée du composant Dice avec :
1. **Dé 3D** : Couleurs personnalisées (foreground, background, outline), texture, matériau
2. **HUD de résultat** : Styles globaux + éléments spécifiques

---

## Configuration DiceBox

Le DiceBox accepte `theme_customColorset` pour des couleurs personnalisées :

```javascript
// Dans DiceBox.updateConfig()
theme_customColorset: {
  name: "custom",           // Nom unique
  foreground: "#ffffff",    // Couleur des chiffres
  background: "#000000",    // Couleur du dé
  outline: "black",         // Couleur du contour (ou "none")
  texture: "marble",        // Texture optionnelle
  material: "glass"         // Matériau (none/metal/wood/glass)
}
```

---

## Plan d'implémentation

### Phase 1 : Mise à jour des types

**Fichier** : `frontend/overlay-studio/types/index.ts`

#### 1.1 Nouveau type pour la config DiceBox

```typescript
// Textures disponibles
export type DiceTexture =
  | "none" | ""
  | "cloudy" | "cloudy_2" | "fire" | "marble" | "water" | "ice"
  | "paper" | "speckles" | "glitter" | "glitter_2" | "stars"
  | "stainedglass" | "wood" | "metal" | "skulls"
  | "leopard" | "tiger" | "cheetah" | "dragon" | "lizard" | "bird" | "astral";

// Matériaux disponibles
export type DiceMaterial = "none" | "metal" | "wood" | "glass";

// Configuration des couleurs du dé (via ColorModule)
export interface DiceCustomColors {
  foreground: string;     // Couleur des chiffres
  background: string;     // Couleur du dé
  outline: string;        // Contour ("none" ou couleur)
}

// Configuration DiceBox complète
export interface DiceBoxConfig {
  colors: DiceCustomColors;
  texture: DiceTexture;
  material: DiceMaterial;
}
```

#### 1.2 Type pour le style HUD

```typescript
// Style du conteneur HUD
export interface HudContainerStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  padding: { top: number; right: number; bottom: number; left: number };
  backdropBlur: number;
  boxShadow: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

// Style des badges critiques
export interface HudCriticalBadgeStyle {
  successBackground: string;
  successTextColor: string;
  successBorderColor: string;
  failureBackground: string;
  failureTextColor: string;
  failureBorderColor: string;
}

// Style de la formule
export interface HudFormulaStyle {
  typography: TypographySettings;
}

// Style du résultat principal
export interface HudResultStyle {
  typography: TypographySettings;
  criticalSuccessColor: string;
  criticalFailureColor: string;
}

// Style du breakdown des dés
export interface HudDiceBreakdownStyle {
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  typography: TypographySettings;
}

// Style des infos de compétence
export interface HudSkillInfoStyle {
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  skillTypography: TypographySettings;
  abilityTypography: TypographySettings;
}

// Configuration HUD complète
export interface DiceHudConfig {
  container: HudContainerStyle;
  criticalBadge: HudCriticalBadgeStyle;
  formula: HudFormulaStyle;
  result: HudResultStyle;
  diceBreakdown: HudDiceBreakdownStyle;
  skillInfo: HudSkillInfoStyle;
  minWidth: number;
  maxWidth: number;
}
```

#### 1.3 Mise à jour de DiceProperties

```typescript
export interface DiceProperties {
  // Configuration DiceBox (couleurs personnalisées)
  diceBox: DiceBoxConfig;

  // Configuration HUD
  hud: DiceHudConfig;

  // Animations (glow pour les critiques)
  colors: {
    criticalSuccessGlow: string;
    criticalFailureGlow: string;
  };

  audio: DiceAudioConfig;
  animations: DiceAnimationsConfig;
  mockData: DiceMockData;
}
```

---

### Phase 2 : Mise à jour de l'inspecteur

**Fichier** : `frontend/overlay-studio/components/inspector/DiceInspector.vue`

#### Structure des sections

1. **Section "Dé 3D"** (icône: `i-lucide-dice-5`)
   - ColorModule : "Couleur du dé" (background)
   - ColorModule : "Couleur des chiffres" (foreground)
   - ColorModule : "Contour" (outline) + option "none"
   - USelect : Texture (avec options groupées)
   - USelect : Matériau (none/metal/wood/glass)

2. **Section "HUD"** (icône: `i-lucide-layout-template`)
   - Sous-section "Conteneur"
     - ColorModule : Background
     - BorderModule : Bordure
     - BorderRadiusModule : Coins
     - PaddingModule : Espacement
     - NumberInput : Backdrop blur
     - BoxShadowModule : Ombre
   - Sous-section "Résultat"
     - TextModule : Typographie
     - ColorModule : Couleur normale
     - ColorModule : Couleur critique succès
     - ColorModule : Couleur critique échec
   - Sous-section "Formule"
     - TextModule : Typographie
     - ColorModule : Couleur
   - Sous-section "Badges critiques"
     - ColorModule x3 : Success (bg, text, border)
     - ColorModule x3 : Failure (bg, text, border)
   - Sous-section "Détail des dés"
     - ColorModule : Background
     - ColorModule : Bordure
     - TextModule : Typographie
   - Sous-section "Compétence"
     - ColorModule : Background
     - ColorModule : Bordure
     - TextModule : Typographie skill
     - TextModule : Typographie ability

3. **Section "Animations"** (conservée)

4. **Section "Audio"** (conservée)

5. **Section "Prévisualisation"** (conservée)

---

### Phase 3 : Mise à jour DiceBox.client.vue

**Fichier** : `frontend/components/DiceBox.client.vue`

Ajouter support pour `customColorset` :

```typescript
const props = withDefaults(defineProps<{
  notation?: string
  colorset?: string           // Preset (fallback)
  customColorset?: {          // NOUVEAU : couleurs custom
    foreground: string
    background: string
    outline: string
    texture?: string
    material?: string
  } | null
  texture?: string
  material?: string
  sounds?: boolean
  volume?: number
}>(), {
  // ...defaults
  customColorset: null,
})
```

Dans `onMounted` et avec un `watch` sur `customColorset` :
```javascript
if (props.customColorset) {
  await diceBox.updateConfig({
    theme_customColorset: {
      name: 'studio-custom',
      ...props.customColorset
    }
  })
}
```

---

### Phase 4 : Mise à jour StudioDiceElement

**Fichier** : `frontend/overlay-studio/dice/components/StudioDiceElement.vue`

Passer les props au DiceBox :

```vue
<DiceBox
  ref="diceBoxRef"
  :custom-colorset="diceBoxCustomColorset"
  :sounds="false"
  @ready="onDiceBoxReady"
/>
```

```typescript
const diceBoxCustomColorset = computed(() => ({
  foreground: diceProperties.value.diceBox.colors.foreground,
  background: diceProperties.value.diceBox.colors.background,
  outline: diceProperties.value.diceBox.colors.outline,
  texture: diceProperties.value.diceBox.texture,
  material: diceProperties.value.diceBox.material,
}))
```

---

### Phase 5 : Mise à jour DiceRollOverlay

**Fichier** : `frontend/components/overlay/DiceRollOverlay.vue`

Ajouter props optionnelles avec valeurs par défaut :

```typescript
const props = withDefaults(defineProps<{
  diceRoll: DiceRollEvent | null;
  visible: boolean;
  // Props de style optionnelles (pour le studio)
  customStyles?: DiceHudConfig | null;
}>(), {
  customStyles: null,
})
```

Utiliser les styles custom si fournis, sinon valeurs CSS hardcodées actuelles.

---

### Phase 6 : Valeurs par défaut

**Fichier** : `frontend/overlay-studio/stores/overlayStudio.ts`

```typescript
// Valeurs par défaut pour DiceProperties
const defaultDiceProperties: DiceProperties = {
  diceBox: {
    colors: {
      foreground: "#000000",
      background: "#ffffff",
      outline: "none",
    },
    texture: "none",
    material: "glass",
  },
  hud: {
    container: {
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: "rgba(148, 163, 184, 0.3)",
      borderWidth: 2,
      borderRadius: 16,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      backdropBlur: 10,
      boxShadow: {
        enabled: true,
        color: "rgba(0, 0, 0, 0.5)",
        blur: 60,
        offsetX: 0,
        offsetY: 20,
      },
    },
    criticalBadge: {
      successBackground: "rgba(34, 197, 94, 0.3)",
      successTextColor: "rgb(74, 222, 128)",
      successBorderColor: "rgba(34, 197, 94, 0.5)",
      failureBackground: "rgba(239, 68, 68, 0.3)",
      failureTextColor: "rgb(252, 165, 165)",
      failureBorderColor: "rgba(239, 68, 68, 0.5)",
    },
    formula: {
      typography: {
        fontFamily: "'Courier New', monospace",
        fontSize: 20,
        fontWeight: 600,
        color: "rgb(148, 163, 184)",
      },
    },
    result: {
      typography: {
        fontFamily: "system-ui",
        fontSize: 48,
        fontWeight: 800,
        color: "rgb(226, 232, 240)",
      },
      criticalSuccessColor: "rgb(74, 222, 128)",
      criticalFailureColor: "rgb(252, 165, 165)",
    },
    diceBreakdown: {
      backgroundColor: "rgba(15, 23, 42, 0.7)",
      borderColor: "rgba(148, 163, 184, 0.3)",
      borderRadius: 6,
      typography: {
        fontFamily: "'Courier New', monospace",
        fontSize: 16,
        fontWeight: 600,
        color: "rgb(203, 213, 225)",
      },
    },
    skillInfo: {
      backgroundColor: "rgba(59, 130, 246, 0.15)",
      borderColor: "rgba(59, 130, 246, 0.3)",
      borderRadius: 8,
      skillTypography: {
        fontFamily: "system-ui",
        fontSize: 16,
        fontWeight: 700,
        color: "rgb(147, 197, 253)",
      },
      abilityTypography: {
        fontFamily: "system-ui",
        fontSize: 14,
        fontWeight: 500,
        color: "rgb(148, 163, 184)",
      },
    },
    minWidth: 320,
    maxWidth: 400,
  },
  colors: {
    criticalSuccessGlow: "#22c55e",
    criticalFailureGlow: "#ef4444",
  },
  audio: { /* existant */ },
  animations: { /* existant */ },
  mockData: { /* existant */ },
}
```

---

## Fichiers à modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `overlay-studio/types/index.ts` | Modifier | Nouveaux types DiceBox et HUD |
| `overlay-studio/stores/overlayStudio.ts` | Modifier | Valeurs par défaut |
| `overlay-studio/components/inspector/DiceInspector.vue` | Modifier | Nouvelles sections |
| `components/DiceBox.client.vue` | Modifier | Support customColorset |
| `components/overlay/DiceRollOverlay.vue` | Modifier | Props de style optionnelles |
| `overlay-studio/dice/components/StudioDiceElement.vue` | Modifier | Passer props |

---

## Ordre d'implémentation

1. Types (`index.ts`)
2. Valeurs par défaut (`overlayStudio.ts`)
3. DiceBox.client.vue - Support customColorset
4. DiceInspector - Section "Dé 3D"
5. StudioDiceElement - Connexion DiceBox
6. DiceRollOverlay - Props de style
7. DiceInspector - Section "HUD"
8. Tests et ajustements
