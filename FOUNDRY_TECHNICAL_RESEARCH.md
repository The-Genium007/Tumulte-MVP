# Foundry VTT - Recherche Technique Détaillée

**Date**: 2026-01-14
**Objectif**: Valider la faisabilité de l'intégration Foundry VTT avec Tumulte

---

## Conclusions Principales

✅ **FAISABILITÉ CONFIRMÉE** - L'intégration est techniquement possible
✅ **APPROCHE RECOMMANDÉE** - Module Foundry personnalisé avec webhooks
⚠️ **PAS D'API REST OFFICIELLE** - Utilisation du système de Hooks + Socket.IO
⚠️ **MODULE REQUIS** - Le MJ doit installer notre module Foundry

---

## Architecture d'Intégration Validée

```
┌─────────────────────────────────────────────────────┐
│  Foundry VTT (Self-hosted ou Cloud)                 │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  Module Tumulte                            │    │
│  │  - Hooks.on('createChatMessage')           │    │
│  │  - Capture dice rolls                      │    │
│  │  - Détecte critiques                       │    │
│  │  - Webhook POST vers Tumulte              │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                       ↓ HTTPS POST
┌─────────────────────────────────────────────────────┐
│  Backend Tumulte (AdonisJS)                         │
│  POST /webhooks/foundry/dice-roll                   │
│  - Enregistre le lancer en DB                       │
│  - Émet événement WebSocket                         │
│  - Déclenche overlay si critique                    │
└─────────────────────────────────────────────────────┘
                       ↓ WebSocket
┌─────────────────────────────────────────────────────┐
│  Frontend Nuxt                                      │
│  - Overlay affiche les critiques                    │
│  - Historique des lancers récents                   │
└─────────────────────────────────────────────────────┘
```

---

## 1. Accès aux Données Foundry

### ✅ Campagnes/Worlds

**Accessible via** : `game.world` object dans le module

```javascript
// Dans le module Foundry
const worldData = {
  id: game.world.id,
  title: game.world.title,
  description: game.world.description,
  system: game.world.system,
  gameSystem: game.system.id // Ex: "dnd5e", "pf2e"
}

// Envoi à Tumulte lors de la configuration
await fetch('https://tumulte.app/api/foundry/world-sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TUMULTE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(worldData)
})
```

**Structure de données** :
- `game.world.id` → UUID du world
- `game.world.title` → Nom de la campagne
- `game.world.description` → Description
- `game.world.system` → Système de jeu (dnd5e, pf2e, etc.)

### ✅ Personnages/Actors

**Accessible via** : `game.actors` collection

```javascript
// Lister tous les personnages joueurs
const playerCharacters = game.actors.filter(a => a.type === 'character')

// Récupérer un acteur spécifique
const actor = game.actors.get(actorId)

// Structure de données
const characterData = {
  id: actor.id,
  name: actor.name,
  type: actor.type, // "character" ou "npc"
  img: actor.img, // URL de l'avatar
  system: {
    abilities: actor.system.abilities, // FOR, DEX, CON, etc. (D&D 5e)
    attributes: {
      hp: actor.system.attributes.hp, // Points de vie
      ac: actor.system.attributes.ac  // Classe d'armure
    },
    skills: actor.system.skills // Compétences
  },
  items: actor.items.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    img: item.img,
    quantity: item.system.quantity
  }))
}
```

**Limitations** :
- ⚠️ La structure `system.*` varie selon le système de jeu (D&D 5e ≠ Pathfinder 2e)
- ✅ On peut normaliser les données côté backend Tumulte

### ✅ Inventaires

**Accessible via** : `actor.items` collection

```javascript
const inventory = actor.items
  .filter(i => ['weapon', 'equipment', 'consumable', 'loot'].includes(i.type))
  .map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    quantity: item.system.quantity || 1,
    weight: item.system.weight,
    rarity: item.system.rarity,
    img: item.img
  }))
```

---

