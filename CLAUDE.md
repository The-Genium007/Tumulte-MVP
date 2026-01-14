# Tumulte - Project Context

Multi-channel Twitch poll management platform for Tabletop RPG Game Masters (GM).

## Architecture

Monorepo with two applications:

```
/Tumulte
├── backend/          # AdonisJS 6 (REST API + WebSocket)
├── frontend/         # Nuxt 3 (Vue 3 + Nuxt UI v3)
└── .github/workflows # CI/CD GitHub Actions
```

## Tech Stack

### Backend
- **Framework**: AdonisJS 6.18 (TypeScript 5.8)
- **ORM**: Lucid (PostgreSQL 16)
- **Cache**: Redis 7
- **WebSocket**: Transmit (real-time)
- **Validation**: VineJS + Zod
- **Tests**: Japa

### Frontend
- **Framework**: Nuxt 3.15 (Vue 3.5)
- **UI**: Nuxt UI v3 (TailwindCSS)
- **State**: Pinia
- **HTTP**: Axios
- **Tests**: Vitest + Playwright

## Essential Commands

### Backend

```bash
# IMPORTANT: To run ace commands in development
node --loader ts-node-maintained/esm bin/console.ts <command>

# Examples
node --loader ts-node-maintained/esm bin/console.ts list
node --loader ts-node-maintained/esm bin/console.ts migration:run
node --loader ts-node-maintained/esm bin/console.ts migration:rollback

# npm scripts
cd backend
npm run dev           # Dev server (port 3333)
npm run test          # All tests
npm run test:unit     # Unit tests
npm run test:functional
npm run typecheck
npm run lint
```

### Frontend

```bash
cd frontend
npm run dev           # Dev server (port 3000)
npm run build
npm run test
npm run test:e2e
npm run typecheck
npm run lint
```

## Architectural Patterns

### Backend - Layers

```
Controller → Service → Repository → Model
     ↓           ↓
  Validator    DTO
```

1. **Controllers**: Request handling, validation, response (NO business logic)
2. **Services**: Business logic, orchestration
3. **Repositories**: Database queries (Lucid ORM)
4. **DTOs**: Model → API Response transformation (`fromModel()`, `fromModelArray()`)
5. **Validators**: Zod schemas for input validation

### Imports (Path Aliases)

```typescript
import { User } from '#models/user'
import { UserService } from '#services/user_service'
import { UserRepository } from '#repositories/user_repository'
import { UserDto } from '#dtos/user_dto'
import { createUserValidator } from '#validators/auth/create_user'
```

## Database

### Main Models

| Model | Description |
|-------|-------------|
| `User` | Users (role: GM or STREAMER) |
| `Streamer` | Twitch info (encrypted tokens) |
| `Campaign` | RPG campaigns |
| `CampaignMembership` | Streamer invitations |
| `PollSession` | Poll sessions |
| `Poll` | Poll definition |
| `PollInstance` | Launched poll instance |
| `PollResult` | Aggregated results |

### Database Conventions

- Tables: `snake_case` plural (`poll_instances`)
- Columns: `snake_case` (`created_at`, `user_id`)
- FK in code: `camelCase` (`userId`, `campaignId`)

## Main API Routes

```
# Auth
GET  /auth/twitch/redirect
GET  /auth/twitch/callback
POST /auth/logout
GET  /auth/me
POST /auth/switch-role

# GM - Campaigns
GET/POST     /mj/campaigns
GET/PUT/DEL  /mj/campaigns/:id
POST         /mj/campaigns/:id/invite

# GM - Sessions
GET/POST     /mj/campaigns/:campaignId/sessions
POST         /mj/sessions/:id/launch

# Streamer
GET  /streamer/campaigns/invitations
POST /streamer/campaigns/invitations/:id/accept
POST /streamer/campaigns/:campaignId/authorize

# Overlay (public)
GET  /overlay/:streamerId/active-poll
```

## Environment Variables

### Backend (.env)

```env
# App
PORT=3333
HOST=localhost
APP_KEY=<generated>
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=twitch_polls

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Twitch OAuth
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_REDIRECT_URI=http://localhost:3333/auth/twitch/callback

# Session
SESSION_DRIVER=cookie

# Frontend CORS
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)

```env
NUXT_PUBLIC_API_BASE=http://localhost:3333
```

## CI/CD

### GitHub Actions Workflows

| Workflow | Branch | Behavior |
|----------|--------|----------|
| `staging-ci.yml` | staging | Functional tests non-blocking |
| `production-ci.yml` | main | All tests blocking |

### Job Structure

```
backend-quality ──► backend-unit-tests ──► backend-functional-tests
frontend-quality ──► frontend-unit-tests
                            ↓
                         build
                            ↓
                   frontend-e2e-tests (prod only)
