# Plan de Résilience Backend - Tumulte

> **Objectif**: Supporter 10 000+ utilisateurs simultanés sur Docker Swarm avec haute disponibilité.

## ✅ Implémentation Complète (25 janvier 2025)

Toutes les phases ont été implémentées. Voici les fichiers créés/modifiés :

### Fichiers Créés
- `app/services/auth/session_service.ts` - Gestion des sessions Redis (logout global)
- `app/services/monitoring/metrics_service.ts` - Métriques Prometheus
- `app/services/cache/cache_warmer.ts` - Cache warming au démarrage
- `app/controllers/health_controller.ts` - Health checks détaillés
- `app/controllers/metrics_controller.ts` - Endpoint /metrics
- `app/middleware/request_id_middleware.ts` - Request ID pour tracing

### Fichiers Modifiés
- `bin/server.ts` - Redis adapter pour Socket.IO + cache warming
- `config/session.ts` - Support Redis store
- `config/database.ts` - Connection pooling PostgreSQL
- `start/env.ts` - Nouvelles variables (DB_POOL_*, SESSION_DRIVER=redis)
- `start/kernel.ts` - Request ID middleware
- `start/routes.ts` - Routes health et metrics
- `app/middleware/security_headers_middleware.ts` - Headers sécurité améliorés
- `Dockerfile` - Build pré-compilé multi-stage
- `docker-entrypoint.sh` - Support build JS
- `package.json` - Nouvelles dépendances

### Variables d'Environnement à Ajouter
```env
# Sessions Redis (OBLIGATOIRE pour multi-instance)
SESSION_DRIVER=redis

# Database Pool (ajuster selon replicas)
DB_POOL_MIN=2
DB_POOL_MAX=20
```

---

## État Actuel

### ✅ Points Forts (déjà implémentés)

| Aspect | Score | Fichiers |
|--------|-------|----------|
| **Architecture en couches** | 9/10 | Controller → Service → Repository → Model |
| **Rate Limiting** | 10/10 | `middleware/rate_limit_middleware.ts` - Granulaire par endpoint |
| **Auth Lockout** | 10/10 | `middleware/auth_lockout_middleware.ts` - Progression exponentielle |
| **Circuit Breakers** | 9/10 | `services/resilience/circuit_breaker.ts` - Lua atomique |
| **Retry avec Backoff** | 9/10 | `services/resilience/backoff_strategy.ts` |
| **Health Checks** | 9/10 | `services/core/health_check_service.ts` |
| **Graceful Shutdown** | 8/10 | `bin/server.ts` + dumb-init |
| **Cache Redis** | 9/10 | `services/cache/redis_service.ts` - TTLs différenciés |
| **Docker Config** | 8/10 | Multi-stage, non-root, healthchecks |

### ❌ Blocages Critiques

| Problème | Impact | Fichier concerné |
|----------|--------|------------------|
| **WebSocket sans Redis Adapter** | Messages non partagés entre instances | `bin/server.ts` |
| **Sessions Cookie-only** | Impossible de révoquer les sessions | `config/session.ts` |
| **PostgreSQL sans pooling** | Saturation connexions multi-instance | `config/database.ts` |
| **Pas d'observabilité** | Aucune métrique en production | - |

---

## Phase 1: Prérequis Multi-Instance (CRITIQUE)

> **Durée estimée**: 4-5 heures
> **Priorité**: BLOQUANT pour le scaling horizontal

### 1.1 Redis Adapter pour Socket.IO

**Problème**: Chaque instance gère ses propres WebSockets. Un client connecté à l'instance A ne reçoit jamais les messages émis par l'instance B.

**Solution**: Ajouter `@socket.io/redis-adapter` pour synchroniser les événements via Redis Pub/Sub.

**Fichiers à modifier**:
- `backend/package.json` - Ajouter dépendance
- `backend/bin/server.ts` - Configurer l'adapter

**Implémentation**:

```bash
npm install @socket.io/redis-adapter
```

```typescript
// bin/server.ts
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

// Créer clients Redis dédiés pour pub/sub
const pubClient = createClient({
  url: `redis://${env.get('REDIS_HOST')}:${env.get('REDIS_PORT')}`,
  password: env.get('REDIS_PASSWORD') || undefined,
})
const subClient = pubClient.duplicate()

await Promise.all([pubClient.connect(), subClient.connect()])

