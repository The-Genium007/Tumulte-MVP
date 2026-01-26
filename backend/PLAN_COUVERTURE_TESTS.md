# Plan d'Augmentation de la Couverture de Tests Backend

> **Objectif**: Atteindre 85%+ de couverture pour être "Sentry-ready" (production-grade)
> **Couverture actuelle**: 67.08% Statements | 80.52% Branches | 45.06% Functions

## État Actuel de la Couverture

### ✅ Zones Bien Couvertes (>80%)
| Fichier/Module | Couverture | Notes |
|----------------|------------|-------|
| `validators/campaigns/` | 100% | Parfait |
| `validators/polls/` | 100% | Parfait |
| `services/resilience/` | 87.62% | Bon |
| `services/campaigns/` | 88.88% | Bon |
| `services/support/` | 92.64% | Bon |
| `models/` (la plupart) | >90% | Bon |

### ⚠️ Zones à Améliorer (50-80%)
| Fichier/Module | Couverture | Priorité |
|----------------|------------|----------|
| `repositories/` | 59.19% | HAUTE |
| `services/auth/` | 54.15% | HAUTE |
| `models/user.ts` | 63.22% | HAUTE |
| `models/subscription.ts` | 72.79% | MOYENNE |
| `services/resilience/retry_event_store.ts` | 53.3% | MOYENNE |

### ❌ Zones Critiques à Couvrir (<50%)
| Fichier/Module | Couverture | Priorité |
|----------------|------------|----------|
| `services/vtt/` | 29.71% | **CRITIQUE** |
| `services/notifications/` | 44.17% | **CRITIQUE** |
| `services/auth/twitch_auth_service.ts` | 35.66% | **CRITIQUE** |
| `models/overlay_config.ts` | 29.69% | HAUTE |
| `commands/` | 19.14% | BASSE |

---

## Phase 1: Services Critiques (Priorité CRITIQUE)

> **Durée estimée**: 8-10 heures
> **Impact**: +10-15% de couverture globale

### 1.1 Services VTT (29.71% → 80%)

**Fichiers à tester**:
- `vtt_websocket_service.ts` (19.05%)
- `vtt_webhook_service.ts` (21.29%)
- `vtt_sync_service.ts` (22.53%)
- `dice_roll_service.ts` (29.49%)

**Tests à créer**: `tests/unit/services/vtt/`

```typescript
// tests/unit/services/vtt/vtt_websocket_service.spec.ts
describe('VttWebSocketService', () => {
  describe('setup', () => {
    it('should register all event handlers')
    it('should handle connection events')
    it('should handle disconnection events')
  })

  describe('handleFoundryConnect', () => {
    it('should validate connection token')
    it('should reject invalid tokens')
    it('should store connection in memory map')
  })

  describe('broadcastToFoundry', () => {
    it('should emit event to correct room')
    it('should handle missing connection gracefully')
  })

  describe('handlePollStart', () => {
    it('should notify all connected Foundry instances')
    it('should include poll data in event')
  })

  describe('handlePollEnd', () => {
    it('should broadcast results to Foundry')
    it('should clean up poll state')
  })
})
```

```typescript
// tests/unit/services/vtt/vtt_sync_service.spec.ts
describe('VttSyncService', () => {
  describe('syncCampaignsFromVtt', () => {
    it('should fetch campaigns from VTT API')
    it('should create new campaigns for unknown ones')
    it('should update existing campaigns')
    it('should handle API errors gracefully')
  })

  describe('syncCharactersFromVtt', () => {
    it('should fetch characters for a campaign')
    it('should update character assignments')
    it('should handle missing characters')
  })
})
```

```typescript
// tests/unit/services/vtt/dice_roll_service.spec.ts
describe('DiceRollService', () => {
  describe('processWebhookPayload', () => {
    it('should validate webhook signature')
    it('should parse dice roll data')
    it('should store roll in database')
    it('should broadcast via WebSocket')
  })

  describe('getDiceRollHistory', () => {
    it('should return recent rolls for campaign')
    it('should paginate results')
    it('should filter by character')
  })
})
```

