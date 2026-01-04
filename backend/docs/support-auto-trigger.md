# Système de Support Automatique sur Erreur

## Vue d'ensemble

Le système de support automatique détecte les erreurs utilisateur et ouvre automatiquement le widget de support avec un message pré-rempli. Conçu pour la phase Alpha, il capture un maximum de bugs pour améliorer la qualité de l'application.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                                                                       │
│  ┌──────────────────┐    ┌─────────────────────┐                     │
│  │ Error Sources    │───▶│ useSupportTrigger   │                     │
│  │ (stores/API)     │    │ - Rate limiting     │                     │
│  └──────────────────┘    │ - Message mapping   │                     │
│                          └──────────┬──────────┘                     │
│                                     │                                 │
│                                     ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ useSupportWidget                                             │     │
│  │ + prefillMessage, prefillActionType, openWithPrefill()       │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                     │                                 │
│                                     ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ SupportWidget.vue                                            │     │
│  │ + Badge type d'erreur, message pré-rempli                    │     │
│  └──────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                    POST /support/report + GET /support/logs
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│                                                                       │
│  ┌──────────────────────────┐    ┌──────────────────────────┐       │
│  │ SupportController        │    │ BackendLogService        │       │
│  │ + getLogs()              │    │ - Redis circular buffer  │       │
│  └──────────────────────────┘    └──────────────────────────┘       │
│                                                                       │
│  ┌──────────────────────────┐                                        │
│  │ TracingMiddleware        │                                        │
│  │ + Push logs to Redis     │                                        │
│  └──────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Composants Backend

### BackendLogService

Service Redis pour stocker les logs utilisateur avec buffer circulaire.

**Fichier**: `app/services/support/backend_log_service.ts`

```typescript
import { BackendLogService } from '#services/support/backend_log_service'

const service = new BackendLogService()

// Ajouter un log
await service.pushLog(userId, {
  timestamp: new Date().toISOString(),
  requestId: 'req-123',
  method: 'GET',
  url: '/api/campaigns',
  statusCode: 200,
  durationMs: 50,
  level: 'info',
})

// Récupérer les logs (50 par défaut)
const logs = await service.getUserLogs(userId, 50)

// Effacer les logs (ex: suppression de compte)
await service.clearUserLogs(userId)
```

**Configuration Redis**:
- Clé: `support:logs:user:{userId}`
- TTL: 1 heure (3600 secondes)
- Max logs: 100 par utilisateur (buffer circulaire)

### TracingMiddleware

Capture automatiquement les requêtes et les pousse vers Redis.

**Fichier**: `app/middleware/tracing_middleware.ts`

Le middleware capture:
- Request ID
- Méthode HTTP
- URL
- Code de statut
- Durée (ms)
- Message d'erreur (si applicable)

### SupportController.getLogs()

Endpoint pour récupérer les logs utilisateur.

**Route**: `GET /api/v2/support/logs`

**Query params**:
- `limit`: Nombre de logs (défaut: 50, max: 100)

**Réponse**:
```json
{
  "data": {
    "logs": [
      {
        "timestamp": "2026-01-04T20:00:00.000Z",
        "requestId": "req-123",
        "method": "GET",
        "url": "/api/campaigns",
        "statusCode": 200,
        "durationMs": 50,
        "level": "info"
      }
    ],
    "userContext": {
      "userId": 1,
      "role": "MJ",
      "displayName": "TestUser"
    }
  }
}
```

## Types d'actions supportés

Le système supporte 60+ types d'actions répartis en catégories:

| Catégorie | Exemples |
|-----------|----------|
| auth | `auth_login`, `auth_callback`, `auth_logout` |
| campaign | `campaign_fetch`, `campaign_create`, `campaign_delete` |
| session | `session_launch`, `session_close` |
| poll | `poll_launch`, `poll_cancel`, `poll_fetch_results` |
| push | `push_subscribe`, `push_unsubscribe` |
| websocket | `websocket_connect`, `websocket_reconnect` |
| generic | `generic_server_error`, `generic_network_error`, `generic_timeout` |

Voir `frontend/utils/supportErrorMessages.ts` pour la liste complète.

## Rate Limiting

- **Frontend**: 1 ouverture automatique par minute
- **Backend**: Logs limités à 100 par utilisateur avec TTL 1h

## Tests

```bash
# Tests unitaires backend
npm run test -- --files="tests/unit/services/support/backend_log_service.spec.ts"

# Tests fonctionnels backend
npm run test -- --files="tests/functional/support/logs.spec.ts"
```

## Sécurité

- Authentification requise pour `/support/logs`
- Logs isolés par utilisateur
- Pas de données sensibles (tokens, passwords) dans les logs
- TTL automatique pour nettoyage
