# Guide d'Implémentation Backend-V2

## 📋 État Actuel de l'Implémentation

### ✅ PHASES COMPLÉTÉES

#### Phase 1 : Infrastructure (100%)
- [x] Configuration Redis (`config/redis.ts`)
- [x] Configuration Sentry (`config/sentry.ts`)
- [x] Configuration Pino Logger (`config/logger.ts`)
- [x] Variables d'environnement (`.env.example`, `start/env.ts`)
- [x] Package.json avec dépendances (Redis, Sentry, Pino, Zod)
- [x] Middleware:
  - `tracing_middleware.ts` - Request ID + correlation
  - `validate_middleware.ts` - Validation Zod générique
  - `error_handler_middleware.ts` - Gestion erreurs + Sentry
- [x] `RedisService` - Cache avec stratégies complètes
- [x] Container IoC (`start/container.ts`)

#### Phase 2 : DTOs & Validators (100%)
- [x] **DTOs Auth**: UserDto, StreamerDto
- [x] **DTOs Campaigns**: CampaignDto, CampaignDetailDto, CampaignMemberDto, CampaignInvitationDto
- [x] **DTOs Polls**: PollTemplateDto, PollSessionDto, PollDto, PollInstanceDto, AggregatedVotesDto, PollResultsDto
- [x] **Validators Campaigns**: create, update, invite_streamer
- [x] **Validators Polls**: create_poll_session, launch_poll, add_poll

#### Phase 3 : Repositories (30%)
- [x] UserRepository
- [x] CampaignRepository
- [x] StreamerRepository
- [ ] CampaignMembershipRepository
- [ ] PollTemplateRepository
- [ ] PollSessionRepository
- [ ] PollRepository
- [ ] PollInstanceRepository
- [ ] PollChannelLinkRepository
- [ ] PollResultRepository

#### Phase 4 : Services (40%)
- [x] **Auth Services**: TwitchAuthService (copié)
- [x] **Twitch Services**: TwitchApiService, TwitchPollService (copiés)
- [x] **Campaign Services**: CampaignService, MembershipService
- [x] **WebSocket Service**: WebSocketService (copié)
- [x] **Cache Service**: RedisService
- [ ] **Poll Services**:
  - PollCreationService
  - PollLifecycleService
  - PollPollingService
  - PollAggregationService

---

## 🚧 PHASES À COMPLÉTER

### Phase 4 (Suite) : Poll Services

#### 1. PollCreationService
```typescript
// app/services/polls/poll_creation_service.ts
import { inject } from '@adonisjs/core'

@inject()
export class PollCreationService {
  constructor(
    private twitchPollService: TwitchPollService,
    private streamerRepository: StreamerRepository,
    private pollChannelLinkRepository: PollChannelLinkRepository,
    private redisService: RedisService
  ) {}

  async createPollsForCampaign(pollInstance: PollInstance): Promise<void> {
    // 1. Récupérer les membres actifs de la campagne
    // 2. Vérifier compatibilité (Affiliate/Partner)
    // 3. Pour chaque streamer compatible:
    //    - Récupérer token décrypté
    //    - Créer poll sur Twitch
    //    - Créer PollChannelLink
    // 4. Logger succès/erreurs
  }
}
```

#### 2. PollLifecycleService
```typescript
// app/services/polls/poll_lifecycle_service.ts
@inject()
export class PollLifecycleService {
  constructor(
    private pollPollingService: PollPollingService,
    private pollAggregationService: PollAggregationService,
    private websocketService: WebSocketService,
    private redisService: RedisService
  ) {}

  async startPoll(pollInstanceId: string): Promise<void>
  async cancelPoll(pollInstanceId: string): Promise<void>
  async endPoll(pollInstanceId: string): Promise<void>
}
```

#### 3. PollPollingService
```typescript
// app/services/polls/poll_polling_service.ts
export class PollPollingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  async startPolling(pollInstance: PollInstance): Promise<void>
  stopPolling(pollInstanceId: string): void
  private async pollChannelLinks(pollInstanceId: string): Promise<void>
}
```

