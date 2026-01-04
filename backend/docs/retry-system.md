# Retry System - Documentation Technique

## Vue d'ensemble

Le système de retry est une infrastructure agnostique et réutilisable pour gérer les erreurs transitoires lors des appels API. Il inclut:

- **Backoff exponentiel avec jitter** pour les rate limits (429)
- **Délai progressif** pour les erreurs serveur (5xx)
- **Circuit breaker** pour éviter les cascades d'échecs
- **Observabilité complète** via logs, WebSocket et base de données

## Architecture

```
                      +---------------------+
                      |   RetryUtility      |
                      | (Wrapper générique) |
                      +----------+----------+
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
+--------v--------+    +--------v--------+    +--------v--------+
| BackoffStrategy |    | CircuitBreaker  |    | RetryEventStore |
|   (Calcul délai)|    | (Redis-backed)  |    | (DB persistence)|
+-----------------+    +-----------------+    +-----------------+
```

## Fichiers

| Fichier | Description |
|---------|-------------|
| `app/services/resilience/types.ts` | Interfaces, types et policies pré-définies |
| `app/services/resilience/backoff_strategy.ts` | Calcul des délais de retry |
| `app/services/resilience/circuit_breaker.ts` | Circuit breaker Redis |
| `app/services/resilience/retry_utility.ts` | Wrapper principal |
| `app/services/resilience/retry_event_store.ts` | Persistance DB |
| `app/models/retry_event.ts` | Model Lucid |
| `app/exceptions/circuit_open_error.ts` | Exception custom |

## Utilisation

### Basique

```typescript
import { RetryUtility } from '#services/resilience/retry_utility'
import { RetryPolicies } from '#services/resilience/types'
import type { HttpCallResult } from '#services/resilience/types'

const retryUtility = new RetryUtility()

const result = await retryUtility.execute(
  async (): Promise<HttpCallResult<MyData>> => {
    const response = await fetch('https://api.example.com/data')

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: new Error(`HTTP ${response.status}`),
      }
    }

    const data = await response.json()
    return { success: true, statusCode: 200, data }
  },
  {
    ...RetryPolicies.SERVER_ERROR,
    context: { service: 'MyService', operation: 'getData' },
  }
)

if (result.success) {
  console.log('Data:', result.data)
} else {
  console.error('Failed after', result.attempts, 'attempts:', result.error)
}
```

### Avec Rate Limiting (429)

```typescript
const result = await retryUtility.execute(
  async (): Promise<HttpCallResult<void>> => {
    const response = await fetch('https://api.example.com/action', {
      method: 'POST',
    })

    // Extraire le header Retry-After pour les 429
    const retryAfter = response.headers.get('Retry-After')

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        retryAfterSeconds: retryAfter ? parseInt(retryAfter, 10) : undefined,
        error: new Error(`HTTP ${response.status}`),
      }
    }

    return { success: true, statusCode: 200 }
  },
  RetryPolicies.RATE_LIMITED
)
```

### Avec Circuit Breaker

```typescript
const result = await retryUtility.execute(operation, {
  ...RetryPolicies.TWITCH_API,
  circuitBreakerKey: 'my-service-api', // Clé unique pour ce service
})

if (result.circuitBreakerOpen) {
  console.log('Circuit breaker ouvert - requête bloquée')
}
```

## Policies Pré-définies

### RATE_LIMITED
Pour les erreurs 429 (Too Many Requests):
- Max retries: 3
- Base delay: 1000ms
- Backoff: Exponentiel avec jitter
- Délai max: 30s

### SERVER_ERROR
Pour les erreurs 5xx:
- Max retries: 3
- Base delay: 500ms
- Backoff: Progressif (500ms → 1s → 2s)
- Délai max: 4s

### TWITCH_API
Combinaison optimisée pour l'API Twitch:
- Max retries: 3
- Base delay: 500ms
- Backoff: Exponentiel
- Erreurs retryables: 429, 500, 502, 503, 504
- Circuit breaker: activé (clé: 'twitch-api')
- Timeout par tentative: 10s
- Délai max: 30s

## Circuit Breaker

### États

1. **CLOSED** (Normal)
   - Toutes les requêtes passent
   - Les échecs sont comptés

2. **OPEN** (Bloqué)
   - Activé après N échecs consécutifs (défaut: 5)
   - Toutes les requêtes sont rejetées immédiatement
   - Durée: 30 secondes par défaut

3. **HALF_OPEN** (Test)
   - Après le timeout, 1-2 requêtes sont autorisées
   - Succès → retour à CLOSED
   - Échec → retour à OPEN

