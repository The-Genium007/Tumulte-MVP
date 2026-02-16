# Testing Guide

## Overview

The Tumulte project uses different testing frameworks for backend and frontend:

- **Backend**: Japa (test runner) with coverage via c8
- **Frontend**: Vitest (unit/component tests) and Playwright (end-to-end tests)

This guide covers testing architecture, patterns, conventions, and best practices for both stacks.

---

## Backend Testing (Japa)

### Test Architecture

The backend uses a 3-level testing structure:

```
backend/tests/
├── unit/              # Isolated tests (mocks)
│   ├── models/        # Model tests (computed properties, relations)
│   ├── services/      # Service tests (manual DI mocking)
│   ├── repositories/  # Repository tests (real DB + transactions)
│   ├── validators/    # Validator tests
│   └── middleware/    # Middleware tests
├── functional/        # HTTP tests (real DB)
│   ├── auth/
│   ├── campaigns/
│   ├── polls/
│   └── websocket/
└── e2e/              # Complete workflows
    ├── complete_poll_workflow.spec.ts
    ├── multi_streamer_poll.spec.ts
    └── authorization_expiry.spec.ts
```

#### Test Types

1. **Unit Tests** (~475 tests)
   - Isolated services with mocks
   - Repositories with real database
   - Zod validators
   - Models (encryption, computed properties)
   - Middleware

2. **Functional Tests** (~45 tests)
   - Real HTTP requests
   - PostgreSQL database
   - Redis cache
   - Automatic transaction rollback

3. **E2E Tests** (~31 workflows)
   - Complete user scenarios
   - Multi-service integration
   - Time management (12h authorization window, expiry flows)

### NPM Scripts

#### Running Tests

```bash
# All tests
npm test

# By type
npm run test:unit           # Unit tests only
npm run test:functional     # Functional tests only
npm run test:e2e           # E2E tests only

# With coverage
npm run test:coverage       # All tests + coverage report

# Watch mode
npm run test:watch         # Auto re-run on changes
```

#### Infrastructure Management

```bash
# Start PostgreSQL + Redis (Docker)
npm run test:setup

# Stop services
npm run test:teardown

# Clean test data
npm run test:clean

# Complete cycle (setup + tests + teardown)
npm run test:all
```

### Local Execution

#### Prerequisites

```bash
# Install dependencies
npm ci

# Environment variables
cp .env.example .env.test
```

#### Configuration `.env.test`

```env
NODE_ENV=test
PORT=3333

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=twitch_polls_test

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Session
SESSION_DRIVER=memory
APP_KEY=test_key_32_characters_long_1234
```

#### Starting Docker Services

```bash
# Via npm script (recommended)
npm run test:setup

# OR manually
docker-compose -f docker-compose.test.yml up -d
```

#### Running Tests

```bash
# 1. Start services
npm run test:setup

# 2. Run migrations
node ace migration:run --force

# 3. Execute tests
npm run test:unit          # ~2-3 sec
npm run test:functional    # ~10-15 sec
npm run test:e2e          # ~30-60 sec

# 4. Stop services
npm run test:teardown
```

### CI/CD Integration

#### Staging Workflow

**Triggers**: PR to `staging` or push on `staging`

**Jobs**:

1. Quality Checks (TypeCheck + Lint) - **BLOCKING**
2. Unit Tests (Backend + Frontend) - **Coverage 80%+ REQUIRED**
3. Build (Backend + Frontend) - **BLOCKING**
4. Functional Tests - **Warning only, non-blocking**

**Estimated duration**: ~5-7 minutes

#### Production Workflow

**Triggers**: PR to `main` or push on `main`

**Jobs**:

1. Quality Checks (TypeCheck + Lint) - **BLOCKING**
2. Security Audit (npm audit) - **BLOCKING**
3. Unit Tests - **Coverage 85%+ REQUIRED**
4. Functional Tests - **BLOCKING**
5. E2E Tests Backend - **BLOCKING**
6. Build Production - **BLOCKING**
7. E2E Tests Frontend (Playwright) - **Warning only**

**Estimated duration**: ~10-15 minutes

