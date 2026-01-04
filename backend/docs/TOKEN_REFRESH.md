# Système de Refresh Automatique des Tokens Twitch

## Vue d'ensemble

Le système de refresh automatique garantit que les tokens Twitch restent valides pendant toute la durée d'une session de jeu (jusqu'à 12h).

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX DE REFRESH TOKEN                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Streamer accorde autorisation 12h]                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────┐                                       │
│  │ Refresh immédiat    │ ← Token frais garanti                 │
│  │ + Stocker expiresAt │                                       │
│  └─────────────────────┘                                       │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────┐    Toutes les 3h30                    │
│  │ Scheduler Cron      │◄───────────────────┐                  │
│  │ TokenRefreshJob     │                    │                  │
│  └─────────────────────┘                    │                  │
│           │                                 │                  │
│           ▼                                 │                  │
│  ┌─────────────────────┐                    │                  │
│  │ Pour chaque streamer│                    │                  │
│  │ avec autorisation   │                    │                  │
│  │ active              │                    │                  │
│  └─────────────────────┘                    │                  │
│           │                                 │                  │
│           ▼                                 │                  │
│  ┌─────────────────────┐     ┌──────────────────────┐         │
│  │ Refresh réussi ?    │─No─►│ Notifier Streamer    │         │
│  └─────────────────────┘     │ + Notifier MJ        │         │
│           │Yes               │ + Désactiver streamer│         │
│           ▼                  └──────────────────────┘         │
│  ┌─────────────────────┐                                       │
│  │ Mettre à jour tokens│                                       │
│  │ + tokenExpiresAt    │                                       │
│  └─────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Composants

- **Refresh au grant** : Token refreshé immédiatement quand un streamer autorise sa chaîne
- **Scheduler** : Refresh proactif toutes les 3h30 pour les streamers avec autorisation active
- **Retry** : En cas d'échec, retry après 15 min. 2ème échec = désactivation + notifications

## Colonnes Base de Données (table `streamers`)

| Colonne | Type | Description |
|---------|------|-------------|
| `token_expires_at` | timestamp | Expiration du token access (~4h après refresh) |
| `last_token_refresh_at` | timestamp | Dernier refresh réussi |
| `token_refresh_failed_at` | timestamp | Dernier échec (pour retry policy) |

## Politique de Retry

```
1er échec → Marquer tokenRefreshFailedAt = now()
          → Le scheduler réessaiera dans ~15 min
          → Pas de notification

2ème échec → Si tokenRefreshFailedAt < 30 min ago
           → Désactiver streamer (isActive = false)
           → Notifier streamer + MJs des campagnes
           → Clear tokenRefreshFailedAt
```

## Guide de Test Manuel

### Prérequis

- Backend lancé en mode dev (`npm run dev`)
- PostgreSQL et Redis démarrés
- Un compte streamer connecté avec token Twitch valide
- Une campagne créée avec le streamer comme membre

### Scénario 1 : Refresh au Grant d'Autorisation

**Objectif** : Vérifier que le token est refreshé quand un streamer accorde l'autorisation.

1. Vérifier l'état initial du token :
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "SELECT twitch_display_name, token_expires_at, last_token_refresh_at
      FROM streamers WHERE twitch_login = 'TON_LOGIN';"
   ```

2. Accorder l'autorisation via l'UI (page Streamer → Campagnes → Autoriser)

3. Vérifier que le token a été refreshé :
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "SELECT twitch_display_name, token_expires_at, last_token_refresh_at
      FROM streamers WHERE twitch_login = 'TON_LOGIN';"
   ```

**Résultat attendu** :
- `token_expires_at` = ~4h dans le futur
- `last_token_refresh_at` = timestamp actuel

### Scénario 2 : Test du Scheduler (Trigger Manuel)

**Objectif** : Vérifier que la commande ace refresh les tokens correctement.

1. Exécuter la commande :
   ```bash
   cd backend
   node --loader ts-node-maintained/esm bin/console.ts token:refresh
   ```

2. Observer les logs :
   ```
   🔄 Token Refresh Command
   ========================

   Finding streamers with active authorization...

   Found X streamer(s) with active authorization:

     - DisplayName (login) ✓

   Starting refresh cycle...

   ═══════════════════════════════════════
                 REPORT
   ═══════════════════════════════════════
   Total streamers: X
   Success: X
   Failed: 0
   Skipped: 0
   ```

**Résultat attendu** :
- Tous les streamers avec autorisation active sont listés
- Les tokens qui expirent bientôt sont refreshés
- Les tokens encore valides (>1h) sont skipped

### Scénario 3 : Forcer le Refresh

```bash
# Forcer le refresh même si le token n'expire pas bientôt
node --loader ts-node-maintained/esm bin/console.ts token:refresh --force

# Refresh un streamer spécifique
node --loader ts-node-maintained/esm bin/console.ts token:refresh STREAMER_ID

# Mode dry-run (affiche ce qui serait fait sans exécuter)
node --loader ts-node-maintained/esm bin/console.ts token:refresh --dry-run
```

### Scénario 4 : Test du Retry (Simuler Échec)

**Objectif** : Vérifier la politique de retry (15 min puis désactivation).

