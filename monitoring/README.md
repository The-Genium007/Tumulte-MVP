# Tumulte Monitoring Stack

Stack Prometheus + Grafana pour monitorer Tumulte, avec support multi-environnement via `ENV_SUFFIX`.

## Architecture

```
monitoring/
├── docker-compose.yml              # Un seul fichier, dynamique via ENV_SUFFIX
├── .env.staging                    # Variables staging
├── .env.production                 # Variables production
├── scripts/
│   └── deploy.sh                   # Script de déploiement
├── prometheus/
│   ├── prometheus.yml
│   ├── alerts.yml
│   └── targets/
│       └── apps.yml                # Généré par deploy.sh
├── grafana/
│   └── ...
└── alertmanager/
    ├── alertmanager.yml
    └── templates/
        └── discord.tmpl
```

## Quick Start

```bash
cd monitoring

# Staging
cp .env.example .env.staging
# Éditer .env.staging
./scripts/deploy.sh staging

# Production
cp .env.example .env.production
# Éditer .env.production
./scripts/deploy.sh prod
```

## Comment ça marche

Le même `docker-compose.yml` gère staging ET production grâce à `ENV_SUFFIX` :

| ENV_SUFFIX | Containers créés | Targets Prometheus |
|------------|------------------|-------------------|
| `staging` | `tumulte-grafana-staging`, `tumulte-prometheus-staging`... | `tumulte-backend-staging:3333`, `tumulte-frontend-staging:3000` |
| `prod` | `tumulte-grafana-prod`, `tumulte-prometheus-prod`... | `tumulte-backend-prod:3333`, `tumulte-frontend-prod:3000` |

Le script `deploy.sh` génère automatiquement `prometheus/targets/apps.yml` avec les bons hostnames.

## Intégration Cloudflare Tunnel

Le tunnel Cloudflare existant peut router vers les containers monitoring :

```
# Dans la config du tunnel Cloudflare :
monitoring.tumulte.app       → tumulte-grafana-prod:3000
monitoring-staging.tumulte.app → tumulte-grafana-staging:3000
```

Les containers sont sur le réseau `dokploy-network`, donc accessibles par le tunnel.

## Variables d'environnement

Crée `.env.staging` ou `.env.production` :

```bash
# Suffixe pour les noms de containers
ENV_SUFFIX=staging   # ou prod

# Grafana
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=secure_password
GRAFANA_ROOT_URL=https://monitoring-staging.tumulte.app
GRAFANA_DOMAIN=monitoring-staging.tumulte.app
GF_SECURITY_COOKIE_SECURE=true
GF_SECURITY_STRICT_TRANSPORT_SECURITY=true

# Discord webhooks
DISCORD_MONITORING_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
DISCORD_CRITICAL_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/zzz

# Exporters
DATA_SOURCE_NAME=postgresql://user:pass@db-host:5432/twitch_polls?sslmode=disable
REDIS_ADDR=redis-host:6379
REDIS_PASSWORD=

# Rétention
PROMETHEUS_RETENTION_TIME=30d
PROMETHEUS_RETENTION_SIZE=10GB
```

## Commandes

```bash
# Démarrer
./scripts/deploy.sh staging
./scripts/deploy.sh prod

# Gestion
./scripts/deploy.sh staging --down      # Arrêter
./scripts/deploy.sh staging --restart   # Redémarrer
./scripts/deploy.sh staging --logs      # Logs
./scripts/deploy.sh staging --status    # Statut
```

## Alertes Discord

Deux webhooks séparés :
- `DISCORD_MONITORING_WEBHOOK_URL` : Alertes normales (warnings)
- `DISCORD_CRITICAL_WEBHOOK_URL` : Alertes critiques (channel séparé)

### Alertes configurées

| Alerte | Condition | Sévérité |
|--------|-----------|----------|
| TumulteBackendDown | Service down > 1min | Critical |
| TumulteFrontendDown | Service down > 1min | Critical |
| HighErrorRate | > 5% erreurs 5xx | Critical |
| HighRequestLatency | p95 > 1s | Warning |
| HighCpuUsage | CPU > 80% | Warning |
| LowMemoryAvailable | RAM < 10% | Critical |
| PostgresDown | DB down | Critical |
| RedisDown | Cache down | Critical |

## Troubleshooting

### Prometheus ne scrape pas les apps

1. Vérifier que les targets sont corrects :
   ```bash
   cat prometheus/targets/apps.yml
   ```

2. Vérifier que les containers sont sur le même réseau :
   ```bash
   docker network inspect dokploy-network
   ```

3. Tester la connectivité :
   ```bash
   docker exec tumulte-prometheus-staging wget -qO- http://tumulte-backend-staging:3333/metrics
   ```

### Grafana inaccessible via tunnel

Vérifier que le tunnel Cloudflare route vers le bon hostname :
- `tumulte-grafana-staging:3000` (pas localhost)
- Le container doit être sur `dokploy-network`
