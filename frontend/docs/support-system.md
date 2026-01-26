# Frontend Support System

## Overview

The frontend support system allows users to report issues through a support widget. It provides contextual error messages and pre-fills the support form based on the action that triggered the error.

## Components

### 1. supportErrorMessages.ts

Comprehensive catalog of error messages.

**File**: `utils/supportErrorMessages.ts`

```typescript
import {
  SUPPORT_ERROR_MESSAGES,
  ACTION_TYPE_LABELS,
  ACTION_CATEGORIES,
  type SupportActionType,
} from '@/utils/supportErrorMessages'

// Get the message for an action
const message = SUPPORT_ERROR_MESSAGES['poll_launch']
// => "Une erreur est survenue lors du lancement du sondage."

// Get the short label for the badge
const label = ACTION_TYPE_LABELS['poll_launch']
// => "Lancement sondage"

// Get the category
const category = ACTION_CATEGORIES['poll_launch']
// => "poll"
```

### 2. useSupportWidget

Composable to control the support widget.

**File**: `composables/useSupportWidget.ts`

```typescript
import { useSupportWidget } from '@/composables/useSupportWidget'

const {
  isSupportWidgetOpen,
  prefillMessage,
  prefillActionType,
  openSupport,
  closeSupport,
  openWithPrefill,
} = useSupportWidget()

// Open with pre-filled message
openWithPrefill('Custom message', 'poll_launch')

// Open without pre-fill
openSupport()

// Close the widget
closeSupport()
```

### 3. SupportWidget.vue

Vue component for the support widget.

**File**: `components/SupportWidget.vue`

The widget displays:

- Badge with the error type (if present)
- Textarea pre-filled with the error message
- "Attach logs" checkbox (enabled by default)
- Cancel/Send buttons

## Manual Error Reporting

To open the support widget with a contextual error message:

```typescript
import { useSupportWidget } from '@/composables/useSupportWidget'
import { SUPPORT_ERROR_MESSAGES } from '@/utils/supportErrorMessages'

const { openWithPrefill } = useSupportWidget()

try {
  await fetchCampaigns()
} catch (error) {
  console.error('Failed to fetch campaigns:', error)
  openWithPrefill(SUPPORT_ERROR_MESSAGES['campaign_fetch'], 'campaign_fetch')
  throw error
}
```

## Adding a New Action Type

1. Add the type in `SupportActionType`:

```typescript
// utils/supportErrorMessages.ts
export type SupportActionType =
  // ... existing types
  'new_action_type'
```

2. Add the message:

```typescript
export const SUPPORT_ERROR_MESSAGES: Record<SupportActionType, string> = {
  // ... existing messages
  new_action_type: 'Une erreur est survenue lors de la nouvelle action.',
}
```

3. Add the label:

```typescript
export const ACTION_TYPE_LABELS: Record<SupportActionType, string> = {
  // ... existing labels
  new_action_type: 'Nouvelle action',
}
```

4. Add the category:

```typescript
export const ACTION_CATEGORIES: Record<SupportActionType, ActionCategory> = {
  // ... existing categories
  new_action_type: 'generic',
}
```

## Tests

```bash
# Tests for message catalog
npm run test -- --run tests/unit/utils/supportErrorMessages.spec.ts
```

## Action Types List (60+)

### Authentication (5)

- `auth_login`, `auth_callback`, `auth_logout`, `auth_switch_role`, `auth_fetch_me`

### GM Campaigns (8)

- `campaign_fetch`, `campaign_fetch_detail`, `campaign_create`, `campaign_update`
- `campaign_delete`, `campaign_invite`, `campaign_members_fetch`, `campaign_member_remove`

### Sessions (6)

- `session_fetch`, `session_create`, `session_update`, `session_delete`
- `session_launch`, `session_close`

### Templates (5)

- `template_fetch`, `template_create`, `template_update`, `template_delete`
- `template_add_to_session`

### Poll Control (7)

- `poll_launch`, `poll_cancel`, `poll_fetch_results`, `poll_fetch_live`
- `poll_next`, `poll_previous`, `poll_reorder`

### Streamer (5)

- `streamer_invitations_fetch`, `streamer_invitation_accept`, `streamer_invitation_decline`
- `streamer_campaigns_fetch`, `streamer_campaign_leave`

### Twitch Authorization (4)

- `authorization_status_fetch`, `authorization_grant`, `authorization_revoke`
- `twitch_revoke_all`

### Push Notifications (6)

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

### Account (2)

- `account_delete`, `settings_update`

### Support (1)

- `support_send`

### Background Processes (5)

- `token_refresh_auto`, `poll_polling_cycle`, `poll_aggregation`
- `twitch_chat_message`, `push_notification_send`

### Generic (3)

- `generic_server_error`, `generic_network_error`, `generic_timeout`
