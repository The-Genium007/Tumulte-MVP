# Plan de Migration VTT - Fixes Sécurité + Module Foundry v2

**Date**: 2026-01-15
**Objectif**: Corriger les problèmes de sécurité critiques ET implémenter le module Foundry v2 avec WebSocket

---

## Vue d'ensemble

Ce plan intègre :
1. **5 fixes de sécurité bloquants** (CSRF, Token Revocation, Router, WebSocket Handlers, Hidden Rolls)
2. **4 corrections importantes** (Encryption, Token Storage, IndexedDB, Rate Limiting)
3. **Module Foundry v2** (Architecture modulaire, WebSocket, JWT Pairing, Collectors)

---

## Phase 0 : Fixes de Sécurité Bloquants

### 0.1 CSRF Protection sur Pairing

**Fichier**: `backend/app/controllers/mj/vtt_connections_controller.ts`

**Problème**: Le paramètre `state` du JWT pairing n'est jamais validé.

**Fix**:
```typescript
// Dans initiatePairing()
async initiatePairing({ auth, request, response, session }: HttpContext) {
  const { pairingUrl } = request.only(['pairingUrl'])

  // 1. Parser l'URL
  const { token, state } = this.vttPairingService.parsePairingUrl(pairingUrl)

  // 2. Valider le state contre la session (NOUVEAU)
  const sessionState = session.get('vtt_pairing_state')
  if (!sessionState) {
    return response.badRequest({ error: 'No pairing session found. Please restart pairing.' })
  }
  if (state !== sessionState) {
    return response.forbidden({ error: 'Invalid CSRF state. Possible attack detected.' })
  }
  session.forget('vtt_pairing_state')

  // 3. Continuer avec validation JWT...
}
```

**Nouveau endpoint requis**: Générer et stocker le state
```typescript
// Ajouter dans VttConnectionsController
async startPairingSession({ session, response }: HttpContext) {
  const state = randomBytes(32).toString('hex')
  session.put('vtt_pairing_state', state)
  session.put('vtt_pairing_expires', Date.now() + 5 * 60 * 1000) // 5 min

  return response.ok({ state })
}
```

---

### 0.2 Token Revocation Complète

**Fichier**: `backend/app/services/vtt/vtt_pairing_service.ts`

**Problème**: Les tokens session/refresh ne sont jamais blacklistés.

**Fix**:
```typescript
async revokeConnectionTokens(connectionId: string, reason: string): Promise<void> {
  const connection = await VttConnection.findOrFail(connectionId)

  // NOUVEAU: Révoquer tous les tokens actifs de cette connexion
  // Note: On n'a pas de table pour tracker les tokens par connexion
  // Solution: Utiliser le jti pattern - tous les tokens ont connection_id dans le payload

  // Option 1: Stocker le timestamp de révocation sur la connexion
  // Tous les tokens émis AVANT ce timestamp sont considérés révoqués
  connection.revokedAt = DateTime.now()

  // Option 2: Ajouter un champ version qui invalide les anciens tokens
  connection.tokenVersion = (connection.tokenVersion || 0) + 1

  connection.status = 'revoked'
  connection.tunnelStatus = 'disconnected'
  await connection.save()
}

// Modifier validateSessionToken pour vérifier tokenVersion
async validateSessionToken(token: string): Promise<boolean> {
  const decoded = jwt.verify(token, this.JWT_SECRET) as any

  const connection = await VttConnection.find(decoded.sub)
  if (!connection || connection.status === 'revoked') {
    return false
  }

  // Vérifier la version du token
  if (decoded.token_version !== connection.tokenVersion) {
    return false
  }

  return true
}
```

**Migration requise**: Ajouter colonnes
```typescript
// Nouvelle migration
table.timestamp('revoked_at').nullable()
table.integer('token_version').defaultTo(0)
```

---

### 0.3 Router Precedence Fix

**Fichier**: `backend/start/routes.ts`

**Problème**: `/sync-all` est capturé par `/:id`.

