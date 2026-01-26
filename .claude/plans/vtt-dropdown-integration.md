# Plan : Intégration VTT dans le Dropdown de Campagne

## Objectif
Supprimer la page `/mj/campaigns/import` et intégrer les informations VTT directement dans le dropdown de sélection de campagne sur le tableau de bord MJ.

---

## État actuel

### Dropdown actuel (`CampaignDropdown.vue`)
- Affiche : nom de la campagne + nombre de joueurs actifs
- Point coloré (brand-500) pour la campagne sélectionnée
- Bouton "Ajouter une campagne" → redirige vers `/mj/campaigns/import`

### Page import (`/mj/campaigns/import`)
- Liste des connexions VTT avec statut
- Campagnes disponibles à importer (peu utile après import initial)
- Actions : Synchroniser, Révoquer, Reconnecter

---

## Proposition

### 1. Modifier le Dropdown de campagne

**Pour chaque campagne dans la liste :**
```
┌─────────────────────────────────────────────────────┐
│ ● Ma Campagne Foundry                               │
│   Foundry VTT • Connecté  [...]                     │
└─────────────────────────────────────────────────────┘
```

- **Ligne 1** : Nom de la campagne (comme actuellement)
- **Ligne 2** :
  - Si VTT connecté : `Foundry VTT • {statut}` avec indicateur couleur
  - Si pas de VTT : `{X} joueur(s) actif(s)` (comportement actuel)
- **Menu 3 points (optionnel)** : On garde ou pas ?

**Statuts affichés :**
| Statut | Couleur | Label |
|--------|---------|-------|
| connected | 🟢 vert | Connecté |
| connecting | 🟠 orange | Connexion... |
| disconnected | ⚪ gris | Déconnecté |
| revoked | 🔴 rouge | Révoqué |
| error | 🔴 rouge | Erreur |

### 2. Modifier le bouton "Ajouter une campagne"

**Actuellement** : Redirige vers `/mj/campaigns/import`

**Nouveau** : Redirige vers `/mj/vtt-connections/create` (page de création/appairage VTT existante)

Ou bien vers `/mj/campaigns/create` si tu veux une page de création de campagne classique (sans VTT obligatoire).

### 3. Supprimer la page import

- Supprimer `/mj/campaigns/import.vue`
- Mettre à jour les liens qui pointaient vers cette page

---

## Décisions prises

- **Q1** : ✅ Pas de menu 3 points (actions sur la page campagne)
- **Q2** : ✅ Bouton mène vers `/mj/vtt-connections/create`
- **Q3** : ✅ VTT + statut si connecté, sinon nombre de joueurs

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `components/mj/CampaignDropdown.vue` | Modifier pour afficher VTT |
| `components/mj/CampaignSelectorCard.vue` | Changer destination bouton |
| `pages/mj/campaigns/import.vue` | **Supprimer** |
| `pages/mj/index.vue` | Vérifier si référence à import |
| `components/mj/VttAlertBanner.vue` | Vérifier liens vers import |

---

## Maquette ASCII du nouveau dropdown

```
┌─────────────────────────────────────────────────────────┐
│  Ma campagne                        [+ Nouvelle]        │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ● Chroniques de Valheim                         ▼   │ │
│ │   Foundry VTT • 🟢 Connecté                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ─────────────── Liste déroulée ───────────────        │
│                                                         │
│ │ ○ Aventures Forgotten Realms                        │ │
│ │   Foundry VTT • 🔴 Révoqué                          │ │
│ │                                                     │ │
│ │ ○ Campagne Test                                     │ │
│ │   3 joueur(s) actif(s)                              │ │
│ │                                                     │ │
│ │ ────────────────────────────                        │ │
│ │ + Connecter un VTT                                  │ │
└─────────────────────────────────────────────────────────┘
```

---

## Validation

Réponds-moi sur les 3 questions ci-dessus et on passe à l'implémentation !
