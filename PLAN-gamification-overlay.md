# Plan : Gamification Overlay System

## Vue d'ensemble

Système complet d'overlay pour la gamification avec :
- **Goal Bar** : Barre de progression style Twitch Goal avec shake progressif
- **Impact HUD** : Animation "slam" pour notifier l'exécution de l'action
- **Personnalisation** : Intégration complète dans l'Overlay Studio

---

## Architecture des états

```
┌─────────────┐    ┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ACTIVE    │───▶│  COMPLETED  │───▶│ PENDING_EXECUTION│───▶│    EXECUTED     │
│ (goal bar)  │    │ (célébration)│    │  (en attente)    │    │ (impact HUD)    │
└─────────────┘    └─────────────┘    └──────────────────┘    └─────────────────┘
       │                  │                                           │
       ▼                  ▼                                           ▼
┌─────────────┐    Barre disparaît                              Cooldown démarre
│   EXPIRED   │    après 3s
│  (timeout)  │
└─────────────┘
```

---

## Phase 1 : Backend - État d'exécution persistant

### 1.1 Migration : Ajouter `execution_status` à `gamification_instances`

**Fichier** : `backend/database/migrations/XXXX_add_execution_status_to_gamification_instances.ts`

```typescript
// Nouveau champ execution_status
execution_status: 'pending' | 'executed' | 'failed' | null

// Nouveau champ executed_at
executed_at: DateTime | null
```

**Valeurs** :
- `null` : Instance pas encore complétée (status = active/expired/cancelled)
- `pending` : Objectif atteint, en attente d'exécution sur Foundry
- `executed` : Action exécutée avec succès
- `failed` : Échec d'exécution (Foundry déconnecté, erreur, etc.)

### 1.2 Cache Redis pour accès rapide

**Clé** : `gamification:pending:{streamerId}`
**TTL** : 24 heures
**Valeur** :
```json
{
  "instanceId": "uuid",
  "eventName": "Inversion de Dé",
  "eventSlug": "dice_invert",
  "actionType": "dice_invert",
  "completedAt": "2024-01-15T14:30:00Z",
  "triggerData": { "characterName": "Gandalf", "criticalType": "success", "result": 20 }
}
```

### 1.3 Nouveau événement WebSocket : `gamification:action_executed`

**Canal** : `streamer:{streamerId}:polls`
**Payload** :
```typescript
{
  event: 'gamification:action_executed',
  data: {
    instanceId: string
    eventName: string
    actionType: 'dice_invert' | 'chat_message' | 'stat_modify'
    success: boolean
    message?: string  // Ex: "Le dé de Gandalf a été inversé : 20 → 1"
  }
}
```

### 1.4 Routes API

| Route | Description |
|-------|-------------|
| `GET /overlay/:streamerId/gamification/pending` | Récupère l'action en attente d'exécution |
| `POST /vtt/gamification/:instanceId/executed` | Callback Foundry quand l'action est exécutée |

### 1.5 Modifications du flow

**Quand l'objectif est atteint** (`instanceManager.complete()`) :
1. `status` = `completed`
2. `execution_status` = `pending`
3. Stocker dans Redis
4. Broadcast `gamification:complete` (célébration overlay)
5. Enregistrer l'action dans la queue Foundry

**Quand Foundry exécute l'action** :
1. Foundry appelle `POST /vtt/gamification/:instanceId/executed`
2. `execution_status` = `executed`
3. `executed_at` = now()
4. Supprimer de Redis
5. Broadcast `gamification:action_executed` (impact HUD)
6. Démarrer le cooldown

---

## Phase 2 : Frontend - Goal Bar améliorée

### 2.1 Composant : `GamificationGoalBar.vue`

**Fichier** : `frontend/components/overlay/GamificationGoalBar.vue`

**États visuels** :

| État | Affichage |
|------|-----------|
| `active` | Barre visible, progression animée, shake à partir de 70% |
| `completed` | Célébration (confetti + glow vert), disparaît après 3s |
| `expired` | Barre rouge, texte "Temps écoulé", disparaît après 2s |

**Animations** :
- **Entry** : Slide down depuis le haut
- **Progress fill** : Transition smooth (300ms ease-out)
- **Shake** : À partir de 70% de progression, amplitude croissante
- **Success** : Glow vert + confetti optionnel
- **Exit** : Fade out + scale down

**Informations affichées** :
```
┌─────────────────────────────────────────────────────────┐
│  🎲 Critique de Gandalf!              45/100 (45%)  0:32│
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────────────────────────────┘
```

### 2.2 Composant : `GamificationImpactHUD.vue`