**Fix**: Réordonner les routes (routes spécifiques AVANT les paramètres)
```typescript
// AVANT (incorrect)
router.get('/vtt-connections/sync-all', ...)
router.get('/vtt-connections/:id', ...)

// APRÈS (correct)
router.get('/vtt-connections/:id', ...)
router.get('/vtt-connections/sync-all', ...)  // APRÈS :id

// OU utiliser un préfixe différent
router.get('/vtt-connections/actions/sync-all', ...)
```

---

### 0.4 WebSocket Handlers Complets

**Fichier**: `backend/app/services/vtt/vtt_websocket_service.ts`

**Problème**: Les handlers `handleDiceRoll`, `handleCampaignSync`, `handleCharacterUpdate` sont vides.

**Fix**:
```typescript
private async handleDiceRoll(socket: VttSocket, data: any): Promise<void> {
  try {
    const connectionId = socket.vttConnectionId!

    // 1. Valider les données
    const payload = diceRollPayloadSchema.parse(data)

    // 2. Récupérer la connexion
    const vttConnection = await VttConnection.query()
      .where('id', connectionId)
      .preload('provider')
      .firstOrFail()

    // 3. Traiter via le service existant
    const webhookService = new VttWebhookService()
    const diceRoll = await webhookService.processDiceRoll(vttConnection, payload)

    // 4. ACK avec ID du roll créé
    socket.emit('dice:roll:ack', {
      success: true,
      rollId: diceRoll.id,
      timestamp: DateTime.now().toISO()
    })

    logger.info('Dice roll processed via WebSocket', { connectionId, rollId: diceRoll.id })
  } catch (error) {
    logger.error('Failed to handle dice roll', { error })
    socket.emit('dice:roll:ack', {
      success: false,
      error: error.message
    })
  }
}

private async handleCampaignSync(socket: VttSocket, data: any): Promise<void> {
  try {
    const connectionId = socket.vttConnectionId!

    // Valider
    const payload = campaignSyncSchema.parse(data)

    // Sync via service
    const syncService = new VttSyncService()
    const result = await syncService.syncCampaign(connectionId, payload)

    socket.emit('campaign:sync:ack', {
      success: true,
      campaignId: result.id,
      charactersCount: result.charactersCount
    })
  } catch (error) {
    logger.error('Failed to handle campaign sync', { error })
    socket.emit('campaign:sync:ack', { success: false, error: error.message })
  }
}

private async handleCharacterUpdate(socket: VttSocket, data: any): Promise<void> {
  try {
    const connectionId = socket.vttConnectionId!

    const payload = characterUpdateSchema.parse(data)

    const webhookService = new VttWebhookService()
    const character = await webhookService.syncCharacter(
      await VttConnection.findOrFail(connectionId),
      payload.campaignId,
      payload.character
    )

    socket.emit('character:update:ack', {
      success: true,
      characterId: character.id
    })
  } catch (error) {
    logger.error('Failed to handle character update', { error })
    socket.emit('character:update:ack', { success: false, error: error.message })
  }
}
```

---

### 0.5 Hidden Rolls Filter

**Fichier**: `frontend/pages/overlay/[streamerId].vue`

**Problème**: Les dés cachés (`isHidden: true`) sont affichés sur l'overlay.

**Fix**:
```typescript
// Dans le handler onDiceRoll
onDiceRoll: (data: DiceRollEvent) => {
  // NOUVEAU: Ne pas afficher les rolls cachés sur l'overlay public
  if (data.isHidden) {
    console.debug('[Overlay] Hidden roll received, not displaying', data.id)
    return
  }

  handleDiceRoll(data)
},

onDiceRollCritical: (data: DiceRollEvent) => {
  // NOUVEAU: Même filtre pour les critiques cachés
  if (data.isHidden) {
    console.debug('[Overlay] Hidden critical roll received, not displaying', data.id)
    return
  }

  if (currentDiceRoll.value) {
    diceRollQueue.value.unshift(data)
  } else {
    currentDiceRoll.value = data
  }
},
```

---

## Phase 1 : Corrections Importantes

### 1.1 Encryption des Credentials

**Fichier**: `backend/app/services/vtt/vtt_pairing_service.ts`