**Pipeline flow**:
```
backend-quality ──► backend-unit-tests ──► backend-functional-tests
frontend-quality ──► frontend-unit-tests
                            ↓
                         build
                            ↓
                   frontend-e2e-tests (prod only)
```

### Coverage Goals

| Environment    | Backend | Frontend | Critical Code |
| -------------- | ------- | -------- | ------------- |
| **Staging**    | 80%+    | 80%+     | 90%+          |
| **Production** | 85%+    | 85%+     | **100%**      |

**Critical code (100% required)**:

- Auth Services (OAuth, encryption, token refresh)
- Poll Services (lifecycle, aggregation)
- Repositories (authorization queries)
- Middleware (auth, roles)
- Validators (Zod schemas)

#### Coverage Configuration

Coverage is configured in `adonisrc.ts`:

```typescript
{
  tests: {
    suites: [
      {
        name: 'unit',
        files: ['tests/unit/**/*.spec.ts'],
      },
      {
        name: 'functional',
        files: ['tests/functional/**/*.spec.ts'],
      },
      {
        name: 'e2e',
        files: ['tests/e2e/**/*.spec.ts'],
      },
    ],
    coverage: {
      enabled: true,
      reporters: ['text', 'html', 'lcov'],
      include: ['app/**/*.ts'],
      exclude: [
        'app/controllers/**',  // Covered by functional tests
        'app/exceptions/**',
        'bin/**',
        'config/**',
        'database/**',
        'start/**',
      ],
    },
  },
}
```

#### Coverage Reports

```bash
# Generate report
npm run test:coverage

# Open HTML report
open coverage/index.html

# LCOV for Codecov
cat coverage/lcov.info
```

### Patterns and Conventions

#### File Naming

```typescript
// File: snake_case.spec.ts
tests/unit/services/poll_lifecycle_service.spec.ts
tests/functional/auth/login.spec.ts
```

#### Test Structure

```typescript
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('ServiceName - methodName', (group) => {
  // Global setup for group
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should perform specific action successfully', async ({ assert }) => {
    // Arrange
    const mockData = {
      /* ... */
    }

    // Act
    const result = await service.doSomething(mockData)

    // Assert
    assert.isTrue(result.success)
    assert.equal(result.value, expectedValue)
  })
})
```

#### Test Groups and Names

- **Test groups**: `test.group('ServiceName - methodName', () => { ... })`
- **Test names**: Descriptive sentences — `'should launch a pending poll successfully'`

#### Assertions

Use Japa's built-in assertions:

- `assert.equal(actual, expected)`
- `assert.isTrue(value)`
- `assert.isFalse(value)`
- `assert.isDefined(value)`
- `assert.rejects(async () => { ... })`

#### Service Mocking

Services are tested with **manual constructor injection** (no DI container manipulation):

```typescript
// Mock dependencies
const mockRepository: Partial<PollRepository> = {
  findById: async (id: string) => {
    return { id, status: 'PENDING' } as Poll
  },
}

const mockChannelLinkRepo: Partial<PollChannelLinkRepository> = {
  getActiveChannels: async () => {
    return [{ streamerId: '123', isActive: true }]
  },
}

// Instantiate service with mocks
const service = new PollLifecycleService(
  mockRepository as any,
  mockChannelLinkRepo as any,
  // ... other mocked dependencies
)

// Test
test('should launch a pending poll', async ({ assert }) => {
  const result = await service.launchPoll('poll-id')
  assert.equal(result.status, 'STARTED')
})
```

#### Spy Pattern

Use flags to verify method calls:

```typescript
// Spy flags
let called = false
let callCount = 0

const mockWithSpy = {
  method: async () => {
    called = true
    callCount++
  },
}

// After test execution
assert.isTrue(called)
assert.equal(callCount, 3)
```

#### Repository Tests

Repository tests use a **real database with transaction rollback**:

```typescript
test.group('PollRepository', (group) => {
  // Automatic transaction rollback after each test
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should find poll by ID', async ({ assert }) => {
    const poll = await Poll.create({ question: 'Test?' })

    const repository = new PollRepository()
    const found = await repository.findById(poll.id)

    assert.equal(found.id, poll.id)
  })
})
```

