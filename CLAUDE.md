# Tumulte - Contexte Projet

Plateforme de gestion de sondages Twitch multi-chaînes pour les Maîtres de Jeu (MJ) de JDR.

## Architecture

Monorepo avec deux applications :

```
/Tumulte
├── backend/          # AdonisJS 6 (API REST + WebSocket)
├── frontend/         # Nuxt 3 (Vue 3 + Nuxt UI v3)
└── .github/workflows # CI/CD GitHub Actions
```

## Stack Technique

### Backend
- **Framework** : AdonisJS 6.18 (TypeScript 5.8)
- **ORM** : Lucid (PostgreSQL 16)
- **Cache** : Redis 7
- **WebSocket** : Transmit (temps réel)
- **Validation** : VineJS + Zod
- **Tests** : Japa

### Frontend
- **Framework** : Nuxt 3.15 (Vue 3.5)
- **UI** : Nuxt UI v3 (TailwindCSS)
- **State** : Pinia
- **HTTP** : Axios
- **Tests** : Vitest + Playwright

## Commandes Essentielles

### Backend

```bash
# IMPORTANT: Pour exécuter les commandes ace en développement
node --loader ts-node-maintained/esm bin/console.ts <command>

# Exemples
node --loader ts-node-maintained/esm bin/console.ts list
node --loader ts-node-maintained/esm bin/console.ts migration:run
node --loader ts-node-maintained/esm bin/console.ts migration:rollback

# Scripts npm
cd backend
npm run dev           # Serveur dev (port 3333)
npm run test          # Tous les tests
npm run test:unit     # Tests unitaires
npm run test:functional
npm run typecheck
npm run lint
```

### Frontend

```bash
cd frontend
npm run dev           # Serveur dev (port 3000)
npm run build
npm run test
npm run test:e2e
npm run typecheck
npm run lint
```

## Patterns Architecturaux

### Backend - Couches

```
Controller → Service → Repository → Model
     ↓           ↓
  Validator    DTO
```

1. **Controllers** : Réception requête, validation, réponse (pas de logique métier)
2. **Services** : Logique métier, orchestration
3. **Repositories** : Requêtes BD (Lucid ORM)
4. **DTOs** : Transformation Model → API Response (`fromModel()`, `fromModelArray()`)
5. **Validators** : Schemas Zod pour validation entrées

### Imports (Path Aliases)

```typescript
import { User } from '#models/user'
import { UserService } from '#services/user_service'
import { UserRepository } from '#repositories/user_repository'
import { UserDto } from '#dtos/user_dto'
import { createUserValidator } from '#validators/auth/create_user'
```

## Base de Données

### Modèles Principaux

| Modèle | Description |
|--------|-------------|
| `User` | Utilisateurs (rôle: MJ ou STREAMER) |
| `Streamer` | Infos Twitch (tokens chiffrés) |
| `Campaign` | Campagnes JDR |
| `CampaignMembership` | Invitations streamers |
| `PollSession` | Sessions de sondages |
| `Poll` | Définition d'un sondage |
| `PollInstance` | Instance lancée d'un sondage |
| `PollResult` | Résultats agrégés |

### Conventions BD

- Tables : `snake_case` pluriel (`poll_instances`)
- Colonnes : `snake_case` (`created_at`, `user_id`)
- FK dans le code : `camelCase` (`userId`, `campaignId`)

## Routes API Principales

```
# Auth
GET  /auth/twitch/redirect
GET  /auth/twitch/callback
POST /auth/logout
GET  /auth/me
POST /auth/switch-role

# MJ - Campagnes
GET/POST     /mj/campaigns
GET/PUT/DEL  /mj/campaigns/:id
POST         /mj/campaigns/:id/invite

# MJ - Sessions
GET/POST     /mj/campaigns/:campaignId/sessions
POST         /mj/sessions/:id/launch

# Streamer
GET  /streamer/campaigns/invitations
POST /streamer/campaigns/invitations/:id/accept
POST /streamer/campaigns/:campaignId/authorize

# Overlay (public)
GET  /overlay/:streamerId/active-poll
```

## Variables d'Environnement

### Backend (.env)

```env
# App
PORT=3333
HOST=localhost
APP_KEY=<généré>
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

# Twitch OAuth
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_REDIRECT_URI=http://localhost:3333/auth/twitch/callback

# Session
SESSION_DRIVER=cookie

# Frontend CORS
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)

```env
NUXT_PUBLIC_API_BASE=http://localhost:3333
```

## CI/CD

### Workflows GitHub Actions

| Workflow | Branche | Comportement |
|----------|---------|--------------|
| `staging-ci.yml` | staging | Tests non-bloquants pour fonctionnels |
| `production-ci.yml` | main | Tous tests bloquants |

### Structure des Jobs

```
backend-quality ──► backend-unit-tests ──► backend-functional-tests
frontend-quality ──► frontend-unit-tests
                            ↓
                         build
                            ↓
                   frontend-e2e-tests (prod only)
```

## Conventions de Code

- **Classes** : PascalCase
- **Fonctions/Variables** : camelCase
- **Constantes** : UPPER_SNAKE_CASE
- **Fichiers** : snake_case (backend), kebab-case (frontend composants)

### ESLint Exceptions

Le snake_case est accepté pour :
- Colonnes BD dans les migrations
- Propriétés OAuth Twitch (`access_token`, `client_id`)
- Réponses API Twitch

## Notes Importantes

1. **Le fichier `ace` à la racine du backend** est pour le build production uniquement. En dev, utiliser `bin/console.ts` avec ts-node.

2. **Tokens Twitch** sont chiffrés via le service Encryption d'AdonisJS avant stockage.

3. **Double validation** : Les streamers doivent être membres d'une campagne ET avoir autorisé leur chaîne pour participer aux sondages.

4. **WebSocket Transmit** : Utilisé pour le push temps réel des résultats de sondages.

## Démarrage Rapide

```bash
# 1. Démarrer les services
docker-compose up -d  # PostgreSQL + Redis

# 2. Backend
cd backend
cp .env.example .env  # Configurer les variables
npm install
node --loader ts-node-maintained/esm bin/console.ts migration:run
npm run dev

# 3. Frontend
cd frontend
npm install
npm run dev
```
