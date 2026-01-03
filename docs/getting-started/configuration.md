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

## Frontend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_PUBLIC_API_BASE` | Yes | Backend API URL (e.g., `http://localhost:3333`) |

## Generating APP_KEY

Generate a secure application key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Twitch Application Setup

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Click "Register Your Application"
3. Fill in:
   - Name: Your application name
   - OAuth Redirect URLs: `http://localhost:3333/auth/twitch/callback` (development)
   - Category: Choose appropriate category
4. Copy the Client ID and generate a Client Secret

## Production Configuration

For production deployments:

```env
NODE_ENV=production
APP_KEY=<strong-generated-key>

# Use production database
DB_HOST=your-db-host
DB_PASSWORD=<strong-password>

# Use production Redis
REDIS_HOST=your-redis-host

# Production URLs
TWITCH_REDIRECT_URI=https://your-domain.com/auth/twitch/callback
FRONTEND_URL=https://your-domain.com
```