#### 4. PollAggregationService
```typescript
// app/services/polls/poll_aggregation_service.ts
export class PollAggregationService {
  async getAggregatedVotes(pollInstanceId: string): Promise<AggregatedVotesDto>
  async cacheAggregatedVotes(pollInstanceId: string, votes: AggregatedVotesDto): Promise<void>
}
```

---

### Phase 5 : Controllers

#### MJ Controllers (5 fichiers)

**1. app/controllers/mj/campaigns_controller.ts (150 lignes)**
```typescript
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class CampaignsController {
  constructor(
    private campaignService: CampaignService,
    private membershipService: MembershipService
  ) {}

  async index({ auth, response }: HttpContext) {}
  async store({ auth, request, response }: HttpContext) {}
  async show({ auth, params, response }: HttpContext) {}
  async update({ auth, params, request, response }: HttpContext) {}
  async destroy({ auth, params, response }: HttpContext) {}
  async invite({ auth, params, request, response }: HttpContext) {}
  async removeMember({ auth, params, response }: HttpContext) {}
}
```

**2. app/controllers/mj/poll_sessions_controller.ts (200 lignes)**
```typescript
@inject()
export default class PollSessionsController {
  // CRUD sessions
  // Ajouter/modifier/supprimer polls dans session
}
```

**3. app/controllers/mj/polls_controller.ts (250 lignes)**
```typescript
@inject()
export default class PollsController {
  constructor(
    private pollLifecycleService: PollLifecycleService,
    private pollCreationService: PollCreationService,
    private pollAggregationService: PollAggregationService
  ) {}

  async launch({ auth, params, request, response }: HttpContext) {}
  async cancel({ auth, params, response }: HttpContext) {}
  async results({ auth, params, response }: HttpContext) {}
}
```

**4. app/controllers/mj/poll_templates_controller.ts (150 lignes)**
```typescript
// CRUD templates
```

**5. app/controllers/mj/streamers_controller.ts (100 lignes)**
```typescript
// Liste et recherche streamers
```

#### Streamer Controllers (2 fichiers)

**1. app/controllers/streamer/campaigns_controller.ts (200 lignes)**
```typescript
@inject()
export default class StreamerCampaignsController {
  constructor(private membershipService: MembershipService) {}

  async invitations({ auth, response }: HttpContext) {}
  async accept({ auth, params, response }: HttpContext) {}
  async decline({ auth, params, response }: HttpContext) {}
  async index({ auth, response }: HttpContext) {}
  async leave({ auth, params, response }: HttpContext) {}
}
```

**2. app/controllers/streamer/overlay_controller.ts (100 lignes)**
```typescript
// Overlay URL, revoke access
```

---

### Phase 5 (Suite) : Routes V2

#### start/routes_v2.ts
```typescript
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Préfixe /api/v2 pour toutes les routes
router.group(() => {
  // Auth routes
  router.group(() => {
    // ...
  }).prefix('/auth')

  // MJ routes
  router.group(() => {
    router.resource('campaigns', '#controllers/mj/campaigns_controller')
    router.post('campaigns/:id/invite', '#controllers/mj/campaigns_controller.invite')
    router.delete('campaigns/:campaignId/members/:memberId', '#controllers/mj/campaigns_controller.removeMember')

    router.resource('campaigns/:campaignId/poll-sessions', '#controllers/mj/poll_sessions_controller')
    router.post('campaigns/:campaignId/poll-sessions/:sessionId/polls', '#controllers/mj/poll_sessions_controller.addPoll')

    router.post('campaigns/:campaignId/polls/:pollId/launch', '#controllers/mj/polls_controller.launch')
    router.patch('campaigns/:campaignId/polls/:pollId/cancel', '#controllers/mj/polls_controller.cancel')
    router.get('campaigns/:campaignId/polls/:pollId/results', '#controllers/mj/polls_controller.results')
  })
    .prefix('/mj')
    .use(middleware.auth())
    .use(middleware.role('MJ'))

  // Streamer routes
  router.group(() => {
    router.get('campaigns/invitations', '#controllers/streamer/campaigns_controller.invitations')
    router.post('campaigns/invitations/:id/accept', '#controllers/streamer/campaigns_controller.accept')
    router.post('campaigns/invitations/:id/decline', '#controllers/streamer/campaigns_controller.decline')
    router.get('campaigns', '#controllers/streamer/campaigns_controller.index')
    router.post('campaigns/:id/leave', '#controllers/streamer/campaigns_controller.leave')
  })
    .prefix('/streamer')
    .use(middleware.auth())
    .use(middleware.role('STREAMER'))
}).prefix('/api/v2')
```