---

### 1.2 Service Notifications (44.17% → 80%)

**Fichier principal**: `push_notification_service.ts` (32.97%)

**Tests à créer**: `tests/unit/services/notifications/`

```typescript
// tests/unit/services/notifications/push_notification_service.spec.ts
describe('PushNotificationService', () => {
  describe('sendNotification', () => {
    it('should send to all user subscriptions')
    it('should handle invalid subscriptions (410 Gone)')
    it('should remove expired subscriptions')
    it('should respect user preferences')
  })

  describe('sendPollStartNotification', () => {
    it('should notify all authorized streamers')
    it('should include poll details in payload')
    it('should skip users with notifications disabled')
  })

  describe('sendPollEndNotification', () => {
    it('should include results summary')
    it('should notify campaign owner')
  })

  describe('sendInvitationNotification', () => {
    it('should notify invited streamer')
    it('should include campaign name')
  })

  describe('checkPreferences', () => {
    it('should return true if notification type enabled')
    it('should return false if user disabled type')
    it('should use defaults for new users')
  })
})
```

---

### 1.3 Service Auth Twitch (35.66% → 80%)

**Fichier principal**: `twitch_auth_service.ts`

**Tests à créer**: `tests/unit/services/auth/`

```typescript
// tests/unit/services/auth/twitch_auth_service.spec.ts
describe('TwitchAuthService', () => {
  describe('exchangeCodeForTokens', () => {
    it('should exchange valid code for tokens')
    it('should handle invalid code error')
    it('should handle network errors')
    it('should validate token response format')
  })

  describe('refreshAccessToken', () => {
    it('should refresh with valid refresh token')
    it('should handle expired refresh token')
    it('should update stored tokens')
  })

  describe('validateAccessToken', () => {
    it('should return true for valid token')
    it('should return false for expired token')
    it('should handle rate limiting')
  })

  describe('revokeToken', () => {
    it('should revoke access token')
    it('should add to revocation list')
    it('should handle already-revoked tokens')
  })

  describe('getUserInfo', () => {
    it('should fetch Twitch user profile')
    it('should handle missing permissions')
  })
})
```

---

## Phase 2: Repositories & Models (Priorité HAUTE)

> **Durée estimée**: 6-8 heures
> **Impact**: +8-10% de couverture globale

### 2.1 Repositories (59.19% → 85%)

**Tests à créer/améliorer**:

```typescript
// tests/unit/repositories/notification_preference_repository.spec.ts (38.88%)
describe('NotificationPreferenceRepository', () => {
  describe('findByUserId', () => {
    it('should return preferences for user')
    it('should return null for non-existent user')
  })

  describe('createDefaults', () => {
    it('should create default preferences for new user')
    it('should not duplicate if already exists')
  })

  describe('updatePreferences', () => {
    it('should update specific notification types')
    it('should preserve other preferences')
  })
})

// tests/unit/repositories/push_subscription_repository.spec.ts (54.71%)
describe('PushSubscriptionRepository', () => {
  describe('findByUserId', () => {
    it('should return all subscriptions for user')
    it('should return empty array for no subscriptions')
  })

  describe('create', () => {
    it('should create new subscription')
    it('should handle duplicate endpoint')
  })

  describe('deleteByEndpoint', () => {
    it('should remove subscription')
    it('should handle non-existent endpoint')
  })

  describe('deleteExpired', () => {
    it('should remove subscriptions older than threshold')
  })
})

// tests/unit/repositories/overlay_studio_repository.spec.ts (needs creation)
describe('OverlayStudioRepository', () => {
  describe('findByStreamerId', () => {})
  describe('findActiveConfig', () => {})
  describe('create', () => {})
  describe('update', () => {})
  describe('activate', () => {})
  describe('delete', () => {})
})

// tests/unit/repositories/poll_repository.spec.ts (needs more tests)
describe('PollRepository', () => {
  describe('findByCampaign', () => {})
  describe('findWithInstances', () => {})
  describe('create', () => {})
  describe('update', () => {})
  describe('delete', () => {})
})
```