const io = new Server(httpServer, {
  cors: { origin: env.get('FRONTEND_URL') },
  transports: ['websocket', 'polling'],
  adapter: createAdapter(pubClient, subClient), // ← AJOUT
})

// Graceful shutdown
app.terminating(async () => {
  await pubClient.quit()
  await subClient.quit()
})
```

**Test de validation**:
```bash
# Lancer 2 instances et vérifier que les messages sont reçus sur les deux
BACKEND_REPLICAS=2 docker stack deploy -c docker-compose.yml tumulte
```

---

### 1.2 Sessions Redis (Logout Global)

**Problème**: Les sessions cookie-only ne peuvent pas être révoquées côté serveur.

**Solution**: Migrer vers Redis session store.

**Fichiers à modifier**:
- `backend/config/session.ts` - Changer le store
- `backend/app/controllers/auth/session_controller.ts` - Ajouter logout global

**Implémentation**:

```typescript
// config/session.ts
import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  enabled: true,
  cookieName: 'tumulte-session',
  clearWithBrowser: false,
  age: '7 days',
  cookie: {
    path: '/',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: app.inProduction ? 'none' : 'lax',
  },
  store: 'redis', // ← CHANGEMENT
  stores: {
    cookie: stores.cookie(),
    redis: stores.redis({
      connection: 'main',
      keyPrefix: 'session:', // Préfixe pour identifier les sessions
    }),
  },
})
```

**Fonctionnalités ajoutées**:

```typescript
// services/auth/session_service.ts
export class SessionService {
  constructor(private redis: RedisService) {}

  /**
   * Déconnecte toutes les sessions d'un utilisateur
   * Utile après changement de mot de passe ou compromission
   */
  async revokeAllSessions(userId: number): Promise<number> {
    const pattern = `session:user:${userId}:*`
    const keys = await this.redis.keys(pattern)

    if (keys.length > 0) {
      await this.redis.del(...keys)
    }

    return keys.length
  }

  /**
   * Liste les sessions actives d'un utilisateur
   */
  async getActiveSessions(userId: number): Promise<SessionInfo[]> {
    const pattern = `session:user:${userId}:*`
    const keys = await this.redis.keys(pattern)

    return Promise.all(keys.map(async (key) => {
      const data = await this.redis.get(key)
      return {
        sessionId: key.split(':').pop(),
        ...JSON.parse(data),
      }
    }))
  }
}
```

---

### 1.3 PostgreSQL Connection Pooling

**Problème**: Configuration par défaut (5-10 connexions). Avec 3 instances × 10 = 30 connexions minimum.

**Solution**: Configurer le pool explicitement.

**Fichier à modifier**: `backend/config/database.ts`

**Implémentation**:

```typescript
// config/database.ts
const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      pool: {
        min: 2,                          // Connexions minimum par instance
        max: env.get('DB_POOL_MAX', 20), // Maximum par instance
        acquireTimeoutMillis: 30000,     // Timeout acquisition connexion
        createTimeoutMillis: 30000,      // Timeout création connexion
        destroyTimeoutMillis: 5000,      // Timeout destruction
        idleTimeoutMillis: 30000,        // Fermer après 30s d'inactivité
        reapIntervalMillis: 1000,        // Vérifier connexions mortes
        createRetryIntervalMillis: 200,  // Retry création
      },
      healthCheck: true,                  // Vérifier connexions avant usage
      debug: env.get('NODE_ENV') === 'development',
    },
  },
})
```

**Variables d'environnement à ajouter**:

```env
# Database Pool (ajuster selon nombre de replicas)
# Formule: DB_POOL_MAX × REPLICAS < max_connections PostgreSQL
DB_POOL_MAX=20
```

**Calcul recommandé**:
- PostgreSQL default: 100 connexions max
- Avec 3 replicas: `DB_POOL_MAX=25` (75 connexions utilisées, 25 réservées pour admin)
- Avec 5 replicas: `DB_POOL_MAX=15` (75 connexions utilisées)

---

## Phase 2: Observabilité (IMPORTANT)

> **Durée estimée**: 4-5 heures
> **Priorité**: Haute - Nécessaire pour débugger en production

### 2.1 Endpoint Prometheus Metrics

**Objectif**: Exposer les métriques au format Prometheus pour Grafana.

**Fichiers à créer**:
- `backend/app/services/monitoring/metrics_service.ts`
- `backend/app/controllers/metrics_controller.ts`

**Dépendance**:
```bash
npm install prom-client
```

**Implémentation**:

```typescript
// services/monitoring/metrics_service.ts
import client, { Registry, Counter, Histogram, Gauge } from 'prom-client'

