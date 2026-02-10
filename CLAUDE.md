# Tumulte - Project Context

Multi-channel Twitch poll management platform for Tabletop RPG Game Masters (GM). Version 0.6.x - **Production environment with live data**.

---

## CRITICAL: Production Safety Rules

> **This application runs in production with real users and persistent data. Every change MUST be safe to deploy without breaking existing functionality or losing data.**

### Database Migration Safety

1. **NEVER drop a column or table directly.** Use the expand-contract pattern:
   - Step 1: Add the new column/table, deploy code that writes to both old and new
   - Step 2: Migrate existing data
   - Step 3: Deploy code that reads from new only
   - Step 4: Drop the old column/table in a later migration

2. **NEVER add `NOT NULL` without a `DEFAULT` on existing tables.** Existing rows will cause the migration to fail.

3. **NEVER rename a column or table directly.** Create new, migrate data, update code, then drop old.

4. **ALWAYS write a working `down()` method** in migrations. It must be able to rollback cleanly.

5. **Migrations that modify data (seeds/backfills) MUST be idempotent.** They may run multiple times (e.g., rollback + re-run). Use `INSERT ... ON CONFLICT DO NOTHING` or check existence before inserting.

6. **Enum modifications** (PostgreSQL): Adding a value is safe. Removing or renaming a value requires creating a new type, migrating, and dropping the old one.

7. **Always test migrations against a copy of production data** before deploying. The `docker-compose.test.yml` provides a clean test environment.

8. **Migration naming**: Timestamps are auto-generated. Use descriptive names: `{timestamp}_add_{column}_to_{table}.ts` or `{timestamp}_create_{table}_table.ts`.

9. **The `docker-entrypoint.sh` runs migrations automatically on deploy** (`migration:run --force`). A broken migration = broken deployment.

### Code Change Safety

1. **Never remove or rename a public API endpoint** without ensuring no client depends on it. The frontend, overlay pages (OBS), Foundry VTT module, and webhooks all consume the API.

2. **Never change WebSocket channel names** without coordinating frontend + overlay updates. Channels are subscribed to by OBS browser sources that may not be refreshed for days.

3. **Backward-compatible changes first.** If changing a DTO response shape, add new fields first, then deprecate old ones.

4. **Overlay routes (`/overlay/*`) are public and embedded in OBS.** Changes must not break existing overlay URLs.

5. **Webhook endpoints (`/webhooks/*`) are called by external services** (Twitch EventSub, Foundry VTT). Changes must respect the expected request/response contracts.

---

## Architecture

### Monorepo Structure

```
/Tumulte
├── backend/              # AdonisJS 6 (REST API + WebSocket)
├── frontend/             # Nuxt 3 (Vue 3 + Nuxt UI v3)
├── monitoring/           # Prometheus + Grafana + AlertManager
├── modules-vtt/          # Foundry VTT module (separate sub-project)
├── docs/                 # Documentation (deployment, API, architecture)
├── scripts/              # Utility scripts (git hooks, lockfile sync)
├── .github/workflows/    # CI/CD GitHub Actions
└── CLAUDE.md             # This file
```

### Tech Stack

**Backend:**
- **Framework**: AdonisJS 6.18 (TypeScript 5.8)
- **ORM**: Lucid (PostgreSQL 16)
- **Cache/Sessions**: Redis 7
- **WebSocket**: Transmit (real-time push)
- **Validation**: VineJS + Zod
- **Tests**: Japa + c8 (coverage)
- **Error tracking**: Sentry
- **Email**: Resend
- **Analytics**: PostHog (EU-compliant)

**Frontend:**
- **Framework**: Nuxt 3.15 (Vue 3.5, SSR)
- **UI**: Nuxt UI v3 (TailwindCSS 4)
- **State**: Pinia 3
- **HTTP**: Axios
- **Tests**: Vitest + Playwright
- **Error tracking**: Sentry (with Session Replay)

**Infrastructure:**
- **Container**: Docker (multi-stage builds, Node 22-alpine)
- **Monitoring**: Prometheus, Grafana, AlertManager, Node Exporter, cAdvisor
- **Database metrics**: PostgreSQL Exporter, Redis Exporter
- **Alerts**: Discord webhooks (normal + critical channels)

