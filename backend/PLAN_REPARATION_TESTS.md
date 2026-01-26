# Plan de Réparation des Tests Échoués

## Résumé des Échecs

| Suite | Passés | Échoués | Total |
|-------|--------|---------|-------|
| Unit | 415 | 16 | 431 |
| Functional | 179 | 9 | 188 |

---

## Tests Unitaires Échoués (16)

### Catégorie 1: Mauvais noms de propriétés de modèles (4 tests)

**Problème**: Les tests utilisent des noms de colonnes incorrects

#### 1.1 AuthProvider - `providerId` vs `providerUserId`
- **Fichier**: `tests/unit/models/user.spec.ts`
- **Tests affectés**:
  - `User Model - hasAuthProvider / should return true when provider exists`
  - `User Model - getAuthProvider / should return auth provider when exists`
- **Erreur**: `Cannot define "providerId" on "AuthProvider" model`
- **Correction**: Remplacer `providerId` par `providerUserId`

```typescript
// Avant
await AuthProvider.create({
  userId: user.id,
  provider: 'google',
  providerId: 'google-123',        // ❌ Incorrect
  providerEmail: 'oauth@gmail.com',
})

// Après
await AuthProvider.create({
  userId: user.id,
  provider: 'google',
  providerUserId: 'google-123',    // ✅ Correct
  providerEmail: 'oauth@gmail.com',
})
```

#### 1.2 TokenRevocationList - `tokenId` vs `jti`
- **Fichier**: `tests/unit/services/vtt/vtt_websocket_service.spec.ts`
- **Tests affectés**:
  - `VttWebSocketService - JWT Token Validation Logic / should detect revoked tokens via TokenRevocationList`
- **Erreur**: `Cannot define "tokenId" on "TokenRevocationList" model`
- **Correction**: Utiliser la méthode statique `revokeToken()` ou les bons noms de colonnes (`jti`, `tokenType`, etc.)

---

### Catégorie 2: Configuration ADMIN_EMAILS manquante (4 tests)

**Problème**: `process.env.ADMIN_EMAILS` n'est pas persisté correctement entre les assertions

- **Fichier**: `tests/unit/models/user.spec.ts`
- **Tests affectés**:
  - `User Model - isAdmin / should return true when user email matches ADMIN_EMAILS`
  - `User Model - isAdmin / should be case insensitive`
  - `User Model - isPremium / should return true for admin users`
  - `User Model - getEffectiveTier / should return admin for admin users`
- **Erreur**: `expected false to be true` ou `expected 'free' to equal 'admin'`
- **Cause**: Le modèle User lit `env.get('ADMIN_EMAILS')` via le service AdonisJS `env`, pas `process.env`
- **Correction**: Utiliser `app.container.use('Adonis/Core/Env')` ou mocker le service env

```typescript
// Solution: Utiliser stub ou importer env correctement
import env from '#start/env'

// Dans le test
const originalGet = env.get.bind(env)
env.get = (key: string, defaultValue?: string) => {
  if (key === 'ADMIN_EMAILS') return 'admin@example.com'
  return originalGet(key, defaultValue)
}
```

---

### Catégorie 3: Valeurs null vs undefined (4 tests)

**Problème**: Les tests attendent `null` mais reçoivent `undefined`

- **Fichiers**:
  - `tests/unit/models/user.spec.ts` - `markEmailAsVerified`
  - `tests/unit/models/subscription.spec.ts` - `Lemon Squeezy IDs`
  - `tests/unit/repositories/notification_preference_repository.spec.ts`
  - `tests/unit/repositories/push_subscription_repository.spec.ts`
- **Erreur**: `expected undefined to equal null`
- **Correction**: Changer `assert.isNull()` en `assert.notExists()` ou vérifier le comportement réel

```typescript
// Avant
assert.isNull(subscription.lemonSqueezySubscriptionId)

// Après (si la valeur peut être undefined)
assert.notExists(subscription.lemonSqueezySubscriptionId)
// ou
assert.oneOf(subscription.lemonSqueezySubscriptionId, [null, undefined])
```

---

### Catégorie 4: Gestion d'erreurs - doesNotReject (4 tests)

**Problème**: Les tests vérifient qu'une fonction ne throw pas, mais elle throw

- **Fichiers**:
  - `tests/unit/services/vtt/vtt_websocket_service.spec.ts`
  - `tests/unit/repositories/push_subscription_repository.spec.ts`
- **Tests affectés**:
  - `should handle non-existent connection gracefully`
  - `should handle deletion of non-existent ID gracefully`
- **Erreur**: `expected [AsyncFunction] to not throw an error but error was thrown`
- **Correction**: Soit modifier le test pour attendre une erreur, soit vérifier que le code gère bien les cas d'erreur