## 2. Événements Temps Réel (Lancers de Dés)

### ✅ Hook System - Méthode Recommandée

**Foundry Hook** : `createChatMessage`

```javascript
Hooks.on('createChatMessage', (chatMessage) => {
  // Vérifier que c'est un lancer de dé
  if (!chatMessage.roll) return

  // Extraire les données
  const rollData = {
    messageId: chatMessage.id,
    actorId: chatMessage.speaker.actor,
    actorName: game.actors.get(chatMessage.speaker.actor)?.name,
    formula: chatMessage.roll.formula, // Ex: "1d20+5"
    total: chatMessage.roll.total, // Résultat final
    dice: chatMessage.roll.dice.map(d => ({
      faces: d.faces, // Ex: 20 pour d20
      results: d.results.map(r => r.result) // Ex: [18]
    })),

    // Visibilité
    isPublic: !chatMessage.blind && chatMessage.whisper.length === 0,
    isBlind: chatMessage.blind, // Dé caché (MJ uniquement)
    whisper: chatMessage.whisper, // IDs des destinataires

    // Critique (système D&D 5e)
    isCritical: chatMessage.flags?.dnd5e?.roll?.isCritical || false,
    rollType: chatMessage.flags?.dnd5e?.roll?.type, // "attack", "damage", "skill"

    timestamp: new Date()
  }

  // Envoyer à Tumulte
  sendToTumulte(rollData)
})
```

### ✅ Détection des Critiques

**Par Système de Jeu** :

#### D&D 5e
```javascript
const isCritSuccess = chatMessage.flags?.dnd5e?.roll?.isCritical === true
const isCritFailure = chatMessage.roll.dice[0]?.results[0]?.result === 1 &&
                     chatMessage.roll.dice[0]?.faces === 20
```

#### Pathfinder 2e
```javascript
const critSuccess = chatMessage.roll.total >= (chatMessage.flags?.pf2e?.context?.dc + 10)
const critFailure = chatMessage.roll.total <= (chatMessage.flags?.pf2e?.context?.dc - 10)
```

#### Détection Générique (si pas de flag système)
```javascript
function detectCritical(roll) {
  const d20 = roll.dice.find(d => d.faces === 20)
  if (!d20) return { isCritical: false }

  const natural = d20.results[0].result
  return {
    isCritical: natural === 20 || natural === 1,
    type: natural === 20 ? 'success' : 'failure'
  }
}
```

### ✅ Dés Cachés vs Publics

**Foundry offre 3 modes** :

| Mode | `blind` | `whisper` | Visible par |
|------|---------|-----------|-------------|
| Public | `false` | `[]` | Tous les joueurs + viewers |
| Whisper | `false` | `[gmId]` | MJ seulement |
| Blind | `true` | `[]` | MJ seulement (joueur ne voit pas le résultat) |

**Implémentation Tumulte** :

```javascript
function getRollVisibility(chatMessage) {
  if (chatMessage.blind) {
    return 'hidden' // Overlay affiche "???"
  }
  if (chatMessage.whisper.length > 0) {
    return 'gm-only' // Pas d'overlay pour les viewers
  }
  return 'public' // Overlay visible par tous
}
```

---

## 3. Module Foundry Personnalisé pour Tumulte

### Structure du Module

```
tumulte-integration/
├── module.json          # Manifest
├── scripts/
│   ├── module.js        # Point d'entrée
│   ├── dice-hooks.js    # Hooks pour lancers de dés
│   ├── api-client.js    # Client HTTP vers Tumulte
│   └── settings.js      # Configuration du module
├── styles/
│   └── module.css       # Styles (optionnel)
└── lang/
    ├── en.json          # Traductions anglais
    └── fr.json          # Traductions français
```

### `module.json` (Manifest)