---

## Essential Commands

### Backend

```bash
# IMPORTANT: In development, use bin/console.ts (NOT the ace file at root)
cd backend
node --loader ts-node-maintained/esm bin/console.ts <command>

# Common commands
node --loader ts-node-maintained/esm bin/console.ts migration:run
node --loader ts-node-maintained/esm bin/console.ts migration:rollback
node --loader ts-node-maintained/esm bin/console.ts migration:status
node --loader ts-node-maintained/esm bin/console.ts make:migration <name>
node --loader ts-node-maintained/esm bin/console.ts list

# npm scripts
npm run dev           # Dev server (port 3333)
npm run test          # All tests
npm run test:unit     # Unit tests only
npm run test:functional
npm run typecheck
npm run lint
```

### Frontend

```bash
cd frontend
npm run dev           # Dev server (port 3000)
npm run build         # Production build (Nuxt SSR)
npm run test          # Vitest unit + component tests
npm run test:e2e      # Playwright E2E tests
npm run typecheck
npm run lint
```

### Docker (Production)

```bash
# Backend
cd backend
docker compose up -d              # Start with PostgreSQL + Redis
docker compose -f docker-compose.test.yml up -d  # Test environment (ports 5433/6380)

# Monitoring
cd monitoring
./scripts/deploy.sh               # Deploy Prometheus + Grafana stack
```

---

## Architectural Patterns

### Backend - Layered Architecture

```
Controller → Service → Repository → Model
     ↓           ↓
  Validator    DTO
```

| Layer | Responsibility | Rules |
|-------|---------------|-------|
| **Controller** | HTTP handling, validation, response formatting | NO business logic. Calls service methods. |
| **Service** | Business logic, orchestration, error handling | May call multiple repositories. Contains domain rules. |
| **Repository** | Database queries via Lucid ORM | NO business logic. Returns models or primitives. |
| **DTO** | Model → API response transformation | Static `fromModel()` and `fromModelArray()` methods. |
| **Validator** | Input validation (Zod schemas) | Validates request body/params before controller logic. |

### Dependency Injection (IoC Container)

Services and repositories are registered in `backend/start/container.ts`.

**To add a new service:**
```typescript
// 1. Register in container.ts
app.container.bind('myService', async () => {
  const mod = await import('#services/my_domain/my_service')
  return app.container.make(mod.MyService)
})

// 2. Add type declaration
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    myService: InstanceType<typeof import('#services/my_domain/my_service').MyService>
  }
}

// 3. Use in controller via @inject or app.container.make()
```

**Singleton vs Bind:**
- `singleton`: One instance for the app lifetime (WebSocket, Redis, Chat services)
- `bind`: New instance per resolution (most services and all repositories)

### Import Path Aliases

```typescript
import { User } from '#models/user'
import { UserService } from '#services/user_service'
import { UserRepository } from '#repositories/user_repository'
import { UserDto } from '#dtos/user_dto'
import { createUserValidator } from '#validators/auth/create_user'
```

---

## Database

### Models (27 models)

**Core Domain:**

| Model | Description |
|-------|-------------|
| `User` | Users (email/password + OAuth providers) |
| `AuthProvider` | OAuth providers linked to users (Twitch, Google) |
| `Streamer` | Twitch channel info (encrypted tokens, scopes) |
| `Campaign` | RPG campaigns created by GM |
| `CampaignMembership` | Streamer invitations & authorization status |

**Polls:**

| Model | Description |
|-------|-------------|
| `Poll` | Poll definition (question, options, duration) |
| `PollTemplate` | Reusable poll templates |
| `PollSession` | Group of polls launched together |
| `PollInstance` | Single launched poll (status: PENDING → STARTED → ENDED/CANCELLED) |
| `PollResult` | Aggregated results per channel |
| `PollChannelLink` | Links a poll instance to streamer channels |

**VTT Integration:**