export class MetricsService {
  private registry: Registry

  // Compteurs
  public httpRequestsTotal: Counter
  public httpRequestDuration: Histogram
  public websocketConnectionsTotal: Gauge
  public pollsLaunchedTotal: Counter
  public votesReceivedTotal: Counter

  // Gauges (valeurs instantanées)
  public activePolls: Gauge
  public connectedStreamers: Gauge
  public redisConnectionsActive: Gauge
  public dbConnectionsActive: Gauge
  public dbConnectionsIdle: Gauge

  constructor() {
    this.registry = new Registry()

    // Métriques par défaut (CPU, RAM, event loop)
    client.collectDefaultMetrics({ register: this.registry })

    // HTTP
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    })

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    })

    // WebSocket
    this.websocketConnectionsTotal = new Gauge({
      name: 'websocket_connections_total',
      help: 'Current WebSocket connections',
      registers: [this.registry],
    })

    // Business metrics
    this.pollsLaunchedTotal = new Counter({
      name: 'polls_launched_total',
      help: 'Total polls launched',
      registers: [this.registry],
    })

    this.votesReceivedTotal = new Counter({
      name: 'votes_received_total',
      help: 'Total votes received',
      labelNames: ['campaign_id'],
      registers: [this.registry],
    })

    this.activePolls = new Gauge({
      name: 'active_polls',
      help: 'Currently active polls',
      registers: [this.registry],
    })

    // Database
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Active database connections',
      registers: [this.registry],
    })

    this.dbConnectionsIdle = new Gauge({
      name: 'db_connections_idle',
      help: 'Idle database connections',
      registers: [this.registry],
    })
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics()
  }
}
```

**Route**:

```typescript
// routes.ts
router.get('/metrics', [metricsController, 'index'])
  .use(middleware.auth()) // Protéger l'endpoint