```typescript
import encryption from '@adonisjs/core/services/encryption'

async completePairing(claims: PairingClaims, userId: string): Promise<...> {
  // ...

  // Chiffrer les credentials sensibles
  const sensitiveData = {
    apiKey,
    pairingCode: claims.pairing_code,
    worldId: claims.world_id,
  }
  const encryptedCredentials = encryption.encrypt(JSON.stringify(sensitiveData))

  const connection = await VttConnection.create({
    // ...
    encryptedCredentials,  // Maintenant chiffré !
  })
}
```

---

### 1.2 Token Storage Frontend

**Fichier**: `frontend/pages/mj/vtt-connections/create.vue`

```typescript
// Décommenter et améliorer le stockage
const storeTokens = (connectionId: string, tokens: SessionTokens) => {
  // Utiliser sessionStorage pour les tokens sensibles (effacé à la fermeture)
  sessionStorage.setItem(`vtt_session_${connectionId}`, tokens.sessionToken)

  // Refresh token peut aller en localStorage (plus long terme)
  localStorage.setItem(`vtt_refresh_${connectionId}`, tokens.refreshToken)

  // Stocker l'expiration pour refresh proactif
  localStorage.setItem(`vtt_expires_${connectionId}`,
    String(Date.now() + tokens.expiresIn * 1000)
  )
}

// Dans handleConfirmConnection, après succès:
if (data.tokens) {
  storeTokens(data.connection.id, data.tokens)
}
```

---

### 1.3 IndexedDB Cache

**Fichier**: `frontend/composables/useVttAutoSync.ts`

```typescript
import { openDB } from 'idb'

const DB_NAME = 'tumulte-vtt-cache'
const STORE_NAME = 'sync-metadata'

const getDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME)
    }
  })
}

export function useVttAutoSync() {
  // ...

  const initialize = async () => {
    const db = await getDB()
    const lastSync = await db.get(STORE_NAME, 'lastSyncTime')

    if (lastSync) {
      lastSyncTime.value = new Date(lastSync)
      isFirstSync.value = false
    } else {
      isFirstSync.value = true
    }

    await syncAllConnections()
  }

  const syncAllConnections = async () => {
    // ... existing logic ...

    // Après sync réussie, sauvegarder
    const db = await getDB()
    await db.put(STORE_NAME, new Date().toISOString(), 'lastSyncTime')
    lastSyncTime.value = new Date()
  }
}
```

---

### 1.4 Rate Limiting

**Fichier**: `backend/start/routes.ts`

```typescript
import limiter from '@adonisjs/limiter/services/main'

// Rate limit sur création de connexions
router.post('/vtt-connections', [
  () => limiter.use({
    requests: 5,
    duration: '1 minute',
    blockDuration: '5 minutes'
  }),
  '#controllers/mj/vtt_connections_controller.store'
])

// Rate limit sur refresh token
router.post('/vtt-connections/refresh-token', [
  () => limiter.use({
    requests: 10,
    duration: '1 minute',
    blockDuration: '5 minutes'
  }),
  '#controllers/mj/vtt_connections_controller.refreshToken'
])
```

---

## Phase 2 : Module Foundry v2 - Core

### 2.1 Structure des fichiers

```
modules-vtt/foundry/
├── module.json                    # Manifest v2
├── README.md                      # Doc utilisateur v2
├── CHANGELOG.md                   # Nouveau
├── scripts/
│   ├── tumulte.js                # Entry point (refactoré)
│   ├── lib/
│   │   ├── socket-client.js      # Socket.IO client
│   │   ├── pairing-manager.js    # JWT pairing
│   │   ├── token-storage.js      # Stockage tokens
│   │   └── reconnection.js       # Auto-reconnect
│   ├── collectors/
│   │   ├── dice-collector.js     # Hook dice rolls
│   │   ├── character-collector.js # Sync personnages
│   │   ├── combat-collector.js   # Events combat
│   │   └── inventory-collector.js # Changements inventaire
│   ├── ui/
│   │   ├── pairing-dialog.js     # Dialog pairing
│   │   └── status-indicator.js   # Indicateur connexion
│   └── utils/
│       ├── logger.js             # Logging
│       └── system-adapters.js    # Adaptateurs système
├── styles/
│   └── tumulte.css               # Styles complets
├── templates/
│   ├── pairing-dialog.hbs        # Template pairing
│   └── status-indicator.hbs      # Template status
├── lang/
│   ├── en.json                   # ~40 clés
│   └── fr.json                   # ~40 clés
└── vendor/
    └── socket.io.min.js          # Socket.IO bundled
```