### 2.2 Models (Améliorer les zones faibles)

```typescript
// tests/unit/models/user.spec.ts (63.22%)
describe('User Model', () => {
  describe('password hashing', () => {
    it('should hash password before save')
    it('should verify correct password')
    it('should reject incorrect password')
  })

  describe('role management', () => {
    it('should default to STREAMER role')
    it('should allow role change')
  })

  describe('email verification', () => {
    it('should track verification status')
    it('should store verification token')
  })

  describe('OAuth providers', () => {
    it('should link Google account')
    it('should link Twitch account')
    it('should unlink provider')
    it('should prevent unlinking last auth method')
  })
})

// tests/unit/models/overlay_config.spec.ts (29.69%)
describe('OverlayConfig Model', () => {
  describe('serialization', () => {
    it('should serialize config JSON correctly')
    it('should deserialize config JSON correctly')
  })

  describe('activation', () => {
    it('should mark config as active')
    it('should deactivate other configs when activating')
  })

  describe('validation', () => {
    it('should validate theme config')
    it('should validate animation config')
    it('should reject invalid color values')
  })
})

// tests/unit/models/subscription.spec.ts (72.79%)
describe('Subscription Model', () => {
  describe('status management', () => {
    it('should track subscription status')
    it('should handle expiration')
  })

  describe('features', () => {
    it('should return correct features for plan')
    it('should check feature access')
  })
})
```

---

## Phase 3: Controllers Fonctionnels (Priorité MOYENNE)

> **Durée estimée**: 8-10 heures
> **Impact**: +10-12% de couverture globale

### 3.1 Auth Controllers

```typescript
// tests/functional/auth/register.spec.ts
describe('POST /auth/register', () => {
  it('should create user with valid data')
  it('should reject duplicate email')
  it('should send verification email')
  it('should hash password')
  it('should reject weak passwords')
  it('should reject invalid email format')
})

// tests/functional/auth/login.spec.ts
describe('POST /auth/login', () => {
  it('should login with correct credentials')
  it('should reject incorrect password')
  it('should reject non-existent email')
  it('should reject unverified email')
  it('should create session')
  it('should rate limit after failures')
  it('should track login attempts')
})

// tests/functional/auth/password.spec.ts
describe('Password Management', () => {
  describe('POST /auth/forgot-password', () => {
    it('should send reset email for valid email')
    it('should not reveal if email exists')
    it('should rate limit requests')
  })

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token')
    it('should reject expired token')
    it('should reject used token')
    it('should logout all sessions after reset')
  })

  describe('POST /auth/change-password', () => {
    it('should change password when authenticated')
    it('should require current password')
    it('should reject weak new password')
  })
})

// tests/functional/auth/oauth.spec.ts
describe('OAuth Flows', () => {
  describe('GET /auth/twitch/redirect', () => {
    it('should redirect to Twitch with correct params')
    it('should include required scopes')
  })

  describe('GET /auth/twitch/callback', () => {
    it('should create user on first login')
    it('should link existing account')
    it('should handle denied authorization')
    it('should handle invalid code')
  })

  describe('POST /auth/link/twitch', () => {
    it('should link Twitch to existing account')
    it('should reject if already linked')
  })

  describe('POST /auth/unlink', () => {
    it('should unlink provider')
    it('should prevent unlinking last auth method')
  })
})
```

### 3.2 Notifications Controller

