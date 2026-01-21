# 🚀 Quick Start - Tester l'Intégration VTT

Guide rapide pour tester l'intégration VTT sans avoir besoin d'installer Foundry VTT.

## 📋 Prérequis

- Backend Tumulte fonctionnel (port 3333)
- PostgreSQL + Redis actifs
- Migrations VTT exécutées
- Seeder VTT providers exécuté

## 🛠️ Setup Initial

### 1. Vérifier que tout est en place

```bash
cd backend

# Vérifier les migrations
node --loader ts-node-maintained/esm bin/console.ts migration:status

# Vérifier les seeders
node --loader ts-node-maintained/esm bin/console.ts db:seed

# Démarrer le serveur
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:3333`

### 2. Créer une connexion VTT de test

Vous pouvez créer manuellement une connexion VTT dans la base de données pour les tests.

**Option A : Via psql**

```sql
-- 1. Récupérer l'ID du provider Foundry
SELECT id, name FROM vtt_providers WHERE name = 'foundry';

-- 2. Créer une connexion de test (remplacer USER_ID et PROVIDER_ID)
INSERT INTO vtt_connections (
  id,
  user_id,
  vtt_provider_id,
  name,
  api_key,
  webhook_url,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID_HERE',
  'FOUNDRY_PROVIDER_ID_HERE',
  'Test Foundry Connection',
  'ta_test_' || md5(random()::text),  -- Génère une clé unique
  'http://localhost:3333/webhooks/vtt/dice-roll',
  'active',
  NOW(),
  NOW()
) RETURNING api_key;

-- 3. Créer une campagne de test liée à cette connexion
INSERT INTO campaigns (
  id,
  name,
  description,
  owner_id,
  vtt_connection_id,
  vtt_campaign_id,
  vtt_campaign_name,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test VTT Campaign',
  'Campagne de test pour l\'intégration VTT',
  'YOUR_USER_ID_HERE',
  'YOUR_VTT_CONNECTION_ID',
  'test-foundry-world',
  'Test Foundry World',
  NOW(),
  NOW()
);
```

**Option B : Via script Node.js (recommandé)**

Créez un fichier `backend/commands/create_test_vtt_connection.ts` :

```typescript
import { BaseCommand } from '@adonisjs/core/ace'
import VttProvider from '#models/vtt_provider'
import VttConnection from '#models/vtt_connection'
import { campaign as Campaign } from '#models/campaign'
import { randomBytes } from 'node:crypto'

export default class CreateTestVttConnection extends BaseCommand {
  static commandName = 'vtt:create-test'
  static description = 'Create a test VTT connection and campaign'

  async run() {
    const userId = await this.prompt.ask('Enter your User ID (UUID)')

    // Trouver le provider Foundry
    const foundryProvider = await VttProvider.query()
      .where('name', 'foundry')
      .firstOrFail()

    // Générer une API key unique
    const apiKey = 'ta_test_' + randomBytes(16).toString('hex')

    // Créer la connexion
    const connection = await VttConnection.create({
      userId: userId,
      vttProviderId: foundryProvider.id,
      name: 'Test Foundry Connection',
      apiKey: apiKey,
      webhookUrl: 'http://localhost:3333/webhooks/vtt/dice-roll',
      status: 'active'
    })

    this.logger.success(`Connection created: ${connection.id}`)

    // Créer une campagne
    const campaign = await Campaign.create({
      name: 'Test VTT Campaign',
      description: 'Test campaign for VTT integration',
      ownerId: userId,
      vttConnectionId: connection.id,
      vttCampaignId: 'test-foundry-world',
      vttCampaignName: 'Test Foundry World'
    })

    this.logger.success(`Campaign created: ${campaign.id}`)

    this.logger.info(`
