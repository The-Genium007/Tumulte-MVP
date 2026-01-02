# État des Tests Backend - Tumulte

Date: 2026-01-02
Status: ⚠️ **INFRASTRUCTURE OK - TESTS À IMPLÉMENTER**

## 📊 Résumé Exécutif

L'infrastructure de tests est **100% fonctionnelle** :
- ✅ Japa configuré correctement
- ✅ PostgreSQL + Redis opérationnels
- ✅ Deadlocks DB résolus (DELETE au lieu de TRUNCATE)
- ✅ Filtres de suites fonctionnels (--suite=unit/functional/e2e)
- ✅ Bootstrap et bin/test.ts correctement configurés

**MAIS** : Les tests fonctionnels et E2E sont des **stubs incomplets** qui échouent.

---

## ✅ Tests Unitaires (OPÉRATIONNELS)

**Status** : Tests s'exécutent sans problème

**Fichiers de tests** : 20+ fichiers
- Middleware (auth, role)
- Models (streamer)
- Repositories (campaign, poll_instance, campaign_membership, streamer)
- Services (campaign, poll_aggregation, auth, polls, twitch)
- Validators (campaign, poll)

**Commande** : `npm run test:unit`

**Résultat** : Tests passent ou échouent normalement (pas de problème d'infrastructure)

---

## ❌ Tests Fonctionnels (CASSÉS - STUBS INCOMPLETS)

**Status** : ❌ **TOUS LES TESTS ÉCHOUENT** - Infrastructure OK mais code de test invalide

### Problème Principal

Les tests fonctionnels utilisent une **API inexistante** : `.withGuard('web')`

**Exemple d'erreur** :
```
TypeError: client.get(...).withGuard is not a function
```

**Code problématique** ([tests/functional/campaigns.spec.ts:9](tests/functional/campaigns.spec.ts:9)) :
```typescript
test('GET /api/v2/mj/campaigns should return campaigns list', async ({ client, assert }) => {
  // TODO: Create authenticated user session
  const response = await client.get('/api/v2/mj/campaigns').withGuard('web')

  // This will fail without proper auth setup, but validates the route exists
  assert.oneOf(response.status(), [200, 401])
})
```

### Analyse

1. **`.withGuard('web')` n'existe pas** dans l'API client de Japa
2. **Commentaires TODO** partout indiquant que les tests ne sont pas implémentés
3. **Assertions trop permissives** : `assert.oneOf([200, 401, 403, 404])` accepte n'importe quoi
4. **Pas d'authentification réelle** : aucune session utilisateur n'est créée

### Fichiers Affectés

Tous les tests fonctionnels (18 occurrences de `.withGuard()`) :
- [tests/functional/campaigns.spec.ts](tests/functional/campaigns.spec.ts) (8 tests)
- [tests/functional/campaigns_crud.spec.ts](tests/functional/campaigns_crud.spec.ts) (12 tests)
- [tests/functional/campaigns_members.spec.ts](tests/functional/campaigns_members.spec.ts) (6 tests)
- [tests/functional/overlay.spec.ts](tests/functional/overlay.spec.ts) (5 tests)
- [tests/functional/polls.spec.ts](tests/functional/polls.spec.ts) (6 tests)
- [tests/functional/streamer_campaigns.spec.ts](tests/functional/streamer_campaigns.spec.ts) (6 tests)
- [tests/functional/auth/oauth_flow.spec.ts](tests/functional/auth/oauth_flow.spec.ts) (9 tests)
- [tests/functional/polls/poll_launch.spec.ts](tests/functional/polls/poll_launch.spec.ts)
- [tests/functional/campaigns/authorization_window.spec.ts](tests/functional/campaigns/authorization_window.spec.ts)
- [tests/functional/websocket/realtime_events.spec.ts](tests/functional/websocket/realtime_events.spec.ts)

**Total estimé** : ~60 tests fonctionnels cassés

### Solution Requise

Pour corriger les tests fonctionnels, il faut :

1. **Supprimer `.withGuard('web')`** (n'existe pas)
2. **Implémenter l'authentification réelle** :
   - Créer un helper `createAuthenticatedUser()` qui retourne un token/cookie
   - Utiliser `.cookie()` ou `.header('Authorization', 'Bearer token')` pour authentifier les requêtes
3. **Créer des données de test réelles** en DB avant chaque test
4. **Assertions strictes** : vérifier status codes exacts + contenu JSON

**Exemple de correction** :

**AVANT (cassé)** :
```typescript
test('GET /api/v2/mj/campaigns should return campaigns list', async ({ client, assert }) => {
  const response = await client.get('/api/v2/mj/campaigns').withGuard('web')
  assert.oneOf(response.status(), [200, 401])
})
```

**APRÈS (correct)** :
```typescript
test('GET /api/v2/mj/campaigns should return campaigns list', async ({ client, assert }) => {
  // 1. Créer user authentifié MJ
  const { user, token } = await createAuthenticatedUser({ role: 'MJ' })

  // 2. Créer 2 campagnes pour ce user
  const campaign1 = await createTestCampaign({ ownerId: user.id, name: 'Campaign 1' })
  const campaign2 = await createTestCampaign({ ownerId: user.id, name: 'Campaign 2' })

  // 3. Request avec vraie authentification
  const response = await client
    .get('/api/v2/mj/campaigns')
    .header('Authorization', `Bearer ${token}`)

  // 4. Assertions strictes
  assert.equal(response.status(), 200)
  assert.equal(response.body().length, 2)
  assert.equal(response.body()[0].name, 'Campaign 1')
})
```

---

## ❌ Tests E2E (CASSÉS - STUBS INCOMPLETS)

**Status** : ❌ **TOUS LES TESTS ÉCHOUENT** - Stubs avec TODO

### Problème Principal

Les tests E2E utilisent `withGlobalTransaction()` qui a été ajouté comme **stub** dans notre helper.

**Exemple d'erreur** (avant le fix) :
```
TypeError: testUtils.db(...).withGlobalTransaction is not a function
```

**Fix appliqué** : Ajout d'un stub `withGlobalTransaction()` qui fait juste `truncate()` pour l'instant.

### Analyse

Tous les tests E2E sont des **stubs avec commentaires TODO** :

**Exemple** ([tests/e2e/authorization_expiry.spec.ts:7-27](tests/e2e/authorization_expiry.spec.ts:7-27)) :
```typescript
test('Authorization expires exactly after 12 hours', async ({ assert }) => {
  // ===== ÉTAPE 1: Grant authorization =====
  // TODO: Créer campagne + membership
  // TODO: POST /grant-authorization
  // TODO: Capturer pollAuthorizationExpiresAt timestamp

  // ===== ÉTAPE 2: Vérifier auth valide immédiatement =====
  // TODO: GET /authorization
  // TODO: Vérifier { authorized: true, remainingSeconds: ~43200 }

  // ===== ÉTAPE 3: Simuler passage de 11h59min =====
  // TODO: Avancer temps de 11h59min (43140 secondes)
  // TODO: GET /authorization
  // TODO: Vérifier { authorized: true, remainingSeconds: ~60 }

  // Placeholder assertion
  assert.isTrue(true)
})
```

### Fichiers Affectés

Tous les tests E2E (6 utilisations de `withGlobalTransaction()`) :
- [tests/e2e/authorization_expiry.spec.ts](tests/e2e/authorization_expiry.spec.ts)
- [tests/e2e/complete_poll_workflow.spec.ts](tests/e2e/complete_poll_workflow.spec.ts)
- [tests/e2e/multi_streamer_poll.spec.ts](tests/e2e/multi_streamer_poll.spec.ts)

**Total estimé** : ~10 tests E2E incomplets

### Solution Requise

Les tests E2E doivent être **entièrement implémentés** selon le plan de test. Ils doivent :

1. Créer des données de test complètes (users, campaigns, polls, etc.)
2. Exécuter des workflows complets end-to-end
3. Vérifier les résultats à chaque étape
4. Utiliser de vraies transactions ou rollback pour l'isolation

---

## 📋 Plan d'Action

### Priorité 1 : Tests Fonctionnels (Semaine en cours)

**Objectif** : Rework complet selon la Phase 0 du plan de test

**Actions** :
1. ✅ ~~Créer helper d'authentification~~ → À faire : `tests/helpers/auth.ts` avec `createAuthenticatedUser()`
2. ✅ ~~Créer factories de données~~ → À faire : étendre `tests/helpers/test_utils.ts`
3. Remplacer tous les `.withGuard('web')` par de vraies sessions
4. Ajouter setup de données dans chaque test
5. Assertions strictes avec vérification du contenu JSON
6. Séparer les tests en fichiers thématiques

**Fichiers à créer/modifier** :
- `tests/helpers/auth.ts` (nouveau)
- Étendre `tests/helpers/test_utils.ts` avec plus de factories
- Rework des 10 fichiers de tests fonctionnels

**Estimation** : 2-3 jours de travail

### Priorité 2 : Tests E2E (Après tests fonctionnels)

**Objectif** : Implémenter les workflows E2E complets

**Actions** :
1. Implémenter `withGlobalTransaction()` proprement (vraies transactions)
2. Écrire les workflows complets dans les 3 fichiers E2E
3. Utiliser les factories et helpers créés pour les tests fonctionnels

**Estimation** : 2-3 jours de travail

---

## 🎯 État Actuel par Type

| Type de Test | Fichiers | Tests | Status | Bloquant |
|-------------|----------|-------|--------|----------|
| **Unit** | 20+ | ~80 | ✅ Fonctionnels | Non |
| **Functional** | 10 | ~60 | ❌ Cassés (stubs) | **OUI** |
| **E2E** | 3 | ~10 | ❌ Incomplets (TODO) | Non (moindre priorité) |

---

## 🔧 Corrections Appliquées Aujourd'hui

### 1. ✅ Résolution Deadlocks DB
- Créé `tests/helpers/database.ts` avec DELETE au lieu de TRUNCATE
- 15 fichiers de tests mis à jour

### 2. ✅ Correction Import Plugin AdonisJS
- Changé `import pluginAdonisJS from '@japa/plugin-adonisjs'`
- En `import { pluginAdonisJS } from '@japa/plugin-adonisjs'`

### 3. ✅ Import Bootstrap dans bin/test.ts
- La configuration `tests/bootstrap.ts` est maintenant utilisée
- Plugins, suites, executors, et hooks appliqués

### 4. ✅ Paramètre --suite Personnalisé
- Implémenté filtrage de suites avant Japa
- `npm run test:unit/functional/e2e` fonctionnent

### 5. ✅ Mise à jour adonisrc.ts
- Ajout de la suite `e2e` qui manquait
- Alignement des patterns et timeouts avec bootstrap.ts

### 6. ✅ Stub withGlobalTransaction
- Ajouté stub dans `tests/helpers/database.ts` pour éviter l'erreur
- Permet aux tests E2E de se lancer (même s'ils sont incomplets)

---

## 📚 Documentation Mise à Jour

- ✅ [BACKEND_TESTS_CONFIG.md](BACKEND_TESTS_CONFIG.md) - Configuration complète
- ✅ Ce fichier - État actuel et plan d'action

---

## ⚠️ Important

**Les tests fonctionnels et E2E ne sont PAS des vrais tests** - ce sont des stubs créés comme placeholders.

**Ils DOIVENT être réécrits** selon les spécifications du plan de test avant d'être utilisables.

**L'infrastructure est prête** - il ne reste "que" l'implémentation du code des tests.

---

**Dernière mise à jour** : 2026-01-02
**Par** : Claude Code
**Status** : Infrastructure OK - Tests à implémenter
