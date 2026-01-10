# API Reference

Complete API documentation for Tumulte.

## Base URL

- Development: `http://localhost:3333`
- Production: `https://your-domain.com`

## Authentication

Most endpoints require authentication via session cookie (set after Twitch OAuth login).

---

## Health & Info Endpoints

### GET /

Returns API information.

**Response**: `200 OK`
```json
{
  "app": "Twitch Multi-Stream Poll",
  "version": "1.0.0",
  "status": "running"
}
```

---

### GET /health

Returns server health status.

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

---

## Auth Endpoints

### GET /auth/twitch/redirect

Redirects user to Twitch OAuth authorization page.

**Response**: `302 Redirect` to Twitch

---

### GET /auth/twitch/callback

Handles OAuth callback from Twitch. Rate limited (10 req/min).

**Query Parameters**:
| Param | Description |
|-------|-------------|
| code | Authorization code from Twitch |
| state | CSRF protection token |

**Response**: `302 Redirect` to frontend

---

### POST /auth/logout

Logs out the current user.

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /auth/me

Returns the current authenticated user.

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "id": "usr_abc123",
  "username": "coolstreamer",
  "role": "MJ",
  "twitchId": "12345678",
  "streamer": {
    "id": "str_xyz789",
    "twitchDisplayName": "CoolStreamer",
    "broadcasterType": "affiliate"
  }
}
```

---

### POST /auth/switch-role

Switches between GM and Streamer roles.

**Authentication**: Required

**Request**:
```json
{
  "role": "MJ" | "STREAMER"
}
```

**Response**: `200 OK`
```json
{
  "role": "MJ"
}
```

---

## Campaign Endpoints (GM)

### GET /mj/campaigns

Lists all campaigns for the authenticated GM.

**Authentication**: Required (GM role)

**Response**: `200 OK`
```json
[
  {
    "id": "cmp_abc123",
    "name": "The Dragon's Lair",
    "status": "ACTIVE",
    "createdAt": "2024-01-15T10:30:00Z",
    "memberCount": 3
  }
]
```

---

### POST /mj/campaigns

Creates a new campaign.

**Authentication**: Required (GM role)

**Request**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Campaign name (3-100 chars) |
| description | string | No | Campaign description |

```json
{
  "name": "The Dragon's Lair",
  "description": "An epic adventure awaits"
}
```

**Response**: `201 Created`

---

### GET /mj/campaigns/:id

Gets a specific campaign with full details.

**Authentication**: Required (GM role, campaign owner)

**Response**: `200 OK`
```json
{
  "id": "cmp_abc123",
  "name": "The Dragon's Lair",
  "description": "An epic adventure awaits",
  "status": "ACTIVE",
  "createdAt": "2024-01-15T10:30:00Z",
  "members": [
    {
      "id": "mbr_xyz789",
      "streamer": {
        "id": "str_123",
        "twitchDisplayName": "CoolStreamer"
      },
      "status": "ACTIVE"
    }
  ]
}
```

---

### PUT /mj/campaigns/:id

Updates a campaign.

**Authentication**: Required (GM role, campaign owner)

**Request**:
```json
{
  "name": "Updated Name",
  "status": "ARCHIVED"
}
```

**Response**: `200 OK`

---

### DELETE /mj/campaigns/:id

Deletes a campaign.

**Authentication**: Required (GM role, campaign owner)

**Response**: `204 No Content`

---

### POST /mj/campaigns/:id/invite

Invites a streamer to the campaign. Rate limited (30 req/min).

**Authentication**: Required (GM role, campaign owner)

**Request**:
```json
{
  "twitchUsername": "streamer_name"
}
```

**Response**: `201 Created`
```json
{
  "id": "mbr_abc123",
  "status": "PENDING",
  "streamer": {
    "twitchDisplayName": "streamer_name"
  }
}
```

---

### GET /mj/campaigns/:id/members

Lists all members of a campaign.

**Authentication**: Required (GM role, campaign owner)

**Response**: `200 OK`

---

### DELETE /mj/campaigns/:id/members/:memberId

Removes a member from a campaign.

**Authentication**: Required (GM role, campaign owner)

**Response**: `204 No Content`

---

### GET /mj/campaigns/:id/live-status

Gets live status of all campaign streamers.

**Authentication**: Required (GM role, campaign owner)

**Response**: `200 OK`
```json
{
  "streamers": [
    {
      "id": "str_123",
      "twitchDisplayName": "CoolStreamer",
      "isLive": true,
      "viewerCount": 1234
    }
  ]
}
```

---

### GET /mj/campaigns/:id/streamers/readiness

Gets readiness status of all campaign streamers for poll sessions.

**Authentication**: Required (GM role, campaign owner)

**Response**: `200 OK`
```json
{
  "ready": [
    {
      "streamerId": "str_123",
      "displayName": "CoolStreamer",
      "isAuthorized": true,
      "tokenValid": true
    }
  ],
  "notReady": [
    {
      "streamerId": "str_456",
      "displayName": "OtherStreamer",
      "issues": ["token_expired", "not_authorized"]
    }
  ]
}
```

---

### POST /mj/campaigns/:id/notify-unready

Sends push notifications to unready streamers.

**Authentication**: Required (GM role, campaign owner)

**Response**: `200 OK`
```json
{
  "notified": 2,
  "failed": 0
}
```

---

## Session Endpoints (GM)

### GET /mj/campaigns/:campaignId/sessions

Lists sessions for a campaign.

**Authentication**: Required (GM role, campaign owner)

**Response**: `200 OK`
```json
[
  {
    "id": "ses_abc123",
    "name": "Session 1",
    "status": "DRAFT",
    "pollCount": 5,
    "createdAt": "2024-01-15T18:00:00Z"
  }
]
```

---

### POST /mj/campaigns/:campaignId/sessions

Creates a new session.

**Authentication**: Required (GM role, campaign owner)

**Request**:
```json
{
  "name": "Session 1 - The Tavern"
}
```

**Response**: `201 Created`

---

### GET /mj/sessions/:id

Gets a specific session with polls.

**Authentication**: Required (GM role, session owner)

**Response**: `200 OK`

---

### PUT /mj/sessions/:id

Updates a session.

**Authentication**: Required (GM role, session owner)

**Response**: `200 OK`

---

### DELETE /mj/sessions/:id

Deletes a session.

**Authentication**: Required (GM role, session owner)

**Response**: `204 No Content`

---

### DELETE /mj/campaigns/:campaignId/sessions/:id

Deletes a session (campaign-scoped route).

**Authentication**: Required (GM role, campaign owner)

**Response**: `204 No Content`

---

### POST /mj/sessions/:id/polls

Adds a poll to a session.

**Authentication**: Required (GM role, session owner)

**Request**:
```json
{
  "question": "What should the party do?",
  "options": ["Attack", "Flee", "Negotiate"],
  "durationSeconds": 60
}
```

**Response**: `201 Created`

---

### PUT /mj/sessions/:id/polls/:pollId

Updates a poll in a session.

**Authentication**: Required (GM role, session owner)

**Response**: `200 OK`

---

### DELETE /mj/sessions/:id/polls/:pollId

Removes a poll from a session.

**Authentication**: Required (GM role, session owner)

**Response**: `204 No Content`

---

### PUT /mj/sessions/:id/polls/reorder

Reorders polls in a session.

**Authentication**: Required (GM role, session owner)

**Request**:
```json
{
  "pollIds": ["poll_123", "poll_456", "poll_789"]
}
```

**Response**: `200 OK`

---

### POST /mj/campaigns/:campaignId/sessions/:sessionId/launch

Launches a poll session with health check.

**Authentication**: Required (GM role, campaign owner)

**Response**: `200 OK`
```json
{
  "status": "ACTIVE",
  "startedAt": "2024-01-15T18:00:00Z"
}
```

**Error Response**: `503 Service Unavailable`
```json
{
  "error": "System health check failed. Cannot launch session.",
  "healthCheck": {
    "healthy": false,
    "services": {
      "twitchApi": { "available": true },
      "redis": { "connected": true },
      "tokens": {
        "valid": false,
        "invalidStreamers": [
          { "id": "str_123", "displayName": "CoolStreamer", "error": "Token expired" }
        ]
      },
      "websocket": { "ready": true }
    }
  }
}
```

---

## Template Endpoints (GM)

### GET /mj/campaigns/:campaignId/templates

Lists templates for a campaign.

**Authentication**: Required (GM role, campaign owner)

**Response**: `200 OK`

---

### POST /mj/campaigns/:campaignId/templates

Creates a new template in a campaign.

**Authentication**: Required (GM role, campaign owner)

**Response**: `201 Created`

---

### GET /mj/templates

Lists all templates for the GM.

**Authentication**: Required (GM role)

**Response**: `200 OK`

---

### GET /mj/templates/:id

Gets a specific template.

**Authentication**: Required (GM role)

**Response**: `200 OK`

---

### PUT /mj/templates/:id

Updates a template.

**Authentication**: Required (GM role, template owner)

**Response**: `200 OK`

---

### DELETE /mj/templates/:id

Deletes a template.

**Authentication**: Required (GM role, template owner)

**Response**: `204 No Content`

---

## Poll Control Endpoints (GM)

### POST /mj/campaigns/:campaignId/polls/launch

Launches a poll across all campaign streamers. Rate limited (20 req/min).

**Authentication**: Required (GM role, campaign owner)

**Request**:
```json
{
  "question": "What should the party do?",
  "options": ["Attack", "Flee", "Negotiate"],
  "durationSeconds": 60
}
```

**Response**: `201 Created`
```json
{
  "id": "pli_abc123",
  "status": "RUNNING",
  "startedAt": "2024-01-15T18:00:00Z",
  "endsAt": "2024-01-15T18:01:00Z"
}
```

---

### GET /mj/polls

Lists all polls for the GM.

**Authentication**: Required (GM role)

**Response**: `200 OK`

---

### GET /mj/polls/:id

Gets a specific poll.

**Authentication**: Required (GM role)

**Response**: `200 OK`

---

### POST /mj/polls/:id/cancel

Cancels an active poll.

**Authentication**: Required (GM role, poll owner)

**Response**: `200 OK`

---

### GET /mj/polls/:id/results

Gets final results of a poll.

**Authentication**: Required (GM role, poll owner)

**Response**: `200 OK`
```json
{
  "question": "What should the party do?",
  "totalVotes": 100,
  "options": [
    { "text": "Attack", "votes": 45, "percentage": 45 },
    { "text": "Flee", "votes": 30, "percentage": 30 },
    { "text": "Negotiate", "votes": 25, "percentage": 25 }
  ],
  "streamerBreakdown": [
    {
      "streamerId": "str_123",
      "displayName": "CoolStreamer",
      "votes": 60
    }
  ]
}
```

---

### GET /mj/polls/:id/live

Gets live results of an active poll (for real-time updates).

**Authentication**: Required (GM role, poll owner)

**Response**: `200 OK`

---

### GET /mj/active-session

Gets the currently active session/poll for the GM.

**Authentication**: Required (GM role)

**Response**: `200 OK`

---

## Streamer Search (GM)

### GET /mj/streamers

Lists streamers known to the system.

**Authentication**: Required (GM role)

**Response**: `200 OK`

---

### GET /mj/streamers/search

Searches for streamers on Twitch.

**Authentication**: Required (GM role)

**Query Parameters**:
| Param | Description |
|-------|-------------|
| q | Search query (Twitch username) |

**Response**: `200 OK`

---

## Streamer Endpoints

### GET /streamer/campaigns/invitations

Lists pending campaign invitations.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`
```json
[
  {
    "id": "mbr_abc123",
    "campaign": {
      "id": "cmp_xyz789",
      "name": "The Dragon's Lair"
    },
    "invitedAt": "2024-01-14T12:00:00Z"
  }
]
```