```

## Code Conventions

- **Classes**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: snake_case (backend), kebab-case (frontend components)

### ESLint Exceptions

snake_case is accepted for:
- Database columns in migrations
- Twitch OAuth properties (`access_token`, `client_id`)
- Twitch API responses

## Important Notes

1. **The `ace` file at backend root** is for production build only. In dev, use `bin/console.ts` with ts-node.

2. **Twitch tokens** are encrypted via AdonisJS Encryption service before storage.

3. **Double validation**: Streamers must be campaign members AND have authorized their channel to participate in polls.

4. **WebSocket Transmit**: Used for real-time push of poll results.

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
npm install
npm run dev
```

---

## Development Roadmap - Responsive & PWA

### Overview

Making Tumulte accessible on mobile, tablet and desktop with:
- Mobile navigation (bottom bar)
- Responsive layouts for all pages
- PWA installation on all platforms
- Limitation message for Overlay Studio on mobile

### Phase 1: PWA Desktop Infrastructure

**Files to create:**
- `frontend/composables/usePwaInstall.ts` - PWA installation management
- `frontend/components/PwaInstallPrompt.vue` - Installation banner
- `frontend/types/pwa.d.ts` - PWA types

**Files to modify:**
- `frontend/components/UserMenu.vue` - Add install button

### Phase 2: Mobile Navigation (Bottom Bar)

**File to create:** `frontend/components/BottomNavigation.vue`

**Structure:**
- Fixed bottom bar (`fixed bottom-0 inset-x-0`)
- Height: 64px (with safe-area-inset-bottom for iPhone)
- 3-4 items based on role (GM or Streamer)
- Visible only on mobile (`lg:hidden`)

**GM Items:**
| Icon | Label | Route |
|------|-------|-------|
| `i-lucide-home` | Home | `/mj` |
| `i-lucide-folder` | Campaigns | `/mj/campaigns` |
| `i-lucide-settings` | Settings | `/settings` |

**Streamer Items:**
| Icon | Label | Route |
|------|-------|-------|
| `i-lucide-home` | Home | `/streamer` |
| `i-lucide-mail` | Invitations | `/streamer/campaigns` |
| `i-lucide-settings` | Settings | `/settings` |

### Phase 3: GM Pages - Responsive

**Pages to adapt:**
- `pages/mj/index.vue` - PollControlCard grid responsive
- `components/mj/CampaignDashboard.vue` - Heights responsive
- `components/mj/EventRow.vue` - Height + truncate
- `pages/mj/campaigns/create.vue` - Width responsive
- `pages/mj/campaigns/[id]/index.vue` - Member layout
- `pages/mj/campaigns/[id]/polls/create.vue` - Form responsive

### Phase 4: Streamer Pages - Responsive

**Pages to adapt:**
- `pages/streamer/index.vue` - Buttons responsive
- `pages/streamer/campaigns.vue` - List responsive
- `pages/streamer/studio.vue` - Add limitation message for mobile

### Phase 5: Common Components - Responsive

**Files to adapt:**
- `components/AppHeader.vue` - Mobile simplification
- `components/AppFooter.vue` - Hide/adapt for mobile
- All modals - Width responsive
- All dropdowns - Position verification

### CSS Utilities to Add

```css
/* Safe areas for PWA */
.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }

/* Mobile viewport height */
.min-h-screen-mobile { min-height: 100dvh; }

/* Touch targets minimum 44px */
.touch-target { min-height: 44px; min-width: 44px; }
```

### Device Testing Checklist

| Device | Viewport | Priority |
|--------|----------|----------|
| iPhone SE | 375x667 | High |
| iPhone 14 | 390x844 | High |
| iPad Mini | 768x1024 | High |
| Desktop 1280px | 1280x800 | High |
| Desktop 1920px | 1920x1080 | High |

### Validation Checklist per Page

- [ ] No horizontal scroll
- [ ] Readable text (min 14px)
- [ ] Touch targets min 44px
- [ ] Buttons accessible by thumb
- [ ] Modals don't overflow
- [ ] Forms usable
- [ ] Smooth navigation
