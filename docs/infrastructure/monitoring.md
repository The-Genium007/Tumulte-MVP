# Monitoring & Docker Infrastructure

This document covers the production Docker setup and the monitoring stack for Tumulte.

---

## Docker Production Setup

Tumulte uses multi-stage Docker builds optimized for production deployment with security and resource management best practices.

### Backend Dockerfile

**Location**: `/backend/Dockerfile`

**Build stages**:
1. **deps** - Install all dependencies
2. **builder** - Compile TypeScript and build application
3. **prod-deps** - Install production-only dependencies
4. **production** - Final runtime image

**Features**:
- **Non-root user**: Runs as `nodejs:1001` for security
- **Signal handling**: Uses `dumb-init` for proper process signal forwarding
- **Health check**: `GET /health/ready` endpoint (checks Redis, PostgreSQL, WebSocket)
- **Resource limits**: 2 CPU cores / 2GB RAM
- **Automatic migrations**: `docker-entrypoint.sh` runs migrations on startup

**Health Check**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node ace healthcheck || exit 1
```

### Frontend Dockerfile

**Location**: `/frontend/Dockerfile`

**Build stages**:
1. **builder** - Install dependencies and build Nuxt SSR application
2. **production** - Final runtime image with built assets

**Features**:
- **Nuxt SSR deployment**: Server-side rendering enabled
- **Health check**: `GET /health` endpoint
- **Optimized builds**: Production-only dependencies, minified assets

**Health Check**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

### Entrypoint Script

**Location**: `/backend/docker-entrypoint.sh`

**Responsibilities**:
1. Wait for PostgreSQL connectivity (retries with exponential backoff)
2. Wait for Redis connectivity (retries with exponential backoff)
3. Run database migrations with `migration:run --force`
4. Exit with error code if migrations fail (prevents broken deployments)
5. Start the application

**Safety**: The entrypoint ensures the database is fully migrated before the application starts accepting requests. A failed migration will prevent the container from starting.

---

## Monitoring Stack

The monitoring infrastructure provides observability for application health, resource usage, and alerting.

### Architecture

```
Prometheus (metrics collection, 30-day retention)
  ├── Node Exporter (CPU, RAM, disk, network)
  ├── cAdvisor (Docker container metrics)
  ├── PostgreSQL Exporter (DB health, query stats)
  └── Redis Exporter (cache metrics, memory usage)

Grafana (dashboards and visualization)
AlertManager → Discord webhooks (normal + critical channels)
```

### Components

| Component | Purpose | Metrics |
|-----------|---------|---------|
| **Prometheus** | Metrics collection and storage | 30-day retention, scrapes all exporters |
| **Node Exporter** | Host-level metrics | CPU, RAM, disk I/O, network traffic |
| **cAdvisor** | Container metrics | Per-container CPU, memory, network |
| **PostgreSQL Exporter** | Database health | Connections, query performance, table stats |
| **Redis Exporter** | Cache health | Memory usage, hit/miss ratio, key count |
| **Grafana** | Dashboards | Pre-configured dashboards for all components |
| **AlertManager** | Alert routing | Discord webhooks for normal and critical alerts |

### Deployment

The monitoring stack is deployed via a dedicated script:

```bash
cd monitoring
./scripts/deploy.sh
```

This script:
- Validates the configuration
- Starts all monitoring services via Docker Compose
- Configures Prometheus scrape targets
- Sets up AlertManager Discord webhooks

**Configuration files**: See the `/monitoring` directory at project root for detailed stack configuration, Prometheus rules, Grafana dashboards, and AlertManager routing.

### Alert Channels

Alerts are routed to Discord webhooks based on severity:

- **Normal channel**: Warnings, informational alerts, recovery notifications
- **Critical channel**: Service down, high error rates, resource exhaustion

---

## CI/CD Pipeline Overview

GitHub Actions workflows automate testing, quality checks, and build verification.

### Workflows

| Workflow | Branch | Behavior |
|----------|--------|----------|
| `staging-ci.yml` | `staging` | Functional tests non-blocking (warnings only) |
| `production-ci.yml` | `main` | All tests blocking (must pass for deployment) |
| `sync-foundry-module.yml` | — | Syncs Foundry VTT module to separate repository |

### Pipeline Structure

```
backend-quality ──► backend-unit-tests ──► backend-functional-tests
frontend-quality ──► frontend-unit-tests
                            ↓
                         build
                            ↓
                   frontend-e2e-tests (production only)
