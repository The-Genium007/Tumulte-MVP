# Tumulte Monitoring Stack

Configuration Prometheus + Grafana pour monitorer l'application Tumulte.

## Structure des fichiers

```
monitoring/
├── docker-compose.yml          # Référence pour les containers
├── prometheus/
│   ├── prometheus.yml          # Config principale Prometheus
│   └── alerts.yml              # Règles d'alertes
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/        # Config auto des datasources
│   │   └── dashboards/         # Config auto des dashboards
│   └── dashboards/
│       └── tumulte-overview.json
└── alertmanager/
    └── alertmanager.yml        # Config des notifications
```

---

## Guide de démarrage

### Étape 1 : Créer le fichier .env

Crée un fichier `.env` dans ce dossier avec :

```bash
# GRAFANA
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=ton_mot_de_passe_secure
GRAFANA_ROOT_URL=http://localhost:3001

# POSTGRESQL EXPORTER
DATA_SOURCE_NAME=postgresql://USER:PASS@HOST:5432/twitch_polls?sslmode=disable

# REDIS EXPORTER
REDIS_ADDR=host.docker.internal:6379
REDIS_PASSWORD=ton_redis_password
```

### Étape 2 : Lancer les containers

**Option A : Docker Compose (tout automatique)**
```bash
cd monitoring
docker compose up -d
```

**Option B : Manuellement (si tu préfères)**

1. **Prometheus** :
```bash
docker run -d \
  --name tumulte-prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro \
  -v $(pwd)/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro \
  --add-host=host.docker.internal:host-gateway \
  prom/prometheus:v2.51.0 \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.retention.time=30d
```

2. **Grafana** :
```bash
docker run -d \
  --name tumulte-grafana \
  -p 3001:3000 \
  -v $(pwd)/grafana/provisioning:/etc/grafana/provisioning:ro \
  -v $(pwd)/grafana/dashboards:/var/lib/grafana/dashboards:ro \
  -e GF_SECURITY_ADMIN_USER=admin \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:10.4.1
```

3. **Node Exporter** (métriques système) :
```bash
docker run -d \
  --name tumulte-node-exporter \
  -p 9100:9100 \
  -v /proc:/host/proc:ro \
  -v /sys:/host/sys:ro \
  prom/node-exporter:v1.7.0 \
  --path.procfs=/host/proc \
  --path.sysfs=/host/sys
```

4. **Postgres Exporter** :
```bash
docker run -d \
  --name tumulte-postgres-exporter \
  -p 9187:9187 \
  -e DATA_SOURCE_NAME="postgresql://user:pass@host:5432/db?sslmode=disable" \
  --add-host=host.docker.internal:host-gateway \
  prometheuscommunity/postgres-exporter:v0.15.0
```

5. **Redis Exporter** :
```bash
docker run -d \
  --name tumulte-redis-exporter \
  -p 9121:9121 \
  -e REDIS_ADDR="host.docker.internal:6379" \
  --add-host=host.docker.internal:host-gateway \
  oliver006/redis_exporter:v1.58.0
```

### Étape 3 : Vérifier que tout fonctionne

1. **Prometheus** : http://localhost:9090
   - Va dans Status → Targets
   - Tous les targets doivent être "UP" (vert)

2. **Grafana** : http://localhost:3001
   - Login : admin / ton_mot_de_passe
   - Le dashboard "Tumulte - Overview" est auto-chargé

---

## Comment ça marche

```
┌─────────────────────────────────────────────────────────────────┐
│                        TON APPLICATION                          │
├─────────────────────────────────────────────────────────────────┤
│  Backend (AdonisJS)          Frontend (Nuxt)                    │
│  └─ GET /metrics             └─ GET /metrics                    │
│     (prom-client)               (prom-client)                   │
└─────────────────────────────────────────────────────────────────┘
                    │                        │
                    ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PROMETHEUS                                │
│  - Scrape toutes les 15s les endpoints /metrics                 │
│  - Stocke les données en time-series                            │
│  - Évalue les alertes                                           │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         GRAFANA                                  │
│  - Requête Prometheus via PromQL                                │
│  - Affiche les dashboards                                       │
│  - Configure des alertes visuelles                              │
└─────────────────────────────────────────────────────────────────┘
```

### Flux de données