```typescript
// tests/functional/notifications/push.spec.ts
describe('Push Notifications', () => {
  describe('POST /notifications/subscribe', () => {
    it('should create subscription with valid VAPID key')
    it('should reject invalid subscription')
    it('should handle duplicate endpoint')
  })

  describe('DELETE /notifications/subscribe', () => {
    it('should remove subscription')
    it('should handle non-existent subscription')
  })

  describe('GET /notifications/preferences', () => {
    it('should return user preferences')
    it('should return defaults for new user')
  })

  describe('PUT /notifications/preferences', () => {
    it('should update preferences')
    it('should validate preference values')
  })

  describe('POST /notifications/test', () => {
    it('should send test notification')
    it('should require at least one subscription')
  })
})
```

### 3.3 Overlay Studio Controller

```typescript
// tests/functional/overlay-studio/configs.spec.ts
describe('Overlay Studio Configs', () => {
  describe('GET /streamer/overlay-studio/configs', () => {
    it('should return all user configs')
    it('should paginate results')
  })

  describe('POST /streamer/overlay-studio/configs', () => {
    it('should create new config')
    it('should validate config schema')
    it('should enforce max configs limit')
  })

  describe('PUT /streamer/overlay-studio/configs/:id', () => {
    it('should update config')
    it('should reject unauthorized access')
  })

  describe('POST /streamer/overlay-studio/configs/:id/activate', () => {
    it('should activate config')
    it('should deactivate previous active config')
  })

  describe('DELETE /streamer/overlay-studio/configs/:id', () => {
    it('should delete config')
    it('should prevent deleting active config')
  })
})
```

---

## Phase 4: Services Secondaires (Priorité BASSE)

> **Durée estimée**: 4-6 heures
> **Impact**: +5-7% de couverture globale

### 4.1 Services à Tester

```typescript
// tests/unit/services/overlay_studio_service.spec.ts
describe('OverlayStudioService', () => {
  describe('getActiveConfig', () => {})
  describe('validateConfig', () => {})
  describe('applyTheme', () => {})
  describe('previewConfig', () => {})
})

// tests/unit/services/twitch_chat_service.spec.ts
describe('TwitchChatService', () => {
  describe('connect', () => {})
  describe('sendMessage', () => {})
  describe('announceCountdown', () => {})
  describe('announceResults', () => {})
})

// tests/unit/services/websocket_service.spec.ts
describe('WebSocketService', () => {
  describe('broadcastPollUpdate', () => {})
  describe('broadcastPollEnd', () => {})
  describe('notifyStreamer', () => {})
})
```

### 4.2 Retry Event Store (53.3% → 85%)

```typescript
// tests/unit/services/resilience/retry_event_store.spec.ts (améliorer)
describe('RetryEventStore', () => {
  describe('recordAttempt', () => {
    it('should store attempt in Redis')
    it('should include timestamp')
    it('should set TTL')
  })

  describe('getRecentAttempts', () => {
    it('should return attempts within time window')
    it('should order by timestamp')
  })

  describe('getStats', () => {
    it('should calculate success rate')
    it('should count total attempts')
    it('should track failures by type')
  })

  describe('cleanup', () => {
    it('should remove old entries')
    it('should preserve recent entries')
  })
})
```

---

## Phase 5: Nouveaux Services (Résilience)

> **Durée estimée**: 3-4 heures
> **Impact**: Couvrir les nouveaux fichiers créés

### 5.1 Services Monitoring & Cache