#### Test Helpers

Use factory functions from `tests/helpers/`:

- `createTestUser()` — Creates a user with fake data (faker)
- `createTestStreamer()` — Creates a streamer with OAuth tokens
- `createTestCampaign()` — Creates a campaign with GM
- `createTestPoll()` — Creates a poll instance
- etc.

```typescript
import { createTestUser, createTestCampaign } from '../../helpers/factories'

test('should authorize campaign access', async ({ assert }) => {
  const user = await createTestUser()
  const campaign = await createTestCampaign({ userId: user.id })

  // Test logic
})
```

### Test Isolation

**Always use automatic transaction rollback** to prevent test pollution:

```typescript
// GOOD - Automatic transaction
group.each.setup(() => testUtils.db().withGlobalTransaction())

// BAD - Shared data between tests
let sharedUser: User // Risk of pollution

test('test 1', async () => {
  sharedUser = await User.create({ /* ... */ })
})

test('test 2', async () => {
  // sharedUser may be undefined if test 1 fails
})
```

### Async Tests

```typescript
// GOOD - async/await
test('async operation', async ({ assert }) => {
  const result = await asyncFunction()
  assert.isDefined(result)
})

// BAD - Promise not awaited
test('async operation', ({ assert }) => {
  asyncFunction().then((result) => {
    assert.isDefined(result) // May not execute
  })
})
```

### Strict Assertions

```typescript
// GOOD - Specific assertions
assert.equal(response.status(), 201)
assert.equal(response.body().name, 'Expected Name')

// BAD - Permissive assertions
assert.oneOf(response.status(), [200, 201, 204]) // Too broad
assert.isDefined(response.body()) // Not precise enough
```

### Naming Conventions

```typescript
// GOOD - camelCase
const testUser = await createTestUser()
const pollInstance = await createTestPoll()

// BAD - snake_case forbidden (except DB/API)
const test_user = await createTestUser()
const poll_instance = await createTestPoll()

// Exception - DB columns and external API
const user = {
  created_at: new Date(), // OK - DB column
  twitch_user_id: '123', // OK - Twitch API
}
```

---

## Frontend Testing (Vitest + Playwright)

### Test Structure

```
frontend/tests/
├── unit/
│   ├── stores/          # Pinia store tests
│   └── composables/     # Composable tests
├── component/           # Vue component tests (Vue Test Utils)
├── e2e/                 # Playwright browser tests
└── setup.ts             # Global mocks (Nuxt auto-imports, localStorage)
```

### Patterns

#### File Naming

- **Components**: `PascalCase.spec.ts` (e.g., `PollCard.spec.ts`)
- **Stores/Composables**: `camelCase.spec.ts` (e.g., `usePollControl.spec.ts`)

#### Test Structure

```typescript
import { describe, test, expect, beforeEach } from 'vitest'

describe('StoreName', () => {
  beforeEach(() => {
    // Setup
  })

  test('should do something', () => {
    // Arrange
    const data = { /* ... */ }

    // Act
    const result = doSomething(data)

    // Assert
    expect(result).toBe(expectedValue)
  })
})
```

#### Assertions

Use Vitest assertions:

- `expect(value).toBe(expected)` — Strict equality
- `expect(value).toEqual(expected)` — Deep equality
- `expect(array).toContain(item)` — Array contains item
- `expect(fn).toThrow()` — Function throws error

#### Store Tests

Fresh Pinia instance per test:

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { usePollStore } from '@/stores/pollStore'

describe('PollStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('should update poll status', () => {
    const store = usePollStore()
    store.updateStatus('active')
    expect(store.status).toBe('active')
  })
})
```

#### Component Tests

Mount with `@vue/test-utils`, mock Nuxt UI components as simple templates:

```typescript
import { mount } from '@vue/test-utils'
import PollCard from '@/components/PollCard.vue'

