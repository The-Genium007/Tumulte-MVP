# Améliorations de la Traçabilité du Système de Sondages

## Vue d'ensemble

Ce document décrit les améliorations apportées au système de traçabilité pour le lancement et le suivi des sondages Twitch dans Tumulte.

## Objectifs

✅ **Logs structurés détaillés** à chaque étape du flux
✅ **Métriques de performance** avec timing précis
✅ **Traçabilité complète** de bout en bout (frontend → backend → API Twitch)
✅ **Détection proactive des erreurs** avec contexte complet
🔜 **Health checks** avant lancement
🔜 **Retry logic** pour les erreurs API Twitch

---

## 1. Contrôleur de Lancement (`polls_controller.ts`)

### Événements loggés

| Événement | Niveau | Quand | Informations incluses |
|-----------|--------|-------|----------------------|
| `poll_launch_forbidden` | WARN | Utilisateur non autorisé | userId, campaignId, raison |
| `poll_launch_initiated` | INFO | Début du lancement | userId, campaignId, title, optionsCount, durationSeconds |
| `poll_instance_created` | INFO | Instance créée en BDD | pollInstanceId, campaignId, status |
| `poll_launch_successful` | INFO | Lancement réussi | pollInstanceId, channelLinksCount |
| `poll_launch_failed` | ERROR | Échec du lancement | pollInstanceId, error, stack |

### Exemple de log
```json
{
  "event": "poll_launch_initiated",
  "userId": "abc-123",
  "campaignId": "e27495bf-7cde-4182-b6b6-f91849102c33",
  "title": "Quelle map préférez-vous ?",
  "optionsCount": 3,
  "durationSeconds": 60
}
```

---

## 2. Service de Création (`poll_creation_service.ts`)

### Événements loggés

| Événement | Niveau | Quand | Informations incluses |
|-----------|--------|-------|----------------------|
| `poll_creation_started` | INFO | Début de création | pollInstanceId, campaignId, title, durationSeconds |
| `streamers_loaded` | INFO | Streamers chargés | totalActiveMembers, authorizedMembers, unauthorizedMembers |
| `streamers_skipped_unauthorized` | WARN | Streamers sans autorisation | count, streamerIds |
| `streamer_compatibility_check` | INFO | Vérification compatibilité | compatibleCount, incompatibleCount, détails |
| `poll_creation_api_started` | INFO | Création API Twitch début | streamer_id, displayName, broadcasterType |
| `poll_created_api_success` | INFO | Création API réussie | twitchPollId, durationMs |
| `poll_creation_chat_started` | INFO | Création chat IRC début | streamer_id, broadcasterType |
| `poll_created_chat_success` | INFO | Création chat réussie | durationMs |
| `poll_creation_failed` | ERROR | Échec création | streamer_id, error, stack |
| `streamer_deactivated` | WARN | Streamer désactivé | raison |
| `poll_creation_completed` | INFO | Récapitulatif final | **métriques complètes** |

### Métriques du récapitulatif final

```json
{
  "event": "poll_creation_completed",
  "pollInstanceId": "8e7f582a-c044-42fc-8c7f-912597684330",
  "campaignId": "e27495bf-7cde-4182-b6b6-f91849102c33",
  "totalStreamers": 5,
  "compatibleStreamers": 4,
  "apiPollsCreated": 3,
  "chatPollsCreated": 1,
  "totalPollsCreated": 4,
  "errors": 0,
  "successRate": "100.0%",
  "totalDurationMs": 2547
}
```

### Informations sur les streamers non autorisés

Le système log maintenant les IDs des streamers actifs mais sans autorisation de sondage :

```json
{
  "event": "streamers_skipped_unauthorized",
  "pollInstanceId": "...",
  "campaign_id": "...",
  "count": 2,
  "streamerIds": ["streamer-123", "streamer-456"]
}
```

---

## 3. Service de Polling (`poll_polling_service.ts`)

### Événements loggés

