# Système de Support Frontend

## Vue d'ensemble

Le système de support frontend détecte automatiquement les erreurs et ouvre le widget de support avec un message pré-rempli en français. Conçu pour la phase Alpha, il maximise la capture de bugs.

## Composants

### 1. supportErrorMessages.ts

Catalogue exhaustif des messages d'erreur.

**Fichier**: `utils/supportErrorMessages.ts`

```typescript
import {
  SUPPORT_ERROR_MESSAGES,
  ACTION_TYPE_LABELS,
  ACTION_CATEGORIES,
  type SupportActionType
} from '@/utils/supportErrorMessages'

// Obtenir le message pour une action
const message = SUPPORT_ERROR_MESSAGES['poll_launch']
// => "Une erreur est survenue lors du lancement du sondage."

// Obtenir le label court pour le badge
const label = ACTION_TYPE_LABELS['poll_launch']
// => "Lancement sondage"

// Obtenir la catégorie
const category = ACTION_CATEGORIES['poll_launch']
// => "poll"
```

### 2. useSupportTrigger

Composable pour déclencher le widget avec rate limiting.

**Fichier**: `composables/useSupportTrigger.ts`

```typescript
import { useSupportTrigger } from '@/composables/useSupportTrigger'

const {
  triggerSupportForError,
  canAutoOpen,
  getRemainingCooldown,
  resetRateLimit,
  RATE_LIMIT_MS
} = useSupportTrigger()

// Déclencher sur une erreur
try {
  await fetchCampaigns()
} catch (error) {
  triggerSupportForError('campaign_fetch', error, 'Contexte optionnel')
  throw error
}

// Vérifier si on peut ouvrir
if (canAutoOpen()) {
  // Widget peut être ouvert automatiquement
}

// Temps restant avant prochaine ouverture (ms)
const remaining = getRemainingCooldown()
```

### 3. useSupportWidget

Composable pour contrôler le widget.

**Fichier**: `composables/useSupportWidget.ts`

```typescript
import { useSupportWidget } from '@/composables/useSupportWidget'

const {
  isSupportWidgetOpen,
  prefillMessage,
  prefillActionType,
  openSupport,
  closeSupport,
  openWithPrefill
} = useSupportWidget()

// Ouvrir avec message pré-rempli
openWithPrefill('Message personnalisé', 'poll_launch')

// Fermer le widget
closeSupport()
```

### 4. SupportWidget.vue

Composant Vue du widget de support.

**Fichier**: `components/SupportWidget.vue`

Le widget affiche:
- Badge avec le type d'erreur (si présent)
- Textarea pré-remplie avec le message d'erreur
- Checkbox "Joindre les logs" (activée par défaut)
- Boutons Annuler/Envoyer

## Intégration dans les stores

### Pattern recommandé

```typescript
// stores/campaigns.ts
import { useSupportTrigger } from '@/composables/useSupportTrigger'

export const useCampaignsStore = defineStore('campaigns', () => {
  const { triggerSupportForError } = useSupportTrigger()

  const fetchCampaigns = async () => {
    try {
      // ... logique existante
    } catch (error) {
      triggerSupportForError('campaign_fetch', error)
      throw error
    }
  }

  const createCampaign = async (data: CampaignData) => {
    try {
      // ... logique existante
    } catch (error) {
      triggerSupportForError('campaign_create', error)
      throw error
    }
  }

  return { fetchCampaigns, createCampaign }
})
```

## Intégration dans le HTTP Client

```typescript
// api/http_client.ts
import { useSupportTrigger } from '@/composables/useSupportTrigger'

// Dans l'intercepteur de réponse
this.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 500) {
      this.triggerSupport?.('generic_server_error', error)
    }
    if (error.code === 'ECONNABORTED') {
      this.triggerSupport?.('generic_timeout', error)
    }
    if (!error.response) {
      this.triggerSupport?.('generic_network_error', error)
    }
    return Promise.reject(error)
  }
)
```

## Ajouter un nouveau type d'action

1. Ajouter le type dans `SupportActionType`:
```typescript
// utils/supportErrorMessages.ts
export type SupportActionType =
  // ... types existants
  | 'new_action_type'
```

2. Ajouter le message:
```typescript
export const SUPPORT_ERROR_MESSAGES: Record<SupportActionType, string> = {
  // ... messages existants
  new_action_type: "Une erreur est survenue lors de la nouvelle action.",
}
```

3. Ajouter le label:
```typescript
export const ACTION_TYPE_LABELS: Record<SupportActionType, string> = {
  // ... labels existants
  new_action_type: "Nouvelle action",
}
```

4. Ajouter la catégorie:
```typescript
export const ACTION_CATEGORIES: Record<SupportActionType, ActionCategory> = {
  // ... catégories existantes
  new_action_type: "generic",
}
```

## Rate Limiting

Le système implémente un rate limit de **1 ouverture automatique par minute** pour éviter le spam.

```typescript
const RATE_LIMIT_MS = 60_000 // 1 minute

const canAutoOpen = (): boolean => {
  return Date.now() - lastAutoOpenTime.value >= RATE_LIMIT_MS
}
```

## Tests

```bash
# Tests du catalogue de messages
npm run test -- --run tests/unit/utils/supportErrorMessages.spec.ts

# Tests du composable trigger
npm run test -- --run tests/unit/composables/useSupportTrigger.spec.ts
```

## Liste des types d'actions (60+)

### Authentification (5)
- `auth_login`, `auth_callback`, `auth_logout`, `auth_switch_role`, `auth_fetch_me`

### Campagnes MJ (8)
- `campaign_fetch`, `campaign_fetch_detail`, `campaign_create`, `campaign_update`
- `campaign_delete`, `campaign_invite`, `campaign_members_fetch`, `campaign_member_remove`

### Sessions (6)
- `session_fetch`, `session_create`, `session_update`, `session_delete`
- `session_launch`, `session_close`

### Templates (5)
- `template_fetch`, `template_create`, `template_update`, `template_delete`
- `template_add_to_session`

### Contrôle sondages (7)
- `poll_launch`, `poll_cancel`, `poll_fetch_results`, `poll_fetch_live`
- `poll_next`, `poll_previous`, `poll_reorder`

### Streamer (5)
- `streamer_invitations_fetch`, `streamer_invitation_accept`, `streamer_invitation_decline`
- `streamer_campaigns_fetch`, `streamer_campaign_leave`

### Authorization Twitch (4)
- `authorization_status_fetch`, `authorization_grant`, `authorization_revoke`
- `twitch_revoke_all`

### Notifications Push (6)
- `push_permission_request`, `push_subscribe`, `push_unsubscribe`
- `push_subscriptions_fetch`, `push_subscription_delete`, `push_preferences_update`

### WebSocket (4)
- `websocket_connect`, `websocket_subscribe`, `websocket_message_parse`
- `websocket_reconnect`

### Health Check (4)
- `health_check_global`, `health_check_twitch`, `health_check_redis`
- `health_check_tokens`

### Overlay (3)
- `overlay_campaigns_fetch`, `overlay_poll_subscribe`, `overlay_poll_display`

### Compte (2)
- `account_delete`, `settings_update`

### Support (1)
- `support_send`

### Processus de fond (5)
- `token_refresh_auto`, `poll_polling_cycle`, `poll_aggregation`
- `twitch_chat_message`, `push_notification_send`

### Génériques (3)
- `generic_server_error`, `generic_network_error`, `generic_timeout`