**Fichier** : `frontend/components/overlay/GamificationImpactHUD.vue`

**Animation "Slam"** :
1. Apparaît depuis le haut de l'écran (hors champ)
2. Descend très rapidement (150ms)
3. "Impact" avec léger rebond et shake
4. Reste affiché 3 secondes
5. Fade out

**Contenu** :
```
┌───────────────────────────┐
│   🎲 INVERSION DE DÉ !    │
│   20 → 1                  │
└───────────────────────────┘
```

**Son** : Joué au moment de l'impact

### 2.3 Intégration dans `[streamerId].vue`

```typescript
// Nouveaux états
const pendingExecution = ref<PendingExecutionData | null>(null)
const showImpactHUD = ref(false)
const impactData = ref<ImpactData | null>(null)

// Nouveaux handlers WebSocket
onGamificationActionExecuted(data) {
  impactData.value = data
  showImpactHUD.value = true
  // Auto-hide après 3s
  setTimeout(() => { showImpactHUD.value = false }, 3000)
}
```

---

## Phase 3 : Overlay Studio - Personnalisation

### 3.1 Types : `GamificationProperties`

**Fichier** : `frontend/overlay-studio/types/gamification.ts`

```typescript
export interface GamificationProperties {
  // ===== GOAL BAR =====
  goalBar: {
    // Container
    container: {
      backgroundColor: string        // #1a1a2e
      borderColor: string            // #9146FF
      borderWidth: number            // 2
      borderRadius: number           // 12
      opacity: number                // 1
      padding: { top: number; right: number; bottom: number; left: number }
      backdropBlur: number           // 0
      boxShadow: { color: string; blur: number; offsetX: number; offsetY: number }
    }

    // Progress Bar
    progressBar: {
      height: number                 // 24
      backgroundColor: string        // #2d2d44
      fillColor: string              // #9146FF
      fillGradient: {
        enabled: boolean
        startColor: string           // #9146FF
        endColor: string             // #ff6b9d
      }
      borderRadius: number           // 8
      glowColor: string              // #9146FF
      glowIntensity: number          // 0.5 (s'intensifie vers la fin)
    }

    // Typography
    eventNameStyle: TypographySettings
    progressTextStyle: TypographySettings  // "45/100 (45%)"
    timerStyle: TypographySettings

    // Animations
    shakeAnimation: {
      enabled: boolean
      startAtPercent: number         // 70
      maxIntensity: number           // 8 (pixels)
    }
    entryAnimation: {
      type: 'slideDown' | 'fadeIn' | 'scaleIn'
      duration: number               // 400
      easing: string                 // 'ease-out'
    }
    successAnimation: {
      confetti: boolean
      glowColor: string              // #22c55e
      glowDuration: number           // 1000
    }
    exitAnimation: {
      type: 'fadeOut' | 'slideUp' | 'scaleOut'
      duration: number               // 300
      delay: number                  // 3000 (après succès)
    }

    // Audio
    progressSound: { enabled: boolean; volume: number }
    successSound: { enabled: boolean; volume: number }
  }

  // ===== IMPACT HUD =====
  impactHUD: {
    // Container
    container: {
      backgroundColor: string        // #1a1a2e
      borderColor: string            // #FFD700
      borderWidth: number            // 3
      borderRadius: number           // 16
      opacity: number                // 1
      padding: { top: number; right: number; bottom: number; left: number }
    }

    // Typography
    titleStyle: TypographySettings   // "INVERSION DE DÉ !"
    detailStyle: TypographySettings  // "20 → 1"

    // Animation
    animation: {
      type: 'slam'                   // Fixé pour l'instant
      dropDistance: number           // 200 (pixels depuis le haut)
      dropDuration: number           // 150
      bounceDuration: number         // 200
      shakeDuration: number          // 100
      shakeIntensity: number         // 5
      displayDuration: number        // 3000
      exitDuration: number           // 300
    }

    // Audio
    impactSound: { enabled: boolean; volume: number }
  }

  // ===== TRANSFORM (Position indépendante) =====
  goalBarPosition: { x: number; y: number }  // Centre-haut par défaut
  goalBarScale: number                       // 1.0
  impactHUDPosition: { x: number; y: number }
  impactHUDScale: number

  // ===== MOCK DATA (Preview) =====
  mockData: {
    eventName: string
    progress: number
    maxProgress: number
    timeRemaining: number
    triggerData: {
      characterName: string
      criticalType: 'success' | 'failure'
      result: number
    }
  }
}
```

### 3.2 Valeurs par défaut

