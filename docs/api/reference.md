# API Reference

Complete API documentation for Tumulte.

## Base URL

- Development: `http://localhost:3333`
- Production: `https://your-domain.com`

## Authentication

Most endpoints require authentication via session cookie (set after Twitch OAuth login).

---

## Auth Endpoints

### GET /auth/twitch/redirect

Redirects user to Twitch OAuth authorization page.

**Response**: `302 Redirect` to Twitch

---

### GET /auth/twitch/callback

Handles OAuth callback from Twitch.

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
  "id": 1,
  "username": "coolstreamer",
  "role": "gm",
  "twitchId": "12345678"
}
```

---

### POST /auth/switch-role

Switches between GM and Streamer roles.

**Authentication**: Required

**Request**:
```json
{
  "role": "gm" | "streamer"
}
```

**Response**: `200 OK`
```json
{
  "role": "gm"
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
    "id": 1,
    "name": "The Dragon's Lair",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
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
```json
{
  "id": 1,
  "name": "The Dragon's Lair",
  "description": "An epic adventure awaits",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET /mj/campaigns/:id

Gets a specific campaign.

**Authentication**: Required (GM role, campaign owner)

**Response**: `200 OK`

---

### PUT /mj/campaigns/:id

Updates a campaign.

**Authentication**: Required (GM role, campaign owner)

**Request**:
```json
{
  "name": "Updated Name",
  "status": "archived"
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

Invites a streamer to the campaign.

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
  "id": 1,
  "status": "pending",
  "streamerUsername": "streamer_name"
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
    "id": 1,
    "name": "Session 1",
    "status": "active",
    "startedAt": "2024-01-15T18:00:00Z"
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

### POST /mj/sessions/:id/launch

Launches a poll session.

**Authentication**: Required (GM role, session owner)

**Response**: `200 OK`
```json
{
  "status": "active",
  "startedAt": "2024-01-15T18:00:00Z"
}
```

---

## Streamer Endpoints

### GET /streamer/campaigns/invitations

Lists pending campaign invitations.

**Authentication**: Required (Streamer role)

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "campaignName": "The Dragon's Lair",
    "gmUsername": "cool_gm",
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

### POST /streamer/campaigns/:campaignId/authorize

Authorizes Twitch channel for the campaign.

**Authentication**: Required (Streamer role, campaign member)

**Response**: `200 OK`

---

## Overlay Endpoints

### GET /overlay/:streamerId/active-poll

Gets the active poll for a streamer's overlay.

**Authentication**: Not required (public)

**Response**: `200 OK`
```json
{
  "id": 1,
  "question": "What should the party do?",
  "choices": [
    { "id": 1, "text": "Attack", "votes": 45 },
    { "id": 2, "text": "Flee", "votes": 30 },
    { "id": 3, "text": "Negotiate", "votes": 25 }
  ],
  "status": "active",
  "endsAt": "2024-01-15T18:05:00Z"
}
```

**Response**: `204 No Content` (no active poll)

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": { ... }  // Optional, for validation errors
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
| 500 | Internal Server Error |
