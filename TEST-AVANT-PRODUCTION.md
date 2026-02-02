# Test Avant Production

> **Note pour Claude** : Ce fichier centralise toutes les modifications de la version en cours et les tests manuels à effectuer avant mise en production. Ajouter ici chaque nouvelle feature, optimisation ou fix avec ses tests associés.

---

## Version actuelle : Optimisation API Twitch

**Objectif** : Réduire les appels API Twitch pour rester sous la limite de 800 requêtes/minute.

---

## Modifications effectuées

### 1. Singleton TwitchApiService

**Fichier** : `backend/start/container.ts` (ligne 72-76)

**Changement** : `bind()` → `singleton()` pour `twitchApiService`

**Pourquoi** : Le token d'application Twitch était régénéré à chaque requête HTTP car chaque injection créait une nouvelle instance. Maintenant une seule instance est partagée.

---

### 2. Cache Redis pour le statut live

**Fichier créé** : `backend/app/services/twitch/live_status_service.ts`

**Changement** : Nouveau service avec cache Redis de 30 secondes par campagne.

**Fichier modifié** : `backend/app/controllers/mj/campaigns_controller.ts`
- Import de `LiveStatusService` au lieu de `TwitchApiService`
- Méthode `liveStatus()` simplifiée, délègue au service

---

### 3. Polling intelligent côté frontend

**Fichier** : `frontend/pages/mj/campaigns/[id]/index.vue`

**Changements** :
- Intervalle adaptatif : 2 min si personne live, 30s si quelqu'un est live
- Pause automatique quand l'onglet est masqué (`visibilitychange`)
- Reprise immédiate quand l'onglet redevient visible

---

### 4. Debounce et déduplication

**Fichier** : `frontend/composables/useCampaigns.ts`

**Changements** :
- Debounce de 500ms sur `getLiveStatus()`
- Déduplication : si une requête est en cours pour la même campagne, on réutilise sa promesse

---

### 5. Optimisation des logs

**Fichier** : `backend/app/services/twitch/twitch_api_service.ts`

**Changements** :
- Log `twitch_app_token_renewed` uniquement lors d'un vrai renouvellement (plus à chaque appel)
- Log `twitch_streams_fetched` en niveau `debug` au lieu de `info`

---

## Tests manuels à effectuer

### Test 1 : Vérifier le cache Redis du statut live

1. Ouvrir la page `/mj/campaigns/[id]`
2. Observer les logs backend
3. Rafraîchir la page rapidement (< 30s)
4. **Attendu** : Le log `live_status_cache_hit` doit apparaître au 2ème appel

```
✅ Cache hit observé
❌ Nouvel appel Twitch à chaque fois
```

---

### Test 2 : Vérifier le singleton du token

1. Redémarrer le backend
2. Ouvrir la page `/mj/campaigns/[id]`
3. Attendre 1-2 minutes, observer les logs
4. **Attendu** : Un seul log `twitch_app_token_renewed` au démarrage, pas de répétition

```
✅ Token renouvelé une seule fois
❌ Token renouvelé à chaque requête
```

---

### Test 3 : Polling intelligent (personne live)

1. S'assurer qu'aucun streamer de la campagne n'est live
2. Ouvrir la page `/mj/campaigns/[id]`
3. Ouvrir la console navigateur
4. Attendre 2-3 minutes
5. **Attendu** : Log `[LiveStatus] Adjusting polling interval` vers 120000ms

```
✅ Intervalle à 2 minutes quand personne live
❌ Intervalle reste à 30 secondes
```

---

### Test 4 : Pause quand onglet masqué

1. Ouvrir la page `/mj/campaigns/[id]`
2. Changer d'onglet ou minimiser le navigateur
3. Attendre 1 minute
4. Observer les logs backend
5. **Attendu** : Aucune requête live-status pendant que l'onglet est masqué

```
✅ Pas de requêtes quand onglet masqué
❌ Requêtes continuent en arrière-plan
```

---

### Test 5 : Debounce des appels rapides

1. Ouvrir la console navigateur
2. Naviguer rapidement entre campagnes ou rafraîchir plusieurs fois
3. **Attendu** : Pas de requêtes doublées à moins de 500ms d'intervalle

```
✅ Requêtes dédupliquées
❌ Requêtes doublées visibles
```

---

### Test 6 : Fonctionnalité live status toujours OK

1. Ouvrir la page `/mj/campaigns/[id]`
2. Si un streamer est live, vérifier que le badge "Live" s'affiche
3. Vérifier que le nombre de viewers s'affiche (si applicable)
4. **Attendu** : Comportement identique à avant, juste moins de requêtes

```
✅ Badge live fonctionne
✅ Viewer count affiché
❌ Régression fonctionnelle
```

---

## Métriques de succès

| Métrique | Avant | Après | Objectif |
|----------|-------|-------|----------|
| Tokens Twitch / heure | ~120 | ~1 | < 5 |
| Appels API Twitch / min (idle) | 2 | 0.5 | < 1 |
| Requêtes doublées | ~20% | 0% | 0% |

---

## Bugs connus / À surveiller

- [ ] Vérifier que le cache Redis se vide bien après 30s
- [ ] Tester avec plusieurs utilisateurs simultanés sur la même campagne
- [ ] Vérifier le comportement si Redis est down (fallback ?)

---

## Historique des ajouts

| Date | Description | Testeur | Statut |
|------|-------------|---------|--------|
| 2026-01-29 | Optimisation API Twitch (5 changements) | - | À tester |