**Fichier** : `backend/app/models/overlay_config.ts`

```typescript
static getDefaultGamificationProperties(): GamificationProperties {
  return {
    goalBar: {
      container: {
        backgroundColor: '#1a1a2e',
        borderColor: '#9146FF',
        borderWidth: 2,
        borderRadius: 12,
        opacity: 1,
        padding: { top: 12, right: 16, bottom: 12, left: 16 },
        backdropBlur: 0,
        boxShadow: { color: 'rgba(145, 70, 255, 0.3)', blur: 20, offsetX: 0, offsetY: 4 }
      },
      progressBar: {
        height: 24,
        backgroundColor: '#2d2d44',
        fillColor: '#9146FF',
        fillGradient: { enabled: true, startColor: '#9146FF', endColor: '#ff6b9d' },
        borderRadius: 8,
        glowColor: '#9146FF',
        glowIntensity: 0.5
      },
      eventNameStyle: { fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: '#ffffff' },
      progressTextStyle: { fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: '#a0a0b0' },
      timerStyle: { fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 700, color: '#ffffff' },
      shakeAnimation: { enabled: true, startAtPercent: 70, maxIntensity: 8 },
      entryAnimation: { type: 'slideDown', duration: 400, easing: 'ease-out' },
      successAnimation: { confetti: true, glowColor: '#22c55e', glowDuration: 1000 },
      exitAnimation: { type: 'fadeOut', duration: 300, delay: 3000 },
      progressSound: { enabled: false, volume: 0.3 },
      successSound: { enabled: true, volume: 0.5 }
    },
    impactHUD: {
      container: {
        backgroundColor: '#1a1a2e',
        borderColor: '#FFD700',
        borderWidth: 3,
        borderRadius: 16,
        opacity: 1,
        padding: { top: 16, right: 24, bottom: 16, left: 24 }
      },
      titleStyle: { fontFamily: 'Inter', fontSize: 28, fontWeight: 800, color: '#FFD700' },
      detailStyle: { fontFamily: 'JetBrains Mono', fontSize: 36, fontWeight: 700, color: '#ffffff' },
      animation: {
        type: 'slam',
        dropDistance: 200,
        dropDuration: 150,
        bounceDuration: 200,
        shakeDuration: 100,
        shakeIntensity: 5,
        displayDuration: 3000,
        exitDuration: 300
      },
      impactSound: { enabled: true, volume: 0.6 }
    },
    goalBarPosition: { x: 0, y: -400 },  // Centre-haut
    goalBarScale: 1.0,
    impactHUDPosition: { x: 0, y: -200 },
    impactHUDScale: 1.0,
    mockData: {
      eventName: '🎲 Critique de Gandalf!',
      progress: 45,
      maxProgress: 100,
      timeRemaining: 32,
      triggerData: { characterName: 'Gandalf', criticalType: 'success', result: 20 }
    }
  }
}
```

### 3.3 Inspector : `GamificationInspector.vue`

**Fichier** : `frontend/overlay-studio/components/inspector/GamificationInspector.vue`

**Sections** :
1. **Goal Bar - Container** : Background, border, radius, opacity, padding, shadow
2. **Goal Bar - Barre de progression** : Height, colors, gradient, glow
3. **Goal Bar - Typographie** : Event name, progress text, timer
4. **Goal Bar - Animations** : Shake, entry, success, exit
5. **Impact HUD - Container** : Background, border, radius, padding
6. **Impact HUD - Typographie** : Title, detail
7. **Impact HUD - Animation** : Slam settings
8. **Audio** : Toggle + volume pour les 3 sons
9. **Mock Data** : Preview data

### 3.4 Studio Canvas Element

**Fichier** : `frontend/overlay-studio/components/StudioGamificationElement.vue`

- Affiche la Goal Bar en mode preview
- Boutons pour tester les animations (entry, progress, success, impact)
- Utilise les mock data pour le rendu

### 3.5 Enregistrement dans le Studio

**Fichier** : `frontend/pages/dashboard/studio.vue`

```typescript
const elementTypes = [
  { type: 'poll', label: 'Sondage', icon: 'i-lucide-bar-chart-3' },
  { type: 'dice', label: 'Dés 3D', icon: 'i-lucide-dice-5' },
  { type: 'gamification', label: 'Gamification', icon: 'i-lucide-trophy' },  // NEW
]
```

---

## Phase 4 : Sons

### 4.1 Fichiers audio placeholder

**Dossier** : `frontend/public/sounds/gamification/`

