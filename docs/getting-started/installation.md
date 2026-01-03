# Installation

This guide covers self-hosting Tumulte on your own server.

## Prerequisites

- Docker and Docker Compose
- A Twitch Developer Application ([create one here](https://dev.twitch.tv/console/apps))
- (Production) A domain with SSL certificate

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/tumulte.git
cd tumulte
```

### 2. Configure Environment

Copy the example environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with your configuration:

```env
# Required: Generate a secure key
APP_KEY=your-secure-32-char-key

# Required: Twitch OAuth
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret
TWITCH_REDIRECT_URI=http://localhost:3333/auth/twitch/callback

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

Edit `frontend/.env`:

```env
NUXT_PUBLIC_API_BASE=http://localhost:3333
```

### 3. Start Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Install backend dependencies and run migrations
cd backend
npm install
node --loader ts-node-maintained/esm bin/console.ts migration:run

# Start backend
npm run dev

# In another terminal, start frontend
cd frontend
npm install
npm run dev
```

### 4. Access Tumulte

Open http://localhost:3000 in your browser.

## Next Steps

- [Configuration](configuration.md) - Learn about all configuration options
- [First Campaign](first-campaign.md) - Create your first campaign
