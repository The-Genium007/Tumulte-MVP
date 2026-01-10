# Testing Guide - Backend Tumulte

## 📚 Table of Contents

- [Test Architecture](#test-architecture)
- [NPM Scripts](#npm-scripts)
- [Local Execution](#local-execution)
- [CI/CD](#cicd)
- [Coverage](#coverage)
- [Best Practices](#best-practices)

## 🏗️ Test Architecture

The project uses **Japa** as the testing framework with a 3-level structure:

```
tests/
├── unit/              # Isolated tests (mocks)
│   ├── models/
│   ├── services/
│   ├── repositories/
│   ├── validators/
│   └── middleware/
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

### Test Types

1. **Unit Tests** (~475 tests)
   - Isolated services with mocks
   - Repositories
   - Zod validators
   - Models (encryption)
   - Middleware

2. **Functional Tests** (~45 tests)
   - Real HTTP requests
   - PostgreSQL database
   - Redis
   - Automatic transactions

3. **E2E Tests** (~31 workflows)
   - Complete scenarios
   - Multi-service
   - Time management (12h window)

## 📦 NPM Scripts

### Running Tests

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

### Infrastructure Management

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

## 🚀 Local Execution

### Prerequisites

```bash
# Install dependencies
npm ci

# Environment variables
cp .env.example .env.test
```

### Configuration `.env.test`

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

### Starting Docker Services

```bash
# Via npm script
npm run test:setup

# OR manually
docker-compose -f docker-compose.test.yml up -d
```

### Running Tests

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

## ⚙️ CI/CD

### Staging Workflow

**Triggers**: PR to `staging` or push on `staging`

**Jobs**:
1. ✅ Quality Checks (TypeCheck + Lint)
2. ✅ Unit Tests (Backend + Frontend) - **Coverage 80%+**
3. ✅ Build (Backend + Frontend)
4. ⚠️ Functional Tests (Warning only, non-blocking)

**Estimated duration**: ~5-7 minutes

### Production Workflow

**Triggers**: PR to `main` or push on `main`

**Jobs**:
1. ✅ Quality Checks (TypeCheck + Lint)
2. ✅ Security Audit (npm audit)
3. ✅ Unit Tests - **Coverage 85%+ REQUIRED**
4. ✅ Functional Tests - **BLOCKING**
5. ✅ E2E Tests Backend - **BLOCKING**
6. ✅ Build Production
7. ⚠️ E2E Tests Frontend (Playwright - Warning)

**Estimated duration**: ~10-15 minutes

### GitHub Badges

```markdown
[![Staging CI](https://github.com/user/repo/actions/workflows/staging-ci.yml/badge.svg)](https://github.com/user/repo/actions/workflows/staging-ci.yml)
[![Production CI](https://github.com/user/repo/actions/workflows/production-ci.yml/badge.svg)](https://github.com/user/repo/actions/workflows/production-ci.yml)
[![codecov](https://codecov.io/gh/user/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/user/repo)
```

## 📊 Coverage

### Japa Configuration

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

### Coverage Reports

```bash
# Generate report
npm run test:coverage

# Open HTML report
open coverage/index.html

# LCOV for Codecov
cat coverage/lcov.info
```

### Coverage Goals

| Environment | Backend | Frontend | Critical Code |
|-------------|---------|----------|---------------|
| **Staging**   | 80%+    | 80%+     | 90%+          |
| **Production**| 85%+    | 85%+     | **100%**      |

**Critical code (100% required)**:
- Auth Services (OAuth, encryption)
- Poll Services (lifecycle, aggregation)
- Repositories (authorization)
- Middleware (auth, roles)
- Validators (Zod schemas)

## 🎯 Best Practices

### Naming Conventions

```typescript
// ✅ GOOD - camelCase
const testUser = await createTestUser()
const pollInstance = await createTestPoll()

// ❌ BAD - snake_case forbidden
const test_user = await createTestUser()
const poll_instance = await createTestPoll()

// ✅ Exception - DB columns and external API
const user = {
  created_at: new Date(),  // OK - DB column
  twitch_user_id: '123',   // OK - Twitch API
}
```

### Test Structure

```typescript
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Service Name', (group) => {
  // Global setup for group
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should do something', async ({ assert }) => {
    // Arrange
    const mockData = { /* ... */ }

    // Act
    const result = await service.doSomething(mockData)

    // Assert
    assert.isTrue(result.success)
    assert.equal(result.value, expectedValue)
  })
})
```

### Mocking Pattern

```typescript
// Mock with Partial<T>
const mockService: Partial<TwitchApiService> = {
  getUserById: async (id: string) => {
    return { id, login: 'testuser' }
  },
}

// Spy flags
let called = false
let callCount = 0

const mockWithSpy = {
  method: async () => {
    called = true
    callCount++
  },
}

// Verification
assert.isTrue(called)
assert.equal(callCount, 3)
```

### Async Tests

```typescript
// ✅ GOOD - async/await
test('async operation', async ({ assert }) => {
  const result = await asyncFunction()
  assert.isDefined(result)
})

// ❌ BAD - Promise not awaited
test('async operation', ({ assert }) => {
  asyncFunction().then(result => {
    assert.isDefined(result)  // May not execute
  })
})
```

### Test Isolation

```typescript
// ✅ GOOD - Automatic transaction
group.each.setup(() => testUtils.db().withGlobalTransaction())

// ❌ BAD - Shared data between tests
let sharedUser: User  // Risk of pollution

test('test 1', async () => {
  sharedUser = await User.create({ /* ... */ })
})

test('test 2', async () => {
  // sharedUser may be undefined if test 1 fails
})
```

### Strict Assertions

```typescript
// ✅ GOOD - Specific assertions
assert.equal(response.status(), 201)
assert.equal(response.body().name, 'Expected Name')

// ❌ BAD - Permissive assertions
assert.oneOf(response.status(), [200, 201, 204])  // Too broad
assert.isDefined(response.body())  // Not precise enough
```

## 🐛 Debugging

### Test Logs

```typescript
// Enable detailed logs
NODE_ENV=test DEBUG=* npm test

// Specific logs
DEBUG=japa:runner npm test
DEBUG=adonis:* npm test
```

### VSCode Breakpoints

```json
// .vscode/launch.json
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

## 📝 Adding New Tests

1. **Create file**: `tests/{unit|functional|e2e}/name.spec.ts`
2. **Follow conventions**: camelCase, path mapping
3. **Add group**: `test.group('Name', (group) => { ... })`
4. **Setup isolation**: `group.each.setup(() => testUtils.db().withGlobalTransaction())`
5. **Check linting**: `npm run lint`
6. **Run tests**: `npm test`
7. **Check coverage**: `npm run test:coverage`

## 🔗 Resources

- [Japa Documentation](https://japa.dev/)
- [AdonisJS Testing](https://docs.adonisjs.com/guides/testing)
- [Codecov Guide](https://docs.codecov.com/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Last updated**: 2026-01-02
