# Plan de Réorganisation Frontend - Tumulte

> **Décisions validées :**
> - Routes : Garder `/mj/` et `/dashboard/` (Option C)
> - Overlay Studio : Intégrer dans la structure principale (Option B)
> - Priorité : A → B → C (Nettoyage → Composables → Pages)
> - CSS : Centraliser les design tokens

---

## Phase A : Nettoyage (Priorité haute)

### A1. Supprimer le code mort

#### Fichier à supprimer : `useSupportTrigger.ts`
- **Statut** : @deprecated, ne fait rien
- **Utilisé dans** : 26 fichiers (imports à nettoyer)
- **Action** : Supprimer le fichier + tous les imports

**Fichiers à modifier :**
```
composables/useSupportTrigger.ts          → SUPPRIMER
tests/unit/composables/useSupportTrigger.spec.ts → SUPPRIMER

# Retirer les imports de useSupportTrigger dans :
stores/auth.ts
stores/campaigns.ts
stores/polls.ts
stores/pushNotifications.ts
pages/mj/index.vue
pages/dashboard/index.vue
pages/auth/callback.vue
composables/useWebSocket.ts
composables/useVttConnections.ts
composables/usePollTemplates.ts
composables/usePollInstance.ts
composables/useSettings.ts
composables/useCharacters.ts
composables/useCampaigns.ts
composables/useCampaignCharacters.ts
overlay-studio/composables/useOverlayStudioApi.ts
api/http_client.ts
vitest.config.ts
eslint.config.js
```

---

### A2. Fusionner les composants UI trop petits

#### Card : Fusionner CardBody + CardHeader + CardFooter dans Card.vue

**Avant :**
```
components/ui/card/
├── Card.vue          (80 lignes)
├── CardBody.vue      (11 lignes) → SUPPRIMER
├── CardHeader.vue    (19 lignes) → SUPPRIMER
└── CardFooter.vue    (23 lignes) → SUPPRIMER
```

**Après :**
```
components/ui/card/
└── Card.vue          (~120 lignes, avec slots nommés)
```

**Nouveau Card.vue avec slots :**
```vue
<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="card-header">
      <slot name="header" />
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>
```

**Migration des usages :**
```vue
<!-- AVANT -->
<Card>
  <CardHeader>Titre</CardHeader>
  <CardBody>Contenu</CardBody>
  <CardFooter>Actions</CardFooter>
</Card>

<!-- APRÈS -->
<Card>
  <template #header>Titre</template>
  Contenu
  <template #footer>Actions</template>
</Card>
```

---

#### Loading : Fusionner LoadingScreen + LoadingState

**Avant :**
```
components/ui/loading/
├── LoadingScreen.vue  (31 lignes) → FUSIONNER
├── LoadingSpinner.vue (47 lignes) → GARDER
└── LoadingState.vue   (38 lignes) → FUSIONNER
```

**Après :**
```
components/ui/loading/
├── LoadingSpinner.vue (47 lignes)
└── LoadingOverlay.vue (~60 lignes, combiné)
```

---

### A3. Composants à inliner

| Fichier | Lignes | Action |
|---------|--------|--------|
| `mj/AddEventDropdown.vue` | 25 | Inliner dans `EventsCard.vue` |
| `mj/CampaignSelectorCard.vue` | 27 | Inliner dans `CampaignDropdown.vue` |

---

### A4. Centraliser les design tokens CSS

**Créer :** `assets/css/variables.css`

Extraire de `main.css` les sections suivantes :
- Breakpoints (nouveau)
- Spacing scale (référencer Tailwind)
- Z-index scale (nouveau)