### 2.2 module.json v2

```json
{
  "id": "tumulte-integration",
  "title": "Tumulte - Twitch Integration",
  "description": "Intégration temps réel avec Tumulte pour les overlays Twitch de JDR",
  "version": "2.0.0",
  "authors": [{ "name": "Tumulte Team", "url": "https://tumulte.app" }],
  "compatibility": {
    "minimum": "11",
    "verified": "12",
    "maximum": "13"
  },
  "esmodules": ["scripts/tumulte.js"],
  "styles": ["styles/tumulte.css"],
  "languages": [
    { "lang": "en", "name": "English", "path": "lang/en.json" },
    { "lang": "fr", "name": "Français", "path": "lang/fr.json" }
  ],
  "socket": true,
  "url": "https://github.com/tumulte-app/foundry-integration"
}
```

---

## Phase 3 : JWT Pairing Flow

### 3.1 Flux complet

```
┌─────────────────┐                         ┌─────────────────┐
│  Foundry VTT    │                         │  Tumulte Web    │
│  (Module v2)    │                         │  (Frontend)     │
└────────┬────────┘                         └────────┬────────┘
         │                                           │
         │ 1. GM clique "Connecter à Tumulte"        │
         ├──────────────────────────────────────────►│
         │                                           │
         │ 2. Frontend appelle GET /vtt/start-pairing│
         │    Reçoit: { state: "abc123" }            │
         │◄──────────────────────────────────────────┤
         │                                           │
         │ 3. Module génère JWT avec:                │
         │    - world_id, world_name                 │
         │    - module_version                       │
         │    - pairing_code (6 chars)               │
         │    - exp: 5 minutes                       │
         │                                           │
         │ 4. Affiche URL + QR Code                  │
         │    foundry://connect?token=JWT&state=abc123
         │                                           │
         │ 5. GM copie URL vers Tumulte              │
         │────────────────────────────────────────►  │
         │                                           │
         │               6. POST /vtt/pair           │
         │                  - Valide state           │
         │                  - Valide JWT             │
         │                  - Crée VttConnection     │
         │                  - Génère tokens          │
         │◄────────────────────────────────────────  │
         │      { connection, tokens }               │
         │                                           │
         │ 7. Module reçoit tokens                   │
         │    Stocke en localStorage                 │
         │                                           │
         │ 8. Connexion WebSocket                    │
         │    wss://api.tumulte.app/vtt              │
         │    auth: { token: sessionToken }          │
         │────────────────────────────────────────►  │
         │                                           │
         │ 9. 'connected' event                      │
         │◄────────────────────────────────────────  │
         │                                           │
         ▼                                           ▼
   ┌─────────────┐                           ┌─────────────┐
   │  SYNC       │ ◄══════════════════════►  │  Dashboard  │
   │  ACTIVE     │    bidirectionnel         │  VTT        │
   └─────────────┘                           └─────────────┘
```

### 3.2 Pairing Manager

