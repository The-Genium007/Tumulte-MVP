# Contributing Guide

Thank you for your interest in contributing to Tumulte! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git

### Setup

1. **Fork and clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/tumulte.git
   cd tumulte
   ```

2. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

5. **Run migrations**
   ```bash
   cd backend
   node --loader ts-node-maintained/esm bin/console.ts migration:run
   ```

6. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Commit Messages

Use conventional commits:

```
feat: add poll duration setting
fix: correct vote count aggregation
docs: update API reference
refactor: extract poll service logic
test: add campaign creation tests
```

### Pull Request Process

1. Create a feature branch from `developement`
2. Make your changes
3. Run tests and linting
4. Push and create a PR to `developement`
5. Wait for review

## Code Standards

### Backend (AdonisJS)

#### Architecture

Follow the layered architecture:
```
Controller → Service → Repository → Model
```

- **Controllers**: HTTP handling only, no business logic
- **Services**: Business logic
- **Repositories**: Database queries
- **DTOs**: Response transformation

#### Example

```typescript
// Good: Business logic in service
class CampaignService {
  async create(userId: number, data: CreateData) {
    // Validation, logic here
    return this.repository.create({ ...data, userId })
  }
}

// Bad: Business logic in controller
class CampaignsController {
  async store({ request }) {
    // Don't do this
    const data = request.all()
    data.status = 'active'
    return Campaign.create(data)
  }
}
```

#### JSDoc

Add JSDoc to all public methods:

```typescript
/**
 * Creates a new campaign.
 *
 * @param userId - The owner's user ID
 * @param data - Campaign creation data
 * @returns The created campaign
 * @throws {ValidationError} If data is invalid
 */
async create(userId: number, data: CreateData): Promise<Campaign>
```

### Frontend (Nuxt 3)

#### Components

Use `<script setup>` with TypeScript:

```vue
<script setup lang="ts">
interface Props {
  campaign: Campaign
}

const props = defineProps<Props>()
</script>
```

#### Composables

Extract reusable logic:

```typescript
export function useCampaigns() {
  const campaigns = ref<Campaign[]>([])
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    campaigns.value = await campaignRepository.getAll()
    loading.value = false
  }

  return { campaigns, loading, fetch }
}
```

## Testing

### Backend Tests

```bash
cd backend
npm run test          # All tests
npm run test:unit     # Unit tests
npm run test:functional  # API tests
```

### Frontend Tests

```bash
cd frontend
npm run test          # Unit tests
npm run test:e2e      # E2E tests
```

### Writing Tests

#### Backend Unit Test

```typescript
test.group('CampaignService', () => {
  test('creates campaign with valid data', async ({ assert }) => {
    const service = new CampaignService(mockRepo)
    const campaign = await service.create(1, { name: 'Test' })
    assert.equal(campaign.name, 'Test')
  })
})
```

#### Frontend Unit Test

```typescript
describe('useCampaigns', () => {
  it('fetches campaigns', async () => {
    const { campaigns, fetch } = useCampaigns()
    await fetch()
    expect(campaigns.value).toHaveLength(2)
  })
})
```

## Quality Checks

Before submitting a PR, ensure:

```bash
# Backend
cd backend
npm run typecheck
npm run lint
npm run test

# Frontend
cd frontend
npm run typecheck
npm run lint
npm run test
```

## Code Review Checklist

- [ ] Follows architecture patterns
- [ ] Has appropriate tests
- [ ] JSDoc on public methods
- [ ] No console.log left
- [ ] TypeScript strict compliance
- [ ] Accessible (frontend)

## Getting Help

- Open an issue for bugs or feature requests
- Join discussions for questions
- Tag maintainers for urgent issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