```

**Stages**:
1. **Quality checks**: ESLint, Prettier, TypeScript type checking
2. **Unit tests**: Backend (Japa) and frontend (Vitest) unit tests
3. **Functional tests**: Backend API endpoint tests
4. **Build verification**: Docker builds for backend and frontend
5. **E2E tests**: Playwright browser tests (production branch only)

**Behavior**:
- **Staging branch**: Functional test failures generate warnings but do not block deployment
- **Production branch**: All tests must pass (blocking)
- **Pull requests**: Full pipeline runs for all PRs targeting `main` or `staging`

### Monitoring in CI/CD

The CI/CD pipeline verifies that:
- Health check endpoints respond correctly
- Docker containers start successfully
- Migrations run without errors
- All services pass readiness checks

For detailed CI/CD workflow configuration, see [ci-cd.md](ci-cd.md).

---

## Health Checks

Tumulte implements comprehensive health checks at multiple levels.

### Application-Level Health Checks

| Endpoint | Purpose | Checks |
|----------|---------|--------|
| `GET /health` | Basic liveness | Application is running |
| `GET /health/ready` | Readiness probe | PostgreSQL, Redis, WebSocket ready |
| `GET /health/live` | Liveness probe | Application is responsive |

### Infrastructure Health Checks

**Docker Compose health checks**:
- PostgreSQL: `pg_isready` command
- Redis: `redis-cli ping` command
- Backend: HTTP GET `/health/ready`
- Frontend: HTTP GET `/health`

**Monitoring stack health checks**:
- Prometheus: HTTP GET `/-/healthy`
- Grafana: HTTP GET `/api/health`
- AlertManager: HTTP GET `/-/healthy`

### Pre-Flight Health Checks

The backend implements a pre-flight system that validates system health before launching polls or gamification events. See [Pre-Flight System](../architecture/backend.md#preflight-system) for details.

---

## Resource Management

### Container Resource Limits

**Backend**:
- CPU: 2 cores
- Memory: 2GB
- Restart policy: `unless-stopped`

**Frontend**:
- CPU: 1 core
- Memory: 1GB
- Restart policy: `unless-stopped`

**PostgreSQL**:
- CPU: 2 cores
- Memory: 4GB
- Shared buffers: 1GB
- Max connections: 200

**Redis**:
- CPU: 1 core
- Memory: 512MB
- Max memory policy: `allkeys-lru`

### Disk Management

- **Prometheus retention**: 30 days
- **PostgreSQL WAL retention**: 7 days
- **Log rotation**: Daily rotation, 14-day retention
- **Docker volume cleanup**: Automated via `docker system prune`

---

## Troubleshooting

### Common Issues

**Container fails to start**:
1. Check logs: `docker compose logs <service_name>`
2. Verify environment variables in `.env`
3. Check resource limits (disk space, memory)
4. Ensure PostgreSQL and Redis are healthy

**Migrations fail on startup**:
1. Check database connectivity
2. Review migration logs in container output
3. Verify `APP_KEY` matches (encryption dependency)
4. Check for migration conflicts in `adonis_schema` table

**Health checks failing**:
1. Verify PostgreSQL is accepting connections
2. Check Redis connectivity
3. Review WebSocket (Transmit) initialization logs
4. Ensure all environment variables are set

**Monitoring stack issues**:
1. Verify all exporters are running: `docker compose ps`
2. Check Prometheus targets: `http://<prometheus>:9090/targets`
3. Review AlertManager configuration
4. Test Discord webhooks manually

---

## Related Documentation

- [CI/CD Workflows](ci-cd.md)
- [Deployment Guide](../guides/deployment.md)
- [Architecture Overview](../architecture/overview.md)
- [Contributing Guide](../guides/contributing.md)