```json
{
  "id": "tumulte-integration",
  "title": "Tumulte - Twitch Integration",
  "description": "Intégration avec Tumulte pour afficher les lancers de dés critiques sur Twitch",
  "version": "1.0.0",
  "authors": [
    {
      "name": "Tumulte",
      "url": "https://tumulte.app"
    }
  ],
  "compatibility": {
    "minimum": "11",
    "verified": "13"
  },
  "esmodules": ["scripts/module.js"],
  "socket": true,
  "languages": [
    {
      "lang": "en",
      "name": "English",
      "path": "lang/en.json"
    },
    {
      "lang": "fr",
      "name": "Français",
      "path": "lang/fr.json"
    }
  ],
  "url": "https://github.com/tumulte-app/foundry-integration",
  "manifest": "https://github.com/tumulte-app/foundry-integration/releases/latest/download/module.json",
  "download": "https://github.com/tumulte-app/foundry-integration/releases/latest/download/module.zip"
}
```

### `scripts/module.js` (Point d'entrée)

```javascript
import { registerSettings } from './settings.js'
import { registerDiceHooks } from './dice-hooks.js'

Hooks.once('init', () => {
  console.log('Tumulte Integration | Initializing...')
  registerSettings()
})

Hooks.once('ready', () => {
  console.log('Tumulte Integration | Ready!')

  // Vérifier la configuration
  const apiKey = game.settings.get('tumulte-integration', 'apiKey')
  if (!apiKey) {
    ui.notifications.warn('Tumulte Integration: API Key non configurée')
    return
  }

  // Enregistrer les hooks de dés
  registerDiceHooks()

  // Synchroniser le world au démarrage
  syncWorldData()
})

async function syncWorldData() {
  const apiUrl = game.settings.get('tumulte-integration', 'apiUrl')
  const apiKey = game.settings.get('tumulte-integration', 'apiKey')

  const worldData = {
    id: game.world.id,
    title: game.world.title,
    description: game.world.description,
    system: game.system.id
  }

  try {
    const response = await fetch(`${apiUrl}/webhooks/foundry/world-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(worldData)
    })

    if (response.ok) {
      ui.notifications.info('Tumulte: World synchronisé')
    } else {
      ui.notifications.error('Tumulte: Erreur de synchronisation')
    }
  } catch (error) {
    console.error('Tumulte sync error:', error)
  }
}
```

### `scripts/settings.js` (Configuration)

```javascript
export function registerSettings() {
  game.settings.register('tumulte-integration', 'apiUrl', {
    name: 'Tumulte API URL',
    hint: 'URL de votre instance Tumulte (ex: https://tumulte.app)',
    scope: 'world',
    config: true,
    type: String,
    default: 'https://tumulte.app'
  })

  game.settings.register('tumulte-integration', 'apiKey', {
    name: 'Tumulte API Key',
    hint: 'Clé API générée depuis votre compte Tumulte',
    scope: 'world',
    config: true,
    type: String,
    default: ''
  })

  game.settings.register('tumulte-integration', 'enableCriticals', {
    name: 'Activer les critiques',
    hint: 'Afficher les réussites/échecs critiques sur Twitch',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  })

  game.settings.register('tumulte-integration', 'enableAllRolls', {
    name: 'Tous les lancers',
    hint: 'Envoyer tous les lancers (pas seulement les critiques)',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  })
}
```

### `scripts/dice-hooks.js` (Hooks)

```javascript
import { sendToTumulte } from './api-client.js'

