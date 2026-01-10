# Automatic Support System on Error

## Overview

The automatic support system detects user errors and automatically opens the support widget with a pre-filled message. Designed for the Alpha phase, it captures as many bugs as possible to improve application quality.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                                                                       │
│  ┌──────────────────┐    ┌─────────────────────┐                     │
│  │ Error Sources    │───▶│ useSupportTrigger   │                     │
│  │ (stores/API)     │    │ - Rate limiting     │                     │
│  └──────────────────┘    │ - Message mapping   │                     │
│                          └──────────┬──────────┘                     │
│                                     │                                 │
│                                     ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ useSupportWidget                                             │     │
│  │ + prefillMessage, prefillActionType, openWithPrefill()       │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                     │                                 │
│                                     ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ SupportWidget.vue                                            │     │
│  │ + Error type badge, pre-filled message                       │     │
│  └──────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                    POST /support/report + GET /support/logs
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│                                                                       │
│  ┌──────────────────────────┐    ┌──────────────────────────┐       │
│  │ SupportController        │    │ BackendLogService        │       │
│  │ + getLogs()              │    │ - Redis circular buffer  │       │
│  └──────────────────────────┘    └──────────────────────────┘       │
│                                                                       │
│  ┌──────────────────────────┐                                        │
│  │ TracingMiddleware        │                                        │
│  │ + Push logs to Redis     │                                        │
│  └──────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Backend Components

### BackendLogService

Redis service for storing user logs with circular buffer.

**File**: `app/services/support/backend_log_service.ts`

```typescript
import { BackendLogService } from '#services/support/backend_log_service'

const service = new BackendLogService()

// Add a log
await service.pushLog(userId, {
  timestamp: new Date().toISOString(),
  requestId: 'req-123',
  method: 'GET',
  url: '/api/campaigns',
  statusCode: 200,
  durationMs: 50,
  level: 'info',
})

// Get logs (50 by default)
const logs = await service.getUserLogs(userId, 50)

// Clear logs (e.g., account deletion)
await service.clearUserLogs(userId)
```

**Redis Configuration**:
- Key: `support:logs:user:{userId}`
- TTL: 1 hour (3600 seconds)
- Max logs: 100 per user (circular buffer)

### TracingMiddleware

Automatically captures requests and pushes them to Redis.

**File**: `app/middleware/tracing_middleware.ts`

The middleware captures:
- Request ID
- HTTP method
- URL
- Status code
- Duration (ms)
- Error message (if applicable)

### SupportController.getLogs()

Endpoint to retrieve user logs.

**Route**: `GET /api/v2/support/logs`

**Query params**:
- `limit`: Number of logs (default: 50, max: 100)

**Response**:
```json
{
  "data": {
    "logs": [
      {
        "timestamp": "2026-01-04T20:00:00.000Z",
        "requestId": "req-123",
        "method": "GET",
        "url": "/api/campaigns",
        "statusCode": 200,
        "durationMs": 50,
        "level": "info"
      }
    ],
    "userContext": {
      "userId": 1,
      "role": "MJ",
      "displayName": "TestUser"
    }
  }
}
```

## Supported Action Types

The system supports 60+ action types across categories:

| Category | Examples |
|----------|----------|
| auth | `auth_login`, `auth_callback`, `auth_logout` |
| campaign | `campaign_fetch`, `campaign_create`, `campaign_delete` |
| session | `session_launch`, `session_close` |
| poll | `poll_launch`, `poll_cancel`, `poll_fetch_results` |
| push | `push_subscribe`, `push_unsubscribe` |
| websocket | `websocket_connect`, `websocket_reconnect` |
| generic | `generic_server_error`, `generic_network_error`, `generic_timeout` |

See `frontend/utils/supportErrorMessages.ts` for the complete list.

## Rate Limiting

- **Frontend**: 1 automatic opening per minute
- **Backend**: Logs limited to 100 per user with 1h TTL

## Tests

```bash
# Backend unit tests
npm run test -- --files="tests/unit/services/support/backend_log_service.spec.ts"

# Backend functional tests
npm run test -- --files="tests/functional/support/logs.spec.ts"
```

## Security

- Authentication required for `/support/logs`
- Logs isolated per user
- No sensitive data (tokens, passwords) in logs
- Automatic TTL for cleanup
