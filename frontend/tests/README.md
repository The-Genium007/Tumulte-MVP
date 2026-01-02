# Tests Frontend - Tumulte v0.1.0-alpha

## 📊 Vue d'ensemble

Suite de tests complète pour le frontend Nuxt 3 de Tumulte, incluant tests unitaires, tests de composants et tests E2E.

### Statistiques

- **Total fichiers de test** : 19 fichiers
- **Total tests** : 238 tests
- **Coverage global** : 37.86% (objectif: 80%+)
- **Tests critiques** : 100% coverage sur auth, useAuth, usePollInstance, sessionPolls

| Type de Test | Fichiers | Tests | Status |
|--------------|----------|-------|--------|
| Unit (Stores) | 4 | 44 | ✅ Passing |
| Unit (Composables) | 10 | 60 | ✅ Passing |
| Unit (API) | 1 | 14 | ✅ Passing |
| Component | 4 | 57 | ✅ Passing |
| E2E (Playwright) | 5 | 63 | ✅ Configured |

## 🚀 Lancer les tests

### Tests unitaires et composants (Vitest)

```bash
# Tous les tests unitaires
npm run test

# Avec interface UI
npm run test:ui

# Avec coverage
npm run test:coverage

# En mode watch
npm test
```

### Tests E2E (Playwright)

```bash
# Tous les tests E2E
npm run test:e2e

# Avec interface UI
npm run test:e2e:ui

# En mode headed (voir le navigateur)
npm run test:e2e:headed
```

### Tous les tests + rapports

```bash
# Tous tests avec coverage
npm run test:all

# Générer rapport HTML complet
npm run test:report

# Script bash complet
./scripts/test-report.sh
```

## 📁 Structure des tests

```
tests/
├── setup.ts                      # Configuration globale Vitest
├── helpers/
│   ├── mockFactory.ts            # Factories de données test
│   └── testUtils.ts              # Helpers (setupPinia, etc.)
├── mocks/
│   ├── handlers.ts               # Handlers MSW
│   └── server.ts                 # Serveur MSW
├── unit/
│   ├── stores/                   # Tests Pinia stores (4 fichiers)
│   │   ├── auth.spec.ts          # ✅ 100% coverage
│   │   ├── campaigns.spec.ts
│   │   ├── pollControl.spec.ts
│   │   └── sessionPolls.spec.ts  # ✅ 100% coverage
│   ├── composables/              # Tests composables (10 fichiers)
│   │   ├── useAuth.spec.ts       # ✅ 100% coverage
│   │   ├── useWebSocket.spec.ts  # 81% coverage
│   │   ├── useCampaigns.spec.ts
│   │   └── usePollInstance.spec.ts # ✅ 100% coverage
│   └── api/
│       └── httpClient.spec.ts
├── component/                    # Tests composants Vue (4 fichiers)
│   ├── PollControlCard.spec.ts   # 20 tests
│   ├── AuthorizationCard.spec.ts # 18 tests
│   ├── UserMenu.spec.ts          # 12 tests
│   └── AppBreadcrumbs.spec.ts    # 7 tests
└── e2e/                          # Tests E2E Playwright (5 fichiers)
    ├── authFlow.spec.ts          # 9 tests - Authentification
    ├── campaignManagement.spec.ts # 14 tests - Gestion campagnes
    ├── pollLaunchFlow.spec.ts    # 16 tests - Lancement polls
    ├── overlayDisplay.spec.ts    # 15 tests - Overlay public
    └── roleSwitch.spec.ts        # 12 tests - Switch rôles
```

## 🎯 Coverage par module

### Code Critique (100% requis) ✅

| Module | Coverage | Status |
|--------|----------|--------|
| stores/auth.ts | 100% | ✅ |
| composables/useAuth.ts | 100% | ✅ |
| composables/usePollInstance.ts | 100% | ✅ |
| stores/sessionPolls.ts | 100% | ✅ |
| composables/usePollTemplates.ts | 100% | ✅ |

### Code Important (80%+ objectif)