export function registerDiceHooks() {
  Hooks.on('createChatMessage', async (chatMessage) => {
    // Filtrer les non-lancers
    if (!chatMessage.roll) return

    // Vérifier les settings
    const enableCriticals = game.settings.get('tumulte-integration', 'enableCriticals')
    const enableAllRolls = game.settings.get('tumulte-integration', 'enableAllRolls')

    // Extraire les données
    const actor = game.actors.get(chatMessage.speaker.actor)
    const roll = chatMessage.roll

    // Détecter critique
    const critical = detectCritical(roll, chatMessage)

    // Filtrer selon config
    if (!enableAllRolls && !critical.isCritical) return
    if (!enableCriticals && critical.isCritical) return

    // Construire payload
    const payload = {
      worldId: game.world.id,
      messageId: chatMessage.id,
      actor: {
        id: actor?.id,
        name: actor?.name || 'Unknown',
        img: actor?.img || 'icons/svg/mystery-man.svg'
      },
      roll: {
        formula: roll.formula,
        total: roll.total,
        dice: roll.dice.map(d => ({
          faces: d.faces,
          results: d.results.map(r => r.result)
        }))
      },
      critical: {
        isCritical: critical.isCritical,
        type: critical.type // 'success' | 'failure'
      },
      visibility: {
        isPublic: !chatMessage.blind && chatMessage.whisper.length === 0,
        isBlind: chatMessage.blind,
        whisper: chatMessage.whisper
      },
      timestamp: new Date().toISOString()
    }

    // Envoyer à Tumulte
    await sendToTumulte(payload)
  })
}