describe('PollCard', () => {
  test('should render poll question', () => {
    const wrapper = mount(PollCard, {
      props: {
        poll: {
          question: 'What should the party do?',
          choices: ['Attack', 'Flee', 'Negotiate'],
        },
      },
    })

    expect(wrapper.text()).toContain('What should the party do?')
  })
})
```

#### Composable Tests

`vi.resetModules()` in `afterEach` for clean imports:

```typescript
import { afterEach, test, vi } from 'vitest'
import { usePollControl } from '@/composables/usePollControl'

describe('usePollControl', () => {
  afterEach(() => {
    vi.resetModules()
  })

  test('should launch poll', async () => {
    const { launchPoll } = usePollControl()
    const result = await launchPoll('poll-id')
    expect(result.success).toBe(true)
  })
})
```

#### Mocking

- **Modules**: `vi.mock()` for module imports
- **Nuxt composables**: `vi.stubGlobal()` for Nuxt auto-imports
- **Functions**: `vi.fn()` for function mocks

```typescript
// Mock module
vi.mock('@/api/polls', () => ({
  launchPoll: vi.fn(() => Promise.resolve({ success: true })),
}))

// Mock Nuxt composable
vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    apiBase: 'http://localhost:3333',
  },
}))

// Mock function
const mockFn = vi.fn((x) => x * 2)
mockFn(5)
expect(mockFn).toHaveBeenCalledWith(5)
expect(mockFn).toHaveReturnedWith(10)
```

#### Timers

Use fake timers for interval-based logic:

```typescript
import { vi } from 'vitest'

test('should poll every 5 seconds', () => {
  vi.useFakeTimers()

  const callback = vi.fn()
  setInterval(callback, 5000)

  vi.advanceTimersByTime(10000)
  expect(callback).toHaveBeenCalledTimes(2)

  vi.useRealTimers()
})
```

---

## When Writing Tests

### Services

- **Mock all dependencies** via constructor injection
- Test **business logic**, not DB queries
- Use the **Partial<T>** pattern for mocks
- Add spy flags to verify method calls

### Repositories

- Use **real database** with transaction rollback
- Test **actual queries** and relations
- Verify correct data is returned

### Components

- Test **user interactions** and rendered output
- Mock API calls with `vi.mock()`
- Test emitted events and prop validation

### Stores

- Test **state mutations** and actions
- Mock axios calls
- Use fresh Pinia per test

### Always Follow AAA Pattern

1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the function/method
3. **Assert**: Verify the result

---

## Debugging

### Test Logs

```bash
# Enable detailed logs
NODE_ENV=test DEBUG=* npm test

# Specific logs
DEBUG=japa:runner npm test
DEBUG=adonis:* npm test
```

### VSCode Breakpoints

Add a launch configuration in `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/.bin/node",
  "args": ["ace", "test", "--filter=unit"],
  "console": "integratedTerminal"
}
```

### Individual Tests

```bash
# Run 1 file
npm test -- tests/unit/services/poll_lifecycle_service.spec.ts

# Filter by name
npm test -- --grep="should launch poll"
```

---

## Adding New Tests Checklist

1. **Create file**: `tests/{unit|functional|e2e}/name.spec.ts`
2. **Follow conventions**:
   - Backend: `snake_case.spec.ts`
   - Frontend: `PascalCase.spec.ts` or `camelCase.spec.ts`
3. **Add test group**: `test.group('Name', (group) => { ... })` (Japa) or `describe('Name', () => { ... })` (Vitest)
4. **Setup isolation**:
   - Backend: `group.each.setup(() => testUtils.db().withGlobalTransaction())`
   - Frontend: `beforeEach(() => setActivePinia(createPinia()))` (for stores)
5. **Check linting**: `npm run lint`
6. **Run tests**: `npm test`
7. **Check coverage**: `npm run test:coverage`

---

## Resources

### Backend (Japa)

- [Japa Documentation](https://japa.dev/)
- [AdonisJS Testing Guide](https://docs.adonisjs.com/guides/testing)
- [Codecov Guide](https://docs.codecov.com/)

### Frontend (Vitest + Playwright)

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)

### CI/CD

- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Last updated**: 2026-02-15