```css
/* assets/css/variables.css */

/* ==========================================================================
   BREAKPOINTS - Cohérents avec Tailwind
   ========================================================================== */
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* ==========================================================================
   Z-INDEX SCALE - Hiérarchie claire
   ========================================================================== */
:root {
  --z-dropdown: 50;
  --z-sticky: 100;
  --z-fixed: 200;
  --z-modal-backdrop: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-tooltip: 600;
  --z-toast: 700;
  --z-gizmo: 1000;
}

/* ==========================================================================
   TRANSITIONS - Durées standardisées
   ========================================================================== */
:root {
  --transition-fast: 150ms;
  --transition-normal: 200ms;
  --transition-slow: 300ms;
  --transition-slower: 500ms;
}
```

**Modifier :** `main.css` pour importer `variables.css`
```css
@import 'tailwindcss';
@import '@nuxt/ui';
@import './variables.css';
```

---

## Phase B : Restructuration Composables

### B1. Nouvelle structure de dossiers

```
composables/
├── index.ts                    # Exports centralisés (nouveau)
│
├── core/                       # Fondamentaux
│   ├── useAuth.ts
│   ├── useDevice.ts
│   └── useOnlineStatus.ts
│
├── data/                       # Gestion des données
│   ├── useCampaigns.ts
│   ├── useCharacters.ts
│   ├── useCampaignCharacters.ts
│   ├── usePolls.ts             # Nouveau (extrait de stores)
│   └── useSelectedCampaign.ts
│
├── vtt/                        # Virtual Table Top
│   ├── useVttConnection.ts     # FUSIONNER: useVttHealth + useVttConnections + useVttAutoSync
│   └── useVttCharacters.ts     # Si nécessaire
│
├── websocket/                  # WebSocket
│   ├── useWebSocketCore.ts     # REFACTORER: connexion de base
│   ├── useWebSocketEvents.ts   # REFACTORER: gestion événements
│   └── useResilientWebSocket.ts # Garder ou fusionner
│
├── notifications/              # Notifications
│   ├── useNotifications.ts
│   ├── usePushNotifications.ts
│   └── useReadiness.ts
│
├── integrations/               # Services externes
│   ├── useAnalytics.ts
│   ├── useTracking.ts
│   ├── useSupport.ts           # FUSIONNER: useSupportWidget + useSupportReporter
│   ├── useOBSEvents.ts
│   └── useSentryToast.ts
│
├── overlay/                    # Overlay
│   ├── useOverlayConfig.ts
│   └── useOverlayPreview.ts
│
├── ui/                         # Helpers UI
│   ├── useLoadingScreen.ts
│   ├── useActionButton.ts
│   ├── usePasswordStrength.ts
│   └── useWorkerTimer.ts
│
└── features/                   # Features spécifiques
    ├── usePwaInstall.ts
    ├── useOfflineFirst.ts
    ├── useJsonLd.ts
    └── useCookieConsent.ts
```

### B2. Fusions à effectuer

#### Fusion VTT (3 fichiers → 1)
```
useVttHealth.ts        ─┐
useVttConnections.ts   ─┼─→ vtt/useVttConnection.ts
useVttAutoSync.ts      ─┘
```

#### Fusion Support (2 fichiers → 1)
```
useSupportWidget.ts    ─┐
useSupportReporter.ts  ─┴─→ integrations/useSupport.ts
```

### B3. Refactoring useWebSocket (777 lignes)

**Découpage proposé :**

| Nouveau fichier | Responsabilité | Lignes estimées |
|-----------------|----------------|-----------------|
| `useWebSocketCore.ts` | Connexion, état, reconnexion | ~200 |
| `useWebSocketEvents.ts` | Émission/réception événements | ~150 |
| `useWebSocketSync.ts` | Synchronisation données | ~150 |
| `useWebSocket.ts` | Façade (compose les 3 autres) | ~100 |

---

## Phase C : Restructuration Pages et Composants

### C1. Intégration Overlay Studio

**Avant :**
```
overlay-studio/           # Mini-app isolée (37 fichiers)
├── components/
├── composables/
├── stores/
├── types/
└── utils/
```

