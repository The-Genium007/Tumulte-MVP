# Automatic Twitch Token Refresh System

## Overview

The automatic refresh system ensures that Twitch tokens remain valid throughout a gaming session (up to 12 hours).

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Streamer grants 12h authorization]                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────┐                                       │
│  │ Immediate refresh   │ ← Fresh token guaranteed              │
│  │ + Store expiresAt   │                                       │
│  └─────────────────────┘                                       │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────┐    Every 3h30                         │
│  │ Scheduler Cron      │◄───────────────────┐                  │
│  │ TokenRefreshJob     │                    │                  │
│  └─────────────────────┘                    │                  │
│           │                                 │                  │
│           ▼                                 │                  │
│  ┌─────────────────────┐                    │                  │
│  │ For each streamer   │                    │                  │
│  │ with active         │                    │                  │
│  │ authorization       │                    │                  │
│  └─────────────────────┘                    │                  │
│           │                                 │                  │
│           ▼                                 │                  │
│  ┌─────────────────────┐     ┌──────────────────────┐         │
│  │ Refresh success?    │─No─►│ Notify Streamer      │         │
│  └─────────────────────┘     │ + Notify GM          │         │
│           │Yes               │ + Deactivate streamer│         │
│           ▼                  └──────────────────────┘         │
│  ┌─────────────────────┐                                       │
│  │ Update tokens       │                                       │
│  │ + tokenExpiresAt    │                                       │
│  └─────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

- **Refresh on grant**: Token refreshed immediately when a streamer authorizes their channel
- **Scheduler**: Proactive refresh every 3h30 for streamers with active authorization
- **Retry**: On failure, retry after 15 min. 2nd failure = deactivation + notifications

## Database Columns (`streamers` table)

| Column | Type | Description |
|--------|------|-------------|
| `token_expires_at` | timestamp | Access token expiration (~4h after refresh) |
| `last_token_refresh_at` | timestamp | Last successful refresh |
| `token_refresh_failed_at` | timestamp | Last failure (for retry policy) |

## Retry Policy

```
1st failure → Set tokenRefreshFailedAt = now()
           → Scheduler will retry in ~15 min
           → No notification

2nd failure → If tokenRefreshFailedAt < 30 min ago
           → Deactivate streamer (isActive = false)
           → Notify streamer + campaign GMs
           → Clear tokenRefreshFailedAt
```

## Manual Testing Guide

### Prerequisites

- Backend running in dev mode (`npm run dev`)
- PostgreSQL and Redis started
- A connected streamer account with valid Twitch token
- A campaign created with the streamer as a member

### Scenario 1: Refresh on Authorization Grant

**Objective**: Verify that the token is refreshed when a streamer grants authorization.

1. Check initial token state:
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "SELECT twitch_display_name, token_expires_at, last_token_refresh_at
      FROM streamers WHERE twitch_login = 'YOUR_LOGIN';"
   ```

2. Grant authorization via UI (Streamer page → Campaigns → Authorize)

3. Verify that the token was refreshed:
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "SELECT twitch_display_name, token_expires_at, last_token_refresh_at
      FROM streamers WHERE twitch_login = 'YOUR_LOGIN';"
   ```

**Expected result**:
- `token_expires_at` = ~4h in the future
- `last_token_refresh_at` = current timestamp

### Scenario 2: Scheduler Test (Manual Trigger)

**Objective**: Verify that the ace command refreshes tokens correctly.

1. Execute the command:
   ```bash
   cd backend
   node --loader ts-node-maintained/esm bin/console.ts token:refresh
   ```

2. Observe the logs:
   ```
   🔄 Token Refresh Command
   ========================

   Finding streamers with active authorization...

   Found X streamer(s) with active authorization:

     - DisplayName (login) ✓

   Starting refresh cycle...

   ═══════════════════════════════════════
                 REPORT
   ═══════════════════════════════════════
   Total streamers: X
   Success: X
   Failed: 0
   Skipped: 0
   ```

**Expected result**:
- All streamers with active authorization are listed
- Tokens expiring soon are refreshed
- Still valid tokens (>1h) are skipped

### Scenario 3: Force Refresh

```bash
# Force refresh even if token isn't expiring soon
node --loader ts-node-maintained/esm bin/console.ts token:refresh --force

# Refresh a specific streamer
node --loader ts-node-maintained/esm bin/console.ts token:refresh STREAMER_ID

# Dry-run mode (shows what would be done without executing)
node --loader ts-node-maintained/esm bin/console.ts token:refresh --dry-run
```

### Scenario 4: Retry Test (Simulate Failure)