```javascript
// scripts/lib/pairing-manager.js

export class PairingManager {
  constructor(options) {
    this.tumulteUrl = options.tumulteUrl
    this.tokenStorage = options.tokenStorage
    this.onPaired = options.onPaired
  }

  async startPairing() {
    // 1. Obtenir le state depuis Tumulte
    const stateResponse = await fetch(`${this.tumulteUrl}/vtt/start-pairing`, {
      method: 'GET',
      credentials: 'include'
    })
    const { state } = await stateResponse.json()

    // 2. Générer le JWT de pairing
    const pairingCode = this.generatePairingCode()
    const jwt = this.generatePairingJWT(state, pairingCode)

    // 3. Construire l'URL
    const pairingUrl = `foundry://connect?token=${jwt}&state=${state}`

    return {
      url: pairingUrl,
      code: pairingCode,
      expiresAt: Date.now() + 5 * 60 * 1000
    }
  }

  generatePairingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  generatePairingJWT(state, pairingCode) {
    const now = Math.floor(Date.now() / 1000)

    const payload = {
      sub: 'vtt:foundry',
      aud: 'tumulte:api',
      iss: 'foundry-module:tumulte',
      pairing_code: pairingCode,
      world_id: game.world.id,
      world_name: game.world.title,
      gm_user_id: game.user.id,
      module_version: game.modules.get('tumulte-integration').version,
      state: state,
      iat: now,
      exp: now + 300, // 5 minutes
      nonce: this.generateNonce(),
      jti: this.generateJti()
    }

    // Signer avec le secret partagé
    const secret = game.settings.get('tumulte-integration', 'serverSecret')
    return this.signJWT(payload, secret)
  }
}
```

---

## Phase 4 : Collectors

### 4.1 Dice Collector

```javascript
// scripts/collectors/dice-collector.js

export class DiceCollector {
  constructor(socketClient) {
    this.socket = socketClient
    this.systemAdapter = null
  }

  initialize() {
    this.systemAdapter = this.getSystemAdapter()

    // Hook principal
    Hooks.on('createChatMessage', this.onChatMessage.bind(this))

    // Hooks spécifiques D&D 5e
    if (game.system.id === 'dnd5e') {
      Hooks.on('dnd5e.rollAttack', this.onDnd5eRoll.bind(this))
      Hooks.on('dnd5e.rollDamage', this.onDnd5eRoll.bind(this))
    }
  }

  async onChatMessage(message, options, userId) {
    if (!message.isRoll) return

    const rollData = this.systemAdapter.extractRollData(message)

    this.socket.emit('dice:roll', {
      worldId: game.world.id,
      campaignId: game.world.id, // Utiliser world ID comme campaign ID
      messageId: message.id,
      ...rollData,
      timestamp: Date.now()
    })
  }

  getSystemAdapter() {
    const adapters = {
      'dnd5e': new Dnd5eAdapter(),
      'pf2e': new Pf2eAdapter(),
      'default': new GenericAdapter()
    }
    return adapters[game.system.id] || adapters['default']
  }
}
```

### 4.2 Character Collector

```javascript
// scripts/collectors/character-collector.js

export class CharacterCollector {
  constructor(socketClient) {
    this.socket = socketClient
    this.syncedCharacters = new Map()
  }

  initialize() {
    Hooks.once('ready', () => this.syncAllCharacters())
    Hooks.on('updateActor', this.onActorUpdate.bind(this))
    Hooks.on('createActor', this.onActorCreate.bind(this))
    Hooks.on('deleteActor', this.onActorDelete.bind(this))
  }

  async syncAllCharacters() {
    const playerCharacters = game.actors.filter(a =>
      a.type === 'character' && a.hasPlayerOwner
    )

    for (const actor of playerCharacters) {
      await this.syncCharacter(actor)
    }
  }

  async syncCharacter(actor) {
    const characterData = {
      vttCharacterId: actor.id,
      name: actor.name,
      avatarUrl: actor.img,
      characterType: actor.type === 'character' ? 'pc' : 'npc',
      stats: this.extractStats(actor),
      inventory: this.extractInventory(actor)
    }

    this.socket.emit('character:update', {
      worldId: game.world.id,
      campaignId: game.world.id,
      character: characterData,
      timestamp: Date.now()
    })
  }

  extractStats(actor) {
    if (game.system.id === 'dnd5e') {
      return {
        hp: {
          current: actor.system.attributes.hp.value,
          max: actor.system.attributes.hp.max,
          temp: actor.system.attributes.hp.temp || 0
        },
        ac: actor.system.attributes.ac.value,
        level: actor.system.details.level
      }
    }
    return {}
  }
}
```

### 4.3 Combat Collector

```javascript
// scripts/collectors/combat-collector.js