| Fichier | Usage |
|---------|-------|
| `progress.mp3` | Bip à chaque contribution |
| `success.mp3` | Célébration quand objectif atteint |
| `impact.mp3` | Son "slam" quand action exécutée |

### 4.2 Intégration

```typescript
const playSound = (soundType: 'progress' | 'success' | 'impact') => {
  const props = element.properties as GamificationProperties
  const config = soundType === 'progress' ? props.goalBar.progressSound
                : soundType === 'success' ? props.goalBar.successSound
                : props.impactHUD.impactSound

  if (config.enabled) {
    const audio = new Audio(`/sounds/gamification/${soundType}.mp3`)
    audio.volume = config.volume
    audio.play()
  }
}
```

---

## Fichiers à créer/modifier

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `backend/database/migrations/XXXX_add_execution_status.ts` | Migration BDD |
| `backend/app/services/gamification/execution_tracker.ts` | Service Redis + état exécution |
| `frontend/components/overlay/GamificationGoalBar.vue` | Composant Goal Bar |
| `frontend/components/overlay/GamificationImpactHUD.vue` | Composant Impact HUD |
| `frontend/overlay-studio/types/gamification.ts` | Types GamificationProperties |
| `frontend/overlay-studio/components/inspector/GamificationInspector.vue` | Inspector |
| `frontend/overlay-studio/components/StudioGamificationElement.vue` | Preview Studio |
| `frontend/public/sounds/gamification/*.mp3` | Sons (placeholders) |

### Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `backend/app/models/gamification_instance.ts` | Ajouter `execution_status`, `executed_at` |
| `backend/app/models/overlay_config.ts` | Ajouter `getDefaultGamificationProperties()` |
| `backend/app/services/gamification/instance_manager.ts` | Gérer `pending` → `executed` |
| `backend/app/services/gamification/gamification_service.ts` | Broadcast `action_executed` |
| `backend/start/routes.ts` | Route `/vtt/gamification/:instanceId/executed` |
| `frontend/pages/overlay/[streamerId].vue` | Intégrer Goal Bar + Impact HUD |
| `frontend/composables/useWebSocket.ts` | Handler `gamification:action_executed` |
| `frontend/overlay-studio/types/index.ts` | Ajouter type 'gamification' |
| `frontend/pages/dashboard/studio.vue` | Ajouter élément gamification |

---

## Ordre d'implémentation recommandé

### Sprint 1 : Goal Bar de base
1. Créer `GamificationGoalBar.vue` avec les états (active, completed, expired)
2. Intégrer dans `[streamerId].vue`
3. Ajouter le shake progressif à partir de 70%
4. Tester avec les boutons DEV existants

### Sprint 2 : État d'exécution persistant
1. Migration BDD (`execution_status`, `executed_at`)
2. Service `ExecutionTracker` (Redis + PostgreSQL)
3. Modifier `instanceManager.complete()` pour passer en `pending`
4. Route callback Foundry `/vtt/gamification/:instanceId/executed`
5. Broadcast `gamification:action_executed`

### Sprint 3 : Impact HUD
1. Créer `GamificationImpactHUD.vue` avec animation slam
2. Handler WebSocket `gamification:action_executed`
3. Intégrer dans `[streamerId].vue`
4. Ajouter les sons

### Sprint 4 : Overlay Studio
1. Types `GamificationProperties`
2. Valeurs par défaut dans `overlay_config.ts`
3. `GamificationInspector.vue`
4. `StudioGamificationElement.vue`
5. Enregistrer dans le Studio

---

## Tests

### Tests unitaires
- `ExecutionTracker.spec.ts` : Redis + fallback PostgreSQL
- `GamificationGoalBar.spec.ts` : Rendu des états
- `GamificationImpactHUD.spec.ts` : Animation slam

### Tests E2E
- Scénario complet : trigger → progress → complete → pending → executed
- Vérifier persistence après refresh
- Vérifier que l'Impact HUD apparaît même si overlay rechargé entre-temps

---

## Notes techniques

### Résilience
- **Redis down** : Fallback sur PostgreSQL (query `WHERE execution_status = 'pending'`)
- **Foundry déconnecté** : L'action reste en `pending`, sera exécutée au prochain jet éligible
- **Overlay refresh** : Au chargement, vérifier s'il y a une action `pending` via API

### Performance
- Redis TTL 24h pour éviter accumulation
- Index sur `(campaign_id, execution_status)` pour queries rapides
- WebSocket broadcast ciblé par `streamerId`

### Sécurité
- Route `/vtt/gamification/:instanceId/executed` protégée par token VTT
- Validation que l'instance appartient bien à la campagne de la connexion VTT