```

### 2.2 Health Check Détaillé

**Objectif**: Endpoint `/health/details` pour debugging.

**Fichier à modifier**: `backend/start/routes.ts`

```typescript
// Route publique simple (pour Docker/Swarm)
router.get('/health', ({ response }) => {
  return response.ok({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

// Route détaillée (protégée)
router.get('/health/details', [healthController, 'details'])
  .use(middleware.auth())
```

**Réponse détaillée**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "connected",
      "pool": {
        "total": 20,
        "active": 5,
        "idle": 15
      },
      "latency_ms": 2
    },
    "redis": {
      "status": "connected",
      "latency_ms": 1,
      "memory_used": "50MB"
    },
    "twitch_api": {
      "status": "available",
      "latency_ms": 150
    }
  },
  "instance": {
    "id": "backend-1",
    "memory": {
      "used": "256MB",
      "total": "512MB"
    },
    "cpu": "15%"
  }
}
```

---

## Phase 3: Performance (OPTIMISATION)

> **Durée estimée**: 4-5 heures
> **Priorité**: Moyenne - Améliore les performances

### 3.1 Pre-build TypeScript

**Problème actuel**: Le serveur transpile TypeScript à chaque démarrage (`ts-node`).

**Solution**: Builder en JavaScript pour la production.

**Fichiers à modifier**:
- `backend/Dockerfile`
- `backend/package.json`

**Implémentation**:

```dockerfile
# Dockerfile - Nouveau stage de build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # Compile TS → JS

FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init curl
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production
CMD ["node", "build/bin/server.js"]  # ← JS directement
```

**Avantages**:
- Démarrage ~5x plus rapide
- Moins de RAM utilisée
- Erreurs de compilation détectées au build, pas au runtime

### 3.2 Cache Warming au Démarrage

**Objectif**: Pré-charger les données fréquemment accédées.

**Fichier à créer**: `backend/app/services/cache/cache_warmer.ts`

```typescript
// services/cache/cache_warmer.ts
export class CacheWarmer {
  constructor(
    private redis: RedisService,
    private campaignRepo: CampaignRepository,
    private streamerRepo: StreamerRepository
  ) {}

  async warmup(): Promise<void> {
    logger.info('[CacheWarmer] Starting cache warmup...')

    const start = Date.now()

    await Promise.all([
      this.warmActiveCampaigns(),
      this.warmActiveStreamers(),
      this.warmPollTemplates(),
    ])

    logger.info(`[CacheWarmer] Warmup completed in ${Date.now() - start}ms`)
  }

  private async warmActiveCampaigns(): Promise<void> {
    // Charger les campagnes avec sessions actives récentes
    const campaigns = await this.campaignRepo.findActiveRecent(30) // 30 derniers jours

    for (const campaign of campaigns) {
      await this.redis.set(
        `campaign:${campaign.id}`,
        JSON.stringify(campaign),
        'EX',
        3600 // 1 heure
      )
    }

    logger.info(`[CacheWarmer] Warmed ${campaigns.length} campaigns`)
  }

  private async warmActiveStreamers(): Promise<void> {
    // Charger les streamers actifs (tokens valides)
    const streamers = await this.streamerRepo.findWithValidTokens()

    for (const streamer of streamers) {
      await this.redis.set(
        `streamer:${streamer.id}:info`,
        JSON.stringify(streamer),
        'EX',
        3600
      )
    }

    logger.info(`[CacheWarmer] Warmed ${streamers.length} streamers`)
  }
}
```

**Intégration au démarrage**:

```typescript
// bin/server.ts
await app.start()

// Warmup après démarrage (non-bloquant)
const cacheWarmer = await app.container.make(CacheWarmer)
cacheWarmer.warmup().catch((err) => {
  logger.error('[CacheWarmer] Warmup failed', err)
})
```

---

## Phase 4: Sécurité Additionnelle (RECOMMANDÉ)

> **Durée estimée**: 2-3 heures
> **Priorité**: Moyenne

### 4.1 Helmet Security Headers

```bash
npm install helmet
```

```typescript
// start/kernel.ts
import helmet from 'helmet'

server.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Pour Twitch embed si nécessaire
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://static-cdn.jtvnw.net"],
      connectSrc: ["'self'", "wss:", env.get('FRONTEND_URL')],
    },
  },
  crossOriginEmbedderPolicy: false, // Pour Twitch iframe
}))
```

### 4.2 Request ID pour Tracing

```typescript
// middleware/request_id_middleware.ts
import { randomUUID } from 'crypto'

export default class RequestIdMiddleware {
  async handle({ request, response }, next) {
    const requestId = request.header('X-Request-ID') || randomUUID()

    // Ajouter au contexte pour les logs
    request.requestId = requestId
    response.header('X-Request-ID', requestId)

    await next()
  }
}
```

---

## Checklist de Déploiement

### Avant le Passage en Multi-Instance

- [ ] Redis Adapter Socket.IO configuré et testé
- [ ] Sessions Redis fonctionnelles
- [ ] Connection pooling PostgreSQL configuré
- [ ] Variables d'environnement ajoutées (`DB_POOL_MAX`)
- [ ] Test de charge avec 2+ replicas

### Monitoring Minimum

- [ ] Endpoint `/metrics` accessible
- [ ] Grafana dashboard configuré (optionnel mais recommandé)
- [ ] Alertes sur erreurs 5xx (optionnel)

### Tests de Validation

```bash
# 1. Test multi-instance WebSocket
# Ouvrir 2 navigateurs, connecter à différentes instances
# Lancer un poll → les deux doivent recevoir les updates

# 2. Test logout global
# Se connecter sur 2 appareils
# Révoquer toutes les sessions
# Vérifier que les 2 sont déconnectés

# 3. Test de charge
# Utiliser k6 ou artillery pour simuler 10k connexions
k6 run --vus 1000 --duration 5m load-test.js
```

---

## Architecture Cible

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (CDN + WAF)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     Traefik     │
                    │  (Load Balancer)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│   Backend 1   │   │   Backend 2   │   │   Backend 3   │
│   (Replica)   │   │   (Replica)   │   │   (Replica)   │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
      ┌───────▼───────┐            ┌───────▼───────┐
      │     Redis     │            │  PostgreSQL   │
      │  (Sessions +  │            │   (Database)  │
      │   Pub/Sub)    │            │               │
      └───────────────┘            └───────────────┘
```

---

## Ressources

- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [AdonisJS Redis Sessions](https://docs.adonisjs.com/guides/session#redis-store)
- [Prometheus Node.js Client](https://github.com/siimon/prom-client)
- [Docker Swarm Best Practices](https://docs.docker.com/engine/swarm/swarm-tutorial/)