📋 Configuration Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API Key: ${connection.apiKey}
Campaign ID (VTT): ${campaign.vttCampaignId}
Webhook URL: ${connection.webhookUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: Save this API key, you'll need it for testing!
    `)
  }
}
```

Ensuite exécutez :
```bash
node --loader ts-node-maintained/esm bin/console.ts vtt:create-test
```

## 🧪 Tester les Endpoints

**Note:** Remplacez `YOUR_API_KEY_HERE` par la clé générée à l'étape précédente.

### Test 1 : Test de Connexion

```bash
curl -X POST http://localhost:3333/webhooks/vtt/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

**Réponse attendue (200 OK) :**
```json
{
  "success": true,
  "message": "Connection test successful",
  "connection": {
    "id": "uuid-here",
    "name": "Test Foundry Connection",
    "provider": "Foundry VTT",
    "status": "active"
  }
}
```

### Test 2 : Envoyer un Dice Roll Normal

```bash
curl -X POST http://localhost:3333/webhooks/vtt/dice-roll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "campaignId": "test-foundry-world",
    "characterId": "char-123",
    "characterName": "Gimli",
    "rollId": "roll-456",
    "rollFormula": "1d20+5",
    "result": 18,
    "diceResults": [13, 5],
    "isCritical": false,
    "criticalType": null,
    "isHidden": false,
    "rollType": "attack",
    "metadata": {
      "foundryMessageId": "msg-789",
      "timestamp": 1704067200000
    }
  }'
```

**Réponse attendue (200 OK) :**
```json
{
  "success": true,
  "rollId": "uuid-of-dice-roll",
  "message": "Dice roll recorded successfully"
}
```

### Test 3 : Envoyer un Critique Success

```bash
curl -X POST http://localhost:3333/webhooks/vtt/dice-roll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "campaignId": "test-foundry-world",
    "characterId": "char-123",
    "characterName": "Gimli",
    "rollId": "roll-critical-success",
    "rollFormula": "1d20+5",
    "result": 25,
    "diceResults": [20, 5],
    "isCritical": true,
    "criticalType": "success",
    "isHidden": false,
    "rollType": "attack",
    "metadata": {
      "flavor": "Longsword Attack",
      "timestamp": 1704067200000
    }
  }'
```

### Test 4 : Envoyer un Critique Failure

```bash
curl -X POST http://localhost:3333/webhooks/vtt/dice-roll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "campaignId": "test-foundry-world",
    "characterId": "char-456",
    "characterName": "Legolas",
    "rollId": "roll-critical-failure",
    "rollFormula": "1d20+3",
    "result": 4,
    "diceResults": [1, 3],
    "isCritical": true,
    "criticalType": "failure",
    "isHidden": false,
    "rollType": "save",
    "metadata": {
      "flavor": "Dexterity Saving Throw",
      "timestamp": 1704067200000
    }
  }'
```

### Test 5 : Envoyer un Roll Caché (Whisper)

```bash
curl -X POST http://localhost:3333/webhooks/vtt/dice-roll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "campaignId": "test-foundry-world",
    "characterId": "npc-001",
    "characterName": "Goblin Boss",
    "rollId": "roll-hidden",
    "rollFormula": "1d20+2",
    "result": 15,
    "diceResults": [13, 2],
    "isCritical": false,
    "criticalType": null,
    "isHidden": true,
    "rollType": "stealth",
    "metadata": {
      "flavor": "Stealth Check (Hidden)",
      "timestamp": 1704067200000
    }
  }'
```

## 🔍 Vérifier les Résultats

### Vérifier en Base de Données

```sql
-- Voir tous les dice rolls
SELECT
  dr.id,
  dr.roll_formula,
  dr.result,
  dr.is_critical,
  dr.critical_type,
  dr.is_hidden,
  c.name as character_name,
  dr.rolled_at
FROM dice_rolls dr
JOIN characters c ON c.id = dr.character_id
ORDER BY dr.rolled_at DESC
LIMIT 10;

-- Voir les personnages créés automatiquement
SELECT
  id,
  name,
  vtt_character_id,
  character_type,
  created_at
FROM characters
ORDER BY created_at DESC;
```

### Surveiller les Logs Backend

Dans le terminal où tourne `npm run dev`, vous devriez voir les logs des requêtes :

```
[18:15:23.456] INFO (backend): POST /webhooks/vtt/dice-roll 200 45ms
[18:15:23.501] INFO (transmit): Broadcast to campaign/uuid/dice-rolls
[18:15:23.502] INFO (transmit): Broadcast to streamer/uuid/dice-rolls
```

### Tester les WebSocket (Optionnel)

Si vous voulez tester la réception WebSocket, créez un fichier HTML simple :

```html
<!DOCTYPE html>
<html>
<head>
  <title>Tumulte WebSocket Test</title>
