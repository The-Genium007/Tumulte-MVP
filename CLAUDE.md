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
├── docs/                 # Documentation (see Documentation Map below)
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

### PreFlight System

Extensible, auto-discovering health check system that validates system health before launching polls, gamification events, or any feature. Uses priority-based execution (0=infrastructure → 20=business rules) with short-circuit on failure. Two modes: `full` (blocking) and `light` (observability-only).

> **Full documentation:** `docs/architecture/preflight.md`

### Gamification Handler Registries

Registry-based handler system for gamification triggers and actions. Eliminates switch statements — adding a new handler type requires only one file + registration in `start/container.ts`.

> **Full documentation:** `docs/gamification/` (architecture + code patterns)

### System Presets Architecture

When a campaign is connected to Foundry VTT, the game system is detected automatically. If recognized, criticality rules and gamification recommendations are auto-configured via a 3-point detection chain (pairing → first dice roll → campaign sync). Three-tier support: 15 Tier 1 systems with full adapters (~85% of users), ~25 Tier 2 with degraded GenericAdapter support, and 320+ Tier 3 with basic dice extraction only.

> **Full documentation:** `docs/architecture/system-presets.md`

---

## Documentation Map

Quick lookup table — use this to find detailed documentation on any topic.

> **RULE: Documentation maintenance.** When creating, moving, or deleting a markdown file in `docs/`:
> 1. **Update this table** — add/remove/edit the corresponding row
> 2. **Update `docs/README.md`** — add/remove the link in the appropriate section
> 3. **Update `.claude/agents/docs.md`** — keep the documentation structure tree in sync
>
> All documentation lives in `docs/`. Never create standalone `.md` files at the project root or in subdirectories like `.github/`, `backend/`, or `frontend/` — place them in the appropriate `docs/` subdirectory instead.

| Topic | File | Description |
|-------|------|-------------|
| **Gamification system** | `docs/gamification/` | Architecture, code patterns, handler registries |
| **Database models** | `docs/reference/models.md` | All 28+ models with schema details |
| **API routes** | `docs/api/reference.md` | Complete endpoint documentation |
| **API authentication** | `docs/api/authentication.md` | OAuth flows, session management |
| **Error handling** | `docs/architecture/backend.md` | Exception handler, resilience patterns |
| **Security** | `docs/architecture/security.md` | Auth guards, token storage, HTTP security |
| **PreFlight checks** | `docs/architecture/preflight.md` | Health check system, priorities, observability |
| **System presets** | `docs/architecture/system-presets.md` | Foundry VTT system detection, preset registry |
| **Backend architecture** | `docs/architecture/backend.md` | Layered pattern, DI, ORM conventions |
| **Frontend architecture** | `docs/architecture/frontend.md` | Nuxt 3 patterns, composables, components |
| **Testing** | `docs/guides/testing.md` | Japa + Vitest patterns, CI/CD, coverage |
| **CI/CD & workflows** | `docs/infrastructure/ci-cd.md` | GitHub Actions, staging/production pipelines |
| **Branch protection** | `docs/infrastructure/branch-protection.md` | GitHub rules, deployment workflow |
| **Monitoring & Docker** | `docs/infrastructure/monitoring.md` | Prometheus, Grafana, Docker setup |
| **Design system** | `docs/reference/design-system.md` | Spacing, typography, colors, components |
| **VTT feature matrix** | `docs/reference/vtt-feature-matrix.md` | Feature support levels per VTT system, how to add features |
| **Environment variables** | `docs/getting-started/configuration.md` | All .env options for backend & frontend |
| **Installation** | `docs/getting-started/installation.md` | Self-hosting setup guide |
| **VTT integration** | `docs/vtt-integration/` | Foundry VTT, pairing, webhooks, characters |
| **Overlay Studio** | `docs/overlay-studio/` | Visual editor, customization, CSS |
| **Contributing** | `docs/guides/contributing.md` | Code standards, PR process |
| **Deployment** | `docs/guides/deployment.md` | Docker, Dokploy, production checklist |
| **Services reference** | `docs/reference/services.md` | All backend services by domain |

---

## Database

### Database Conventions

- Tables: `snake_case` plural (`poll_instances`)
- Columns: `snake_case` (`created_at`, `user_id`)
- Foreign keys in TypeScript: `camelCase` (`userId`, `campaignId`)
- UUIDs for all primary keys
- Timestamps: `created_at`, `updated_at` on all tables

### Migration Count

70+ migrations as of v0.6.x. Migrations include both schema changes and data migrations (seeds, backfills). See the "Database Migration Safety" section above before creating new ones.

> **Full models reference (28+ models):** `docs/reference/models.md`

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

### Loading Icons

**All loading/spinner indicators MUST use the branded D20 dice icon.** Never use generic spinners (`i-lucide-loader-2`, `i-heroicons-arrow-path`, SVG circle spinners, etc.).

```vue
<!-- Standard loading indicator -->
<UIcon name="i-game-icons-dice-twenty-faces-twenty" class="size-8 text-primary animate-spin-slow" />

<!-- Small inline loading (buttons, compact areas) -->
<UIcon name="i-game-icons-dice-twenty-faces-twenty" class="size-4 animate-spin-slow" />
```

- **Icon**: `i-game-icons-dice-twenty-faces-twenty`
- **Animation**: `animate-spin-slow` (4.5s rotation, defined in `main.css`) — preferred for most cases. Use `animate-spin` (1s) only for very short micro-interactions.
- **Color**: `text-primary` for prominent loaders, `text-muted` for subtle inline ones.
- **Full-page loading**: Use the `<LoadingScreen />` component (`components/ui/loading/LoadingScreen.vue`).

### File Organization

**Backend service directories:**
```
app/services/
├── auth/              # Authentication (email, OAuth, tokens, sessions)
├── cache/             # Redis service
├── campaigns/         # Campaign + membership logic
├── core/              # Health checks, database seeder
├── gamification/      # Gamification engine (events, rewards, handler registries)
├── monitoring/        # Prometheus metrics service
├── mail/              # Email sending (welcome, verification)
├── notifications/     # Push notifications
├── polls/             # Poll lifecycle (creation, polling, aggregation, results)
├── preflight/         # Pre-flight health checks (registry, runner, checks/)
├── resilience/        # Circuit breaker, retry, backoff
├── scheduler/         # Scheduled tasks (token refresh, expiry checks)
├── twitch/            # Twitch API, polls, chat, countdown
├── vtt/               # VTT integration (sync, webhooks, pairing, import)
└── websocket/         # WebSocket (Transmit) broadcasting
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