| Module | Coverage | Status |
|--------|----------|--------|
| api/http-client.ts | 92.77% | ✅ |
| composables/useWebSocket.ts | 81.47% | ✅ |
| stores/pollControl.ts | 74.73% | ⚠️ |
| stores/campaigns.ts | 61.96% | ⚠️ |
| composables/useCampaigns.ts | 48.97% | ❌ |

### Composants testés

| Composant | Coverage | Tests |
|-----------|----------|-------|
| PollControlCard.vue | 100% | 20 |
| AuthorizationCard.vue | 90.9% | 18 |
| UserMenu.vue | 96.35% | 12 |
| AppBreadcrumbs.vue | 100% | 7 |

## 🛠️ Technologies

- **Vitest 3.2.0** - Tests unitaires et composants
- **@vue/test-utils 2.4.0** - Utilitaires pour tester composants Vue
- **MSW 2.12.7** - Mock Service Worker pour API
- **Playwright 1.49.0** - Tests E2E
- **@vitest/coverage-v8** - Rapports coverage

## 📝 Conventions de test

### Nommage des fichiers

- Tests unitaires : `*.spec.ts`
- Fichiers dans : `tests/unit/`, `tests/component/`, `tests/e2e/`

### Structure d'un test

```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  })

  test('should do something', () => {
    // Arrange
    const wrapper = mount(Component)

    // Act
    wrapper.find('button').trigger('click')

    // Assert
    expect(wrapper.text()).toContain('Expected')
  })
})
```

### Mocking avec MSW

```typescript
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'

test('should fetch data', async () => {
  server.use(
    http.get('/api/v2/endpoint', () => {
      return HttpResponse.json({ data: 'mock' })
    })
  )

  // Your test here
})
```

### Factories

```typescript
import { createMockUser, createMockCampaign } from '../helpers/mockFactory'

const user = createMockUser({ role: 'MJ' })
const campaign = createMockCampaign({ name: 'Test' })
```

## 🔍 Rapports

### Visualiser le coverage

```bash
# Générer et ouvrir dans le navigateur
npm run test:coverage
npx vite preview --outDir coverage
```

### Visualiser les rapports Playwright

```bash
npm run test:e2e
npx playwright show-report
```

## ⚙️ Configuration

### Vitest

Configuration dans [vitest.config.ts](../vitest.config.ts)

- **Environment** : happy-dom
- **Coverage Provider** : V8
- **Thresholds** : 80% (branches, functions, lines, statements)

### Playwright

Configuration dans [playwright.config.ts](../playwright.config.ts)

- **Base URL** : http://localhost:3000
- **Browsers** : Chromium
- **Retries** : 2 en CI, 0 en local
- **Screenshots** : Sur échec uniquement

## 🚦 CI/CD

### Staging CI

Tests unitaires + coverage 80% minimum

```yaml
- npm run test:coverage
- Check coverage threshold
```

### Production CI

Tests unitaires + E2E + coverage 85% minimum

```yaml
- npm run test:coverage
- npm run test:e2e
- Enforce strict coverage
```

## 📚 Guides

### Ajouter un nouveau test unitaire

1. Créer `tests/unit/[type]/[nom].spec.ts`
2. Importer le module à tester
3. Écrire les tests avec `describe()` et `test()`
4. Vérifier le coverage : `npm run test:coverage`

### Ajouter un test E2E

1. Créer `tests/e2e/[feature].spec.ts`
2. Importer `{ test, expect } from '@playwright/test'`
3. Écrire le scénario utilisateur
4. Lancer : `npm run test:e2e:headed` pour debug

### Débugger un test

```bash
# Vitest UI mode
npm run test:ui

# Playwright UI mode
npm run test:e2e:ui

# Playwright debug mode
npx playwright test --debug
```

## 🎯 Prochaines étapes

- [ ] Augmenter coverage stores (campaigns, pollControl) à 80%+
- [ ] Augmenter coverage composables (useCampaigns) à 80%+
- [ ] Ajouter tests pour les composants restants (forms, modals)
- [ ] Configurer visual regression avec Playwright
- [ ] Intégrer rapports dans PR comments (GitHub Actions)

## 📄 License

CC BY-NC 4.0 - Voir LICENSE dans le dossier racine
