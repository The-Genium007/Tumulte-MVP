# Textures de Dés

Ce dossier contient les textures pour les dés 3D de l'Overlay Studio.

## Format

- **Format recommandé** : WebP
- **Résolution** : 512x512 ou 1024x1024 pixels
- **Transparence** : Supportée (canal alpha)

## Structure

```
textures/dice/
├── default/          # Textures par défaut (flat design)
│   ├── d4.webp
│   ├── d6.webp
│   ├── d8.webp
│   ├── d10.webp
│   ├── d12.webp
│   ├── d20.webp
│   └── d100.webp
└── custom/           # Textures personnalisées
    └── (vos textures ici)
```

## Ajout de textures personnalisées

1. Placez vos fichiers `.webp` dans le dossier `custom/`
2. Dans l'Overlay Studio, activez les textures et sélectionnez votre fichier
3. Les textures sont appliquées comme "skin" sur la géométrie du dé

## Création de textures

Pour créer des textures compatibles :

1. Utilisez un template UV correspondant au type de dé
2. Exportez en WebP avec compression sans perte (lossless) pour la meilleure qualité
3. Testez dans l'aperçu de l'Overlay Studio
