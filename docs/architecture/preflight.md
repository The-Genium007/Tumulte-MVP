# PreFlight System

The PreFlight System is an extensible, auto-discovering health check system that validates system health before launching polls, gamification events, or any future feature requiring infrastructure readiness.

---

## Overview

The PreFlight System ensures that critical dependencies and business rules are validated before executing operations that require them. It prevents failures by detecting issues early, provides detailed observability into system health, and enables graceful degradation through execution modes.

**Key characteristics:**

- **Auto-discovering**: New checks are automatically registered and executed
- **Prioritized**: Checks run in priority order, short-circuiting on critical failures
- **Observable**: Every run is tracked in Sentry, database, and Prometheus
- **Mode-aware**: Different execution modes for blocking vs. observability-only scenarios

---

## Architecture

### File Structure

```
app/services/preflight/
├── types.ts                          # Core interfaces (PreFlightCheck, CheckContext, CheckResult, PreFlightReport)
├── preflight_registry.ts             # Dynamic check registry (singleton)
├── preflight_runner.ts               # Orchestrator: runs checks, short-circuits, tracks in Sentry/DB/Prometheus
└── checks/
    ├── redis_check.ts                # Priority 0 — Redis connectivity
    ├── websocket_check.ts            # Priority 0 — WebSocket (Transmit) readiness
    ├── twitch_api_check.ts           # Priority 5 — Twitch API availability
    ├── token_check.ts                # Priority 10 — Streamer OAuth tokens
    ├── vtt_connection_check.ts       # Priority 15 — VTT connection active
    ├── cooldown_check.ts             # Priority 20 — Event not on cooldown
    └── gamification_config_check.ts  # Priority 20 — Event enabled in config
```

### Core Interfaces

**PreFlightCheck**: Interface that all health checks must implement.

```typescript
interface PreFlightCheck {
  name: string
  priority: number
  execute(context: CheckContext): Promise<CheckResult>
}
```

**CheckContext**: Context data passed to each check (campaign ID, streamer ID, event type, etc.).

**CheckResult**: Result of a check execution (success, failure, warnings, metadata).

**PreFlightReport**: Aggregated report of all checks in a run (persisted to database).

---

## Priority System

Checks are executed in priority order (lower value = higher priority). If a check fails, execution short-circuits and subsequent lower-priority checks are skipped.

| Priority | Category | Rationale |
|----------|----------|-----------|
| **0** | Infrastructure | Redis, WebSocket — if these fail, nothing works |
| **5** | External APIs | Twitch API availability |
| **10** | Authentication | Streamer OAuth tokens |
| **15** | Connections | VTT connection active |
| **20** | Business rules | Cooldowns, event enabled in config |

**Example short-circuit scenario:**

1. Redis check (priority 0) fails
2. Runner stops execution immediately
3. WebSocket check (priority 0) is skipped
4. All other checks are skipped
5. Report shows failure at priority 0

---

## Execution Modes

The PreFlight System supports two execution modes:

### Full Mode

**Characteristics:**
- Blocking behavior
- Runs all checks regardless of priority
- Throws an exception if any check fails
- Used for MJ-initiated actions (poll launch, manual gamification triggers)

**Use case:** Prevent the GM from launching a poll if critical infrastructure is down.

**Example:**
```typescript
const report = await preFlightRunner.run({
  mode: 'full',
  campaignId,
  streamerIds,
  eventType: 'poll_launch'
})

if (!report.success) {
  throw new Error('Pre-flight checks failed')
}
```

### Light Mode

**Characteristics:**
- Non-blocking behavior
- Runs only priority ≤ 10 checks
- Never throws exceptions
- Used for automatic events (dice rolls, Twitch redemptions)
- Observability-only — failures are logged but do not block execution

**Use case:** Track infrastructure health during automatic events without disrupting gameplay.

**Example:**
```typescript
const report = await preFlightRunner.run({
  mode: 'light',
  campaignId,
  streamerIds,
  eventType: 'dice_roll'
})

// Execution continues regardless of report.success
```

---

## Adding a New Check

Adding a new pre-flight check requires only two steps:

### Step 1: Create the Check Class

Create a new file in `app/services/preflight/checks/` implementing the `PreFlightCheck` interface.

**Example:**
```typescript
// app/services/preflight/checks/database_check.ts

import type { PreFlightCheck, CheckContext, CheckResult } from '../types.js'
import db from '@adonisjs/lucid/services/db'

export class DatabaseCheck implements PreFlightCheck {
  name = 'database'
  priority = 0

  async execute(context: CheckContext): Promise<CheckResult> {
    try {
      await db.rawQuery('SELECT 1')
      return {
        success: true,
        message: 'Database connection healthy'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Database connection failed',
        error: error.message
      }
    }
  }
}
```

### Step 2: Register the Check

Register the check in `start/container.ts` during the boot sequence.

**Example:**
```typescript
// start/container.ts

app.booted(async () => {
  const preFlightRegistry = await app.container.make('preFlightRegistry')
  const databaseCheck = new DatabaseCheck()
  preFlightRegistry.register(databaseCheck)
})
```

The check is now auto-discovered and will execute according to its priority.

---

## Gamification Handler Integration

Gamification handlers (triggers and actions) can optionally declare a `preFlightCheck()` method. These checks are automatically registered during application boot.