### Configuration

```typescript
const retryUtility = new RetryUtility({
  failureThreshold: 5,    // Échecs avant ouverture
  resetTimeoutMs: 30000,  // Durée OPEN
  successThreshold: 2,    // Succès pour refermer
})
```

### Clés Redis

```
circuit:{key}:state       → 'CLOSED' | 'OPEN' | 'HALF_OPEN'
circuit:{key}:failures    → compteur échecs
circuit:{key}:successes   → compteur succès (half-open)
circuit:{key}:openedAt    → timestamp ouverture
```

## Backoff Strategies

### Exponentiel avec Jitter

```
delay = baseDelay × 2^attempt + random(0, 1000)
```

Exemple avec baseDelay=500ms:
- Tentative 1: 500-1500ms
- Tentative 2: 1000-2000ms
- Tentative 3: 2000-3000ms

### Progressif

```
delay = baseDelay × (attempt + 1)
```

Exemple avec baseDelay=500ms:
- Tentative 1: 500ms
- Tentative 2: 1000ms
- Tentative 3: 1500ms

### Retry-After Header

Si l'API retourne un header `Retry-After`, ce délai est utilisé en priorité (converti en millisecondes).

## Observabilité

### Logs

Chaque tentative et résultat final est loggé via `@adonisjs/core/services/logger`:

```
[INFO] RetryUtility: Attempt 1/4 for TwitchPollService:createPoll
[WARN] RetryUtility: Attempt 2/4 failed (429), retrying in 1523ms
[INFO] RetryUtility: Success after 2 attempts (1845ms total)
```

### WebSocket

Notifications temps réel vers le MJ via le canal `campaign:{id}:notifications`:

```typescript
// Événements émis
'api:retry'           // À chaque tentative
'api:retry-success'   // Succès après retry(s)
'api:retry-exhausted' // Échec définitif
```

### Base de données

Les événements sont persistés dans la table `retry_events` pour analytics:

```typescript
interface RetryEvent {
  id: string
  service: string           // Ex: 'TwitchPollService'
  operation: string         // Ex: 'createPoll'
  attempts: number
  success: boolean
  totalDurationMs: number
  finalStatusCode: number | null
  errorMessage: string | null
  circuitBreakerTriggered: boolean
  circuitBreakerKey: string | null
  metadata: Record<string, unknown> | null
  streamerId: string | null
  campaignId: string | null
  pollInstanceId: string | null
  createdAt: DateTime
}
```

## RetryResult

Structure retournée par `execute()`:

```typescript
interface RetryResult<T> {
  success: boolean
  data?: T                          // Données si succès
  error?: Error                     // Erreur si échec
  attempts: number                  // Nombre de tentatives
  totalDurationMs: number           // Durée totale
  circuitBreakerOpen: boolean       // Si bloqué par circuit breaker
  attemptDetails: AttemptDetail[]   // Détail de chaque tentative
}

interface AttemptDetail {
  attempt: number
  statusCode?: number
  errorMessage?: string
  delayMs: number                   // Délai avant cette tentative
  durationMs: number                // Durée de cette tentative
  timestamp: Date
  usedRetryAfter: boolean
}
```

## Intégration avec Token Refresh

Pour les APIs nécessitant un refresh de token (401), combiner avec `withTokenRefresh`:

```typescript
async withTokenRefreshAndRetry<T>(
  operation: (accessToken: string) => Promise<HttpCallResult<T>>,
  getAccessToken: () => Promise<string>,
  refreshToken: string,
  onTokenRefreshed: (newAccess: string, newRefresh: string) => Promise<void>,
  retryOptions: RetryOptions
): Promise<RetryResult<T>> {
  // 1. Tente l'opération avec retry
  // 2. Sur 401, refresh le token et réessaye
  // 3. Autres erreurs gérées par RetryUtility
}
```

## Tests

Les tests unitaires couvrent:

- `backoff_strategy.spec.ts`: Calcul des délais
- `circuit_breaker.spec.ts`: États et transitions
- `retry_utility.spec.ts`: Retry logic complète

Exécuter:
```bash
npm run test:unit -- --files="tests/unit/services/resilience/**"
```

## Bonnes Pratiques

1. **Toujours définir un contexte** pour le logging/tracking
2. **Utiliser des clés circuit breaker distinctes** par service/endpoint
3. **Respecter les headers Retry-After** des APIs
4. **Ne pas retry les erreurs client** (4xx sauf 429)
5. **Monitorer les retry_events** pour détecter les problèmes récurrents
6. **Configurer des alertes** sur les circuit breakers ouverts
