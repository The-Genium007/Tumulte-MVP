# Test du Système de Mise à Jour Temps Réel de l'Overlay

## Résumé de l'Implémentation

### Modifications Apportées

**Fichier modifié:** `backend/app/services/polls/poll_polling_service.ts`

**Changements:**
- Ajout d'un système de broadcast en temps réel qui émet les résultats agrégés **toutes les secondes** (au lieu de 3 secondes)
- Les résultats sont lus depuis le cache Redis (léger) au lieu de recalculer depuis la BDD (coûteux)
- Le système fonctionne pour TOUS les types de polls (API Twitch + IRC Chat)

### Architecture du Flux de Données

```
┌─────────────────────────────────────────────────────────┐
│ COLLECTE DES VOTES                                       │
├─────────────────────────────────────────────────────────┤
│ Affiliés/Partners: API Twitch (toutes les 3s)          │
│ Non-Affiliés:      Bot IRC → Redis (temps réel)        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ AGRÉGATION (toutes les 3s)                              │
├─────────────────────────────────────────────────────────┤
│ • Lecture API Twitch OU Redis (IRC)                    │
│ • Sync vers BDD (poll_channel_links)                   │
│ • Agrégation globale (tous les streamers)              │
│ • Mise en cache Redis (TTL: 5s)                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ BROADCAST TEMPS RÉEL (toutes les 1s) ← NOUVEAU         │
├─────────────────────────────────────────────────────────┤
│ • Lecture cache Redis (O(1) - très rapide)             │
│ • Émission WebSocket (poll:update)                     │
│ • Tous les overlays connectés reçoivent les updates    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ AFFICHAGE OVERLAY (temps réel)                          │
├─────────────────────────────────────────────────────────┤
│ • Réception WebSocket poll:update                      │
│ • Mise à jour percentages (props reactive)             │
│ • Affichage automatique dans LivePollElement           │
└─────────────────────────────────────────────────────────┘
```

## Comment Tester

### Prérequis

1. Backend et Frontend en cours d'exécution
2. Redis actif
3. Au moins un streamer configuré
4. Une campagne créée avec au moins un membre

### Étape 1: Démarrer les Services

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Redis (si pas déjà lancé)
docker-compose up redis
```

### Étape 2: Ouvrir l'Overlay dans OBS ou Navigateur

**URL de l'overlay:**
```
http://localhost:3000/overlay/{STREAMER_ID}
```

Remplacez `{STREAMER_ID}` par l'ID du streamer que vous voulez tester.

**Dans OBS:**
1. Ajouter une source "Navigateur"
2. URL: `http://localhost:3000/overlay/{STREAMER_ID}`
3. Largeur: 1920, Hauteur: 1080
4. Cocher "Actualiser le navigateur à l'activation de la source"

**Dans un navigateur:**
- Ouvrir l'URL de l'overlay dans Chrome/Firefox
- Ouvrir la console (F12) pour voir les logs WebSocket

### Étape 3: Lancer un Poll

1. Connectez-vous en tant que Game Master
2. Sélectionnez votre campagne
3. Créez et lancez un nouveau poll avec une durée de 30-60 secondes

### Étape 4: Observer les Logs Backend

Dans le terminal backend, vous devriez voir ces événements **toutes les secondes** :

```json
{
  "event": "realtime_broadcast_emitted",
  "pollInstanceId": "xxx",
  "totalVotes": 0
}
```

Et ces événements **toutes les 3 secondes** :

```json
{
  "event": "polling_cycle_completed",
  "pollInstanceId": "xxx",
  "cycle": 1,
  "timeRemainingSeconds": 57,
  "totalVotes": 0
}
```

### Étape 5: Simuler des Votes

#### Option A: Votes via API Twitch (pour affiliés/partners)

Les votes se font directement sur Twitch. L'API sera interrogée toutes les 3 secondes.

#### Option B: Votes via Chat IRC (pour non-affiliés)

Les votes sont comptés en temps réel via le bot IRC qui écoute le chat Twitch.

**Format de vote dans le chat:**
```
!vote 1    # Vote pour l'option 1
!vote 2    # Vote pour l'option 2
```

### Étape 6: Vérifier l'Overlay

**Ce que vous devriez observer:**

1. ✅ **Apparition du poll** : Le poll s'affiche avec une animation d'entrée
2. ✅ **Mise à jour fluide** : Les pourcentages se mettent à jour **toutes les secondes** (pas toutes les 3s)
3. ✅ **Barres progressives** : Les barres de progression se remplissent progressivement
4. ✅ **Timer** : Le temps restant diminue seconde par seconde
5. ✅ **Résultats finaux** : À la fin, le poll affiche les résultats finaux

**Dans la console du navigateur:**

Vous devriez voir des logs comme :
```
[Overlay] Message received on streamer:xxx:polls: { event: 'poll:update', data: {...} }
```

Ces messages doivent apparaître **toutes les secondes**.

## Tests de Performance

### Test 1: Vérifier la Fréquence de Mise à Jour

**Objectif:** S'assurer que les mises à jour arrivent bien toutes les secondes.