---

### POST /streamer/campaigns/invitations/:id/accept

Accepts a campaign invitation.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`

---

### POST /streamer/campaigns/invitations/:id/decline

Declines a campaign invitation.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`

---

### GET /streamer/campaigns

Lists active campaigns the streamer is a member of.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`

---

### POST /streamer/campaigns/:id/leave

Leaves a campaign.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`

---

### GET /streamer/campaigns/authorization-status

Gets authorization status for all campaigns.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`
```json
{
  "campaigns": [
    {
      "campaign_id": "cmp_abc123",
      "campaign_name": "The Dragon's Lair",
      "is_authorized": true,
      "is_owner": false,
      "authorized_until": "2024-01-15T06:00:00Z"
    }
  ]
}
```

---

### POST /streamer/campaigns/:campaignId/authorize

Grants poll authorization for a campaign (12h window).

**Authentication**: Required (Streamer role, campaign member)

**Response**: `200 OK`
```json
{
  "authorizedUntil": "2024-01-15T06:00:00Z"
}
```

---

### DELETE /streamer/campaigns/:campaignId/authorize

Revokes poll authorization for a campaign.

**Authentication**: Required (Streamer role, campaign member)

**Response**: `200 OK`

---

### POST /streamer/revoke

Revokes all Twitch access (tokens).

**Authentication**: Required (Streamer role)

**Response**: `200 OK`

---

### GET /streamer/overlay-url

Gets the OBS overlay URL for the streamer.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`
```json
{
  "url": "https://your-domain.com/overlay/str_abc123"
}
```

