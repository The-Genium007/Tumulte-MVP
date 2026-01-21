# 🚀 Quick Start - Testing VTT Integration

Quick guide to test VTT integration without needing to install Foundry VTT.

## 📋 Prerequisites

- Tumulte backend running (port 3333)
- PostgreSQL + Redis active
- VTT migrations executed
- VTT providers seeder executed

## 🛠️ Initial Setup

### 1. Verify everything is in place

```bash
cd backend

# Check migrations
node --loader ts-node-maintained/esm bin/console.ts migration:status

# Run seeders
node --loader ts-node-maintained/esm bin/console.ts db:seed

# Start server
npm run dev
```

Server should start on `http://localhost:3333`

### 2. Create a test VTT connection

You can manually create a VTT connection in the database for testing.

**Option A: Via psql**

```sql
-- 1. Get Foundry provider ID
SELECT id, name FROM vtt_providers WHERE name = 'foundry';

-- 2. Create test connection (replace USER_ID and PROVIDER_ID)
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
  'ta_test_' || md5(random()::text),  -- Generate unique key
  'http://localhost:3333/webhooks/vtt/dice-roll',
  'active',
  NOW(),
  NOW()
) RETURNING api_key;

-- 3. Create test campaign linked to this connection
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
  'Test campaign for VTT integration',
  'YOUR_USER_ID_HERE',
  'YOUR_VTT_CONNECTION_ID',
  'test-foundry-world',
  'Test Foundry World',
  NOW(),
  NOW()
);
```

**Option B: Via Node.js script (recommended)**

Create file `backend/commands/create_test_vtt_connection.ts`:

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

    // Find Foundry provider
    const foundryProvider = await VttProvider.query()
      .where('name', 'foundry')
      .firstOrFail()

    // Generate unique API key
    const apiKey = 'ta_test_' + randomBytes(16).toString('hex')

    // Create connection
    const connection = await VttConnection.create({
      userId: userId,
      vttProviderId: foundryProvider.id,
      name: 'Test Foundry Connection',
      apiKey: apiKey,
      webhookUrl: 'http://localhost:3333/webhooks/vtt/dice-roll',
      status: 'active'
    })

    this.logger.success(`Connection created: ${connection.id}`)

    // Create campaign
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

Then execute:
```bash
node --loader ts-node-maintained/esm bin/console.ts vtt:create-test
```

## 🧪 Testing Endpoints

**Note:** Replace `YOUR_API_KEY_HERE` with the key generated in previous step.

### Test 1: Connection Test

```bash
curl -X POST http://localhost:3333/webhooks/vtt/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

**Expected response (200 OK):**
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

### Test 2: Send Normal Dice Roll

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

**Expected response (200 OK):**
```json
{
  "success": true,
  "rollId": "uuid-of-dice-roll",
  "message": "Dice roll recorded successfully"
}
```

### Test 3: Send Critical Success

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

### Test 4: Send Critical Failure

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

### Test 5: Send Hidden Roll (Whisper)

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

## 🔍 Verify Results

### Check Database

```sql
-- View all dice rolls
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

-- View automatically created characters
SELECT
  id,
  name,
  vtt_character_id,
  character_type,
  created_at
FROM characters
ORDER BY created_at DESC;
```

### Monitor Backend Logs

In the terminal running `npm run dev`, you should see request logs:

```
[18:15:23.456] INFO (backend): POST /webhooks/vtt/dice-roll 200 45ms
[18:15:23.501] INFO (transmit): Broadcast to campaign/uuid/dice-rolls
[18:15:23.502] INFO (transmit): Broadcast to streamer/uuid/dice-rolls
```

### Test WebSocket (Optional)

If you want to test WebSocket reception, create a simple HTML file:

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
      // Subscribe to campaign channel
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

## 🧪 Complete Test Scenario

### 1. Setup (Once)
```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Migrations and seeders
cd backend
node --loader ts-node-maintained/esm bin/console.ts migration:run
node --loader ts-node-maintained/esm bin/console.ts db:seed

# Create test connection
node --loader ts-node-maintained/esm bin/console.ts vtt:create-test
# Save displayed API key
```

### 2. Start Backend
```bash
npm run dev
```

### 3. Connection Test
```bash
curl -X POST http://localhost:3333/webhooks/vtt/test \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

✅ Should return `200 OK` with connection info

### 4. Simulate Dice Rolls
```bash
# Normal roll
curl -X POST http://localhost:3333/webhooks/vtt/dice-roll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{"campaignId":"test-foundry-world","characterId":"char-1","characterName":"Gimli","rollFormula":"1d20+5","result":18,"diceResults":[13,5],"isCritical":false}'

# Critical success
curl -X POST http://localhost:3333/webhooks/vtt/dice-roll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{"campaignId":"test-foundry-world","characterId":"char-1","characterName":"Gimli","rollFormula":"1d20+5","result":25,"diceResults":[20,5],"isCritical":true,"criticalType":"success"}'
```

### 5. Verify Database
```sql
SELECT * FROM dice_rolls ORDER BY rolled_at DESC LIMIT 5;
SELECT * FROM characters;
```

✅ Should see rolls and "Gimli" character automatically created

## ❌ Troubleshooting

### Error 401 "Invalid API Key"
- Verify API key exists in `vtt_connections`
- Verify status is `active`
- No spaces before/after key

### Error 404 "Campaign not found"
- Verify `vtt_campaign_id` matches in both tables
- Verify `vtt_connection_id` is linked to correct connection

### Error 500
- Check backend logs
- Verify PostgreSQL is accessible
- Verify migrations are up to date

### No WebSocket received
- Verify Transmit is configured in `config/transmit.ts`
- Verify Redis is active (Transmit uses Redis for pub/sub)
- Test WebSocket connection with browser tool

## 📊 Expected Results

After running tests, you should have:

- ✅ 1 VTT connection in `vtt_connections` (status: active)
- ✅ 1 campaign in `campaigns` (with `vtt_connection_id` filled)
- ✅ 2-3 characters in `characters` (automatically created)
- ✅ 4-5 dice rolls in `dice_rolls`
- ✅ `last_webhook_at` updated on connection
- ✅ `last_sync_at` updated on characters

## 🎯 Next Step

Once backend tests succeed, you can:

1. **Test with real Foundry VTT**:
   - Install module in Foundry
   - Configure with real API key
   - Roll dice in Foundry
   - Verify reception in backend

2. **Create GM Frontend**:
   - VTT connections management page
   - Campaign import page
   - Character assignment

3. **Create Overlay**:
   - Dice roll display component
   - Critical animations
   - Real testing on OBS

---

**Good luck! 🎲✨**