function detectCritical(roll, chatMessage) {
  // Priorité au flag système
  if (chatMessage.flags?.dnd5e?.roll?.isCritical) {
    return { isCritical: true, type: 'success' }
  }

  // Détection générique sur d20
  const d20 = roll.dice.find(d => d.faces === 20)
  if (!d20) return { isCritical: false }

  const natural = d20.results[0]?.result
  if (natural === 20) return { isCritical: true, type: 'success' }
  if (natural === 1) return { isCritical: true, type: 'failure' }

  return { isCritical: false }
}
```

### `scripts/api-client.js` (Client HTTP)

```javascript
export async function sendToTumulte(payload) {
  const apiUrl = game.settings.get('tumulte-integration', 'apiUrl')
  const apiKey = game.settings.get('tumulte-integration', 'apiKey')

  if (!apiKey) {
    console.warn('Tumulte: API Key manquante')
    return
  }

  try {
    const response = await fetch(`${apiUrl}/webhooks/foundry/dice-roll`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Tumulte: Roll envoyé', data)
  } catch (error) {
    console.error('Tumulte API Error:', error)
    ui.notifications.error(`Tumulte: Erreur d'envoi - ${error.message}`)
  }
}
```

---

## 4. Backend Tumulte - Endpoints

### Nouveau : Webhook Foundry

```typescript
// backend/app/controllers/webhooks/foundry_controller.ts

import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import FoundryWebhookService from '#services/foundry/foundry_webhook_service'

@inject()
export default class FoundryController {
  constructor(private foundryWebhookService: FoundryWebhookService) {}

  // POST /webhooks/foundry/world-sync
  async worldSync({ request, response }: HttpContext) {
    // Authentifier via Bearer token (API key)
    const apiKey = request.header('Authorization')?.replace('Bearer ', '')

    const connection = await VttConnection.query()
      .where('apiKey', apiKey) // Nouveau champ à ajouter
      .where('vttProviderId', 'foundry')
      .firstOrFail()

    const worldData = request.only(['id', 'title', 'description', 'system'])

    await this.foundryWebhookService.syncWorld(connection, worldData)

    return response.ok({ message: 'World synchronized' })
  }

  // POST /webhooks/foundry/dice-roll
  async diceRoll({ request, response }: HttpContext) {
    const apiKey = request.header('Authorization')?.replace('Bearer ', '')

    const connection = await VttConnection.query()
      .where('apiKey', apiKey)
      .where('vttProviderId', 'foundry')
      .preload('campaigns')
      .firstOrFail()

    const rollData = request.only([
      'worldId',
      'messageId',
      'actor',
      'roll',
      'critical',
      'visibility',
      'timestamp'
    ])

    // Trouver la campagne correspondante
    const campaign = connection.campaigns.find(c => c.vttCampaignId === rollData.worldId)
    if (!campaign) {
      return response.badRequest({ message: 'Campaign not found' })
    }

    await this.foundryWebhookService.handleDiceRoll(campaign, rollData)

    return response.ok({ message: 'Roll processed' })
  }
}
```

### Service Foundry

```typescript
// backend/app/services/foundry/foundry_webhook_service.ts

import { inject } from '@adonisjs/core'
import Campaign from '#models/campaign'
import Character from '#models/character'
import DiceRoll from '#models/dice_roll'
import DiceRollService from '#services/vtt/dice_roll_service'

@inject()
export default class FoundryWebhookService {
  constructor(private diceRollService: DiceRollService) {}

  async syncWorld(connection: VttConnection, worldData: any): Promise<void> {
    // Mettre à jour ou créer la campagne
    await Campaign.updateOrCreate(
      {
        vttConnectionId: connection.id,
        vttCampaignId: worldData.id
      },
      {
        vttCampaignName: worldData.title,
        name: worldData.title,
        description: worldData.description,
        vttData: { system: worldData.system },
        lastVttSyncAt: DateTime.now()
      }
    )
  }

  async handleDiceRoll(campaign: Campaign, rollData: any): Promise<void> {
    // Trouver ou créer le personnage
    let character = await Character.query()
      .where('campaignId', campaign.id)
      .where('vttCharacterId', rollData.actor.id)
      .first()

    if (!character) {
      character = await Character.create({
        campaignId: campaign.id,
        vttCharacterId: rollData.actor.id,
        name: rollData.actor.name,
        avatarUrl: rollData.actor.img,
        characterType: 'pc', // Déterminer selon les données
        stats: {},
        inventory: [],
        lastSyncAt: DateTime.now()
      })
    }

    // Enregistrer le lancer
    const vttRollData = {
      id: rollData.messageId,
      formula: rollData.roll.formula,
      result: rollData.roll.total,
      diceResults: rollData.roll.dice.flatMap(d => d.results),
      isCritical: rollData.critical.isCritical,
      criticalType: rollData.critical.type,
      isHidden: !rollData.visibility.isPublic,
      characterId: rollData.actor.id,
      metadata: rollData
    }

    await this.diceRollService.recordRoll(campaign.id, vttRollData)
  }
}
```

---

## 5. Flux d'Authentification Foundry

### Étape 1 : Génération API Key Tumulte

```typescript
// backend/app/services/vtt/vtt_connection_service.ts

async createFoundryConnection(userId: string, name: string, serverUrl: string): Promise<VttConnection> {
  // Générer une API key unique
  const apiKey = crypto.randomBytes(32).toString('hex')

  const connection = await VttConnection.create({
    userId,
    vttProviderId: 'foundry', // UUID du provider Foundry
    name,
    serverUrl,
    apiKey, // Nouveau champ (non chiffré, c'est une clé que le MJ va copier)
    status: 'pending' // En attente de validation par le module
  })

  return connection
}
```

### Étape 2 : Configuration Module Foundry

1. MJ installe le module Tumulte dans Foundry
2. MJ va dans Settings → Module Settings → Tumulte Integration
3. MJ entre :
   - **API URL** : `https://tumulte.app` (ou instance custom)
   - **API Key** : La clé générée à l'étape 1
4. Module envoie un test de connexion :

```javascript
// Dans le module Foundry
async function testConnection() {
  const apiUrl = game.settings.get('tumulte-integration', 'apiUrl')
  const apiKey = game.settings.get('tumulte-integration', 'apiKey')

  const response = await fetch(`${apiUrl}/webhooks/foundry/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      worldId: game.world.id,
      worldTitle: game.world.title
    })
  })

  if (response.ok) {
    ui.notifications.info('✅ Connexion à Tumulte réussie !')
  } else {
    ui.notifications.error('❌ Échec de connexion à Tumulte')
  }
}
```

### Étape 3 : Validation Backend

```typescript
// POST /webhooks/foundry/test
async test({ request, response }: HttpContext) {
  const apiKey = request.header('Authorization')?.replace('Bearer ', '')

  const connection = await VttConnection.query()
    .where('apiKey', apiKey)
    .where('vttProviderId', 'foundry')
    .first()

  if (!connection) {
    return response.unauthorized({ message: 'Invalid API key' })
  }

  // Marquer comme active
  connection.status = 'active'
  await connection.save()

  return response.ok({ message: 'Connection validated' })
}
```

---

## 6. Hébergement Foundry

### Option A : Self-Hosted avec Tunnel Sécurisé (Recommandé)

**Avantages** :
- Contrôle total
- Pas de coût récurrent
- Performance optimale

**Outils** :
- **ngrok** (gratuit avec limitations) : `ngrok http 30000`
- **Cloudflare Tunnel** (gratuit) : Meilleure sécurité
- **Tailscale** (VPN mesh) : Pour réseau privé

**Configuration Cloudflare Tunnel** :

```bash
# Installation
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Authentification
./cloudflared tunnel login