```typescript
// tests/unit/services/monitoring/metrics_service.spec.ts
describe('MetricsService', () => {
  describe('recordHttpRequest', () => {
    it('should increment request counter')
    it('should record duration histogram')
    it('should label by method, route, status')
  })

  describe('recordPollLaunch', () => {
    it('should increment poll counter')
    it('should label by campaign')
  })

  describe('recordVote', () => {
    it('should increment vote counter')
    it('should label by campaign and streamer')
  })

  describe('setDbPoolMetrics', () => {
    it('should set active and idle gauges')
  })

  describe('getMetrics', () => {
    it('should return Prometheus format')
    it('should include default metrics')
  })
})

// tests/unit/services/cache/cache_warmer.spec.ts
describe('CacheWarmer', () => {
  describe('warmup', () => {
    it('should warm campaigns cache')
    it('should warm streamers cache')
    it('should handle partial failures')
  })

  describe('warmActiveCampaigns', () => {
    it('should cache recent campaigns')
    it('should limit to 100 campaigns')
    it('should set correct TTL')
  })

  describe('warmActiveStreamers', () => {
    it('should cache streamers with valid tokens')
    it('should limit to 200 streamers')
  })

  describe('clearWarmedCache', () => {
    it('should remove all warmed entries')
    it('should use SCAN for safety')
  })
})

// tests/unit/services/auth/session_service.spec.ts
describe('SessionService', () => {
  describe('registerSession', () => {
    it('should store session mapping')
    it('should include metadata')
    it('should set TTL')
  })

  describe('getActiveSessions', () => {
    it('should return all user sessions')
    it('should clean up stale mappings')
    it('should sort by last activity')
  })

  describe('revokeSession', () => {
    it('should delete from Redis')
    it('should remove from mapping')
  })

  describe('revokeAllSessions', () => {
    it('should revoke all user sessions')
    it('should optionally keep current session')
  })
})
```

### 5.2 Health Controller

```typescript
// tests/functional/health/health.spec.ts
describe('Health Endpoints', () => {
  describe('GET /health', () => {
    it('should return healthy status')
    it('should include timestamp')
  })

  describe('GET /health/ready', () => {
    it('should check database connection')
    it('should check Redis connection')
    it('should return 503 if service down')
  })

  describe('GET /health/live', () => {
    it('should always return 200 if app running')
  })

  describe('GET /health/details', () => {
    it('should require authentication')
    it('should return detailed service status')
    it('should include pool metrics')
    it('should include memory usage')
  })
})

// tests/functional/metrics/metrics.spec.ts
describe('GET /metrics', () => {
  it('should require authentication')
  it('should return Prometheus format')
  it('should include HTTP metrics')
  it('should include business metrics')
})
```

---

## Checklist de Validation

### Avant Merge

- [ ] Couverture globale > 80%
- [ ] Couverture fonctions > 70%
- [ ] Aucun fichier critique < 60%
- [ ] Tous les services créés pour la résilience testés
- [ ] Tests Sentry integration (error capturing)

### Tests Sentry à Ajouter

```typescript
// tests/unit/sentry/error_reporting.spec.ts
describe('Sentry Error Reporting', () => {
  it('should capture unhandled exceptions')
  it('should include request context')
  it('should include user context when authenticated')
  it('should respect PII settings')
  it('should capture breadcrumbs')
})

// tests/functional/sentry/integration.spec.ts
describe('Sentry Integration', () => {
  it('should report 500 errors')
  it('should not report 4xx errors')
  it('should include transaction name')
  it('should track performance')
})
```

---

## Priorités Résumées

| Phase | Priorité | Durée | Impact |
|-------|----------|-------|--------|
| Phase 1: Services Critiques | **CRITIQUE** | 8-10h | +10-15% |
| Phase 2: Repositories & Models | HAUTE | 6-8h | +8-10% |
| Phase 3: Controllers Fonctionnels | MOYENNE | 8-10h | +10-12% |
| Phase 4: Services Secondaires | BASSE | 4-6h | +5-7% |
| Phase 5: Nouveaux Services | HAUTE | 3-4h | +3-5% |

**Total estimé**: 29-38 heures de travail
**Objectif final**: 85%+ de couverture (actuellement 67%)

---

## Commandes Utiles

```bash
# Couverture globale
npm run test:coverage

# Couverture d'un fichier spécifique
npm run test -- --files="tests/unit/services/vtt/*"

# Rapport HTML détaillé
npm run test:coverage && open coverage/lcov-report/index.html

# Vérifier le seuil de couverture
npm run coverage:check:prod  # Vérifie >= 85%
```