**Objective**: Verify the retry policy (15 min then deactivation).

1. Manually invalidate a token in DB:
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "UPDATE streamers SET access_token_encrypted = 'invalid'
      WHERE twitch_login = 'YOUR_LOGIN';"
   ```

2. First scheduler trigger:
   ```bash
   node --loader ts-node-maintained/esm bin/console.ts token:refresh --force
   ```

   **Expected result**:
   - Refresh fails
   - `token_refresh_failed_at` = current timestamp
   - `is_active` remains `true` (not deactivated yet)

3. Check state:
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "SELECT twitch_display_name, is_active, token_refresh_failed_at
      FROM streamers WHERE twitch_login = 'YOUR_LOGIN';"
   ```

4. Second trigger (after waiting or modifying delay in dev):
   ```bash
   node --loader ts-node-maintained/esm bin/console.ts token:refresh --force
   ```

   **Expected result after 2nd failure**:
   - `is_active` = `false`
   - Push notification sent to streamer
   - Push notification sent to campaign GMs

### Scenario 5: Health Check with Auto-Refresh

**Objective**: Verify that health check attempts automatic refresh.

1. Simulate a token near expiration:
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "UPDATE streamers SET token_expires_at = NOW() + INTERVAL '30 minutes'
      WHERE twitch_login = 'YOUR_LOGIN';"
   ```

2. Launch a poll session via GM UI

3. Observe the logs:
   ```
   [HealthCheck] Token invalid for streamer X, attempting refresh...
   [HealthCheck] Token refreshed successfully for streamer X
   ```

**Expected result**:
- Health check detects expiring token
- Automatic refresh attempted and succeeds
- Session can be launched normally

## Ace Command: token:refresh

```bash
# Refresh all streamers with active authorization
node --loader ts-node-maintained/esm bin/console.ts token:refresh

# Refresh a specific streamer
node --loader ts-node-maintained/esm bin/console.ts token:refresh STREAMER_ID

# Force refresh even if token isn't expired
node --loader ts-node-maintained/esm bin/console.ts token:refresh --force

# Dry-run mode (shows what would be done without executing)
node --loader ts-node-maintained/esm bin/console.ts token:refresh --dry-run

# Combine options
node --loader ts-node-maintained/esm bin/console.ts token:refresh STREAMER_ID --force --dry-run
```

## Cron Scheduler

The scheduler runs automatically every 3h30 in web environment (production).

- **Cron expressions**: `0 0,7,14,21 * * *` and `30 3,10,17 * * *`
- **Execution times**: 00:00, 03:30, 07:00, 10:30, 14:00, 17:30, 21:00

The scheduler is configured in:
- `app/services/scheduler/token_refresh_scheduler.ts` - Scheduler logic
- `start/scheduler.ts` - Boot startup (web environment only)
- `adonisrc.ts` - Preload configuration

## Tests

### Unit Tests

```bash
npm run test:unit -- --files="tests/unit/services/token_refresh_service.spec.ts"
```

Covers:
- `isTokenExpiringSoon` and `isTokenExpired` getters
- Tracking column persistence
- `findStreamersWithActiveAuthorization`
- `findStreamersNeedingRetry`
- Retry policy (`handleRefreshFailure`)
- `refreshAllActiveTokens` report

### Functional Tests

```bash
npm run test:functional -- --files="tests/functional/token_refresh.spec.ts"
```

Covers:
- Integration with authorization grant
- Token tracking
- Service integration
- Edge cases (multiple streamers, inactive, etc.)

## Troubleshooting

### Refresh fails consistently

1. Verify the refresh token is valid:
   ```bash
   # The refresh token may have been revoked by the user on Twitch
   # Solution: ask the streamer to reconnect
   ```

2. Verify Twitch credentials:
   ```bash
   # Verify TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are correct in .env
   ```

3. Check the logs:
   ```bash
   # Search for TokenRefresh errors
   grep -i "TokenRefresh" logs/app.log
   ```

### Scheduler doesn't start

1. Verify preload is configured in `adonisrc.ts`
2. Verify environment is `web` (not `console` or `test`)
3. Check startup logs:
   ```
   [Scheduler] Token refresh scheduler started
   ```

### Notifications not received

1. Verify push notification service is configured
2. Verify VAPID keys exist (`backend/.vapid-keys.json`)
3. Verify user has enabled notifications in settings

### Streamer deactivated by mistake

To reactivate a streamer:
```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
  "UPDATE streamers SET is_active = true, token_refresh_failed_at = NULL
   WHERE twitch_login = 'YOUR_LOGIN';"
```

The streamer will need to reconnect to get a new valid token.