| Événement | Niveau | Quand | Informations incluses |
|-----------|--------|-------|----------------------|
| `polling_already_running` | WARN | Polling existe déjà | pollInstanceId |
| `polling_started` | INFO | Début du polling | durationSeconds, startedAt, endsAt, timeRemainingSeconds |
| `websocket_poll_start_emitted` | INFO | WebSocket émis | pollInstanceId |
| `polling_interval_configured` | INFO | Interval configuré | intervalMs, expectedCycles |
| `poll_time_expired` | INFO | Temps écoulé | totalCycles, scheduledEnd, actualEnd |
| `poll_status_changed` | INFO | Changement de statut | oldStatus, newStatus, twitchPollId |
| `poll_fetch_success` | DEBUG | Poll récupéré avec succès | totalVotes, twitchStatus, durationMs |
| `poll_fetch_failed` | ERROR | Échec récupération | streamer_id, error |
| `polling_cycle_completed` | INFO | Cycle terminé | **métriques du cycle** |
| `polling_cycle_error` | ERROR | Erreur dans le cycle | cycle, error, stack |

### Métriques de chaque cycle (toutes les 3s)

```json
{
  "event": "polling_cycle_completed",
  "pollInstanceId": "8e7f582a-c044-42fc-8c7f-912597684330",
  "cycle": 5,
  "timeRemainingSeconds": 45,
  "totalStreamers": 4,
  "apiPolls": 3,
  "chatPolls": 1,
  "successfulPolls": 3,
  "failedPolls": 0,
  "totalVotes": 127,
  "cycleDurationMs": 456
}
```

### Progression en temps réel

Chaque cycle (3 secondes) log :
- Nombre de streamers interrogés
- Votes totaux agrégés
- Temps restant
- Taux de succès/échec
- Durée du cycle

---

## 4. Flux Complet de Logs

Voici un exemple de séquence de logs lors d'un lancement de poll :

```
[INFO] poll_launch_initiated (userId, campaignId, title, durationSeconds)
  ↓
[INFO] poll_instance_created (pollInstanceId, status=PENDING)
  ↓
[INFO] poll_creation_started (pollInstanceId, campaignId)
  ↓
[INFO] streamers_loaded (totalActiveMembers=5, authorizedMembers=4)
  ↓
[WARN] streamers_skipped_unauthorized (count=1, streamerIds=[...])
  ↓
[INFO] streamer_compatibility_check (compatible=4, incompatible=0)
  ↓
[INFO] poll_creation_api_started (streamer_id, broadcasterType=affiliate)
[INFO] poll_created_api_success (twitchPollId, durationMs=234)
  ↓
[INFO] poll_creation_chat_started (streamer_id, broadcasterType=none)
[INFO] poll_created_chat_success (durationMs=156)
  ↓
[INFO] poll_creation_completed (totalPollsCreated=4, successRate=100%, totalDurationMs=2547)
  ↓
[INFO] polling_started (durationSeconds=60, timeRemainingSeconds=60)
[INFO] websocket_poll_start_emitted
[INFO] polling_interval_configured (intervalMs=3000, expectedCycles=20)
  ↓
[INFO] polling_cycle_completed (cycle=1, totalVotes=0, successfulPolls=3)
[DEBUG] poll_fetch_success (streamer_id, totalVotes=0, durationMs=123)
  ↓ (toutes les 3 secondes)
[INFO] polling_cycle_completed (cycle=2, totalVotes=23, successfulPolls=3)
[INFO] polling_cycle_completed (cycle=3, totalVotes=47, successfulPolls=3)
...
  ↓
[INFO] poll_time_expired (totalCycles=20, scheduledEnd, actualEnd)
```

---

## 5. Informations de Débogage

### Logs de performance

Chaque opération critique inclut un `durationMs` :
- Création de poll API Twitch
- Création de poll chat IRC
- Récupération de votes (polling)
- Cycle complet de polling

### Détection d'anomalies

Le système détecte et log automatiquement :
- ✅ Streamers non autorisés (skipped)
- ✅ Streamers incompatibles (pas affiliate/partner pour API)
- ✅ Tokens expirés (avec refresh automatique)
- ✅ Changements de statut de poll
- ✅ Erreurs API Twitch
- ✅ Échecs de récupération de votes

---