export class CombatCollector {
  constructor(socketClient) {
    this.socket = socketClient
  }

  initialize() {
    Hooks.on('createCombat', this.onCombatCreate.bind(this))
    Hooks.on('updateCombat', this.onCombatUpdate.bind(this))
    Hooks.on('deleteCombat', this.onCombatDelete.bind(this))
    Hooks.on('combatTurn', this.onTurnChange.bind(this))
    Hooks.on('combatRound', this.onRoundChange.bind(this))
  }

  onCombatCreate(combat) {
    this.socket.emit('combat:start', {
      worldId: game.world.id,
      combatId: combat.id,
      round: combat.round,
      turn: combat.turn,
      combatants: this.extractCombatants(combat),
      timestamp: Date.now()
    })
  }

  onTurnChange(combat, prior, options) {
    const current = combat.combatant

    this.socket.emit('combat:turn', {
      worldId: game.world.id,
      combatId: combat.id,
      round: combat.round,
      turn: combat.turn,
      currentCombatant: {
        id: current.actor?.id,
        name: current.name,
        initiative: current.initiative,
        isNPC: !current.actor?.hasPlayerOwner
      },
      timestamp: Date.now()
    })
  }

  onCombatDelete(combat) {
    this.socket.emit('combat:end', {
      worldId: game.world.id,
      combatId: combat.id,
      timestamp: Date.now()
    })
  }

  extractCombatants(combat) {
    return combat.combatants.map(c => ({
      id: c.actor?.id,
      name: c.name,
      initiative: c.initiative,
      isDefeated: c.isDefeated,
      isNPC: !c.actor?.hasPlayerOwner,
      img: c.actor?.img
    }))
  }
}
```

---

## Phase 5 : WebSocket Client

```javascript
// scripts/lib/socket-client.js

export class TumulteSocketClient {
  constructor(options) {
    this.serverUrl = options.serverUrl
    this.tokenStorage = options.tokenStorage
    this.socket = null
    this.connected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 1000
  }

  async connect() {
    const sessionToken = await this.tokenStorage.getSessionToken()

    if (!sessionToken) {
      throw new Error('No session token. Please complete pairing first.')
    }

    return new Promise((resolve, reject) => {
      const io = window.io

      this.socket = io(`${this.serverUrl}/vtt`, {
        auth: { token: sessionToken },
        transports: ['websocket'],
        reconnection: false,
        timeout: 10000
      })

      this.socket.on('connect', () => {
        this.connected = true
        this.reconnectAttempts = 0
        ui.notifications.info('Tumulte: Connected')
        resolve()
      })

      this.socket.on('disconnect', (reason) => {
        this.connected = false
        if (reason !== 'io server disconnect') {
          this.scheduleReconnect()
        }
      })

      this.socket.on('connect_error', async (error) => {
        if (error.message.includes('expired')) {
          try {
            await this.refreshToken()
            this.scheduleReconnect()
          } catch (e) {
            reject(new Error('Authentication failed. Please re-pair.'))
          }
        } else {
          reject(error)
        }
      })

      // Heartbeat
      this.socket.on('ping', (data) => {
        this.socket.emit('pong', { timestamp: data.timestamp })
      })

      // Révocation
      this.socket.on('connection:revoked', (data) => {
        ui.notifications.error(`Tumulte: Connection revoked - ${data.reason}`)
        this.tokenStorage.clearTokens()
        this.disconnect()
      })
    })
  }

