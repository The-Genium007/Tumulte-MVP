# Tumulte Backend Tests

This directory contains all tests for the Tumulte backend (AdonisJS + Japa).

## 📋 Table of Contents

- [Structure](#structure)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Conventions](#conventions)
- [Helpers and Factories](#helpers-and-factories)
- [Mocking](#mocking)

## 📁 Structure

```
tests/
├── bootstrap.ts                  # Japa configuration
├── helpers/
│   └── test_utils.ts            # Test factories (createTestUser, etc.)
├── mocks/
│   └── twitch_api_mock.ts       # Twitch API mock
├── unit/                        # Unit tests (~70 files planned)
│   ├── models/
│   ├── services/
│   ├── repositories/
│   ├── validators/
│   └── middleware/
├── functional/                  # Functional tests (~20 files)
│   ├── campaigns_crud.spec.ts       # 13 CRUD campaigns tests
│   ├── campaigns_members.spec.ts    # 6 member management tests
│   ├── polls.spec.ts                # 6 polls tests
│   ├── streamer_campaigns.spec.ts   # 6 streamer tests
│   └── overlay.spec.ts              # 4 public overlay tests
└── e2e/                        # E2E tests (~5 files planned)
```

## 🚀 Installation

### Prerequisites

- Docker and Docker Compose installed
- Node.js 20+
- npm or yarn

### Initial Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start test services**:
   ```bash
   npm run test:setup
   ```

   This will:
   - Start PostgreSQL (port 5433) and Redis (port 6380) in Docker
   - Run test migrations
   - Prepare the environment

## 🧪 Running Tests

### All tests

```bash
npm test
```

### Tests by type

```bash
# Unit tests only
npm run test:unit

# Functional tests only
npm run test:functional

# E2E tests only
npm run test:e2e
```

### Tests with coverage

```bash
npm run test:coverage
```

Target: **80%+ overall coverage**, **100% on critical code** (auth, polls, campaigns).

### Watch mode

```bash
npm run test:watch
```

### Complete workflow

```bash
# Start services + migrations + tests
npm run test:all

# Stop services after tests
npm run test:teardown

# Complete cleanup (Docker volumes)
npm run test:clean
```

## 📐 Conventions

### Naming

✅ **GOOD - camelCase** for variables, functions, parameters:
```typescript
const campaignService = new CampaignService()
const testUser = await createTestUser()
const mockRepository = new MockCampaignRepository()
```

❌ **BAD - snake_case** forbidden:
```typescript
const campaign_service = new CampaignService()  // ❌
const test_user = await createTestUser()        // ❌
```

### snake_case Exceptions

✅ **Allowed** for DB columns and external API fields:
```typescript
const campaign = await Campaign.create({
  owner_id: user.id,           // ✅ DB column
  created_at: new Date(),      // ✅ DB column
})

const twitchData = {
  twitch_user_id: '12345',     // ✅ Twitch API
  access_token: 'token123',    // ✅ OAuth
}
```

### Imports

✅ **GOOD - Path mapping**:
```typescript
import { CampaignService } from '#services/campaigns/campaign_service'
import { createTestUser } from '#tests/helpers/test_utils'
```

❌ **BAD - Relative imports**:
```typescript
import { CampaignService } from '../../../app/services/campaigns/campaign_service'
```

## 🏭 Helpers and Factories

The `helpers/test_utils.ts` file provides factories to create test data:

### Users

```typescript
// Create a basic user
const user = await createTestUser({ role: 'MJ' })

// Create an authenticated user with token
const { user, token } = await createAuthenticatedUser({ role: 'STREAMER' })
```

### Campaigns

```typescript
// Simple campaign
const campaign = await createTestCampaign({ name: 'My Campaign' })

// Campaign with owner
const campaign = await createTestCampaign({ ownerId: user.id })
```

### Streamers

```typescript
const streamer = await createTestStreamer({
  twitchLogin: 'mystreamer',
  broadcasterType: 'partner',
})
```

### Memberships

```typescript
const membership = await createTestMembership({
  campaignId: campaign.id,
  streamerId: streamer.id,
  status: 'ACTIVE',
})

// With authorization
const membership = await grantPollAuthorization(membership, 12) // 12h
```

### Polls

```typescript
// Poll template
const template = await createTestPollTemplate({
  campaignId: campaign.id,
  question: 'Test question?',
  options: ['A', 'B', 'C'],
})

// Poll instance
const poll = await createTestPollInstance({
  campaignId: campaign.id,
  status: 'RUNNING',
})
```

### Complete setup

```typescript
// Create a campaign with N members
const { campaign, owner, members, streamers } = await createCampaignWithMembers(3)
```

## 🎭 Mocking

### Twitch API Mock

The `mocks/twitch_api_mock.ts` file provides mocks for all Twitch interactions:

```typescript
import { MockTwitchApiClient, mockOAuthTokenExchange } from '#tests/mocks/twitch_api_mock'

// Reusable mock client
const mockTwitch = new MockTwitchApiClient()

// Register a user
mockTwitch.registerUser('12345', {
  login: 'testuser',
  display_name: 'TestUser',
})

// Create a poll
const poll = await mockTwitch.createPoll(
  '12345',
  'Question?',
  ['A', 'B'],
  60
)

// Simulate an error
mockTwitch.failNextRequest(mockUnauthorizedError())
```

### Database

Tests use a **real PostgreSQL database** in Docker (tmpfs for performance).

Automatic cleanup between each test:
```typescript
test.group('My Tests', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should...', async ({ client, assert }) => {
    // Empty DB here
  })
})
```

### Redis

**Real Redis** in Docker (tmpfs) for cache tests.

## ✅ Validation

### Linting

```bash
npm run lint
```

Must pass **without errors**.

### TypeCheck

```bash
npm run typecheck
```

Must pass **without errors**.

## 📊 Current Coverage

### Functional tests created
- ✅ **campaigns_crud.spec.ts** - 13 tests (complete CRUD)
- ✅ **campaigns_members.spec.ts** - 6 tests (invitations, authorization)
- ✅ **polls.spec.ts** - 6 tests (launch, cancel, results)
- ✅ **streamer_campaigns.spec.ts** - 6 tests (invitations, active campaigns)
- ✅ **overlay.spec.ts** - 4 tests (public overlay)

**Total**: **35+ functional tests** modernized with real authentication and strict assertions.

### Unit tests
- ✅ **campaign_service_modernized.spec.ts** - 13 tests with MockRepository pattern

### Infrastructure
- ✅ Docker Compose for PostgreSQL + Redis
- ✅ .env.test configuration
- ✅ Japa bootstrap
- ✅ Complete Twitch API mock
- ✅ Reusable factories (9 helpers)
- ✅ npm scripts for all workflows

## 🎯 Next Steps (according to the plan)

### Phase 1 continued
- OAuth authentication tests (100% coverage)
- Token encryption/refresh tests
- RBAC middleware tests

### Phase 2
- Polls services tests (lifecycle, polling, aggregation)
- Twitch integration services tests
- WebSocket real-time tests

### Phase 3
- Complete E2E workflow tests
- Frontend component tests (Vitest + Playwright)

### Phase 4
- Performance tests (1000 votes/sec)
- Edge case tests
- Validator tests

## 📝 Examples

### Modern Functional Test

```typescript
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createAuthenticatedUser, createTestCampaign } from '#tests/helpers/test_utils'

test.group('Campaigns API', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create campaign', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })

    const response = await client
      .post('/api/v2/mj/campaigns')
      .json({ name: 'New Campaign' })
      .bearerToken(token)

    assert.equal(response.status(), 201)
    assert.equal(response.body().name, 'New Campaign')
  })
})
```

### Unit Test with Mock Repository

```typescript
import { test } from '@japa/runner'
import { MockCampaignRepository } from './campaign_service_modernized.spec'

test.group('CampaignService', (group) => {
  let mockRepo: MockCampaignRepository
  let service: CampaignService

  group.each.setup(() => {
    mockRepo = new MockCampaignRepository()
    service = new CampaignService(mockRepo)
  })

  test('should create campaign', async ({ assert }) => {
    const result = await service.createCampaign('user-123', {
      name: 'Test',
    })

    assert.exists(result.id)
    assert.equal(result.name, 'Test')
  })
})
```

## 🐛 Debugging

### Test logs

By default, logs are in `silent` mode (see `.env.test`).

To enable logs:
```bash
LOG_LEVEL=debug npm test
```

### Inspect test DB

```bash
# Connect to test PostgreSQL
docker exec -it tumulte-postgres-test psql -U test -d tumulte_test

# List tables
\dt

# Query
SELECT * FROM campaigns;
```

### Inspect test Redis

```bash
# Connect to test Redis
docker exec -it tumulte-redis-test redis-cli

# List keys
KEYS *

# Get a value
GET poll:results:123
```

## 📚 Documentation

- [Japa Documentation](https://japa.dev/)
- [AdonisJS Testing](https://docs.adonisjs.com/guides/testing)
- [Complete test plan](../../.claude/plans/staged-tinkering-summit.md)