**Après :**
```
# Déplacer les composants
components/
└── overlay-studio/       # Tous les composants overlay-studio
    ├── StudioCanvas.vue
    ├── StudioElement.vue
    ├── inspector/
    └── ...

# Déplacer les composables
composables/
└── overlay-studio/       # Tous les composables overlay-studio
    ├── useAnimationController.ts
    ├── useUndoRedo.ts
    └── ...

# Déplacer le store
stores/
└── overlayStudio.ts      # Store overlay studio

# Déplacer les types
types/
└── overlay-studio.ts     # Types overlay studio

# CSS reste dans overlay-studio pour l'instant
overlay-studio/
└── styles/
    └── inspector.css     # À intégrer dans assets/css/ plus tard
```

### C2. Restructuration Components

**Nouvelle structure :**
```
components/
├── ui/                         # Composants UI génériques
│   ├── Card.vue                # Fusionné (avec slots)
│   ├── Button.vue
│   ├── Modal.vue
│   ├── ActionRow.vue
│   ├── form/
│   │   ├── FormField.vue
│   │   └── FormInput.vue
│   └── loading/
│       ├── LoadingSpinner.vue
│       └── LoadingOverlay.vue  # Fusionné
│
├── gm/                         # Composants Game Master
│   ├── CampaignDashboard.vue
│   ├── CampaignDropdown.vue    # Absorbe CampaignSelectorCard
│   ├── EventsCard.vue          # Absorbe AddEventDropdown
│   ├── EventRow.vue
│   ├── EventActionsDropdown.vue
│   ├── PollResultsModal.vue
│   ├── DeletePollModal.vue
│   ├── PlayersColumn.vue
│   └── vtt/
│       ├── VttStatusCard.vue
│       └── VttAlertBanner.vue
│
├── streamer/                   # NOUVEAU - Composants Streamer
│   └── CharacterSelectionModal.vue  # Déplacé depuis dashboard/
│
├── landing/                    # Landing page (garder)
│   └── ...
│
├── notifications/              # Notifications (garder)
│   └── ...
│
├── overlay/                    # Overlay public (garder)
│   └── ...
│
├── overlay-studio/             # NOUVEAU - Overlay Studio intégré
│   └── ...
│
└── shared/                     # NOUVEAU - Composants partagés
    ├── AppHeader.vue
    ├── AppFooter.vue
    ├── BottomNavigation.vue
    ├── UserMenu.vue
    ├── TwitchAvatar.vue
    ├── LiveBadge.vue
    ├── OfflineIndicator.vue
    ├── PollControlCard.vue
    ├── AuthorizationCard.vue
    ├── MemberAuthorizationBadge.vue
    ├── StreamerReadinessItem.vue
    ├── PasswordStrengthMeter.vue
    ├── SupportWidget.vue
    ├── PwaInstallPrompt.vue
    ├── CookieConsentBanner.vue
    ├── WaitingListModal.vue
    ├── OnboardingTwitchModal.vue
    └── DiceBox.client.vue
```

### C3. Refactoring des pages énormes

#### `pages/dashboard/studio.vue` (1404 lignes → ~400 lignes)

**Extraire en composants :**
```vue
<!-- AVANT: tout dans studio.vue -->

<!-- APRÈS: composants extraits -->
<template>
  <StudioLayout>
    <template #toolbar>
      <StudioToolbar
        @save="handleSave"
        @preview="handlePreview"
      />
    </template>

    <template #sidebar>
      <StudioElementList
        :elements="elements"
        @select="selectElement"
      />
    </template>

    <template #canvas>
      <StudioCanvas
        :elements="elements"
        :selected="selectedElement"
      />
    </template>

    <template #inspector>
      <StudioInspector
        v-if="selectedElement"
        :element="selectedElement"
        @update="updateElement"
      />
    </template>
  </StudioLayout>
</template>
```

**Nouveaux composants à créer :**
| Composant | Responsabilité |
|-----------|----------------|
| `StudioToolbar.vue` | Barre d'outils (save, preview, undo/redo) |
| `StudioElementList.vue` | Liste des éléments avec drag & drop |
| `StudioInspector.vue` | Panneau d'inspection (existe déjà en partie) |