  async refreshToken() {
    const refreshToken = await this.tokenStorage.getRefreshToken()

    const response = await fetch(`${this.serverUrl}/vtt/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })

    if (!response.ok) throw new Error('Token refresh failed')

    const data = await response.json()
    await this.tokenStorage.storeTokens(data.sessionToken, data.refreshToken)
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      ui.notifications.error('Tumulte: Unable to reconnect')
      return
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    )

    this.reconnectAttempts++
    setTimeout(() => this.connect().catch(() => {}), delay)
  }

  emit(event, data) {
    if (!this.connected) return
    this.socket.emit(event, data)
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.connected = false
  }
}
```

---

## Phase 6 : Backend - Nouveaux Events

### 6.1 Events WebSocket à ajouter

```typescript
// Dans vtt_websocket_service.ts - handleConnection()

// Combat events
socket.on('combat:start', async (data) => {
  await this.handleCombatStart(socket, data)
})

socket.on('combat:turn', async (data) => {
  await this.handleCombatTurn(socket, data)
})

socket.on('combat:end', async (data) => {
  await this.handleCombatEnd(socket, data)
})

// Inventory events
socket.on('inventory:update', async (data) => {
  await this.handleInventoryUpdate(socket, data)
})
```

### 6.2 Nouveaux services

```typescript
// backend/app/services/vtt/combat_sync_service.ts

export default class CombatSyncService {
  async handleCombatStart(campaignId: string, data: CombatStartPayload) {
    // Stocker en Redis pour temps réel
    await redis.set(`combat:${campaignId}:active`, JSON.stringify(data))

    // Broadcast aux streamers
    transmit.broadcast(`streamer/${streamerId}/combat`, data)
  }

  async handleCombatTurn(campaignId: string, data: CombatTurnPayload) {
    // Mettre à jour Redis
    const combat = await redis.get(`combat:${campaignId}:active`)
    // ... update turn info

    // Broadcast
    transmit.broadcast(`streamer/${streamerId}/combat`, data)
  }
}
```

---

## Checklist d'implémentation

### Phase 0 - Fixes Sécurité (Blockers)
- [ ] 0.1 CSRF Protection sur pairing
- [ ] 0.2 Token Revocation complète (migration + code)
- [ ] 0.3 Router precedence fix
- [ ] 0.4 WebSocket handlers complets
- [ ] 0.5 Hidden rolls filter

### Phase 1 - Corrections Importantes
- [ ] 1.1 Encryption credentials
- [ ] 1.2 Token storage frontend
- [ ] 1.3 IndexedDB cache
- [ ] 1.4 Rate limiting

### Phase 2 - Module Core
- [ ] 2.1 Structure fichiers
- [ ] 2.2 module.json v2
- [ ] 2.3 Télécharger socket.io.min.js
- [ ] 2.4 scripts/tumulte.js (entry point)

### Phase 3 - JWT Pairing
- [ ] 3.1 pairing-manager.js
- [ ] 3.2 token-storage.js
- [ ] 3.3 pairing-dialog.js + template
- [ ] 3.4 Backend endpoint /vtt/start-pairing

### Phase 4 - Collectors
- [ ] 4.1 dice-collector.js
- [ ] 4.2 character-collector.js
- [ ] 4.3 combat-collector.js
- [ ] 4.4 inventory-collector.js
- [ ] 4.5 system-adapters.js

### Phase 5 - WebSocket
- [ ] 5.1 socket-client.js
- [ ] 5.2 Reconnection logic
- [ ] 5.3 Token refresh

### Phase 6 - Backend Events
- [ ] 6.1 Combat events handlers
- [ ] 6.2 CombatSyncService
- [ ] 6.3 Broadcast aux overlays

### Phase 7 - UI & Polish
- [ ] 7.1 status-indicator.js + template
- [ ] 7.2 Styles complets
- [ ] 7.3 Traductions FR/EN
- [ ] 7.4 README v2
- [ ] 7.5 CHANGELOG

### Phase 8 - Tests
- [ ] 8.1 Tests manuels pairing
- [ ] 8.2 Tests manuels dice rolls
- [ ] 8.3 Tests manuels reconnexion
- [ ] 8.4 Tests combat sync

---

## Ordre d'exécution recommandé

1. **Phase 0** (obligatoire avant tout) - Fixes sécurité
2. **Phase 1** - Corrections importantes
3. **Phase 2 + 5** en parallèle - Core module + WebSocket client
4. **Phase 3** - JWT Pairing (dépend de 2)
5. **Phase 4** - Collectors (dépend de 5)
6. **Phase 6** - Backend events (dépend de 4)
7. **Phase 7** - UI & Polish
8. **Phase 8** - Tests

---

**Prêt à commencer l'implémentation ?**
