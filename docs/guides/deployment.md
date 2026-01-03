# Deployment Guide

This guide covers deploying Tumulte to production environments.

## Prerequisites

- Docker and Docker Compose
- A domain with SSL certificate
- Twitch Developer Application

## Docker Compose Deployment

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/tumulte.git
cd tumulte
```

### 2. Configure Environment

Create production environment files:

**backend/.env**:
```env
NODE_ENV=production
PORT=3333
HOST=0.0.0.0
APP_KEY=your-secure-32-char-key

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=tumulte
DB_PASSWORD=secure-password
DB_DATABASE=tumulte

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Twitch
TWITCH_CLIENT_ID=your-client-id
TWITCH_CLIENT_SECRET=your-client-secret
TWITCH_REDIRECT_URI=https://your-domain.com/auth/twitch/callback

# Session
SESSION_DRIVER=cookie

# CORS
FRONTEND_URL=https://your-domain.com
```

**frontend/.env**:
```env
NUXT_PUBLIC_API_BASE=https://api.your-domain.com
```

### 3. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: tumulte
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: tumulte
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tumulte"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
    env_file:
      - ./backend/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3333:3333"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    env_file:
      - ./frontend/.env
    ports:
      - "3000:3000"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 4. Build and Run

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 5. Run Migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend \
  node ace migration:run --force
```

## Reverse Proxy (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Dokploy Deployment

[Dokploy](https://dokploy.com) is a self-hosted PaaS alternative.

### 1. Create Application

1. Login to Dokploy dashboard
2. Create new application
3. Connect Git repository

### 2. Configure Build

**Backend**:
- Build command: `npm run build`
- Start command: `node build/bin/server.js`
- Port: 3333

**Frontend**:
- Build command: `npm run build`
- Start command: `node .output/server/index.mjs`
- Port: 3000

### 3. Environment Variables

Add all environment variables from the configuration section.

### 4. Database Setup

Create PostgreSQL and Redis services in Dokploy and link them to your application.

## Backup Strategy

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U tumulte tumulte > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U tumulte tumulte < backup.sql
```

### Automated Backups

Add a cron job:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/tumulte && docker-compose exec -T postgres pg_dump -U tumulte tumulte | gzip > /backups/tumulte-$(date +\%Y\%m\%d).sql.gz
```

## Monitoring

### Health Checks

Backend provides health endpoints:

- `GET /health` - Overall health
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

## Updating

1. Pull latest changes
   ```bash
   git pull origin main
   ```

2. Rebuild and restart
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

3. Run new migrations
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend \
     node ace migration:run --force
   ```

## Troubleshooting

### Database Connection Issues

Check PostgreSQL is running:
```bash
docker-compose -f docker-compose.prod.yml ps postgres
docker-compose -f docker-compose.prod.yml logs postgres
```

### Redis Connection Issues

Check Redis is running:
```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### Backend Not Starting

Check logs:
```bash
docker-compose -f docker-compose.prod.yml logs backend
```

Common issues:
- Missing environment variables
- Database not ready
- Port already in use