## 6. Métriques Clés pour le Monitoring

### Au lancement

- **Nombre de streamers** : total vs autorisés vs compatibles
- **Taux de succès** : pourcentage de polls créés avec succès
- **Temps de création** : durée totale de création de tous les polls
- **Type de poll** : répartition API Twitch vs chat IRC

### Pendant le polling

- **Votes totaux** : agrégés de tous les streamers
- **Taux de réussite des polls** : successfulPolls / totalPolls
- **Temps de cycle** : durée de chaque cycle de 3s
- **Temps restant** : secondes avant la fin du poll

---

## 7. Utilisation pour le Debugging

### Identifier un problème de token

Recherchez ces événements :
```
event=token_invalid_refreshing → Token expiré détecté
event=token_refreshed_successfully → Refresh réussi
event=token_refresh_failed → Échec du refresh
event=streamer_deactivated → Streamer désactivé suite à erreur auth
```

### Vérifier la santé d'un poll

Recherchez par `pollInstanceId` :
```bash
grep "pollInstanceId\":\"8e7f582a-c044\"" logs.json
```

Analysez :
- Combien de streamers ont été ciblés ?
- Combien de polls ont été créés avec succès ?
- Y a-t-il des erreurs de polling ?
- Les votes augmentent-ils ?

### Identifier une API Twitch lente

Recherchez les `durationMs` élevés :
```bash
grep "poll_fetch_success" logs.json | grep "durationMs\":[0-9]{4,}"
```

---

## 8. Suggestions pour la Suite

### Health Check avant Lancement

Avant de créer un poll, vérifier :
- ✅ Tokens valides (API validate)
- ✅ API Twitch disponible (health check)
- ✅ WebSocket connecté
- ✅ Redis disponible

### Retry Logic

Pour les erreurs API Twitch :
- Erreur **429** (rate limit) → backoff exponentiel
- Erreur **500/502/503** → retry 3x avec délai
- Erreur **401** → refresh token automatique (✅ déjà fait)

### Alertes Automatiques

Créer des alertes si :
- Taux d'échec > 25% lors de la création
- Taux d'échec de polling > 50% pendant 3 cycles consécutifs
- Durée de cycle > 5 secondes
- Aucun vote après 10 secondes

### Dashboard Temps Réel

Afficher dans le frontend :
- Nombre de streamers actifs
- Votes en temps réel par streamer
- Statut de connexion de chaque streamer
- Indicateur de santé (vert/orange/rouge)

---

## 9. Format des Logs

Tous les logs suivent ce format structuré JSON :

```json
{
  "level": "INFO|WARN|ERROR|DEBUG",
  "timestamp": "2025-01-15T09:36:40.871Z",
  "event": "nom_de_l_evenement",
  "pollInstanceId": "uuid",
  "campaignId": "uuid",
  "streamer_id": "uuid",
  "...": "contexte spécifique"
}
```

### Niveaux de log

- **DEBUG** : Détails de chaque opération (fetch success, etc.)
- **INFO** : Événements normaux (création, cycles, etc.)
- **WARN** : Situations anormales mais gérables (unauthorized, skip)
- **ERROR** : Échecs nécessitant investigation

---

## 10. Fichiers Modifiés

| Fichier | Lignes modifiées | Améliorations |
|---------|------------------|---------------|
| `polls_controller.ts` | 28-108 | Logs de lancement avec contexte complet |
| `poll_creation_service.ts` | 25-260 | Métriques détaillées + timing + récapitulatif |
| `poll_polling_service.ts` | 46-250 | Logs de cycle avec compteurs et votes |
| `twitch_auth_service.ts` | 210-227 | Validation de token (pour refresh auto) |
| `twitch_chat_service.ts` | 32-87 | Refresh automatique avant connexion IRC |

---

## Conclusion

Le système de traçabilité est maintenant **production-ready** avec :

✅ Logs structurés à chaque étape
✅ Métriques de performance
✅ Contexte complet pour debugging
✅ Détection automatique des anomalies
✅ Visibilité temps réel sur la santé du système

**Prochaines étapes** : Health checks + Retry logic + Alerting automatique
