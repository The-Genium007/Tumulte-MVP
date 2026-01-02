# Tests Backend Tumulte

Ce répertoire contient tous les tests du backend Tumulte (AdonisJS + Japa).

## 📋 Table des matières

- [Structure](#structure)
- [Installation](#installation)
- [Lancement des tests](#lancement-des-tests)
- [Conventions](#conventions)
- [Helpers et Factories](#helpers-et-factories)
- [Mocking](#mocking)

## 📁 Structure

```
tests/
├── bootstrap.ts                  # Configuration Japa
├── helpers/
│   └── test_utils.ts            # Factories de test (createTestUser, etc.)
├── mocks/
│   └── twitch_api_mock.ts       # Mock Twitch API
├── unit/                        # Tests unitaires (~70 fichiers prévus)
│   ├── models/
│   ├── services/
│   ├── repositories/
│   ├── validators/
│   └── middleware/
├── functional/                  # Tests fonctionnels (~20 fichiers)
│   ├── campaigns_crud.spec.ts       # 13 tests CRUD campaigns
│   ├── campaigns_members.spec.ts    # 6 tests gestion membres
│   ├── polls.spec.ts                # 6 tests polls
│   ├── streamer_campaigns.spec.ts   # 6 tests streamer
│   └── overlay.spec.ts              # 4 tests overlay public
└── e2e/                        # Tests E2E (~5 fichiers prévus)
```

## 🚀 Installation

### Prérequis

- Docker et Docker Compose installés
- Node.js 20+
- npm ou yarn

### Setup initial

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Démarrer les services de test** :
   ```bash
   npm run test:setup
   ```

   Cela va :
   - Démarrer PostgreSQL (port 5433) et Redis (port 6380) en Docker
   - Exécuter les migrations de test
   - Préparer l'environnement

## 🧪 Lancement des tests

### Tous les tests

```bash
npm test
```

### Tests par type

```bash
# Tests unitaires uniquement
npm run test:unit

# Tests fonctionnels uniquement
npm run test:functional

# Tests E2E uniquement
npm run test:e2e
```

### Tests avec coverage

```bash
npm run test:coverage
```

Cible : **80%+ de couverture globale**, **100% sur le code critique** (auth, polls, campaigns).

### Mode watch

```bash
npm run test:watch
```

### Workflow complet

```bash
# Démarrer services + migrations + tests
npm run test:all

# Arrêter les services après les tests
npm run test:teardown

# Nettoyer complètement (volumes Docker)
npm run test:clean
```

## 📐 Conventions

### Nommage

✅ **BON - camelCase** pour variables, fonctions, paramètres :
```typescript
const campaignService = new CampaignService()
const testUser = await createTestUser()
const mockRepository = new MockCampaignRepository()
```

❌ **MAUVAIS - snake_case** interdit :
```typescript
const campaign_service = new CampaignService()  // ❌
const test_user = await createTestUser()        // ❌
```

### Exceptions snake_case

✅ **Autorisé** pour colonnes DB et champs API externes :
```typescript
const campaign = await Campaign.create({
  owner_id: user.id,           // ✅ colonne DB
  created_at: new Date(),      // ✅ colonne DB
})

const twitchData = {
  twitch_user_id: '12345',     // ✅ API Twitch
  access_token: 'token123',    // ✅ OAuth
}
```

### Imports

✅ **BON - Path mapping** :
```typescript
import { CampaignService } from '#services/campaigns/campaign_service'
import { createTestUser } from '#tests/helpers/test_utils'
```

❌ **MAUVAIS - Imports relatifs** :
```typescript
import { CampaignService } from '../../../app/services/campaigns/campaign_service'
```

## 🏭 Helpers et Factories

Le fichier `helpers/test_utils.ts` fournit des factories pour créer des données de test :

### Users

```typescript
// Créer un user basique
const user = await createTestUser({ role: 'MJ' })

// Créer un user authentifié avec token
const { user, token } = await createAuthenticatedUser({ role: 'STREAMER' })
```

### Campaigns

```typescript
// Campaign simple
const campaign = await createTestCampaign({ name: 'My Campaign' })

// Campaign avec owner
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

// Avec autorisation
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

### Setup complet

```typescript
// Créer une campaign avec N membres
const { campaign, owner, members, streamers } = await createCampaignWithMembers(3)
```

## 🎭 Mocking

### Twitch API Mock

Le fichier `mocks/twitch_api_mock.ts` fournit des mocks pour toutes les interactions Twitch :

```typescript
import { MockTwitchApiClient, mockOAuthTokenExchange } from '#tests/mocks/twitch_api_mock'

// Mock client réutilisable
const mockTwitch = new MockTwitchApiClient()

// Register un user
mockTwitch.registerUser('12345', {
  login: 'testuser',
  display_name: 'TestUser',
})

// Créer un poll
const poll = await mockTwitch.createPoll(
  '12345',
  'Question?',
  ['A', 'B'],
  60
)

// Simuler une erreur
mockTwitch.failNextRequest(mockUnauthorizedError())
```

### Database

Les tests utilisent une **vraie base PostgreSQL** en Docker (tmpfs pour performance).

Cleanup automatique entre chaque test :
```typescript
test.group('My Tests', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should...', async ({ client, assert }) => {
    // DB vide ici
  })
})
```

### Redis

**Vrai Redis** en Docker (tmpfs) pour les tests de cache.

## ✅ Validation

### Linting

```bash
npm run lint
```

Doit passer **sans erreur**.

### TypeCheck

```bash
npm run typecheck
```

Doit passer **sans erreur**.

## 📊 Coverage actuel

### Tests fonctionnels créés
- ✅ **campaigns_crud.spec.ts** - 13 tests (CRUD complet)
- ✅ **campaigns_members.spec.ts** - 6 tests (invitations, authorization)
- ✅ **polls.spec.ts** - 6 tests (launch, cancel, results)
- ✅ **streamer_campaigns.spec.ts** - 6 tests (invitations, campaigns actives)
- ✅ **overlay.spec.ts** - 4 tests (overlay public)

**Total** : **35+ tests fonctionnels** modernisés avec authentification réelle et assertions strictes.

### Tests unitaires
- ✅ **campaign_service_modernized.spec.ts** - 13 tests avec MockRepository pattern

### Infrastructure
- ✅ Docker Compose pour PostgreSQL + Redis
- ✅ Configuration .env.test
- ✅ Bootstrap Japa
- ✅ Mock Twitch API complet
- ✅ Factories réutilisables (9 helpers)
- ✅ Scripts npm pour tous les workflows

## 🎯 Prochaines étapes (selon le plan)

### Phase 1 suite
- Tests authentification OAuth (100% coverage)
- Tests token encryption/refresh
- Tests middleware RBAC

### Phase 2
- Tests services polls (lifecycle, polling, aggregation)
- Tests services Twitch integration
- Tests WebSocket real-time

### Phase 3
- Tests E2E workflows complets
- Tests composants frontend (Vitest + Playwright)

### Phase 4
- Tests de performance (1000 votes/sec)
- Tests edge cases
- Tests validateurs

## 📝 Exemples

### Test fonctionnel moderne

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

### Test unitaire avec Mock Repository

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

### Logs de test

Par défaut, les logs sont en mode `silent` (voir `.env.test`).

Pour activer les logs :
```bash
LOG_LEVEL=debug npm test
```

### Inspecter la DB de test

```bash
# Se connecter à PostgreSQL de test
docker exec -it tumulte-postgres-test psql -U test -d tumulte_test

# Lister les tables
\dt

# Query
SELECT * FROM campaigns;
```

### Inspecter Redis de test

```bash
# Se connecter à Redis de test
docker exec -it tumulte-redis-test redis-cli

# Lister les clés
KEYS *

# Get une valeur
GET poll:results:123
```

## 📚 Documentation

- [Japa Documentation](https://japa.dev/)
- [AdonisJS Testing](https://docs.adonisjs.com/guides/testing)
- [Plan de tests complet](../../.claude/plans/staged-tinkering-summit.md)
