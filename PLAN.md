# Plan : Prévisualisation statique du Dice

## Objectif

Afficher dans le canvas de l'Overlay Studio :
1. **Un dé 3D statique** (d20 posé, rotation lente)
2. **Le HUD de résultat** avec données mockées fixes

Les deux éléments sont personnalisables via l'inspecteur de propriétés existant.

## Fichiers à créer

### 1. `DicePreviewMesh.vue`
Dé 3D statique avec rotation lente.

**Props :**
- `baseColor` : Couleur du dé (depuis `properties.colors.baseColor`)
- `numberColor` : Couleur des chiffres (depuis `properties.colors.numberColor`)

**Technique :**
- `IcosahedronGeometry` de Three.js (forme d20)
- `MeshStandardMaterial` avec la couleur
- Rotation lente via `useRenderLoop`

### 2. `ResultTextPreview.vue`
HUD de résultat avec données mockées.

**Props :**
- `result` : Valeur affichée (ex: 18)
- `formula` : Formule (ex: "1d20")
- `isCritical` / `criticalType` : État critique
- `typography` : Style du texte
- `criticalSuccessGlow` / `criticalFailureGlow` : Couleurs de glow

## Fichiers à modifier

### 3. `StudioDiceElement.vue`
Intégrer les deux composants dans le canvas existant.

### 4. `index.ts`
Exporter les nouveaux composants.

## Étapes

1. Créer `ResultTextPreview.vue`
2. Créer `DicePreviewMesh.vue`
3. Modifier `StudioDiceElement.vue` pour intégrer les deux
4. Mettre à jour `index.ts`
