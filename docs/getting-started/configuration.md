# Configuration

This guide covers all configuration options for Tumulte.

## Backend Environment Variables

### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3333` | HTTP server port |
| `HOST` | No | `localhost` | HTTP server host |
| `APP_KEY` | Yes | - | Encryption key (32+ characters) |
| `NODE_ENV` | No | `development` | Environment (`development`, `production`, `test`) |
| `TZ` | No | `UTC` | Timezone for the application |
| `LOG_LEVEL` | No | `info` | Log level (`debug`, `info`, `warn`, `error`) |
| `ENV_SUFFIX` | No | `prod` | Docker container suffix (`prod`, `staging`) |

### Database (PostgreSQL)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | No | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_USER` | No | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | Yes | - | PostgreSQL password |
| `DB_DATABASE` | No | `twitch_polls` | Database name |

### Cache (Redis)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password (if required) |
| `REDIS_DB` | No | `0` | Redis database number |
| `REDIS_CONNECTION` | No | `main` | Redis connection name |

### Twitch OAuth

| Variable | Required | Description |
|----------|----------|-------------|
| `TWITCH_CLIENT_ID` | Yes | Your Twitch application client ID |
| `TWITCH_CLIENT_SECRET` | Yes | Your Twitch application client secret |
| `TWITCH_REDIRECT_URI` | Yes | OAuth callback URL (must match Twitch app settings) |

### Session

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_DRIVER` | No | `cookie` | Session storage driver |

### CORS

| Variable | Required | Description |
|----------|----------|-------------|
| `FRONTEND_URL` | Yes | Frontend URL for CORS (e.g., `http://localhost:3000`) |

### Push Notifications (VAPID)

| Variable | Required | Description |
|----------|----------|-------------|
| `VAPID_PUBLIC_KEY` | No* | VAPID public key for push notifications |
| `VAPID_PRIVATE_KEY` | No* | VAPID private key for push notifications |
| `VAPID_SUBJECT` | No | Contact email for VAPID (e.g., `mailto:admin@tumulte.app`) |

\* Required if you want to enable push notifications

### Discord Support

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_SUPPORT_WEBHOOK_URL` | No | Discord webhook URL for support tickets |
| `DISCORD_SUPPORT_ROLE_ID` | No | Discord role ID to ping for support |

### Monitoring

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | No | Sentry DSN for error tracking |

## Frontend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_PUBLIC_API_BASE` | Yes | Backend API URL (e.g., `http://localhost:3333`) |

## Generating Keys

### APP_KEY

Generate a secure application key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### VAPID Keys

Generate VAPID keys for push notifications:

```bash
npx web-push generate-vapid-keys
```

This will output:
```
=======================================

Public Key:
BNxR...

Private Key:
abc123...

=======================================
```

Copy these values to your `.env` file.

## Twitch Application Setup

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Click "Register Your Application"
3. Fill in:
   - **Name**: Your application name (e.g., "Tumulte Dev")
   - **OAuth Redirect URLs**:
     - Development: `http://localhost:3333/auth/twitch/callback`
     - Production: `https://your-domain.com/auth/twitch/callback`
   - **Category**: Choose "Application Integration"
4. Copy the Client ID
5. Click "New Secret" to generate a Client Secret

### Required Scopes

The application requests these Twitch scopes:
- `channel:manage:polls` - Create and manage polls
- `channel:read:polls` - Read poll results
- `user:read:email` - Read user email for identification

## Development Configuration

Create `backend/.env`:

```env
TZ=UTC
PORT=3333
HOST=localhost
LOG_LEVEL=info
APP_KEY=your-32-character-key-here
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=twitch_polls

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Session
SESSION_DRIVER=cookie

# Twitch OAuth
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=http://localhost:3333/auth/twitch/callback

# Frontend CORS
FRONTEND_URL=http://localhost:3000

# Push Notifications (optional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:dev@localhost

# Discord Support (optional)
DISCORD_SUPPORT_WEBHOOK_URL=
DISCORD_SUPPORT_ROLE_ID=
```

Create `frontend/.env`:

```env
NUXT_PUBLIC_API_BASE=http://localhost:3333
```

## Production Configuration

For production deployments:

```env
NODE_ENV=production
TZ=UTC
PORT=3333
HOST=0.0.0.0
LOG_LEVEL=info
APP_KEY=<strong-generated-key>
ENV_SUFFIX=prod

# Database - Use production credentials
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=tumulte_user
DB_PASSWORD=<strong-password>
DB_DATABASE=tumulte_prod

# Redis - Use production instance
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# Twitch OAuth - Production URLs
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=https://api.your-domain.com/auth/twitch/callback

# CORS
FRONTEND_URL=https://your-domain.com

# Push Notifications
VAPID_PUBLIC_KEY=BNxR...
VAPID_PRIVATE_KEY=abc123...
VAPID_SUBJECT=mailto:admin@your-domain.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# Discord Support
DISCORD_SUPPORT_WEBHOOK_URL=https://discord.com/api/webhooks/xxx
DISCORD_SUPPORT_ROLE_ID=123456789
```

## Docker Configuration

When using Docker Compose, environment variables can be set in `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
```

Or use an `.env` file with Docker Compose:

```bash
docker-compose --env-file .env.production up -d
```

## Environment Variable Validation

The backend validates required environment variables on startup. If any required variable is missing, the application will fail to start with a clear error message.

### Common Errors

**Missing APP_KEY:**
```
E_MISSING_APP_KEY: Make sure to define APP_KEY environment variable
```
→ Generate a key with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

**Missing Twitch credentials:**
```
Missing Twitch OAuth configuration
```
→ Set `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_REDIRECT_URI`

**Invalid VAPID keys:**
```
VAPID keys are invalid or not configured
```
→ Generate new keys with `npx web-push generate-vapid-keys`