| Model | Description |
|-------|-------------|
| `VttProvider` | VTT platform definitions (Foundry, Roll20, etc.) |
| `VttConnection` | User's connection to a VTT instance |
| `Character` | Imported characters from VTT |
| `CharacterAssignment` | Streamer ↔ character assignments |
| `DiceRoll` | Dice rolls received from VTT |
| `TokenRevocationList` | Revoked VTT connection tokens |

**Gamification:**

| Model | Description |
|-------|-------------|
| `GamificationEvent` | Event definitions (dice roll, poll vote, etc.) |
| `GamificationInstance` | Active gamification session |
| `GamificationContribution` | Viewer contributions to gamification goals |
| `StreamerGamificationConfig` | Per-streamer gamification settings |
| `CampaignGamificationConfig` | Per-campaign gamification settings |

**Other:**

| Model | Description |
|-------|-------------|
| `OverlayConfig` | Overlay Studio visual configurations |
| `PushSubscription` | Web push notification subscriptions |
| `NotificationPreference` | Per-user notification settings |
| `RetryEvent` | Failed operation retry tracking |
| `Subscription` | User subscription (future monetization) |

### Database Conventions

- Tables: `snake_case` plural (`poll_instances`)
- Columns: `snake_case` (`created_at`, `user_id`)
- Foreign keys in TypeScript: `camelCase` (`userId`, `campaignId`)
- UUIDs for all primary keys
- Timestamps: `created_at`, `updated_at` on all tables

### Migration Count

69 migrations as of v0.6.x. Migrations include both schema changes and data migrations (seeds, backfills). See the "Database Migration Safety" section above before creating new ones.

---

## API Routes Overview

### Public (no auth)