1. Invalider manuellement un token en DB :
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "UPDATE streamers SET access_token_encrypted = 'invalid'
      WHERE twitch_login = 'TON_LOGIN';"
   ```

2. Premier trigger du scheduler :
   ```bash
   node --loader ts-node-maintained/esm bin/console.ts token:refresh --force
   ```

   **Résultat attendu** :
   - Le refresh échoue
   - `token_refresh_failed_at` = timestamp actuel
   - `is_active` reste `true` (pas encore désactivé)

3. Vérifier l'état :
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "SELECT twitch_display_name, is_active, token_refresh_failed_at
      FROM streamers WHERE twitch_login = 'TON_LOGIN';"
   ```

4. Deuxième trigger (après avoir attendu ou modifié le délai en dev) :
   ```bash
   node --loader ts-node-maintained/esm bin/console.ts token:refresh --force
   ```

   **Résultat attendu après 2ème échec** :
   - `is_active` = `false`
   - Notification push envoyée au streamer
   - Notification push envoyée aux MJs des campagnes concernées

### Scénario 5 : Health Check avec Auto-Refresh

**Objectif** : Vérifier que le health check tente un refresh automatique.

1. Simuler un token proche de l'expiration :
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
     "UPDATE streamers SET token_expires_at = NOW() + INTERVAL '30 minutes'
      WHERE twitch_login = 'TON_LOGIN';"
   ```

2. Lancer une session de sondage via l'UI MJ

3. Observer les logs :
   ```
   [HealthCheck] Token invalid for streamer X, attempting refresh...
   [HealthCheck] Token refreshed successfully for streamer X
   ```

**Résultat attendu** :
- Le health check détecte le token expirant
- Refresh automatique tenté et réussi
- La session peut être lancée normalement

## Commande Ace : token:refresh

```bash
# Refresh tous les streamers avec autorisation active
node --loader ts-node-maintained/esm bin/console.ts token:refresh

# Refresh un streamer spécifique
node --loader ts-node-maintained/esm bin/console.ts token:refresh STREAMER_ID

# Forcer le refresh même si le token n'est pas expiré
node --loader ts-node-maintained/esm bin/console.ts token:refresh --force

# Mode dry-run (affiche ce qui serait fait sans exécuter)
node --loader ts-node-maintained/esm bin/console.ts token:refresh --dry-run

# Combiner les options
node --loader ts-node-maintained/esm bin/console.ts token:refresh STREAMER_ID --force --dry-run
```

## Scheduler Cron

Le scheduler s'exécute automatiquement toutes les 3h30 en environnement web (production).

- **Expressions cron** : `0 0,7,14,21 * * *` et `30 3,10,17 * * *`
- **Heures d'exécution** : 00:00, 03:30, 07:00, 10:30, 14:00, 17:30, 21:00

Le scheduler est configuré dans :
- `app/services/scheduler/token_refresh_scheduler.ts` - Logique du scheduler
- `start/scheduler.ts` - Démarrage au boot (environnement web uniquement)
- `adonisrc.ts` - Configuration du preload

## Tests

### Tests Unitaires

```bash
npm run test:unit -- --files="tests/unit/services/token_refresh_service.spec.ts"
```

Couvrent :
- Getters `isTokenExpiringSoon` et `isTokenExpired`
- Persistance des colonnes de tracking
- `findStreamersWithActiveAuthorization`
- `findStreamersNeedingRetry`
- Politique de retry (`handleRefreshFailure`)
- Report de `refreshAllActiveTokens`

### Tests Fonctionnels

```bash
npm run test:functional -- --files="tests/functional/token_refresh.spec.ts"
```

Couvrent :
- Intégration avec le grant d'autorisation
- Tracking des tokens
- Intégration du service
- Cas limites (streamers multiples, inactifs, etc.)

## Dépannage

### Le refresh échoue systématiquement

1. Vérifier que le refresh token est valide :
   ```bash
   # Le refresh token peut avoir été révoqué par l'utilisateur sur Twitch
   # Solution : demander au streamer de se reconnecter
   ```

2. Vérifier les credentials Twitch :
   ```bash
   # Vérifier que TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET sont corrects dans .env
   ```

3. Vérifier les logs :
   ```bash
   # Chercher les erreurs TokenRefresh
   grep -i "TokenRefresh" logs/app.log
   ```

### Le scheduler ne se lance pas

1. Vérifier que le preload est configuré dans `adonisrc.ts`
2. Vérifier que l'environnement est `web` (pas `console` ou `test`)
3. Vérifier les logs au démarrage du serveur :
   ```
   [Scheduler] Token refresh scheduler started
   ```

### Notifications non reçues

1. Vérifier que le service de notifications push est configuré
2. Vérifier que les clés VAPID sont présentes (`backend/.vapid-keys.json`)
3. Vérifier que l'utilisateur a activé les notifications dans ses paramètres

### Streamer désactivé par erreur

Pour réactiver un streamer :
```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d twitch_polls -c \
  "UPDATE streamers SET is_active = true, token_refresh_failed_at = NULL
   WHERE twitch_login = 'TON_LOGIN';"
```

Le streamer devra se reconnecter pour obtenir un nouveau token valide.