#### `pages/mj/index.vue` (968 lignes → ~350 lignes)

**Extraire en composants :**
```vue
<!-- Nouveaux composants -->
<GmDashboardHeader />           <!-- Stats globales -->
<GmQuickActions />              <!-- Actions rapides -->
<GmCampaignOverview />          <!-- Vue campagne sélectionnée -->
<GmRecentActivity />            <!-- Activité récente -->
```

### C4. Restructuration Types

**Avant :**
```
types/
├── index.ts        # 420 lignes fourre-tout
├── api.ts
├── pwa.d.ts
├── gtm.d.ts
└── troika-three-text.d.ts
```

**Après :**
```
types/
├── index.ts                    # Exports uniquement
│
├── entities/                   # Types des modèles
│   ├── user.ts
│   ├── campaign.ts
│   ├── poll.ts
│   ├── character.ts
│   └── streamer.ts
│
├── api/                        # Types API
│   ├── auth.ts
│   ├── campaigns.ts
│   ├── polls.ts
│   └── responses.ts
│
├── events/                     # Types événements
│   ├── poll.ts
│   ├── websocket.ts
│   └── readiness.ts
│
├── features/                   # Types features
│   ├── notifications.ts
│   ├── overlay.ts
│   └── vtt.ts
│
├── overlay-studio.ts           # Types overlay studio (intégré)
│
└── lib/                        # Types librairies
    ├── pwa.d.ts
    ├── gtm.d.ts
    └── troika-three-text.d.ts
```

---

## Ordre d'exécution recommandé

### Semaine 1 : Phase A - Nettoyage
1. ☐ A1 : Supprimer `useSupportTrigger.ts` et nettoyer imports
2. ☐ A2 : Fusionner Card (CardBody, CardHeader, CardFooter)
3. ☐ A2 : Fusionner Loading (LoadingScreen, LoadingState)
4. ☐ A3 : Inliner AddEventDropdown et CampaignSelectorCard
5. ☐ A4 : Créer `variables.css` et centraliser design tokens

### Semaine 2 : Phase B - Composables
1. ☐ B1 : Créer la nouvelle structure de dossiers
2. ☐ B2 : Fusionner composables VTT
3. ☐ B2 : Fusionner composables Support
4. ☐ B3 : Refactorer useWebSocket (découper en 4)
5. ☐ B1 : Créer `composables/index.ts` pour exports centralisés

### Semaine 3 : Phase C - Pages et Composants
1. ☐ C1 : Intégrer overlay-studio dans la structure principale
2. ☐ C2 : Créer dossier `components/shared/`
3. ☐ C2 : Créer dossier `components/streamer/`
4. ☐ C3 : Refactorer `studio.vue`
5. ☐ C3 : Refactorer `mj/index.vue`

### Semaine 4 : Phase C - Types et Finitions
1. ☐ C4 : Restructurer types par domaine
2. ☐ Mettre à jour tous les imports
3. ☐ Vérifier les tests
4. ☐ Vérifier le build
5. ☐ Documentation

---

## Résumé des gains

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Fichiers composables | 35 | ~28 | -7 |
| Fichiers composants | 55 | ~48 | -7 |
| Plus gros fichier page | 1404 lignes | ~400 lignes | -70% |
| Fichiers < 30 lignes | 8 | 0 | -8 |
| Dossiers organisés | Non | Oui | ✓ |
| Design tokens centralisés | Non | Oui | ✓ |
| Types par domaine | Non | Oui | ✓ |

---

## Notes importantes

1. **Tests** : Exécuter `npm run test` après chaque phase
2. **Build** : Exécuter `npm run build` après chaque phase
3. **Commits** : Un commit par sous-tâche (A1, A2, etc.)
4. **Branche** : Travailler sur une branche `refactor/frontend-reorganization`

---

**Prêt pour validation !**