# Créer le tunnel
./cloudflared tunnel create foundry-vtt

# Configurer le tunnel (config.yml)
tunnel: <TUNNEL-ID>
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: foundry.mon-domaine.com
    service: http://localhost:30000
  - service: http_status:404

# Démarrer le tunnel
./cloudflared tunnel run foundry-vtt
```

### Option B : Foundry Cloud Hosting

**Partenaires Officiels** :
- Molten Hosting ($10-20/mois)
- Forge VTT ($5-15/mois)
- AWS Marketplace (variable)

**Avantages** :
- Configuration simplifiée
- Sauvegardes automatiques
- Support technique

**Inconvénients** :
- Coût mensuel
- Moins de contrôle
- Potentiellement plus lent

---

## 7. Sécurité

### ✅ HTTPS Obligatoire

Foundry requiert HTTPS pour :
- Caméra/micro (WebRTC)
- Webhooks sécurisés
- Protection des tokens

**Solutions** :
- **Let's Encrypt** (gratuit, auto-renouvelé)
- **Cloudflare** (proxy SSL gratuit)
- **Caddy** (serveur web avec SSL auto)

### ✅ API Key Rotation

```typescript
// backend/app/controllers/mj/vtt_connections_controller.ts

// POST /mj/vtt/connections/:id/rotate-key
async rotateKey({ auth, params, response }: HttpContext) {
  const connection = await VttConnection.query()
    .where('id', params.id)
    .where('userId', auth.user!.id)
    .firstOrFail()

  // Générer nouvelle clé
  const newApiKey = crypto.randomBytes(32).toString('hex')

  connection.apiKey = newApiKey
  connection.status = 'pending' // Re-validation requise
  await connection.save()

  return response.ok({ apiKey: newApiKey })
}
```

### ✅ Rate Limiting

```typescript
// backend/app/middleware/rate_limit_middleware.ts

import ratelimit from '@adonisjs/limiter/services/main'

export default class RateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const limiter = ratelimit.use('foundry-webhooks')

    await limiter.throttle({
      key: ctx.request.ip(),
      limit: 100, // 100 requêtes
      duration: '1 min'
    })

    await next()
  }
}
```

---

## 8. Tests & Validation

### Environnement de Test Foundry

**Option 1** : Foundry local (dev)
```bash
# Télécharger Foundry
# Lancer sur port 30000
node resources/app/main.js --dataPath=/path/to/data --port=30000
```

**Option 2** : Foundry Demo World
- Utiliser un serveur de test communautaire
- Créer un world jetable pour tests

### Tests du Module

```javascript
// tests/module.test.js

