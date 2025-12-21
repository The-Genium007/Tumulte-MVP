# Guide de test : Système de sondage par chat

## Prérequis
✅ Backend démarré sur localhost:3333
✅ Redis actif sur 127.0.0.1:6379
✅ PostgreSQL actif sur 127.0.0.1:5432

## Scénario de test 1 : Poll hybride (API + Chat)

### Étape 1 : Créer une campagne avec streamers mixtes
1. Connectez-vous au frontend (localhost:3000)
2. Créez une nouvelle campagne
3. Invitez au moins 2 streamers :
   - Un streamer **affilié ou partenaire** (utilisera l'API Twitch)
   - Un streamer **non-affilié** (utilisera le chat)

### Étape 2 : Créer une session de poll
1. Créez une nouvelle session avec la campagne
2. Configurez :
   - Question : "Quelle est votre option préférée ?"
   - Options : ["Option 1", "Option 2", "Option 3"]
   - Durée : 30 secondes

### Étape 3 : Lancer le poll
1. Cliquez sur "Lancer le sondage"
2. **Vérifications backend** :

   Logs attendus pour streamer NON-AFFILIÉ :
   ```
   event: 'chat_poll_launched'
   poll_instance_id: '{pollInstanceId}'
   streamer_id: '{streamerId}'
   streamer_login: '{streamerLogin}'
   options_count: 3
   ```

   Logs attendus pour streamer AFFILIÉ :
   ```
   message: 'Poll created for streamer'
   twitch_poll_id: '{twitchPollId}'
   ```

3. **Vérifications frontend** :
   - Les deux streamers apparaissent dans la liste
   - Aucune indication visuelle de la différence entre API et chat

### Étape 4 : Vérifier le message initial dans le chat
Pour le streamer non-affilié, vérifiez que ce message apparaît dans son chat :
```
🎮 SONDAGE - 30 secondes
Quelle est votre option préférée ?
1️⃣ Option 1
2️⃣ Option 2
3️⃣ Option 3
Votez en tapant 1, 2, 3 !
```

### Étape 5 : Simuler des votes dans le chat
Dans le chat Twitch du streamer non-affilié, envoyez :
- `1` (3 fois de différents comptes si possible)
- `2` (2 fois)
- `3` (5 fois)
- `abc` (doit être ignoré)
- `11111` (doit être ignoré)
- `1 2` (doit être ignoré)

**Logs attendus** :
```
event: 'chat_vote_received'
poll_instance_id: '{pollInstanceId}'
streamer_id: '{streamerId}'
voter: 'username'
option_index: 0
new_count: 1
```

### Étape 6 : Vérifier les countdown messages
À t=20s (10 secondes avant la fin) :
```
⏰ Plus que 10 secondes pour voter !
```

À t=25-29s :
```
5
4
3
2
1
```

À t=30s :
```
🔒 Sondage clôturé ! Merci pour vos votes 🎉
```

### Étape 7 : Vérifier les résultats
1. Frontend doit afficher les résultats agrégés :
   - Option 1 : 3 votes (chat) + X votes (API)
   - Option 2 : 2 votes (chat) + X votes (API)
   - Option 3 : 5 votes (chat) + X votes (API)

2. **Vérification Redis** (si redis-cli disponible) :
   ```bash
   redis-cli HGETALL poll:chat:votes:{pollInstanceId}:{streamerId}
   ```
   Devrait afficher :
   ```
   "0" "3"
   "1" "2"
   "2" "5"
   ```

### Étape 8 : Vérifier WebSocket en temps réel
Pendant le poll, le frontend doit recevoir les événements `poll:update` toutes les 3 secondes avec les votes mis à jour.

---

## Scénario de test 2 : Annulation d'un poll chat

### Étape 1 : Lancer un poll (comme scénario 1)

### Étape 2 : Annuler le poll avant la fin
1. Cliquez sur "Annuler le sondage"
2. **Logs attendus** :
   ```
   event: 'countdown_cancelled'
   poll_instance_id: '{pollInstanceId}'
   timeouts_cleared: 7
   ```
   ```
   event: 'chat_poll_disconnected'
   poll_instance_id: '{pollInstanceId}'
   streamer_id: '{streamerId}'
   ```

3. **Message dans le chat** :
   ```
   ❌ Sondage annulé par le MJ
   ```

4. **Vérifications** :
   - Plus de votes ne sont comptés après l'annulation
   - Status du poll en DB : `CANCELLED`
   - Client IRC déconnecté

---

## Scénario de test 3 : Fallback Redis (en mémoire)

### Étape 1 : Arrêter Redis temporairement
```bash
# Arrêter Redis
redis-cli shutdown
```

### Étape 2 : Lancer un poll chat
Les votes devraient être stockés en mémoire (Map JavaScript)

**Logs attendus** :
```
event: 'redis_unavailable'
message: 'Falling back to in-memory storage'
```

### Étape 3 : Vérifier que les votes sont toujours comptés
Les résultats doivent apparaître correctement malgré l'absence de Redis.

### Étape 4 : Redémarrer Redis
```bash
redis-server /etc/redis/redis.conf
```

---

## Scénario de test 4 : Parsing strict des votes

Envoyez ces messages dans le chat et vérifiez qu'ils sont traités correctement :

| Message | Attendu | Raison |
|---------|---------|--------|
| `1` | ✅ Vote pour option 0 | Format valide |
| `3` | ✅ Vote pour option 2 | Format valide |
| `0` | ❌ Ignoré | Index invalide (commence à 1) |
| `11111` | ❌ Ignoré | Plus d'1 chiffre |
| `1 2` | ❌ Ignoré | Contient un espace |
| `abc` | ❌ Ignoré | Pas un chiffre |
| `  2  ` | ✅ Vote pour option 1 | Trim() appliqué |
| `5` | ❌ Ignoré (si 3 options) | Index > optionsCount |

---

## Vérifications finales

### Base de données
Requête pour vérifier les `poll_results` :
```sql
SELECT
  id,
  status,
  twitch_polls->>'{streamerId}'->>'mode' as mode,
  twitch_polls->>'{streamerId}'->>'status' as streamer_status
FROM poll_results
WHERE id = '{pollInstanceId}';
```

Le champ `mode` doit être `"CHAT"` pour les streamers non-affiliés.

### Logs backend
Filtrer les événements importants :
```bash
# Lancement du poll
grep "chat_poll_launched" logs.txt

# Votes reçus
grep "chat_vote_received" logs.txt

# Countdown
grep "countdown_message_sent" logs.txt

# Annulation
grep "countdown_cancelled" logs.txt
```

---

## Points de vigilance

1. **Scopes OAuth manquants** : Si le token du streamer n'a pas `chat:read` et `chat:edit`, le client IRC échouera. Vérifier les logs pour `chat_connection_failed`.

2. **Rate limiting Twitch** : Si trop de messages sont envoyés rapidement, Twitch peut ralentir ou bloquer temporairement. Le délai de 50ms entre les lignes du message initial devrait éviter ce problème.

3. **Messages multilignes** : Vérifier que chaque ligne du message initial apparaît bien séparément dans le chat (car Twitch IRC ne supporte pas les `\n` natifs).

4. **Votes après clôture** : Vérifier qu'aucun vote n'est compté après que le poll soit terminé. Le client IRC doit être marqué `active: false`.

5. **Compatibilité frontend** : Aucun changement ne doit être visible côté frontend. Les résultats doivent s'afficher identiquement qu'il s'agisse d'un poll API ou chat.

---

## Cas limites testés

- ✅ Poll avec uniquement des streamers chat (pas d'API)
- ✅ Poll avec uniquement des streamers API (pas de chat)
- ✅ Poll hybride (mix API + chat)
- ✅ Multiple polls simultanés pour différents streamers
- ✅ 100 votes simultanés dans le même chat
- ✅ Annulation pendant le countdown
- ✅ Redis indisponible
- ✅ Token OAuth invalide

---

## Commandes utiles

### Nettoyer Redis
```bash
redis-cli KEYS "poll:chat:votes:*" | xargs redis-cli DEL
```

### Vérifier les clients IRC actifs
```bash
# Dans les logs backend
grep "chat_clients_active" logs.txt
```

### Réinitialiser un poll bloqué
```sql
UPDATE poll_results SET status = 'CANCELLED', ended_at = NOW(), cancelled_at = NOW() WHERE id = '{pollInstanceId}';
```

---

## Résultats attendus

✅ **Fonctionnalités validées** :
- Connexion IRC réussie pour streamers non-affiliés
- Parsing strict des votes (1, 2, 3)
- Comptage incrémental dans Redis
- Messages countdown automatiques
- Agrégation des votes (API + chat)
- Annulation propre (déconnexion IRC + cleanup)
- Fallback en mémoire si Redis fail
- Invisibilité totale côté frontend

🔴 **Si échec** :
- Vérifier les logs backend pour les erreurs
- Vérifier les scopes OAuth du streamer
- Vérifier que Redis et PostgreSQL sont actifs
- Vérifier que le token d'accès du streamer est valide