```typescript
// Option 1: Si l'erreur est attendue
await assert.rejects(async () => {
  await service.revokeConnection('non-existent-id', 'reason')
}, { message: /not found/i })

// Option 2: Si le code doit être silencieux
// Vérifier l'implémentation et potentiellement ajouter un try/catch
```

---

## Tests Fonctionnels Échoués (9)

### Catégorie 5: Routes Health protégées par authentification (5 tests)

**Problème**: Les routes `/health/details` requièrent maintenant une authentification

- **Fichier**: `tests/functional/health/health_controller.spec.ts`
- **Tests affectés**:
  - `should return detailed health info`
  - `should include service statuses`
  - `should include instance info`
  - `should include latency for services`
  - `should set X-Health-Check-Duration-Ms header`
- **Erreur**: `expected 401 to be one of [ 200, 503 ]`
- **Correction**: Soit ajouter l'authentification aux tests, soit vérifier si la route doit être publique

```typescript
// Si la route doit être authentifiée
test('should return detailed health info', async ({ assert, client }) => {
  const { token } = await createAuthenticatedUser()
  const response = await client
    .get('/health/details')
    .header('Authorization', `Bearer ${token}`)
  // ...
})

// Si la route doit être publique, vérifier les routes
// router.get('/health/details', ...).middleware(['auth']) ← retirer middleware
```

### Catégorie 6: Route VAPID publique retourne 401 (1 test)

- **Fichier**: `tests/functional/notifications/notifications_controller.spec.ts`
- **Test**: `should return VAPID public key when configured`
- **Erreur**: `expected 401 to equal 503`
- **Correction**: La route `/notifications/vapid-public-key` nécessite auth ou doit être publique

### Catégorie 7: Erreur 500 au lieu de 404/422 (2 tests)

- **Fichier**: `tests/functional/auth/register_controller.spec.ts`
- **Tests**:
  - `should reject invalid email format` - attendu 422, reçu 500
  - `should reject missing required fields` - attendu 422, reçu 500
- **Cause**: Exception non gérée dans la validation
- **Correction**: Vérifier les validators et les handlers d'erreur

- **Fichier**: `tests/functional/notifications/notifications_controller.spec.ts`
- **Test**: `should return 404 for non-existent subscription`
- **Erreur**: `expected 500 to equal 404`
- **Cause**: Exception non gérée quand l'ID n'existe pas

---

## Plan d'Exécution

### Phase 1: Corrections rapides (propriétés de modèles)
1. [ ] Corriger `providerId` → `providerUserId` dans user.spec.ts
2. [ ] Corriger la création de TokenRevocationList dans vtt_websocket_service.spec.ts

### Phase 2: Corrections d'assertions null/undefined
3. [ ] Changer `assert.isNull()` en `assert.notExists()` où approprié
4. [ ] Vérifier le comportement réel des propriétés Lemon Squeezy

### Phase 3: Correction des tests Admin
5. [ ] Investiguer comment mocker `env.get('ADMIN_EMAILS')` correctement
6. [ ] Appliquer la correction aux 4 tests concernés

### Phase 4: Correction des tests de gestion d'erreur
7. [ ] Revoir `doesNotReject` → ajuster les assertions ou le code

### Phase 5: Tests fonctionnels
8. [ ] Vérifier si `/health/details` doit être public ou protégé
9. [ ] Ajouter auth si nécessaire ou retirer le middleware
10. [ ] Corriger les erreurs 500 dans register_controller
11. [ ] Corriger l'erreur 500 pour non-existent subscription

---

## Fichiers à Modifier

| Fichier | Modifications |
|---------|---------------|
| `tests/unit/models/user.spec.ts` | providerId → providerUserId, mock env |
| `tests/unit/models/subscription.spec.ts` | null vs undefined |
| `tests/unit/services/vtt/vtt_websocket_service.spec.ts` | tokenId → jti, doesNotReject |
| `tests/unit/repositories/push_subscription_repository.spec.ts` | null vs undefined |
| `tests/unit/repositories/notification_preference_repository.spec.ts` | null vs undefined |
| `tests/functional/health/health_controller.spec.ts` | Ajouter auth ou vérifier routes |
| `tests/functional/notifications/notifications_controller.spec.ts` | Vérifier route VAPID |
| `tests/functional/auth/register_controller.spec.ts` | Vérifier validator |

---

## Temps Estimé
- Phase 1: ~15 min
- Phase 2: ~10 min
- Phase 3: ~20 min
- Phase 4: ~15 min
- Phase 5: ~30 min

**Total estimé: ~1h30**