**Example:**
```typescript
// app/services/gamification/handlers/triggers/dice_critical_trigger.ts

export class DiceCriticalTrigger implements TriggerHandler {
  triggerType = 'dice_critical'

  preFlightCheck(): PreFlightCheck {
    return {
      name: 'dice_critical_vtt_connection',
      priority: 15,
      execute: async (context) => {
        const vttConnection = await VttConnection.findActiveForCampaign(context.campaignId)
        if (!vttConnection) {
          return {
            success: false,
            message: 'No active VTT connection for dice critical trigger'
          }
        }
        return { success: true, message: 'VTT connection active' }
      }
    }
  }

  // ... other handler methods
}
```

During boot, the registry automatically discovers and registers these checks:

```typescript
// start/container.ts (automatic registration)

app.booted(async () => {
  const triggerRegistry = await app.container.make('triggerHandlerRegistry')
  const preFlightRegistry = await app.container.make('preFlightRegistry')

  for (const handler of triggerRegistry.getAllHandlers()) {
    if (handler.preFlightCheck) {
      preFlightRegistry.register(handler.preFlightCheck())
    }
  }
})
```

---

## Observability

Every PreFlight run produces a `PreFlightReport` that is tracked across multiple systems:

### 1. Sentry

**Breadcrumbs:**
- Every check execution is logged as a breadcrumb
- Includes check name, priority, result, duration

**Events:**
- Failed runs generate a Sentry event
- Includes full report context (all check results)
- Tagged with campaign ID, streamer IDs, event type

### 2. Database

**Table:** `preflight_reports`

**Schema:**
```sql
CREATE TABLE preflight_reports (
  id UUID PRIMARY KEY,
  mode VARCHAR(10) NOT NULL,           -- 'full' or 'light'
  event_type VARCHAR(50) NOT NULL,     -- 'poll_launch', 'dice_roll', etc.
  campaign_id UUID,
  success BOOLEAN NOT NULL,
  checks JSONB NOT NULL,               -- Array of CheckResult objects
  duration_ms INTEGER NOT NULL,
  triggered_by UUID,                   -- User ID who triggered the operation
  created_at TIMESTAMP NOT NULL
)
```

**Retention:** Reports are stored for 30 days (configurable).

### 3. Prometheus

**Metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `tumulte_preflight_runs_total` | Counter | Total runs by mode, event type, success/failure |
| `tumulte_preflight_check_duration_seconds` | Histogram | Duration of individual check executions |
| `tumulte_preflight_failures_total` | Counter | Total failures by check name |

**Example queries:**

```promql
# Success rate of pre-flight runs
rate(tumulte_preflight_runs_total{success="true"}[5m])
/
rate(tumulte_preflight_runs_total[5m])

# Most common failing checks
topk(5, sum by (check_name) (rate(tumulte_preflight_failures_total[1h])))
```

---

## Admin Monitoring

The admin monitoring page (`/admin/monitoring`) provides real-time visibility into pre-flight health:

**Features:**

1. **Statistics Card**
   - Total runs in last 24h
   - Success rate
   - Average duration
   - Most common event types

2. **Most Failed Checks**
   - Top 10 checks by failure count
   - Failure rate percentage
   - Last failure timestamp

3. **Recent Reports**
   - Last 50 reports with expandable details
   - Color-coded by success/failure
   - Check-level details (name, status, message, duration)
   - Auto-refresh every 30 seconds

**Access:** Requires admin role (`admin` middleware).

**Example:**
```
GET /admin/monitoring

Response:
{
  "stats": {
    "totalRuns": 1243,
    "successRate": 0.987,
    "averageDurationMs": 45
  },
  "topFailures": [
    { "checkName": "twitch_api", "failureCount": 12, "failureRate": 0.03 }
  ],
  "recentReports": [...]
}
```

---

## Best Practices

### When to Use Full Mode

- MJ-initiated poll launches
- Manual gamification event triggers
- Admin operations requiring infrastructure
- Any blocking operation where failure should prevent execution

### When to Use Light Mode

- Automatic dice roll processing
- Twitch redemption handling
- Background synchronization tasks
- Any non-blocking operation where observability is the goal

### Check Design Guidelines

1. **Single responsibility**: Each check validates one specific aspect
2. **Fast execution**: Checks should complete in <500ms
3. **Clear messages**: Return actionable error messages for failures
4. **Idempotent**: Checks should not modify system state
5. **Context-aware**: Use CheckContext to access campaign/streamer data
6. **Priority correctly**: Lower priority = runs first, more critical

### Error Handling

Checks should never throw exceptions. Always return a `CheckResult` with `success: false`.

**Bad:**
```typescript
async execute(context: CheckContext): Promise<CheckResult> {
  throw new Error('Redis is down') // BAD — breaks runner
}
```

**Good:**
```typescript
async execute(context: CheckContext): Promise<CheckResult> {
  try {
    await redis.ping()
    return { success: true, message: 'Redis healthy' }
  } catch (error) {
    return {
      success: false,
      message: 'Redis connection failed',
      error: error.message
    }
  }
}
```

---

## Future Extensions

The PreFlight System is designed to support future features:

- **Dynamic check configuration**: Enable/disable checks via admin panel
- **Custom check parameters**: Pass check-specific parameters via context
- **Conditional checks**: Run checks only if certain conditions are met
- **Alerting**: Trigger alerts when specific checks fail repeatedly
- **Historical trends**: Track check success rates over time in Grafana dashboards

---

## Related Documentation

- [Error Handling](../guides/error-handling.md)
- [Monitoring](../guides/monitoring.md)
- [Gamification Architecture](./gamification.md)