</head>
<body>
  <h1>WebSocket Test</h1>
  <div id="messages"></div>
  <script>
    const campaignId = 'YOUR_CAMPAIGN_UUID_HERE'
    const ws = new WebSocket(`ws://localhost:3333/__transmit/events`)

    ws.onopen = () => {
      console.log('Connected to Transmit')
      // S'abonner au channel de campagne
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: `campaign/${campaignId}/dice-rolls`
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('Received:', data)

      const div = document.getElementById('messages')
      div.innerHTML += `<pre>${JSON.stringify(data, null, 2)}</pre><hr>`
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  </script>
</body>
</html>
```

## 🧪 Scénario de Test Complet

### 1. Setup (Une fois)
```bash
# Démarrer PostgreSQL et Redis
docker-compose up -d

# Migrations et seeders
cd backend
node --loader ts-node-maintained/esm bin/console.ts migration:run
node --loader ts-node-maintained/esm bin/console.ts db:seed

# Créer la connexion de test
node --loader ts-node-maintained/esm bin/console.ts vtt:create-test
# Sauvegarder l'API key affichée
```

### 2. Démarrer le Backend
```bash
npm run dev
```

### 3. Test de Connexion
```bash
curl -X POST http://localhost:3333/webhooks/vtt/test \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

✅ Devrait retourner `200 OK` avec les infos de connexion

### 4. Simuler des Dice Rolls
```bash
# Roll normal
curl -X POST http://localhost:3333/webhooks/vtt/dice-roll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{"campaignId":"test-foundry-world","characterId":"char-1","characterName":"Gimli","rollFormula":"1d20+5","result":18,"diceResults":[13,5],"isCritical":false}'

# Critique success
curl -X POST http://localhost:3333/webhooks/vtt/dice-roll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{"campaignId":"test-foundry-world","characterId":"char-1","characterName":"Gimli","rollFormula":"1d20+5","result":25,"diceResults":[20,5],"isCritical":true,"criticalType":"success"}'
```

### 5. Vérifier en Base
```sql
SELECT * FROM dice_rolls ORDER BY rolled_at DESC LIMIT 5;
SELECT * FROM characters;
```

✅ Devrait voir les rolls et le personnage "Gimli" créé automatiquement

## ❌ Dépannage

### Erreur 401 "Invalid API Key"
- Vérifiez que l'API key existe dans `vtt_connections`
- Vérifiez que le status est `active`
- Pas d'espaces avant/après la clé

### Erreur 404 "Campaign not found"
- Vérifiez que `vtt_campaign_id` correspond dans les deux tables
- Vérifiez que `vtt_connection_id` est lié à la bonne connexion

### Erreur 500
- Consultez les logs du backend
- Vérifiez que PostgreSQL est accessible
- Vérifiez que les migrations sont à jour

### Aucun WebSocket reçu
- Vérifiez que Transmit est configuré dans `config/transmit.ts`
- Vérifiez que Redis est actif (Transmit utilise Redis pour le pub/sub)
- Testez la connexion WebSocket avec l'outil navigateur

## 📊 Résultats Attendus

Après avoir exécuté les tests, vous devriez avoir :

- ✅ 1 connexion VTT dans `vtt_connections` (status: active)
- ✅ 1 campagne dans `campaigns` (avec `vtt_connection_id` renseigné)
- ✅ 2-3 personnages dans `characters` (créés automatiquement)
- ✅ 4-5 dice rolls dans `dice_rolls`
- ✅ `last_webhook_at` mis à jour sur la connexion
- ✅ `last_sync_at` mis à jour sur les personnages

## 🎯 Prochaine Étape

Une fois les tests backend réussis, vous pouvez :

1. **Tester avec Foundry VTT réel** :
   - Installer le module dans Foundry
   - Configurer avec la vraie API key
   - Lancer des dés dans Foundry
   - Vérifier la réception dans le backend

2. **Créer le Frontend GM** :
   - Page de gestion des connexions VTT
   - Page d'import de campagnes
   - Assignment des personnages

3. **Créer l'Overlay** :
   - Composant d'affichage des dice rolls
   - Animations des critiques
   - Test en conditions réelles sur OBS

---

**Bonne chance ! 🎲✨**