**Méthode:**
1. Ouvrir la console du navigateur (F12)
2. Exécuter ce script pour compter les updates :

```javascript
let updateCount = 0;
let startTime = Date.now();

// Intercepter les logs WebSocket
const originalLog = console.log;
console.log = function(...args) {
  if (args[0]?.includes?.('poll:update')) {
    updateCount++;
    const elapsed = (Date.now() - startTime) / 1000;
    console.warn(`Updates: ${updateCount}, Temps écoulé: ${elapsed.toFixed(1)}s, Fréquence: ${(updateCount / elapsed).toFixed(2)} Hz`);
  }
  originalLog.apply(console, args);
};
```

**Résultat attendu:** Fréquence proche de 1 Hz (1 update par seconde)

### Test 2: Vérifier la Latence

**Objectif:** S'assurer que les votes apparaissent rapidement sur l'overlay.

**Méthode:**
1. Voter dans le chat Twitch
2. Chronométrer le temps avant que le vote n'apparaisse sur l'overlay

**Résultat attendu:**
- **Votes IRC (non-affiliés):** < 2 secondes (temps réel + broadcast)
- **Votes API (affiliés):** < 4 secondes (cycle de 3s + broadcast)

### Test 3: Vérifier l'Agrégation Multi-Streamers

**Objectif:** S'assurer que les votes de tous les streamers sont bien agrégés.

**Méthode:**
1. Créer une campagne avec 2+ streamers
2. Lancer un poll
3. Faire voter sur le chat de chaque streamer
4. Vérifier que les totaux sont corrects sur l'overlay

**Résultat attendu:** Les votes de tous les streamers sont additionnés correctement

## Logs à Surveiller

### Backend - Événements Importants

**Au démarrage du poll:**
```json
{
  "event": "realtime_broadcast_started",
  "pollInstanceId": "xxx",
  "intervalMs": 1000
}
```

**Toutes les secondes (mode debug):**
```json
{
  "event": "realtime_broadcast_emitted",
  "pollInstanceId": "xxx",
  "totalVotes": 42
}
```

**À la fin du poll:**
```json
{
  "event": "realtime_broadcast_stopped",
  "pollInstanceId": "xxx"
}
```

### Frontend - Console du Navigateur

**Connexion WebSocket:**
```
[WebSocket] Subscription created for streamer channel: streamer:xxx:polls
```

**Réception des updates:**
```
[Overlay] Message received on streamer:xxx:polls: { event: 'poll:update', ... }
```

## Dépannage

### Problème: Les Updates n'Apparaissent Pas Toutes les Secondes

**Causes possibles:**
1. Redis n'est pas démarré → Vérifier `docker-compose ps`
2. Le cache Redis est vide → Les updates n'arrivent que toutes les 3s
3. WebSocket déconnecté → Vérifier les logs frontend

**Solution:**
- Redémarrer Redis: `docker-compose restart redis`
- Vérifier les logs backend pour `realtime_broadcast_emitted`
- Vérifier la connexion WebSocket dans la console

### Problème: Les Votes ne s'Affichent Pas

**Causes possibles:**
1. Bot IRC non connecté (pour non-affiliés)
2. Problème de permissions Twitch (pour affiliés)
3. Le poll n'est pas démarré correctement

**Solution:**
- Vérifier les logs backend pour `chat_poll_sync_success` ou `poll_fetch_success`
- Vérifier que le streamer est bien membre de la campagne
- Relancer le poll

### Problème: L'Overlay ne se Met Pas à Jour

**Causes possibles:**
1. WebSocket déconnecté
2. L'overlay n'est pas sur le bon `streamerId`
3. Le poll n'est pas dans la bonne campagne

**Solution:**
- Rafraîchir la source OBS (clic droit → Rafraîchir)
- Vérifier l'URL de l'overlay
- Vérifier que le streamer est membre actif de la campagne

## Performance Attendue

### Charge Réseau

**Avant (toutes les 3s):**
- Broadcast WebSocket: ~0.33 Hz
- Taille moyenne: 500 bytes
- Bande passante: ~165 bytes/s par client

**Après (toutes les 1s):**
- Broadcast WebSocket: ~1 Hz
- Taille moyenne: 500 bytes
- Bande passante: ~500 bytes/s par client

**Impact:** +235 bytes/s par client → **Négligeable** (< 0.5 KB/s)

### Charge Serveur

**Redis:**
- 1 lecture cache par seconde par poll actif
- Opération O(1) très rapide (< 1ms)
- **Impact: Négligeable**

**Backend:**
- 1 émission WebSocket par seconde par poll actif
- **Impact: Négligeable** (WebSocket très efficient)

**BDD:**
- Aucun changement (toujours 1 requête toutes les 3s)
- **Impact: Aucun**

## Conclusion

Le système de mise à jour temps réel permet d'afficher les résultats des polls **3x plus rapidement** sur l'overlay (1s vs 3s), avec un impact négligeable sur les performances grâce à l'utilisation intelligente du cache Redis.

Les votes des streamers affiliés (API Twitch) et non-affiliés (IRC Chat) sont tous pris en compte et agrégés correctement.