describe('Tumulte Module', () => {
  it('envoie un lancer de dé public', async () => {
    const roll = await new Roll('1d20+5').evaluate()
    const message = await ChatMessage.create({
      speaker: { actor: 'actor-id' },
      roll: roll,
      content: roll.total
    })

    // Vérifier que le webhook a été appelé
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/webhooks/foundry/dice-roll'),
      expect.objectContaining({
        method: 'POST'
      })
    )
  })

  it('détecte un critique naturel 20', () => {
    const roll = { dice: [{ faces: 20, results: [{ result: 20 }] }] }
    const critical = detectCritical(roll, {})

    expect(critical.isCritical).toBe(true)
    expect(critical.type).toBe('success')
  })
})
```

### Tests Backend

```typescript
// backend/tests/functional/foundry/webhook.spec.ts

test.group('Foundry Webhook', () => {
  test('accepte un lancer de dé valide', async ({ client }) => {
    const connection = await VttConnectionFactory.create()

    const response = await client
      .post('/webhooks/foundry/dice-roll')
      .header('Authorization', `Bearer ${connection.apiKey}`)
      .json({
        worldId: 'world-123',
        actor: { id: 'actor-1', name: 'Gandalf' },
        roll: { formula: '1d20+5', total: 18 },
        critical: { isCritical: false }
      })

    response.assertStatus(200)
  })

  test('rejette une API key invalide', async ({ client }) => {
    const response = await client
      .post('/webhooks/foundry/dice-roll')
      .header('Authorization', 'Bearer invalid-key')
      .json({})

    response.assertStatus(401)
  })
})
```

---

## 9. Checklist Implémentation Phase 1

### Backend (AdonisJS)

- [ ] Migration : Ajouter champ `apiKey` à `vtt_connections`
- [ ] Migration : Ajouter champ `vttProviderId = 'foundry'` dans seeds
- [ ] Controller : `FoundryController` avec endpoints `/webhooks/foundry/*`
- [ ] Service : `FoundryWebhookService` pour traiter les événements
- [ ] Middleware : Rate limiting pour webhooks
- [ ] Tests : Webhooks Foundry

### Module Foundry

- [ ] Créer structure du module (`module.json`, scripts)
- [ ] Implémenter settings (API URL, API Key)
- [ ] Hook `createChatMessage` pour lancers de dés
- [ ] Client HTTP vers backend Tumulte
- [ ] Détection critiques (D&D 5e + générique)
- [ ] Gestion visibilité (public/blind/whisper)
- [ ] Tests unitaires module

### Frontend (Nuxt)

- [ ] Page : Créer connexion Foundry (générer API key)
- [ ] Composant : Instructions d'installation module
- [ ] Overlay : Affichage critiques temps réel
- [ ] WebSocket : Écoute événements `dice:critical`

### Documentation

- [ ] Guide installation module Foundry
- [ ] Guide configuration API key
- [ ] Troubleshooting connexion
- [ ] Vidéo tutoriel (optionnel)

---

## 10. Limitations & Workarounds

### ❌ Pas d'API REST Native

**Impact** : On ne peut pas interroger Foundry depuis le backend Tumulte
**Workaround** : Module envoie les données via webhooks (push au lieu de pull)

### ⚠️ Structure de Données Variable (par système)

**Impact** : `actor.system.*` diffère selon le système (D&D 5e ≠ PF2e)
**Workaround** : Normaliser les données côté backend, ou stocker brut dans `vttData` JSON

### ⚠️ Module Requis Côté MJ

**Impact** : Le MJ doit installer et configurer le module
**Workaround** : Documentation claire + installation 1-clic si possible

### ⚠️ Pas de Queries Temps Réel

**Impact** : On ne peut pas demander "donne-moi l'état actuel des PV du personnage"
**Workaround** : Sync périodique ou événements uniquement (pas de queries ad-hoc)

---

## Conclusion

✅ **Intégration Foundry VTT techniquement validée**

**Approche finale** :
1. Module Foundry personnalisé (hooks + webhooks)
2. Backend Tumulte reçoit les événements via POST
3. Pas besoin de REST API (le module push les données)
4. Authentication via API key générée par Tumulte

**Prochaine étape** : Implémenter le module Foundry et les webhooks backend