---

### Phase 6 : Tests

#### Tests Unitaires (Japa)
```typescript
// tests/unit/services/campaign_service.spec.ts
test.group('CampaignService', () => {
  test('should create a campaign', async ({ assert }) => {
    // ...
  })
})

// tests/unit/repositories/campaign_repository.spec.ts
// tests/unit/validators/create_campaign_validator.spec.ts
```

#### Tests E2E
```typescript
// tests/functional/campaigns/create.spec.ts
test('POST /api/v2/mj/campaigns', async ({ client, assert }) => {
  const response = await client
    .post('/api/v2/mj/campaigns')
    .json({ name: 'Test Campaign' })
    .withGuard('session')
    .loginAs(user)

  response.assertStatus(201)
  assert.properties(response.body(), ['id', 'name'])
})
```

---

## 🔄 Workflow de Développement

### 1. Compléter les Repositories restants (7 fichiers)
Utiliser le même pattern que UserRepository, CampaignRepository, StreamerRepository.

### 2. Créer les 4 Poll Services
En s'inspirant du `poll_service.ts` existant dans backend v1.

### 3. Créer les 7 Controllers
Utiliser l'injection de dépendances avec `@inject()`.

### 4. Créer les Routes V2
Avec préfixe `/api/v2` et middleware appropriés.

### 5. Copier les middleware manquants
```bash
cp ../backend/app/middleware/auth_middleware.ts app/middleware/
cp ../backend/app/middleware/role_middleware.ts app/middleware/
cp ../backend/app/middleware/guest_middleware.ts app/middleware/
```

### 6. Mettre à jour start/kernel.ts
Enregistrer les nouveaux middleware.

### 7. Tester
- Créer fichier `.env` depuis `.env.example`
- Lancer Redis: `redis-server`
- Lancer backend-v2: `npm run dev`
- Tester les routes avec curl/Postman

---

## 📝 Commandes Utiles

```bash
# Backend V2
cd backend-v2
npm install
npm run dev              # Port 3334

# Générer APP_KEY
node ace generate:key

# Migrations (partagées avec v1)
node ace migration:run

# Tests
npm test
```

---

## 🎯 Checklist Finale

### Backend-V2
- [x] Infrastructure (Redis, Sentry, Pino)
- [x] Middleware (tracing, validation, error handler)
- [x] Container IoC
- [x] DTOs (12 fichiers)
- [x] Validators Zod (6 fichiers)
- [x] Repositories (3/10)
- [x] Services Auth & Campaign (4 fichiers)
- [ ] Services Poll (4 fichiers)
- [ ] Controllers (7 fichiers)
- [ ] Routes V2
- [ ] Tests

### Frontend-V2
- [ ] Toutes les phases à venir selon le plan

---

## 💡 Notes Importantes

1. **ESLint Warnings**: Les warnings "File ignored because outside of base path" sont normaux et n'affectent pas le fonctionnement.

2. **Port**: Backend-V2 utilise le port 3334 (différent de v1: 3333) pour permettre de tester les deux versions en parallèle.

3. **Base de données**: Les deux versions partagent la même base PostgreSQL et les mêmes modèles Lucid.

4. **Architecture modulaire**: Chaque layer (Controller → Service → Repository → Model) est bien séparé avec injection de dépendances.

5. **Validation**: Toutes les entrées sont validées avec Zod avant d'atteindre les controllers.

6. **Logging**: Pino logger avec request tracing et Sentry pour les erreurs production.

7. **Cache**: Redis utilisé pour cacher les résultats de polls, tokens et app tokens.

---

**Prochaine étape recommandée**: Compléter les 7 repositories restants, puis créer les 4 Poll services.