| Group | Key Endpoints |
|-------|---------------|
| **Health** | `GET /health`, `GET /health/ready`, `GET /health/live` |
| **Auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/twitch/redirect`, `GET /auth/twitch/callback`, `GET /auth/google/redirect`, `GET /auth/google/callback`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| **Overlay** (OBS) | `GET /overlay/:streamerId`, `GET /overlay/:streamerId/active-poll`, `GET /overlay/:streamerId/config`, `GET /overlay/:streamerId/gamification/active` |
| **Webhooks** | `POST /webhooks/twitch/eventsub`, `POST /webhooks/vtt/dice-roll`, `POST /webhooks/foundry/*` |

### Authenticated

| Group | Key Endpoints |
|-------|---------------|
| **Session** | `GET /auth/me`, `POST /auth/logout`, `POST /auth/change-password` |
| **OAuth Linking** | `GET /auth/link/twitch`, `GET /auth/link/google`, `POST /auth/unlink` |
| **GM - Campaigns** | `CRUD /mj/campaigns`, `POST /mj/campaigns/:id/invite`, `GET /mj/campaigns/:id/members`, `GET /mj/campaigns/:id/events` |
| **GM - Polls** | `CRUD /mj/campaigns/:campaignId/polls`, `POST /mj/polls/:id/launch`, `POST /mj/polls/:id/cancel`, `GET /mj/polls/:id/results` |
| **GM - Gamification** | `GET /mj/gamification/events`, `POST /mj/campaigns/:id/gamification/trigger`, gamification instance management |
| **GM - VTT** | `CRUD /mj/vtt-connections`, `POST /mj/vtt-connections/pair-with-code`, sync operations |
| **GM - Characters** | `GET /mj/campaigns/:id/characters`, `POST /mj/campaigns/:id/active-character`, dice roll attribution |
| **Streamer** | `GET /streamer/campaigns/invitations`, accept/decline invitations, authorization grant/revoke, character assignment |
| **Dashboard** | Mirrors `/streamer` routes + streamer gamification settings |
| **Overlay Studio** | `CRUD /streamer/overlay-studio/configs`, activate, preview commands |
| **Notifications** | VAPID key, subscribe/unsubscribe, preferences |
| **Support** | `POST /support/report`, `POST /support/suggestion` |
| **Admin** | `GET /admin/metrics/*` (admin middleware) |
| **Account** | `DELETE /account/delete` |

### Rate Limiting

Rate limits are applied per-endpoint via Redis-based middleware:
- Auth endpoints: 3-10 req/60s (strictest on registration, forgot-password)
- Auth lockout: Exponential backoff (30s → 1h) after 5 failed logins
- Poll operations: 20 req/60s
- Overlay Studio: Per-action rate limiting
- VTT webhooks: 100 req/60s

---

## Error Handling

### Backend

**Exception Handler** (`app/exceptions/handler.ts`):
- Logs all errors with request context (method, URL, IP, requestId)
- Sends 5xx errors to Sentry (4xx filtered out)
- Production: Masks sensitive error messages with generic responses

**Custom Exceptions:**
- `ValidationException`: Zod validation failures → HTTP 400 with field details
- `CircuitOpenError`: Circuit breaker open → HTTP 503

**Resilience Patterns** (`app/services/resilience/`):
- **Circuit Breaker**: Redis-backed, distributed, Lua atomic scripts. States: CLOSED → OPEN → HALF_OPEN
- **Retry Utility**: Exponential backoff + jitter, Retry-After header support, circuit breaker integration
- **Health Check Service**: Pre-validates Twitch API, Redis, streamer tokens, WebSocket before poll operations

**Error Response Format:**
```json
{
  "error": "Human-readable message",
  "details": [{ "field": "email", "message": "Invalid email", "code": "INVALID_EMAIL" }]
}
```

### Frontend

- **Global 401 handler** (`plugins/api-auth-handler.client.ts`): Clears auth state, redirects to login
- **Sentry** with Session Replay: Captures errors, breadcrumbs, user context
- **Toast notifications**: Debounced error toast when Sentry captures an error
- **Support reporter** (`composables/useSupportReporter.ts`): Collects diagnostics (console, performance, store state) with automatic sensitive data sanitization
- **Resilient WebSocket** (`composables/useResilientWebSocket.ts`): Auto-reconnect with exponential backoff, HTTP polling fallback when WebSocket is down
- **Error message catalog** (`utils/supportErrorMessages.ts`): 60+ typed action categories with French user-facing messages

---

## Security Architecture

### Authentication
- **Two guards**: `web` (session/cookie) and `api` (access token)
- **OAuth**: Twitch + Google with PKCE-like state validation (`timingSafeEqual`)
- **Password hashing**: Scrypt (cost: 16384, blockSize: 8)
- **Sessions**: Redis-backed, `httpOnly`, `secure` (prod), 7-day expiry
- **Brute force protection**: Exponential lockout (IP + IP+email tracking)

### Token Storage
- All OAuth tokens (Twitch, Google) encrypted at rest via AdonisJS Encryption (`APP_KEY`)
- Token fields use `serializeAs: null` — never exposed in API responses
- Automatic token refresh with failure tracking

### HTTP Security
- **CORS**: Whitelist-only (frontend URL). Exception: Foundry VTT endpoints (API key auth)
- **Security Headers Middleware**: CSP, HSTS, X-Frame-Options (DENY except `/overlay`), X-Content-Type-Options, Permissions-Policy
- **Rate Limiting**: Redis-based, per-IP, per-endpoint configurable
- **Request IDs**: UUID per request for traceability
- **Input validation**: Zod schemas on all endpoints

### Sensitive Data
- Passwords, tokens, API keys filtered from Sentry breadcrumbs
- Support reporter sanitizes Bearer tokens, JWT, passwords before sending
- Generic error messages in production (prevents email enumeration)

---

## Testing Conventions

### Backend (Japa)

**Structure:**
```
backend/tests/
├── unit/
│   ├── services/        # Service tests (manual DI mocking)
│   ├── repositories/    # Repository tests (real DB + transactions)
│   ├── models/          # Model tests (computed properties, relations)
│   └── validators/      # Validator tests
├── functional/          # HTTP endpoint tests
├── e2e/                 # End-to-end tests
└── helpers/             # Test utilities (factories, database cleanup)
```

**Patterns:**
- File naming: `snake_case.spec.ts`
- Test groups: `test.group('ServiceName - methodName', () => { ... })`
- Test names: Descriptive sentences — `'should launch a pending poll successfully'`
- Assertions: `assert.equal()`, `assert.isTrue()`, `assert.rejects()`
- **Service mocking**: Manual constructor injection (no DI container manipulation)
  ```typescript
  const service = new PollLifecycleService(
    mockRepository as any,
    mockChannelLinkRepo as any,
    // ... other mocked dependencies
  )
  ```
- **Repository tests**: Real database with `group.each.setup(() => testUtils.db().withGlobalTransaction())`
- **Test helpers**: `createTestUser()`, `createTestStreamer()`, `createTestCampaign()`, etc. (faker-based)

### Frontend (Vitest + Playwright)

**Structure:**
```
frontend/tests/
├── unit/
│   ├── stores/          # Pinia store tests
│   └── composables/     # Composable tests
├── component/           # Vue component tests (Vue Test Utils)
├── e2e/                 # Playwright browser tests
└── setup.ts             # Global mocks (Nuxt auto-imports, localStorage)
```

**Patterns:**
- File naming: `PascalCase.spec.ts` (components) or `camelCase.spec.ts` (stores/composables)
- Describe/test: `describe('StoreName', () => { test('should ...', () => {}) })`
- Assertions: `expect().toBe()`, `expect().toEqual()`, `expect().toContain()`
- **Store tests**: Fresh Pinia per test via `setActivePinia(createPinia())`
- **Component tests**: Mount with `@vue/test-utils`, mock Nuxt UI components as simple templates
- **Composable tests**: `vi.resetModules()` in `afterEach` for clean imports
- **Mocking**: `vi.mock()` for modules, `vi.stubGlobal()` for Nuxt composables, `vi.fn()` for functions
- **Timers**: `vi.useFakeTimers()` / `vi.useRealTimers()` for interval-based logic

### When Writing Tests

- **Services**: Mock all dependencies via constructor injection. Test business logic, not DB queries.
- **Repositories**: Use real DB with transaction rollback. Test actual queries.
- **Components**: Test user interactions and rendered output. Mock API calls.
- **Stores**: Test state mutations and actions. Mock axios calls.
- Always follow the **Arrange-Act-Assert** (AAA) pattern.

---

## Monitoring & Infrastructure

### Docker Production Setup

**Backend** (`backend/Dockerfile`):
- 4-stage multi-stage build (deps → builder → prod-deps → production)
- Non-root user (`nodejs:1001`)
- `dumb-init` for proper signal handling
- Health check: `GET /health/ready`
- Resource limits: 2 CPU / 2GB RAM

**Frontend** (`frontend/Dockerfile`):
- 2-stage build (builder → production)
- Nuxt SSR deployment
- Health check: `GET /health`

**Entrypoint** (`backend/docker-entrypoint.sh`):
- Waits for PostgreSQL + Redis connectivity
- Runs `migration:run --force` automatically
- Exits with error if migrations fail

### Monitoring Stack (`monitoring/`)

```
Prometheus (metrics collection, 30-day retention)
  ├── Node Exporter (CPU, RAM, disk, network)
  ├── cAdvisor (Docker container metrics)
  ├── PostgreSQL Exporter (DB health)
  └── Redis Exporter (cache metrics)

Grafana (dashboards)
AlertManager → Discord webhooks (normal + critical channels)
```

### CI/CD (`/.github/workflows/`)

| Workflow | Branch | Behavior |
|----------|--------|----------|
| `staging-ci.yml` | staging | Functional tests non-blocking |
| `production-ci.yml` | main | All tests blocking |
| `sync-foundry-module.yml` | — | Syncs Foundry VTT module |

**Pipeline:**
```
backend-quality ──► backend-unit-tests ──► backend-functional-tests
frontend-quality ──► frontend-unit-tests
                            ↓
                         build
                            ↓
                   frontend-e2e-tests (prod only)
```

---

## Code Conventions

### Naming

| Context | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `PollLifecycleService` |
| Functions/Variables | camelCase | `launchPoll()` |
| Constants | UPPER_SNAKE_CASE | `MAX_POLL_DURATION` |
| Backend files | snake_case | `poll_lifecycle_service.ts` |
| Frontend components | PascalCase | `PollControlCard.vue` |
| Frontend composables | camelCase | `usePollControl.ts` |
| DB tables | snake_case plural | `poll_instances` |
| DB columns | snake_case | `created_at` |
| TS foreign keys | camelCase | `userId` |

### ESLint Exceptions

`snake_case` is accepted for:
- Database columns in migrations
- Twitch OAuth properties (`access_token`, `client_id`)
- Twitch API responses
- PostgreSQL query results

### File Organization

**Backend service directories:**
```
app/services/
├── auth/              # Authentication (email, OAuth, tokens, sessions)
├── cache/             # Redis service
├── campaigns/         # Campaign + membership logic
├── core/              # Health checks, database seeder
├── gamification/      # Gamification engine (events, rewards, tracking)
├── mail/              # Email sending (welcome, verification)
├── notifications/     # Push notifications
├── polls/             # Poll lifecycle (creation, polling, aggregation, results)
├── resilience/        # Circuit breaker, retry, backoff
├── scheduler/         # Scheduled tasks (token refresh, expiry checks)
├── twitch/            # Twitch API, polls, chat, countdown
├── vtt/               # VTT integration (sync, webhooks, pairing, import)
└── websocket/         # WebSocket (Transmit) broadcasting
```

---

## Environment Variables

### Backend (.env)

```env
# App
PORT=3333
HOST=localhost
APP_KEY=<generated>             # CRITICAL: Used for encryption. Never change in prod.
NODE_ENV=development
LOG_LEVEL=info
TZ=Europe/Paris

# Database (PostgreSQL 16)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=twitch_polls
DB_POOL_MIN=2
DB_POOL_MAX=20

# Cache (Redis 7)
REDIS_HOST=localhost
REDIS_PORT=6379

# Twitch OAuth
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_REDIRECT_URI=http://localhost:3333/auth/twitch/callback

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3333/auth/google/callback

# Session
SESSION_DRIVER=cookie            # Use 'redis' in production

# CORS
FRONTEND_URL=http://localhost:3000

# Error Tracking
SENTRY_DSN=

# Email
RESEND_API_KEY=

# Web Push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Integrations
DISCORD_WEBHOOK_SUPPORT=
DISCORD_WEBHOOK_SUGGESTIONS=
GITHUB_TOKEN=

# Analytics
POSTHOG_API_KEY=
POSTHOG_HOST=

# Admin
ADMIN_EMAILS=admin@example.com
```

### Frontend (.env)

```env
NUXT_PUBLIC_API_BASE=http://localhost:3333
NUXT_PUBLIC_SENTRY_DSN=
```

---

## Important Notes

1. **The `ace` file at backend root** is for production build only. In dev, always use `bin/console.ts` with ts-node.

2. **Twitch tokens** are encrypted via AdonisJS Encryption service before storage. `APP_KEY` must never change in production or all encrypted tokens become unreadable.

3. **Double validation** for poll participation: Streamers must be campaign members AND have explicitly authorized their channel.

4. **WebSocket Transmit** is used for real-time push. Channels follow the pattern `streamer/{streamerId}/polls` and `streamer/{streamerId}/gamification`.

5. **Overlay pages** are loaded in OBS Browser Source by streamers. They must remain lightweight, public, and backward-compatible.

6. **Foundry VTT module** (`modules-vtt/`) communicates with the backend via webhooks with API key + fingerprint authentication.

7. **Rate limiting fails closed**: If Redis is down, requests are blocked (HTTP 503) rather than allowed through.

8. **The monitoring stack** is optional for development but required in production. AlertManager sends to Discord.

---

## Quick Start

```bash
# 1. Start services
docker-compose up -d  # PostgreSQL + Redis

# 2. Backend
cd backend
cp .env.example .env  # Configure variables
npm install
node --loader ts-node-maintained/esm bin/console.ts migration:run
npm run dev

# 3. Frontend
cd frontend
cp .env.example .env
npm install
npm run dev

# 4. Open http://localhost:3000
```