---

## Overlay Studio Endpoints (Streamer)

### GET /streamer/overlay-studio/configs

Lists all overlay configurations for the streamer.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`

---

### POST /streamer/overlay-studio/configs

Creates a new overlay configuration. Rate limited.

**Authentication**: Required (Streamer role)

**Response**: `201 Created`

---

### GET /streamer/overlay-studio/configs/:id

Gets a specific overlay configuration.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`

---

### PUT /streamer/overlay-studio/configs/:id

Updates an overlay configuration. Rate limited.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`

---

### DELETE /streamer/overlay-studio/configs/:id

Deletes an overlay configuration. Rate limited.

**Authentication**: Required (Streamer role)

**Response**: `204 No Content`

---

### POST /streamer/overlay-studio/configs/:id/activate

Activates an overlay configuration. Rate limited.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`

---

### POST /streamer/overlay-studio/preview-command

Sends a preview command to sync with OBS overlay. Rate limited.

**Authentication**: Required (Streamer role)

**Request**:
```json
{
  "command": "show" | "hide" | "refresh"
}
```

**Response**: `200 OK`

---

## Overlay Endpoints (Public)

These endpoints are used by OBS Browser Sources and do not require authentication.

### GET /overlay/:streamerId

Gets basic info about a streamer for the overlay.

