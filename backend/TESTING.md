# Guide de Tests - Backend Tumulte

## 📚 Table des Matières

- [Architecture des Tests](#architecture-des-tests)
- [Scripts NPM](#scripts-npm)
- [Exécution Locale](#exécution-locale)
- [CI/CD](#cicd)
- [Coverage](#coverage)
- [Bonnes Pratiques](#bonnes-pratiques)

## 🏗️ Architecture des Tests

Le projet utilise **Japa** comme framework de test avec une structure en 3 niveaux :

```
tests/
├── unit/              # Tests isolés (mocks)
│   ├── models/
│   ├── services/
│   ├── repositories/
│   ├── validators/
│   └── middleware/
├── functional/        # Tests HTTP (vraie DB)
│   ├── auth/
│   ├── campaigns/
│   ├── polls/
│   └── websocket/
└── e2e/              # Workflows complets
    ├── complete_poll_workflow.spec.ts
    ├── multi_streamer_poll.spec.ts
    └── authorization_expiry.spec.ts
```

### Types de Tests

1. **Tests Unitaires** (~475 tests)
   - Services isolés avec mocks
   - Repositories
   - Validators Zod
   - Models (encryption)
   - Middleware

2. **Tests Fonctionnels** (~45 tests)
   - Requêtes HTTP réelles
   - Base de données PostgreSQL
   - Redis
   - Transactions automatiques

3. **Tests E2E** (~31 workflows)
   - Scénarios complets
   - Multi-services
   - Gestion temporelle (12h window)

## 📦 Scripts NPM

### Exécution des Tests

```bash
# Tous les tests
npm test

# Par type
npm run test:unit           # Tests unitaires uniquement
npm run test:functional     # Tests fonctionnels uniquement
npm run test:e2e           # Tests E2E uniquement

# Avec coverage
npm run test:coverage       # Tous tests + rapport coverage

# Mode watch
npm run test:watch         # Re-exécution auto sur changements
```

### Gestion Infrastructure

```bash
# Démarrer PostgreSQL + Redis (Docker)
npm run test:setup

# Arrêter services
npm run test:teardown

# Nettoyer données de test
npm run test:clean

# Cycle complet (setup + tests + teardown)
npm run test:all
```

## 🚀 Exécution Locale

### Prérequis

```bash
# Installer dépendances
npm ci

# Variables d'environnement
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

### Démarrage Services Docker

```bash
# Via npm script
npm run test:setup

# OU manuellement
docker-compose -f docker-compose.test.yml up -d
```

### Exécution Tests

```bash
# 1. Démarrer services
npm run test:setup

# 2. Lancer migrations
node ace migration:run --force

# 3. Exécuter tests
npm run test:unit          # ~2-3 sec
npm run test:functional    # ~10-15 sec
npm run test:e2e          # ~30-60 sec

# 4. Arrêter services
npm run test:teardown
```

## ⚙️ CI/CD

### Workflow Staging

**Déclencheurs** : PR vers `staging` ou push sur `staging`

**Jobs** :
1. ✅ Quality Checks (TypeCheck + Lint)
2. ✅ Unit Tests (Backend + Frontend) - **Coverage 80%+**
3. ✅ Build (Backend + Frontend)
4. ⚠️ Functional Tests (Warning only, non-bloquant)

**Durée estimée** : ~5-7 minutes

### Workflow Production

**Déclencheurs** : PR vers `main` ou push sur `main`

**Jobs** :
1. ✅ Quality Checks (TypeCheck + Lint)
2. ✅ Security Audit (npm audit)
3. ✅ Unit Tests - **Coverage 85%+ REQUIS**
4. ✅ Functional Tests - **BLOQUANT**
5. ✅ E2E Tests Backend - **BLOQUANT**
6. ✅ Build Production
7. ⚠️ E2E Tests Frontend (Playwright - Warning)

**Durée estimée** : ~10-15 minutes

### Badges GitHub

```markdown
[![Staging CI](https://github.com/user/repo/actions/workflows/staging-ci.yml/badge.svg)](https://github.com/user/repo/actions/workflows/staging-ci.yml)
[![Production CI](https://github.com/user/repo/actions/workflows/production-ci.yml/badge.svg)](https://github.com/user/repo/actions/workflows/production-ci.yml)
[![codecov](https://codecov.io/gh/user/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/user/repo)
```

## 📊 Coverage

### Configuration Japa

Le coverage est configuré dans `adonisrc.ts` :

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
        'app/controllers/**',  // Couvert par tests fonctionnels
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

### Rapports Coverage

```bash
# Générer rapport
npm run test:coverage

# Ouvrir rapport HTML
open coverage/index.html

# LCOV pour Codecov
cat coverage/lcov.info
```

### Objectifs Coverage

| Environnement | Backend | Frontend | Code Critique |
|---------------|---------|----------|---------------|
| **Staging**   | 80%+    | 80%+     | 90%+          |
| **Production**| 85%+    | 85%+     | **100%**      |

**Code critique (100% requis)** :
- Services Auth (OAuth, encryption)
- Services Polls (lifecycle, aggregation)
- Repositories (authorization)
- Middleware (auth, roles)
- Validators (Zod schemas)

## 🎯 Bonnes Pratiques

### Conventions de Nommage

```typescript
// ✅ BON - camelCase
const testUser = await createTestUser()
const pollInstance = await createTestPoll()

// ❌ MAUVAIS - snake_case interdit
const test_user = await createTestUser()
const poll_instance = await createTestPoll()

// ✅ Exception - Colonnes DB et API externe
const user = {
  created_at: new Date(),  // OK - colonne DB
  twitch_user_id: '123',   // OK - API Twitch
}
```

### Structure d'un Test

```typescript
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Service Name', (group) => {
  // Setup global pour le groupe
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
// Mock avec Partial<T>
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

// Vérification
assert.isTrue(called)
assert.equal(callCount, 3)
```

### Tests Asynchrones

```typescript
// ✅ BON - async/await
test('async operation', async ({ assert }) => {
  const result = await asyncFunction()
  assert.isDefined(result)
})

// ❌ MAUVAIS - Promise non attendue
test('async operation', ({ assert }) => {
  asyncFunction().then(result => {
    assert.isDefined(result)  // Peut ne pas s'exécuter
  })
})
```

### Isolation des Tests

```typescript
// ✅ BON - Transaction automatique
group.each.setup(() => testUtils.db().withGlobalTransaction())

// ❌ MAUVAIS - Partage de données entre tests
let sharedUser: User  // Risque de pollution

test('test 1', async () => {
  sharedUser = await User.create({ /* ... */ })
})

test('test 2', async () => {
  // sharedUser peut être undefined si test 1 échoue
})
```

### Assertions Strictes

```typescript
// ✅ BON - Assertions spécifiques
assert.equal(response.status(), 201)
assert.equal(response.body().name, 'Expected Name')

// ❌ MAUVAIS - Assertions permissives
assert.oneOf(response.status(), [200, 201, 204])  // Trop large
assert.isDefined(response.body())  // Pas assez précis
```

## 🐛 Debugging

### Logs de Test

```typescript
// Activer logs détaillés
NODE_ENV=test DEBUG=* npm test

// Logs spécifiques
DEBUG=japa:runner npm test
DEBUG=adonis:* npm test
```

### Breakpoints VSCode

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

### Tests Individuels

```bash
# Exécuter 1 fichier
npm test -- tests/unit/services/poll_lifecycle_service.spec.ts

# Filtrer par nom
npm test -- --grep="should launch poll"
```

## 📝 Ajouter de Nouveaux Tests

1. **Créer fichier** : `tests/{unit|functional|e2e}/nom.spec.ts`
2. **Respecter conventions** : camelCase, path mapping
3. **Ajouter groupe** : `test.group('Name', (group) => { ... })`
4. **Setup isolation** : `group.each.setup(() => testUtils.db().withGlobalTransaction())`
5. **Vérifier linting** : `npm run lint`
6. **Exécuter tests** : `npm test`
7. **Vérifier coverage** : `npm run test:coverage`

## 🔗 Ressources

- [Japa Documentation](https://japa.dev/)
- [AdonisJS Testing](https://docs.adonisjs.com/guides/testing)
- [Codecov Guide](https://docs.codecov.com/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Dernière mise à jour** : 2026-01-02
