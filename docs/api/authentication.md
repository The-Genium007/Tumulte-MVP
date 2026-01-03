# Authentication

Tumulte uses Twitch OAuth for authentication. This document explains the authentication flow and security measures.

## OAuth Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Backend │     │  Twitch  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ 1. Login click │                │
     │───────────────▶│                │
     │                │                │
     │ 2. Redirect    │                │
     │◀───────────────│                │
     │                │                │
     │ 3. Authorize   │                │
     │────────────────────────────────▶│
     │                │                │
     │ 4. Callback    │                │
     │◀────────────────────────────────│
     │                │                │
     │ 5. Code        │                │
     │───────────────▶│                │
     │                │ 6. Exchange    │
     │                │───────────────▶│
     │                │                │
     │                │ 7. Tokens      │
     │                │◀───────────────│
     │                │                │
     │ 8. Session     │                │
     │◀───────────────│                │
     │                │                │
```

## Step-by-Step

### 1. Initiate Login

User clicks "Login with Twitch" which redirects to:

```
GET /auth/twitch/redirect
```

### 2. Twitch Authorization

User is redirected to Twitch where they authorize the application.

### 3. Callback

Twitch redirects back with an authorization code:

```
GET /auth/twitch/callback?code=xxx&state=yyy
```

### 4. Token Exchange

Backend exchanges the code for access and refresh tokens:

```typescript
const tokens = await twitch.exchangeCode(code)
// Returns: { access_token, refresh_token, expires_in }
```

### 5. User Creation/Update

Backend creates or updates the user with Twitch info:

```typescript
const twitchUser = await twitch.getUser(accessToken)
const user = await User.updateOrCreate(
  { twitchId: twitchUser.id },
  {
    username: twitchUser.login,
    displayName: twitchUser.display_name
  }
)
```

### 6. Token Storage

Tokens are encrypted before storage:

```typescript
streamer.accessToken = encryption.encrypt(accessToken)
streamer.refreshToken = encryption.encrypt(refreshToken)
```

### 7. Session Creation

A session cookie is created for the user:

```typescript
await auth.use('web').login(user)
```

## Security Measures

### Token Encryption

All Twitch tokens are encrypted using AdonisJS Encryption before storage. They are never stored in plain text.

### Double Validation

For streamers to participate in polls:
1. Must be invited to the campaign (CampaignMembership)
2. Must authorize their Twitch channel

### Session Security

Session cookies are configured with:
- `httpOnly: true` - Not accessible via JavaScript
- `secure: true` (production) - HTTPS only
- `sameSite: lax` - CSRF protection

### Token Refresh

When a Twitch token expires, the refresh token is used to obtain a new access token automatically.

## Roles

Users can have one of two roles:

| Role | Description | Permissions |
|------|-------------|-------------|
| `gm` | Game Master | Create campaigns, manage sessions, run polls |
| `streamer` | Streamer | Join campaigns, display overlay |

Users can switch roles via:

```
POST /auth/switch-role
{ "role": "gm" | "streamer" }
```

## Required Scopes

The Twitch OAuth requests these scopes:

| Scope | Purpose |
|-------|---------|
| `channel:manage:polls` | Create and manage polls on channel |
| `channel:read:polls` | Read poll results |
| `user:read:email` | Get user email (optional) |

## Error Handling

### Authentication Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Not logged in | Redirect to login |
| 403 Forbidden | Wrong role | Switch role or use correct account |
| Token expired | Session timeout | Re-authenticate |

### OAuth Errors

| Error | Cause |
|-------|-------|
| `invalid_grant` | Authorization code expired or invalid |
| `access_denied` | User denied authorization |
| `invalid_scope` | Requested scope not allowed |

## Logout

To logout:

```
POST /auth/logout
```

This clears the session cookie and invalidates the session.
