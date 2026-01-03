<p align="center">
  <h1 align="center">Tumulte</h1>
  <p align="center">
    <strong>Multi-stream Twitch poll system for Tabletop RPG sessions</strong>
  </p>
</p>

<p align="center">
  <a href="https://github.com/The-Genium007/tumulte/releases"><img src="https://img.shields.io/badge/version-0.2.0-blue.svg" alt="Version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
  <br>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/AdonisJS-6.x-5A45FF?logo=adonisjs&logoColor=white" alt="AdonisJS">
  <img src="https://img.shields.io/badge/Nuxt-3.x-00DC82?logo=nuxt.js&logoColor=white" alt="Nuxt">
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a>
</p>

---

**Tumulte** enables Game Masters (GMs) to launch synchronized Twitch polls across multiple streams during TTRPG sessions. Viewers vote on their favorite streamer's chat, and results are aggregated in real-time with a transparent OBS overlay.

> **Early Alpha** - Functional but not production-ready. Breaking changes may occur between versions.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Features

### For Game Masters
- **Campaign Management** - Create campaigns and invite streamers via Twitch username
- **Dual Security Validation** - Streamers must accept the campaign AND be manually authorized per session
- **Synchronized Polls** - Launch polls that appear simultaneously on all participating streams
- **Real-time Aggregation** - View votes from all chats in real-time
- **Session Control** - Full control over when and how polls are launched

### For Streamers
- **One-click Auth** - OAuth Twitch authentication
- **Invitation System** - Accept or decline campaign invitations
- **Per-session Validation** - GM must authorize you before each session (prevents unwanted polls)
- **Compatibility** - Works for Twitch Affiliates and Partners

---

## Quick Start

### Prerequisites

- Node.js v20+
- Docker & Docker Compose
- [Twitch Developer Application](https://dev.twitch.tv/console/apps)
- PostgreSQL 16 & Redis 7 (via Docker or existing)

### Installation

```bash
# Clone the repository
git clone https://github.com/The-Genium007/tumulte.git
cd tumulte

# Start Redis
cd backend && docker compose up -d

# Setup backend
cp .env.example .env
npm install
node ace migration:run
npm run dev  # Runs on port 3333

# Setup frontend (new terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev  # Runs on port 3000
```

### Twitch OAuth Configuration

Create an app on [Twitch Developers Console](https://dev.twitch.tv/console/apps) and configure `backend/.env`:

```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=http://localhost:3333/auth/twitch/callback

# Authorized GM Twitch IDs (comma-separated)
MJ_TWITCH_IDS=123456789,987654321
```

**Required scopes**: `channel:manage:polls`, `channel:read:polls`, `user:read:email`

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3333 |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | AdonisJS 6, Lucid ORM, VineJS, Transmit WebSocket |
| **Frontend** | Nuxt 3, Vue 3, Nuxt UI v3, Pinia, Axios |
| **Database** | PostgreSQL 16, Redis 7 |
| **Infrastructure** | Docker, GitHub Actions CI/CD |

---

## Deployment

### Docker Compose

The project provides separate Docker Compose files for flexible deployment:

```bash
# Backend (includes Redis)
cd backend && docker compose up -d

# Frontend
cd frontend && docker compose up -d
```

### Database Migrations

Migrations run automatically on container startup via `docker-entrypoint.sh`.

Manual commands:
```bash
docker compose exec backend node ace migration:run
docker compose exec backend node ace migration:status
```

### Resource Allocation

| Service | CPU | RAM |
|---------|-----|-----|
| Backend | 1 | 512 MB |
| Frontend | 0.5 | 256 MB |
| PostgreSQL | 1 | 1 GB |
| Redis | 0.5 | 256 MB |

---

## Known Limitations

- Only Twitch **Affiliates** or **Partners** can use polls
- Maximum **5 choices** per poll (Twitch API limit)
- Maximum poll duration: **1800 seconds** (30 minutes)

---

## Roadmap

Coming soon.

---

## Contributing

The project is in active development and **contributions are not yet open** formally.

**Coming soon**: Once beta is reached, we'll open contributions with a detailed CONTRIBUTING.md guide.

**In the meantime**:
- Report bugs via [Bugs & Issues](https://github.com/The-Genium007/Tumulte/discussions/categories/bugs-issues)
- Suggest improvements in [Ideas & Suggestions](https://github.com/The-Genium007/Tumulte/discussions/categories/ideas-suggestions)
- Star the project if you find it useful!

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

You are free to use, modify, distribute, and sell this software without any restrictions.

---

## Acknowledgments

Built with:

[AdonisJS](https://adonisjs.com/) • [Nuxt](https://nuxt.com/) • [Nuxt UI](https://ui.nuxt.com/) • [Twitch API](https://dev.twitch.tv/docs/api/) • [PostgreSQL](https://www.postgresql.org/) • [Redis](https://redis.io/)

---

<p align="center">
  <strong>Made for the TTRPG Twitch community</strong>
  <br><br>
  <a href="https://github.com/The-Genium007/Tumulte">Star this project</a> •
  <a href="https://github.com/The-Genium007/Tumulte/discussions/categories/bugs-issues">Report a bug</a> •
  <a href="https://github.com/The-Genium007/Tumulte/discussions/categories/ideas-suggestions">Suggest a feature</a>
</p>