1. **Ton app expose /metrics** → Format texte Prometheus
2. **Prometheus scrape** → Toutes les 15 secondes
3. **Prometheus stocke** → Base de données time-series
4. **Grafana query** → PromQL pour visualiser

---

## Métriques disponibles

### Backend Tumulte

| Métrique | Type | Description |
|----------|------|-------------|
| `tumulte_http_requests_total` | Counter | Nombre de requêtes HTTP |
| `tumulte_http_request_duration_seconds` | Histogram | Latence des requêtes |
| `tumulte_websocket_connections_total` | Gauge | Connexions WS actives |
| `tumulte_polls_launched_total` | Counter | Polls lancés |
| `tumulte_polls_active_total` | Gauge | Polls en cours |
| `tumulte_votes_received_total` | Counter | Votes reçus |
| `tumulte_db_connections_active` | Gauge | Connexions DB actives |
| `tumulte_db_connections_idle` | Gauge | Connexions DB idle |
| `tumulte_cache_hits_total` | Counter | Hits cache |
| `tumulte_cache_misses_total` | Counter | Misses cache |

### Exporters

| Source | Métriques clés |
|--------|----------------|
| Node Exporter | CPU, RAM, disque, réseau |
| Postgres Exporter | Connexions, transactions, locks |
| Redis Exporter | Mémoire, commandes, clients |
| cAdvisor | CPU/RAM par container Docker |

---

## Alertes configurées

| Alerte | Condition | Sévérité |
|--------|-----------|----------|
| TumulteBackendDown | Service indisponible > 1min | Critical |
| TumulteFrontendDown | Service indisponible > 1min | Critical |
| HighRequestLatency | p95 > 1s pendant 5min | Warning |
| HighErrorRate | > 5% erreurs 5xx | Critical |
| HighCpuUsage | CPU > 80% pendant 10min | Warning |
| LowMemoryAvailable | RAM < 10% disponible | Critical |
| DiskSpaceLow | Disque < 15% | Warning |
| PostgresDown | DB indisponible | Critical |
| RedisDown | Cache indisponible | Critical |

---

## Requêtes PromQL utiles

### Taux de requêtes par seconde
```promql
sum(rate(tumulte_http_requests_total[5m]))
```

### Latence p95
```promql
histogram_quantile(0.95, sum(rate(tumulte_http_request_duration_seconds_bucket[5m])) by (le))
```

### Taux d'erreurs
```promql
sum(rate(tumulte_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(tumulte_http_requests_total[5m]))
```

### Mémoire utilisée (pourcentage)
```promql
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100
```

### Cache hit rate
```promql
sum(rate(tumulte_cache_hits_total[5m])) / (sum(rate(tumulte_cache_hits_total[5m])) + sum(rate(tumulte_cache_misses_total[5m]))) * 100
```

---

## Scalabilité : quand ajouter des machines ?

Surveille ces métriques pour savoir quand scaler :

| Métrique | Seuil d'alerte | Action |
|----------|----------------|--------|
| CPU > 70% constant | Warning | Envisager scale |
| CPU > 85% constant | Critical | Scaler immédiatement |
| RAM > 80% | Warning | Augmenter RAM ou instances |
| Latence p95 > 500ms | Warning | Optimiser ou scaler |
| Latence p95 > 1s | Critical | Scaler backend |
| DB connections > 80% pool | Warning | Augmenter pool ou replicas |
| WebSocket > 500/instance | Info | Prévoir scale horizontal |

---

## Troubleshooting

### Prometheus ne scrape pas mes métriques

1. Vérifie que ton app expose `/metrics` :
   ```bash
   curl http://localhost:3333/metrics
   ```

2. Vérifie les targets dans Prometheus :
   - http://localhost:9090/targets
   - Le status doit être "UP"

3. Vérifie la connectivité réseau :
   - `host.docker.internal` fonctionne sur Mac/Windows
   - Sur Linux, utilise l'IP du host ou `--network=host`

### Grafana ne montre pas de données

1. Vérifie que la datasource Prometheus est configurée :
   - Settings → Data Sources → Prometheus
   - Test la connexion

2. Vérifie que Prometheus reçoit des données :
   - http://localhost:9090/graph
   - Tape une métrique et vérifie qu'il y a des résultats

### Les alertes ne partent pas

1. Vérifie Alertmanager :
   - http://localhost:9093
   - Vérifie que les alertes sont visibles

2. Configure les webhooks Discord dans `alertmanager.yml`