**Authentication**: Not required

**Response**: `200 OK`

---

### GET /overlay/:streamerId/active-poll

Gets the active poll for a streamer's overlay.

**Authentication**: Not required

**Response**: `200 OK`
```json
{
  "id": "pli_abc123",
  "question": "What should the party do?",
  "choices": [
    { "id": 1, "text": "Attack", "votes": 45 },
    { "id": 2, "text": "Flee", "votes": 30 },
    { "id": 3, "text": "Negotiate", "votes": 25 }
  ],
  "status": "RUNNING",
  "endsAt": "2024-01-15T18:05:00Z"
}
```

**Response**: `204 No Content` (no active poll)

---

### GET /overlay/:streamerId/poll/:pollInstanceId

Gets results for a specific poll.

**Authentication**: Not required

**Response**: `200 OK`

---

### GET /overlay/:streamerId/config

Gets the active overlay configuration for a streamer.

**Authentication**: Not required

**Response**: `200 OK`

---

## Account Endpoints

### DELETE /account/delete

Deletes the authenticated user's account and all associated data.

**Authentication**: Required

**Response**: `200 OK`

---

## Support Endpoints

### POST /support/report

Sends a support report (bug report, feedback).

**Authentication**: Required

**Request**:
```json
{
  "message": "Bug description...",
  "actionType": "poll_launch",
  "includeLogs": true
}
```

**Response**: `200 OK`

---

### GET /support/logs

Gets recent error logs for the current user (from Redis buffer).

**Authentication**: Required

**Response**: `200 OK`

---

## Push Notification Endpoints

### GET /notifications/vapid-public-key

Gets the VAPID public key for push notification subscription.

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "publicKey": "BNxR..."
}
```

---

### POST /notifications/subscribe

Subscribes to push notifications.

**Authentication**: Required

**Request**:
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  },
  "deviceName": "Chrome Desktop"
}
```

**Response**: `201 Created`

---

### DELETE /notifications/subscribe

Unsubscribes from push notifications.

**Authentication**: Required

**Request**:
```json
{
  "endpoint": "https://fcm.googleapis.com/..."
}
```

**Response**: `200 OK`

---

### GET /notifications/subscriptions

Lists all push notification subscriptions for the user.

**Authentication**: Required

**Response**: `200 OK`
```json
[
  {
    "id": "sub_abc123",
    "deviceName": "Chrome Desktop",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

---

### DELETE /notifications/subscriptions/:id

Deletes a specific push notification subscription.

**Authentication**: Required

**Response**: `200 OK`

---

### GET /notifications/preferences

Gets notification preferences.

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "sessionReminders": true,
  "invitations": true,
  "authorizationExpiry": true
}
```

---

### PUT /notifications/preferences

Updates notification preferences.

**Authentication**: Required

**Request**:
```json
{
  "sessionReminders": false
}
```

**Response**: `200 OK`

---

## WebSocket (Transmit)

Real-time events are delivered via AdonisJS Transmit (SSE-based WebSocket).

### Channel: `campaign:{campaignId}`

Events for campaign-wide updates.

**Events**:
- `poll:launched` - New poll started
- `poll:results` - Poll results updated
- `poll:ended` - Poll completed
- `member:joined` - New member joined
- `member:left` - Member left

### Channel: `streamer:{streamerId}`

Events for streamer-specific updates.

**Events**:
- `poll:active` - Poll active on this channel
- `overlay:update` - Overlay configuration changed

### Channel: `overlay:{streamerId}`

Events for OBS overlay (public, no auth).

**Events**:
- `poll:show` - Display poll
- `poll:update` - Update poll results
- `poll:hide` - Hide poll
- `preview:command` - Overlay Studio preview command

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Validation Error - Invalid data |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Health check failed |

### Rate Limiting

Some endpoints are rate limited to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| `/auth/twitch/callback` | 10 req/min |
| `/mj/campaigns/:id/invite` | 30 req/min |
| `/mj/campaigns/:campaignId/polls/launch` | 20 req/min |
| Overlay Studio mutations | Default rate limit |
