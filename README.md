# 🎲 Tumulte

**Multi-stream polling system for tabletop RPG sessions on Twitch**

Tumulte allows Game Masters (GMs) to launch synchronized Twitch polls across multiple streamers' channels during tabletop RPG sessions. Players vote on their favorite streamer's chat, and results are aggregated in real-time with a transparent OBS overlay.

> ⚠️ **Note**: This is an experimental project built for fun and community feedback. It's not intended for large-scale production deployment, but feel free to use it, fork it, and share your improvements!

---

## ✨ Features

### For Game Masters
- Launch synchronized polls across all connected streamers
- Real-time vote aggregation from all channels
- Campaign management with streamer invitations
- Session-based poll templates

### For Streamers
- One-click Twitch OAuth authentication
- Automatic poll creation on their channel
- Custom OBS overlay URL (transparent background)
- Compatibility check (Twitch Affiliate/Partner required)

### OBS Overlay
- Transparent background for seamless integration
- Real-time vote updates via WebSocket
- Progress bars and countdown timer
- Auto-show/hide on poll start/end

---

## 🛠️ Tech Stack

- **Backend**: AdonisJS v6 (REST API + WebSocket)
- **Frontend**: Vue.js 3 + Vite + Nuxt UI 4
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose (Dokploy compatible)

---

## 🚀 Quick Start

### Prerequisites

- Node.js v20+
- Docker & Docker Compose
- Twitch Developer Application ([Create one here](https://dev.twitch.tv/console/apps))

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/tumulte.git
cd tumulte

# Start (or reuse) a PostgreSQL 16 instance
# Example with Docker:
docker run -d --name tumulte-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=twitch_polls \
  -p 5432:5432 postgres:16-alpine

# Backend setup
cd backend
cp .env.example .env
npm install
node ace generate:key
node ace migration:run
npm run dev

# Frontend setup (in another terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 2. Configure Twitch OAuth

Create a Twitch application and add to `backend/.env`:

```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=http://localhost:3333/auth/twitch/callback
MJ_TWITCH_IDS=your_twitch_user_id
```

Find your Twitch User ID: https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/

### 3. Access the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3333

---

## 📦 Deployment with Dokploy

Two separate Compose manifests are provided (both compatible with [Dokploy](https://docs.dokploy.com)):

| File                        | Services included             | Notes |
|-----------------------------|-------------------------------|-------|
| `docker-compose.backend.yml`  | `backend` (Adonis API + WS)   | Connects to an **external** PostgreSQL instance via env vars. Mounts on the external `dokploy-network`. |
| `docker-compose.frontend.yml` | `frontend` (Nuxt dashboard)   | Static Nuxt build served by Node (port 3000) on the same `dokploy-network`. |

> 💡 Deploy Postgres (or any other infra pieces such as Cloudflare Tunnel) in their own Dokploy services. Only the API and the dashboard are managed here.

### Network Information

- **Network name**: `dokploy-network` (external network managed by Dokploy)
- Attach your Cloudflared/Dokploy Traefik services to this network to route traffic.

### Service information for Cloudflare Tunnel (external stack)

| Service  | Hostname example        | Backend target                       | Protocol      |
|----------|-------------------------|--------------------------------------|---------------|
| Frontend | `app.yourdomain.com`    | `http://frontend:3000`               | HTTP          |
| Backend  | `api.yourdomain.com`    | `http://backend:3333`                | HTTP + WS     |

> Assurez-vous que votre conteneur Cloudflared rejoint `dokploy-network` pour accéder aux services par leurs noms Docker (`frontend`, `backend`). Le tunnel reste dans un projet séparé afin de rester mutualisable.

**Helpful docs**: [Dokploy Compose guide](https://docs.dokploy.com/docs/core/docker-compose) · [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

---

## 🎯 How It Works

1. **GM creates a campaign** and invites streamers via their Twitch username
2. **Streamers accept** the invitation and authorize poll creation on their channel
3. **GM launches a poll** during the RPG session
4. **Twitch polls are created** simultaneously on all streamers' channels
5. **Votes are aggregated** in real-time and displayed on each overlay
6. **Results are shown** when the poll ends

> **Important**: Only Twitch Affiliates and Partners can use the polling feature due to Twitch API restrictions.

---

## 📁 Project Structure

```
tumulte/
├── backend/              # AdonisJS API
│   ├── app/
│   │   ├── controllers/  # HTTP & WebSocket controllers
│   │   ├── models/       # Database models (Lucid ORM)
│   │   └── services/     # Business logic
│   └── database/
│       └── migrations/   # Database schema
│
├── frontend/             # Vue.js Dashboard
│   ├── pages/           # MJ Dashboard, Streamer Dashboard, Overlay
│   ├── components/      # Reusable components
│   └── composables/     # Shared logic (useAuth, useCampaigns, etc.)
│
├── docker-compose.backend.yml   # Backend stack (Adonis only)
└── docker-compose.frontend.yml  # Frontend stack (Nuxt only)
```

---

## 🐛 Troubleshooting

### PostgreSQL Connection Issues

```bash
# If you run Postgres via Docker:
docker ps --filter "name=tumulte-postgres"
docker logs tumulte-postgres
docker restart tumulte-postgres

# For the backend service (Dokploy/local)
docker compose -f docker-compose.backend.yml logs backend
docker compose -f docker-compose.backend.yml restart backend
```

### OAuth Redirect Errors

- Verify `TWITCH_REDIRECT_URI` matches exactly in Twitch Console and `.env`
- Ensure Twitch app has `channel:manage:polls` and `channel:read:polls` scopes

### Streamer Not Compatible

- Only Twitch Affiliates and Partners can create polls
- Check streamer status on their [Dashboard Settings](https://dashboard.twitch.tv/settings/affiliate)

---

## 🤝 Contributing

This is a personal project shared for educational purposes and community feedback. Feel free to:

- 🐛 Report bugs via [GitHub Issues](https://github.com/yourusername/tumulte/issues)
- 💡 Suggest features or improvements
- 🔧 Submit pull requests

---

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Built with [AdonisJS](https://adonisjs.com/), [Vue.js](https://vuejs.org/), and [Nuxt UI](https://ui.nuxt.com/)
- Powered by [Twitch API](https://dev.twitch.tv/docs/api/)
- Deployment tools: [Dokploy](https://dokploy.com/), [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/)
