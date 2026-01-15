# Plan d'Intégration VTT - Tumulte

## Vue d'ensemble

Intégration de 3 VTT (Foundry VTT, Alchemy RPG, Roll20) pour permettre :
- La synchronisation des campagnes et personnages
- L'affichage en temps réel des lancers de dés critiques sur overlay
- La gestion des dés cachés pour le MJ
- L'accès aux inventaires et stats des personnages via API

**Architecture modulaire** : Les fonctionnalités polls existantes coexistent avec le nouveau système de dés.

---

## Décisions d'Architecture

### 1. Système de Campagnes

**BREAKING CHANGE** : Suppression du système de création manuelle de campagnes

- Les campagnes proviennent maintenant **exclusivement** des VTT
- Le MJ se connecte à son VTT et importe une campagne existante
- Migrations nécessaires pour gérer les campagnes existantes

### 2. Authentification VTT (Hybride)

| VTT | Méthode |
|-----|---------|
| Foundry VTT | OAuth (si disponible) ou API Key + URL serveur |
| Roll20 | API Key manuelle |
| Alchemy RPG | API Key manuelle |

### 3. Flux de Données

**Lancers de dés** : Écoute passive via WebSocket
- Tumulte écoute les événements de lancer depuis le VTT
- Pas de lancer depuis l'interface Tumulte
- Affichage temps réel sur overlay

**Données personnages** : Stratégie hybride
- **Cache en DB** : Inventaire, stats, info personnage (sync périodique toutes les 5 min)
- **Temps réel** : Lancers de dés (WebSocket direct)

### 4. Modularité

Architecture permettant d'ajouter facilement :
- Nouveaux VTT
- Nouveaux types d'événements (pas juste les dés)
- Futures fonctionnalités (animations 3D, extensions Twitch, etc.)

---

## Modèles de Données

### Nouveau : `VttProvider`

```typescript
// backend/app/models/vtt_provider.ts
export default class VttProvider extends BaseModel {
  @column({ isPrimary: true })
  declare id: string // UUID

  @column()
  declare name: string // 'foundry', 'roll20', 'alchemy'

  @column()
  declare displayName: string // 'Foundry VTT', 'Roll20', 'Alchemy RPG'

  @column()
  declare authType: 'oauth' | 'api_key'

  @column()
  declare isActive: boolean

  @column()
  declare configSchema: object // JSON schema for provider-specific config

  // Relations
  @hasMany(() => VttConnection)
  declare connections: HasMany<typeof VttConnection>
}
```

### Nouveau : `VttConnection`

```typescript
// backend/app/models/vtt_connection.ts
export default class VttConnection extends BaseModel {
  @column({ isPrimary: true })
  declare id: string // UUID

  @column()
  declare userId: string // FK -> users (le MJ)

  @column()
  declare vttProviderId: string // FK -> vtt_providers

  @column()
  declare name: string // Nom donné par le MJ (ex: "Mon serveur Foundry")

  @column()
  declare encryptedCredentials: string // OAuth tokens OU API key (encrypted)

  @column()
  declare serverUrl: string | null // Pour Foundry self-hosted

  @column()
  declare status: 'active' | 'expired' | 'revoked'

  @column()
  declare lastSyncAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => VttProvider)
  declare provider: BelongsTo<typeof VttProvider>

  @hasMany(() => Campaign)
  declare campaigns: HasMany<typeof Campaign>
}
```

### Modification : `Campaign`

```typescript
// backend/app/models/campaign.ts
export default class Campaign extends BaseModel {
  // ... champs existants ...

  // NOUVEAUX CHAMPS
  @column()
  declare vttConnectionId: string // FK -> vtt_connections (REQUIRED)

  @column()
  declare vttCampaignId: string // ID de la campagne dans le VTT

  @column()
  declare vttCampaignName: string // Nom original dans le VTT

  @column()
  declare vttData: object | null // Métadonnées du VTT (JSON)

  @column.dateTime()
  declare lastVttSyncAt: DateTime | null

  // Relations
  @belongsTo(() => VttConnection)
  declare vttConnection: BelongsTo<typeof VttConnection>

  @hasMany(() => Character)
  declare characters: HasMany<typeof Character>

  @hasMany(() => DiceRoll)
  declare diceRolls: HasMany<typeof DiceRoll>
}
```

### Nouveau : `Character`

```typescript
// backend/app/models/character.ts
export default class Character extends BaseModel {
  @column({ isPrimary: true })
  declare id: string // UUID

  @column()
  declare campaignId: string // FK -> campaigns

  @column()
  declare vttCharacterId: string // ID du personnage dans le VTT

  @column()
  declare name: string

  @column()
  declare avatarUrl: string | null

  @column()
  declare characterType: 'pc' | 'npc' // Player Character ou NPC

  @column()
  declare stats: object // JSON: { strength: 18, dexterity: 14, ... }

  @column()
  declare inventory: object // JSON: [{ name: 'Sword', quantity: 1 }, ...]

  @column()
  declare vttData: object | null // Données brutes du VTT

  @column.dateTime()
  declare lastSyncAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  @hasMany(() => CharacterAssignment)
  declare assignments: HasMany<typeof CharacterAssignment>

  @hasMany(() => DiceRoll)
  declare diceRolls: HasMany<typeof DiceRoll>
}
```

### Nouveau : `CharacterAssignment`

```typescript
// backend/app/models/character_assignment.ts
export default class CharacterAssignment extends BaseModel {
  @column({ isPrimary: true })
  declare id: string // UUID

  @column()
  declare characterId: string // FK -> characters

  @column()
  declare streamerId: string // FK -> streamers

  @column()
  declare campaignId: string // FK -> campaigns

  @column.dateTime({ autoCreate: true })
  declare assignedAt: DateTime

  // Relations
  @belongsTo(() => Character)
  declare character: BelongsTo<typeof Character>

  @belongsTo(() => Streamer)
  declare streamer: BelongsTo<typeof Streamer>

  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  // Unique constraint: (characterId, campaignId)
  // Un personnage ne peut être assigné qu'à un seul streamer par campagne
}
```

### Nouveau : `DiceRoll`

```typescript
// backend/app/models/dice_roll.ts
export default class DiceRoll extends BaseModel {
  @column({ isPrimary: true })
  declare id: string // UUID

  @column()
  declare campaignId: string // FK -> campaigns

  @column()
  declare characterId: string // FK -> characters

  @column()
  declare vttRollId: string | null // ID du lancer dans le VTT

  @column()
  declare rollFormula: string // Ex: "1d20+5", "2d6"

  @column()
  declare result: number // Résultat total

  @column()
  declare diceResults: number[] // Résultats individuels des dés

  @column()
  declare isCritical: boolean // Réussite ou échec critique

  @column()
  declare criticalType: 'success' | 'failure' | null

  @column()
  declare isHidden: boolean // Dé caché (MJ uniquement)

  @column()
  declare rollType: string | null // 'attack', 'skill_check', 'damage', etc.

  @column()
  declare vttData: object | null // Données brutes du VTT

  @column.dateTime({ autoCreate: true })
  declare rolledAt: DateTime

  // Relations
  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => Character)
  declare character: BelongsTo<typeof Character>
}
```

---

## Migrations de Données

### Migration 1 : Ajouter les tables VTT

```typescript
// database/migrations/XXXX_create_vtt_providers_table.ts
// database/migrations/XXXX_create_vtt_connections_table.ts
// database/migrations/XXXX_create_characters_table.ts
// database/migrations/XXXX_create_character_assignments_table.ts
// database/migrations/XXXX_create_dice_rolls_table.ts
```

### Migration 2 : Modifier campaigns

```typescript
// database/migrations/XXXX_add_vtt_fields_to_campaigns.ts

export default class extends BaseSchema {
  public async up() {
    this.schema.alterTable('campaigns', (table) => {
      table.uuid('vtt_connection_id').nullable().references('id').inTable('vtt_connections')
      table.string('vtt_campaign_id').nullable()
      table.string('vtt_campaign_name').nullable()
      table.jsonb('vtt_data').nullable()
      table.timestamp('last_vtt_sync_at').nullable()
    })
  }

  public async down() {
    this.schema.alterTable('campaigns', (table) => {
      table.dropColumn('vtt_connection_id')
      table.dropColumn('vtt_campaign_id')
      table.dropColumn('vtt_campaign_name')
      table.dropColumn('vtt_data')
      table.dropColumn('last_vtt_sync_at')
    })
  }
}
```

### Migration 3 : Données existantes

**STRATÉGIE** : Suppression complète des campagnes existantes

```typescript
// database/migrations/XXXX_cleanup_legacy_campaigns.ts

export default class extends BaseSchema {
  public async up() {
    // Option 1: Suppression en cascade (si FK ON DELETE CASCADE configurées)
    await this.db.rawQuery('DELETE FROM campaigns')

    // Option 2: Suppression manuelle dans l'ordre
    await this.db.rawQuery('DELETE FROM poll_instances')
    await this.db.rawQuery('DELETE FROM polls')
    await this.db.rawQuery('DELETE FROM campaign_memberships')
    await this.db.rawQuery('DELETE FROM campaigns')

    // Rendre vtt_connection_id REQUIRED
    this.schema.alterTable('campaigns', (table) => {
      table.uuid('vtt_connection_id').notNullable().alter()
      table.string('vtt_campaign_id').notNullable().alter()
    })
  }

  public async down() {
    this.schema.alterTable('campaigns', (table) => {
      table.uuid('vtt_connection_id').nullable().alter()
      table.string('vtt_campaign_id').nullable().alter()
    })
  }
}
```

---

## Architecture Modulaire VTT

### Interface commune : `VttAdapter`

```typescript
// backend/app/services/vtt/contracts/vtt_adapter_interface.ts

export interface VttCampaignData {
  id: string
  name: string
  description?: string
  gameSystem?: string
  metadata: Record<string, any>
}

export interface VttCharacterData {
  id: string
  name: string
  avatarUrl?: string
  type: 'pc' | 'npc'
  stats: Record<string, any>
  inventory: Array<{ name: string; quantity: number; [key: string]: any }>
  metadata: Record<string, any>
}

export interface VttDiceRollData {
  id?: string
  formula: string
  result: number
  diceResults: number[]
  isCritical: boolean
  criticalType?: 'success' | 'failure'
  isHidden: boolean
  rollType?: string
  characterId: string
  metadata: Record<string, any>
}

export interface VttAdapterInterface {
  // Authentification
  validateCredentials(credentials: any): Promise<boolean>
  refreshToken?(connection: VttConnection): Promise<string>

  // Campagnes
  listCampaigns(connection: VttConnection): Promise<VttCampaignData[]>
  getCampaign(connection: VttConnection, campaignId: string): Promise<VttCampaignData>

  // Personnages
  listCharacters(connection: VttConnection, campaignId: string): Promise<VttCharacterData[]>
  getCharacter(connection: VttConnection, campaignId: string, characterId: string): Promise<VttCharacterData>

  // WebSocket pour écoute des événements
  subscribeToEvents(connection: VttConnection, campaignId: string, handlers: {
    onDiceRoll: (roll: VttDiceRollData) => void
    onCharacterUpdate?: (character: VttCharacterData) => void
  }): Promise<void>

  unsubscribeFromEvents(connection: VttConnection, campaignId: string): Promise<void>
}
```

### Implémentations

```
backend/app/services/vtt/
├── contracts/
│   └── vtt_adapter_interface.ts
├── adapters/
│   ├── foundry_adapter.ts        # Phase 1
│   ├── roll20_adapter.ts         # Phase 2
│   └── alchemy_adapter.ts        # Phase 2
├── vtt_adapter_factory.ts
└── vtt_sync_service.ts
```

### Factory Pattern

```typescript
// backend/app/services/vtt/vtt_adapter_factory.ts

import { VttAdapterInterface } from './contracts/vtt_adapter_interface.js'
import FoundryAdapter from './adapters/foundry_adapter.js'
import Roll20Adapter from './adapters/roll20_adapter.js'
import AlchemyAdapter from './adapters/alchemy_adapter.js'

export default class VttAdapterFactory {
  static create(providerName: string): VttAdapterInterface {
    switch (providerName) {
      case 'foundry':
        return new FoundryAdapter()
      case 'roll20':
        return new Roll20Adapter()
      case 'alchemy':
        return new AlchemyAdapter()
      default:
        throw new Error(`Unknown VTT provider: ${providerName}`)
    }
  }
}
```

---

## Phase 1 : Foundry VTT (MVP)

### Objectifs

✅ Connexion MJ + sélection campagne
✅ Association streamer-personnage
✅ Overlay critiques basique
✅ Dés cachés MJ

### 1.1 Backend - Foundry Adapter

**Recherche préalable** : Explorer l'API Foundry VTT
- Documentation officielle
- Endpoints disponibles
- Format des WebSocket events
- Gestion des critiques (par système de jeu ?)

```typescript
// backend/app/services/vtt/adapters/foundry_adapter.ts

import { VttAdapterInterface, VttCampaignData, VttCharacterData, VttDiceRollData } from '../contracts/vtt_adapter_interface.js'
import VttConnection from '#models/vtt_connection'
import axios from 'axios'
import WebSocket from 'ws'

export default class FoundryAdapter implements VttAdapterInterface {
  private wsConnections: Map<string, WebSocket> = new Map()

  async validateCredentials(credentials: any): Promise<boolean> {
    // TODO: Implémenter validation Foundry
    // Test de connexion au serveur avec l'API key
    try {
      const response = await axios.get(`${credentials.serverUrl}/api/status`, {
        headers: { 'Authorization': `Bearer ${credentials.apiKey}` }
      })
      return response.status === 200
    } catch {
      return false
    }
  }

  async listCampaigns(connection: VttConnection): Promise<VttCampaignData[]> {
    // TODO: GET /api/worlds
    // Transformer la réponse Foundry vers VttCampaignData
    const decrypted = await this.decryptCredentials(connection)
    const response = await axios.get(`${decrypted.serverUrl}/api/worlds`, {
      headers: { 'Authorization': `Bearer ${decrypted.apiKey}` }
    })

    return response.data.worlds.map(world => ({
      id: world.id,
      name: world.title,
      description: world.description,
      gameSystem: world.system,
      metadata: { ...world }
    }))
  }

  async getCampaign(connection: VttConnection, campaignId: string): Promise<VttCampaignData> {
    // TODO: GET /api/worlds/:id
    const decrypted = await this.decryptCredentials(connection)
    const response = await axios.get(`${decrypted.serverUrl}/api/worlds/${campaignId}`, {
      headers: { 'Authorization': `Bearer ${decrypted.apiKey}` }
    })

    return {
      id: response.data.id,
      name: response.data.title,
      description: response.data.description,
      gameSystem: response.data.system,
      metadata: { ...response.data }
    }
  }

  async listCharacters(connection: VttConnection, campaignId: string): Promise<VttCharacterData[]> {
    // TODO: GET /api/worlds/:worldId/actors
    // Filtrer par type 'character' vs 'npc'
    const decrypted = await this.decryptCredentials(connection)
    const response = await axios.get(
      `${decrypted.serverUrl}/api/worlds/${campaignId}/actors`,
      { headers: { 'Authorization': `Bearer ${decrypted.apiKey}` } }
    )

    return response.data.actors.map(actor => ({
      id: actor._id,
      name: actor.name,
      avatarUrl: actor.img,
      type: actor.type === 'npc' ? 'npc' : 'pc',
      stats: actor.system.attributes || {},
      inventory: actor.items || [],
      metadata: { ...actor }
    }))
  }

  async getCharacter(connection: VttConnection, campaignId: string, characterId: string): Promise<VttCharacterData> {
    // TODO: GET /api/worlds/:worldId/actors/:actorId
    const decrypted = await this.decryptCredentials(connection)
    const response = await axios.get(
      `${decrypted.serverUrl}/api/worlds/${campaignId}/actors/${characterId}`,
      { headers: { 'Authorization': `Bearer ${decrypted.apiKey}` } }
    )

    const actor = response.data
    return {
      id: actor._id,
      name: actor.name,
      avatarUrl: actor.img,
      type: actor.type === 'npc' ? 'npc' : 'pc',
      stats: actor.system.attributes || {},
      inventory: actor.items || [],
      metadata: { ...actor }
    }
  }

  async subscribeToEvents(
    connection: VttConnection,
    campaignId: string,
    handlers: {
      onDiceRoll: (roll: VttDiceRollData) => void
      onCharacterUpdate?: (character: VttCharacterData) => void
    }
  ): Promise<void> {
    // TODO: WebSocket connection to Foundry
    // ws://server/socket.io
    // Listen for 'createChatMessage' events with rolls
    const decrypted = await this.decryptCredentials(connection)
    const wsUrl = decrypted.serverUrl.replace('http', 'ws') + '/socket.io'

    const ws = new WebSocket(wsUrl, {
      headers: { 'Authorization': `Bearer ${decrypted.apiKey}` }
    })

    ws.on('message', (data) => {
      const event = JSON.parse(data.toString())

      if (event.type === 'createChatMessage' && event.data.roll) {
        const roll = this.parseFoundryRoll(event.data, campaignId)
        handlers.onDiceRoll(roll)
      }

      if (event.type === 'updateActor' && handlers.onCharacterUpdate) {
        const character = this.parseFoundryActor(event.data)
        handlers.onCharacterUpdate(character)
      }
    })

    this.wsConnections.set(`${connection.id}-${campaignId}`, ws)
  }

  async unsubscribeFromEvents(connection: VttConnection, campaignId: string): Promise<void> {
    const key = `${connection.id}-${campaignId}`
    const ws = this.wsConnections.get(key)
    if (ws) {
      ws.close()
      this.wsConnections.delete(key)
    }
  }

  private parseFoundryRoll(chatMessage: any, campaignId: string): VttDiceRollData {
    // TODO: Parser les données de roll Foundry
    // Détecter les critiques selon le système de jeu
    const roll = chatMessage.roll
    const isCritical = this.detectCritical(roll)

    return {
      id: chatMessage._id,
      formula: roll.formula,
      result: roll.total,
      diceResults: roll.dice.flatMap(d => d.results.map(r => r.result)),
      isCritical: isCritical.is,
      criticalType: isCritical.type,
      isHidden: chatMessage.blind || chatMessage.whisper?.length > 0,
      rollType: chatMessage.flavor || 'unknown',
      characterId: chatMessage.speaker.actor,
      metadata: { ...chatMessage }
    }
  }

  private detectCritical(roll: any): { is: boolean; type?: 'success' | 'failure' } {
    // TODO: Logique de détection selon le système
    // Pour D&D 5e: natural 1 ou 20 sur d20
    // À adapter selon le système de jeu
    const d20Roll = roll.dice.find(d => d.faces === 20)
    if (d20Roll) {
      const result = d20Roll.results[0]?.result
      if (result === 20) return { is: true, type: 'success' }
      if (result === 1) return { is: true, type: 'failure' }
    }
    return { is: false }
  }

  private parseFoundryActor(actor: any): VttCharacterData {
    return {
      id: actor._id,
      name: actor.name,
      avatarUrl: actor.img,
      type: actor.type === 'npc' ? 'npc' : 'pc',
      stats: actor.system.attributes || {},
      inventory: actor.items || [],
      metadata: { ...actor }
    }
  }

  private async decryptCredentials(connection: VttConnection): Promise<any> {
    // TODO: Utiliser AdonisJS Encryption service
    const encryption = await import('@adonisjs/core/services/encryption')
    return encryption.default.decrypt(connection.encryptedCredentials)
  }
}
```

### 1.2 Backend - Services

#### VttConnectionService

```typescript
// backend/app/services/vtt/vtt_connection_service.ts

import { inject } from '@adonisjs/core'
import VttConnection from '#models/vtt_connection'
import VttProvider from '#models/vtt_provider'
import VttAdapterFactory from './vtt_adapter_factory.js'
import encryption from '@adonisjs/core/services/encryption'

@inject()
export default class VttConnectionService {
  async createConnection(
    userId: string,
    providerId: string,
    name: string,
    credentials: any,
    serverUrl?: string
  ): Promise<VttConnection> {
    const provider = await VttProvider.findOrFail(providerId)
    const adapter = VttAdapterFactory.create(provider.name)

    // Valider les credentials
    const isValid = await adapter.validateCredentials({ ...credentials, serverUrl })
    if (!isValid) {
      throw new Error('Invalid VTT credentials')
    }

    // Chiffrer les credentials
    const encryptedCredentials = encryption.encrypt(JSON.stringify(credentials))

    // Créer la connexion
    const connection = await VttConnection.create({
      userId,
      vttProviderId: providerId,
      name,
      encryptedCredentials,
      serverUrl,
      status: 'active'
    })

    return connection
  }

  async listConnections(userId: string): Promise<VttConnection[]> {
    return VttConnection.query()
      .where('userId', userId)
      .preload('provider')
      .orderBy('createdAt', 'desc')
  }

  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const connection = await VttConnection.query()
      .where('id', connectionId)
      .where('userId', userId)
      .firstOrFail()

    // Vérifier qu'aucune campagne n'utilise cette connexion
    await connection.load('campaigns')
    if (connection.campaigns.length > 0) {
      throw new Error('Cannot delete connection with active campaigns')
    }

    await connection.delete()
  }

  async testConnection(connectionId: string, userId: string): Promise<boolean> {
    const connection = await VttConnection.query()
      .where('id', connectionId)
      .where('userId', userId)
      .preload('provider')
      .firstOrFail()

    const adapter = VttAdapterFactory.create(connection.provider.name)
    const credentials = JSON.parse(encryption.decrypt(connection.encryptedCredentials)!)

    return adapter.validateCredentials({
      ...credentials,
      serverUrl: connection.serverUrl
    })
  }
}
```

#### CampaignSyncService

```typescript
// backend/app/services/vtt/campaign_sync_service.ts

import { inject } from '@adonisjs/core'
import Campaign from '#models/campaign'
import Character from '#models/character'
import VttConnection from '#models/vtt_connection'
import VttAdapterFactory from './vtt_adapter_factory.js'
import { DateTime } from 'luxon'

@inject()
export default class CampaignSyncService {
  async importCampaign(connectionId: string, vttCampaignId: string, userId: string): Promise<Campaign> {
    const connection = await VttConnection.query()
      .where('id', connectionId)
      .where('userId', userId)
      .preload('provider')
      .firstOrFail()

    const adapter = VttAdapterFactory.create(connection.provider.name)
    const vttCampaign = await adapter.getCampaign(connection, vttCampaignId)

    // Créer la campagne dans Tumulte
    const campaign = await Campaign.create({
      ownerId: userId,
      vttConnectionId: connectionId,
      vttCampaignId: vttCampaign.id,
      vttCampaignName: vttCampaign.name,
      name: vttCampaign.name,
      description: vttCampaign.description,
      vttData: vttCampaign.metadata,
      lastVttSyncAt: DateTime.now()
    })

    // Importer les personnages
    await this.syncCharacters(campaign, connection)

    return campaign
  }

  async syncCharacters(campaign: Campaign, connection?: VttConnection): Promise<void> {
    if (!connection) {
      await campaign.load('vttConnection', (query) => query.preload('provider'))
      connection = campaign.vttConnection
    }

    const adapter = VttAdapterFactory.create(connection.provider.name)
    const vttCharacters = await adapter.listCharacters(connection, campaign.vttCampaignId)

    for (const vttChar of vttCharacters) {
      await Character.updateOrCreate(
        {
          campaignId: campaign.id,
          vttCharacterId: vttChar.id
        },
        {
          name: vttChar.name,
          avatarUrl: vttChar.avatarUrl,
          characterType: vttChar.type,
          stats: vttChar.stats,
          inventory: vttChar.inventory,
          vttData: vttChar.metadata,
          lastSyncAt: DateTime.now()
        }
      )
    }

    campaign.lastVttSyncAt = DateTime.now()
    await campaign.save()
  }

  async syncCampaignData(campaignId: string): Promise<void> {
    const campaign = await Campaign.query()
      .where('id', campaignId)
      .preload('vttConnection', (query) => query.preload('provider'))
      .firstOrFail()

    const adapter = VttAdapterFactory.create(campaign.vttConnection.provider.name)
    const vttCampaign = await adapter.getCampaign(
      campaign.vttConnection,
      campaign.vttCampaignId
    )

    // Mettre à jour les métadonnées de la campagne
    campaign.vttCampaignName = vttCampaign.name
    campaign.description = vttCampaign.description
    campaign.vttData = vttCampaign.metadata
    campaign.lastVttSyncAt = DateTime.now()
    await campaign.save()

    // Synchroniser les personnages
    await this.syncCharacters(campaign, campaign.vttConnection)
  }
}
```

#### DiceRollService

```typescript
// backend/app/services/vtt/dice_roll_service.ts

import { inject } from '@adonisjs/core'
import DiceRoll from '#models/dice_roll'
import Character from '#models/character'
import Campaign from '#models/campaign'
import { VttDiceRollData } from './contracts/vtt_adapter_interface.js'
import WebSocketService from '#services/websocket/websocket_service'

@inject()
export default class DiceRollService {
  constructor(private webSocketService: WebSocketService) {}

  async recordRoll(campaignId: string, rollData: VttDiceRollData): Promise<DiceRoll> {
    // Trouver le personnage correspondant
    const character = await Character.query()
      .where('campaignId', campaignId)
      .where('vttCharacterId', rollData.characterId)
      .firstOrFail()

    // Enregistrer le lancer
    const diceRoll = await DiceRoll.create({
      campaignId,
      characterId: character.id,
      vttRollId: rollData.id,
      rollFormula: rollData.formula,
      result: rollData.result,
      diceResults: rollData.diceResults,
      isCritical: rollData.isCritical,
      criticalType: rollData.criticalType,
      isHidden: rollData.isHidden,
      rollType: rollData.rollType,
      vttData: rollData.metadata
    })

    // Si c'est un critique, émettre un événement WebSocket
    if (diceRoll.isCritical && !diceRoll.isHidden) {
      await this.broadcastCriticalRoll(diceRoll, character)
    }

    // Si c'est un dé caché, émettre uniquement au MJ
    if (diceRoll.isHidden) {
      await this.broadcastHiddenRoll(diceRoll, character, campaignId)
    }

    return diceRoll
  }

  private async broadcastCriticalRoll(roll: DiceRoll, character: Character): Promise<void> {
    await roll.load('campaign', (query) => query.preload('memberships', (q) => q.preload('streamer')))

    const payload = {
      rollId: roll.id,
      character: {
        id: character.id,
        name: character.name,
        avatarUrl: character.avatarUrl
      },
      formula: roll.rollFormula,
      result: roll.result,
      criticalType: roll.criticalType,
      rolledAt: roll.rolledAt.toISO()
    }

    // Broadcast à tous les streamers de la campagne
    for (const membership of roll.campaign.memberships) {
      this.webSocketService.broadcast(
        `streamer:${membership.streamer.id}:dice`,
        'dice:critical',
        payload
      )
    }

    // Broadcast au MJ
    this.webSocketService.broadcast(
      `campaign:${roll.campaignId}:dice`,
      'dice:critical',
      payload
    )
  }

  private async broadcastHiddenRoll(roll: DiceRoll, character: Character, campaignId: string): Promise<void> {
    // Payload pour viewers (masqué)
    const publicPayload = {
      rollId: roll.id,
      character: {
        id: character.id,
        name: character.name,
        avatarUrl: character.avatarUrl
      },
      formula: '???',
      result: '???',
      isHidden: true,
      rolledAt: roll.rolledAt.toISO()
    }

    // Payload pour MJ (complet)
    const gmPayload = {
      ...publicPayload,
      formula: roll.rollFormula,
      result: roll.result,
      diceResults: roll.diceResults,
      isCritical: roll.isCritical,
      criticalType: roll.criticalType
    }

    await roll.load('campaign', (query) => query.preload('memberships', (q) => q.preload('streamer')))

    // Broadcast masqué aux streamers
    for (const membership of roll.campaign.memberships) {
      this.webSocketService.broadcast(
        `streamer:${membership.streamer.id}:dice`,
        'dice:hidden',
        publicPayload
      )
    }

    // Broadcast complet au MJ
    this.webSocketService.broadcast(
      `campaign:${campaignId}:dice`,
      'dice:hidden-gm',
      gmPayload
    )
  }

  async getRecentCriticals(campaignId: string, limit: number = 5): Promise<DiceRoll[]> {
    return DiceRoll.query()
      .where('campaignId', campaignId)
      .where('isCritical', true)
      .where('isHidden', false)
      .preload('character')
      .orderBy('rolledAt', 'desc')
      .limit(limit)
  }

  async getRollHistory(campaignId: string, characterId?: string, limit: number = 20): Promise<DiceRoll[]> {
    const query = DiceRoll.query()
      .where('campaignId', campaignId)
      .preload('character')
      .orderBy('rolledAt', 'desc')
      .limit(limit)

    if (characterId) {
      query.where('characterId', characterId)
    }

    return query
  }
}
```

### 1.3 Backend - Controllers & Routes

#### VttConnectionsController

```typescript
// backend/app/controllers/mj/vtt_connections_controller.ts

import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import VttConnectionService from '#services/vtt/vtt_connection_service'
import { createVttConnectionValidator } from '#validators/vtt/create_vtt_connection'

@inject()
export default class VttConnectionsController {
  constructor(private vttConnectionService: VttConnectionService) {}

  // GET /mj/vtt/connections
  async index({ auth, response }: HttpContext) {
    const connections = await this.vttConnectionService.listConnections(auth.user!.id)
    return response.ok(connections)
  }

  // POST /mj/vtt/connections
  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createVttConnectionValidator)

    const connection = await this.vttConnectionService.createConnection(
      auth.user!.id,
      data.providerId,
      data.name,
      data.credentials,
      data.serverUrl
    )

    return response.created(connection)
  }

  // DELETE /mj/vtt/connections/:id
  async destroy({ auth, params, response }: HttpContext) {
    await this.vttConnectionService.deleteConnection(params.id, auth.user!.id)
    return response.noContent()
  }

  // POST /mj/vtt/connections/:id/test
  async test({ auth, params, response }: HttpContext) {
    const isValid = await this.vttConnectionService.testConnection(params.id, auth.user!.id)
    return response.ok({ valid: isValid })
  }
}
```

#### CampaignsController (modifié)

```typescript
// backend/app/controllers/mj/campaigns_controller.ts

// MODIFIER store() pour importer depuis VTT au lieu de créer manuellement

async store({ auth, request, response }: HttpContext) {
  const data = await request.validateUsing(importCampaignValidator)

  const campaign = await this.campaignSyncService.importCampaign(
    data.vttConnectionId,
    data.vttCampaignId,
    auth.user!.id
  )

  return response.created(CampaignDto.fromModel(campaign))
}

// AJOUTER sync endpoint
// POST /mj/campaigns/:id/sync
async sync({ auth, params, response }: HttpContext) {
  // Vérifier ownership
  const campaign = await Campaign.findOrFail(params.id)
  if (campaign.ownerId !== auth.user!.id) {
    return response.forbidden({ message: 'Not authorized' })
  }

  await this.campaignSyncService.syncCampaignData(params.id)

  return response.ok({ message: 'Campaign synchronized' })
}
```

#### CharactersController

```typescript
// backend/app/controllers/mj/characters_controller.ts

import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import Character from '#models/character'
import CharacterAssignment from '#models/character_assignment'
import Campaign from '#models/campaign'

@inject()
export default class CharactersController {
  // GET /mj/campaigns/:campaignId/characters
  async index({ auth, params, response }: HttpContext) {
    const campaign = await Campaign.findOrFail(params.campaignId)
    if (campaign.ownerId !== auth.user!.id) {
      return response.forbidden({ message: 'Not authorized' })
    }

    const characters = await Character.query()
      .where('campaignId', params.campaignId)
      .preload('assignments', (query) => query.preload('streamer'))
      .orderBy('name')

    return response.ok(characters)
  }

  // POST /mj/campaigns/:campaignId/characters/:characterId/assign
  async assign({ auth, params, request, response }: HttpContext) {
    const campaign = await Campaign.findOrFail(params.campaignId)
    if (campaign.ownerId !== auth.user!.id) {
      return response.forbidden({ message: 'Not authorized' })
    }

    const { streamerId } = await request.validate({
      schema: schema.create({
        streamerId: schema.string({ trim: true }, [rules.uuid()])
      })
    })

    // Vérifier que le streamer est membre de la campagne
    const membership = await CampaignMembership.query()
      .where('campaignId', params.campaignId)
      .where('streamerId', streamerId)
      .where('status', 'ACTIVE')
      .first()

    if (!membership) {
      return response.badRequest({ message: 'Streamer is not a member of this campaign' })
    }

    // Vérifier que le personnage existe
    const character = await Character.query()
      .where('id', params.characterId)
      .where('campaignId', params.campaignId)
      .firstOrFail()

    // Créer ou mettre à jour l'assignation
    const assignment = await CharacterAssignment.updateOrCreate(
      {
        characterId: character.id,
        campaignId: params.campaignId
      },
      {
        streamerId
      }
    )

    await assignment.load('streamer')
    await assignment.load('character')

    return response.ok(assignment)
  }

  // DELETE /mj/campaigns/:campaignId/characters/:characterId/assign
  async unassign({ auth, params, response }: HttpContext) {
    const campaign = await Campaign.findOrFail(params.campaignId)
    if (campaign.ownerId !== auth.user!.id) {
      return response.forbidden({ message: 'Not authorized' })
    }

    await CharacterAssignment.query()
      .where('characterId', params.characterId)
      .where('campaignId', params.campaignId)
      .delete()

    return response.noContent()
  }
}
```

#### DiceRollsController (Overlay)

```typescript
// backend/app/controllers/overlay/dice_rolls_controller.ts

import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import DiceRollService from '#services/vtt/dice_roll_service'
import Streamer from '#models/streamer'

@inject()
export default class DiceRollsController {
  constructor(private diceRollService: DiceRollService) {}

  // GET /overlay/:streamerId/criticals
  async criticals({ params, response }: HttpContext) {
    const streamer = await Streamer.query()
      .where('id', params.streamerId)
      .preload('memberships', (query) =>
        query.where('status', 'ACTIVE').preload('campaign')
      )
      .firstOrFail()

    // Récupérer les critiques des campagnes actives du streamer
    const criticals = []
    for (const membership of streamer.memberships) {
      const campaignCriticals = await this.diceRollService.getRecentCriticals(
        membership.campaignId,
        5
      )
      criticals.push(...campaignCriticals)
    }

    // Trier par date décroissante et limiter à 5
    criticals.sort((a, b) => b.rolledAt.toMillis() - a.rolledAt.toMillis())
    const recent = criticals.slice(0, 5)

    return response.ok(recent)
  }
}
```

### 1.4 Frontend - Pages & Components

#### Page: Connexions VTT (MJ)

```vue
<!-- frontend/pages/mj/vtt/connections.vue -->

<script setup lang="ts">
const { data: connections, refresh } = await useAsyncData('vtt-connections', () =>
  $fetch('/mj/vtt/connections')
)

const isModalOpen = ref(false)
const selectedProvider = ref<string | null>(null)

const openModal = (providerId: string) => {
  selectedProvider.value = providerId
  isModalOpen.value = true
}

const handleConnectionCreated = () => {
  refresh()
  isModalOpen.value = false
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Connexions VTT</h1>
      <UButton @click="openModal('foundry')" icon="i-lucide-plus">
        Nouvelle connexion
      </UButton>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="connection in connections" :key="connection.id">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon :name="getProviderIcon(connection.provider.name)" />
              <span class="font-semibold">{{ connection.name }}</span>
            </div>
            <UBadge :color="connection.status === 'active' ? 'green' : 'red'">
              {{ connection.status }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-2">
          <p class="text-sm text-gray-600">
            {{ connection.provider.displayName }}
          </p>
          <p v-if="connection.serverUrl" class="text-sm text-gray-500">
            {{ connection.serverUrl }}
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton size="xs" variant="ghost" @click="testConnection(connection.id)">
              Tester
            </UButton>
            <UButton size="xs" color="red" variant="ghost" @click="deleteConnection(connection.id)">
              Supprimer
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <VttConnectionModal
      v-model="isModalOpen"
      :provider-id="selectedProvider"
      @created="handleConnectionCreated"
    />
  </div>
</template>
```

#### Component: Modal de création de connexion

```vue
<!-- frontend/components/mj/VttConnectionModal.vue -->

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  providerId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: []
}>()

const form = ref({
  name: '',
  serverUrl: '',
  apiKey: ''
})

const isLoading = ref(false)

const submit = async () => {
  isLoading.value = true
  try {
    await $fetch('/mj/vtt/connections', {
      method: 'POST',
      body: {
        providerId: props.providerId,
        name: form.value.name,
        serverUrl: form.value.serverUrl,
        credentials: {
          apiKey: form.value.apiKey
        }
      }
    })
    emit('created')
    form.value = { name: '', serverUrl: '', apiKey: '' }
  } catch (error) {
    console.error('Failed to create connection:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UModal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Nouvelle connexion Foundry VTT</h3>
      </template>

      <form @submit.prevent="submit" class="space-y-4">
        <UFormGroup label="Nom de la connexion" required>
          <UInput v-model="form.name" placeholder="Mon serveur Foundry" />
        </UFormGroup>

        <UFormGroup label="URL du serveur" required>
          <UInput v-model="form.serverUrl" placeholder="https://mon-serveur.foundry.com" />
        </UFormGroup>

        <UFormGroup label="API Key" required>
          <UInput v-model="form.apiKey" type="password" placeholder="Votre clé API" />
        </UFormGroup>

        <div class="flex justify-end gap-2">
          <UButton type="button" variant="ghost" @click="emit('update:modelValue', false)">
            Annuler
          </UButton>
          <UButton type="submit" :loading="isLoading">
            Créer
          </UButton>
        </div>
      </form>
    </UCard>
  </UModal>
</template>
```

#### Page: Import de campagne (MJ)

```vue
<!-- frontend/pages/mj/campaigns/import.vue -->

<script setup lang="ts">
const route = useRoute()
const connectionId = route.query.connectionId as string

const { data: campaigns } = await useAsyncData('vtt-campaigns', () =>
  $fetch(`/mj/vtt/connections/${connectionId}/campaigns`)
)

const selectedCampaign = ref<string | null>(null)
const isImporting = ref(false)

const importCampaign = async () => {
  if (!selectedCampaign.value) return

  isImporting.value = true
  try {
    const campaign = await $fetch('/mj/campaigns', {
      method: 'POST',
      body: {
        vttConnectionId: connectionId,
        vttCampaignId: selectedCampaign.value
      }
    })
    navigateTo(`/mj/campaigns/${campaign.id}`)
  } catch (error) {
    console.error('Failed to import campaign:', error)
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">Importer une campagne</h1>

    <div class="space-y-4">
      <UCard v-for="campaign in campaigns" :key="campaign.id"
             :class="{ 'ring-2 ring-primary': selectedCampaign === campaign.id }"
             class="cursor-pointer"
             @click="selectedCampaign = campaign.id">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold">{{ campaign.name }}</h3>
            <p class="text-sm text-gray-600">{{ campaign.description }}</p>
            <p class="text-xs text-gray-500 mt-1">Système: {{ campaign.gameSystem }}</p>
          </div>
          <UIcon v-if="selectedCampaign === campaign.id" name="i-lucide-check-circle"
                 class="text-primary text-2xl" />
        </div>
      </UCard>
    </div>

    <div class="mt-6 flex justify-end gap-2">
      <UButton variant="ghost" @click="navigateTo('/mj/campaigns')">
        Annuler
      </UButton>
      <UButton :disabled="!selectedCampaign" :loading="isImporting" @click="importCampaign">
        Importer
      </UButton>
    </div>
  </div>
</template>
```

#### Page: Assignation de personnages (MJ)

```vue
<!-- frontend/pages/mj/campaigns/[id]/characters.vue -->

<script setup lang="ts">
const route = useRoute()
const campaignId = route.params.id as string

const { data: characters, refresh } = await useAsyncData('campaign-characters', () =>
  $fetch(`/mj/campaigns/${campaignId}/characters`)
)

const { data: members } = await useAsyncData('campaign-members', () =>
  $fetch(`/mj/campaigns/${campaignId}/members`)
)

const assignCharacter = async (characterId: string, streamerId: string) => {
  await $fetch(`/mj/campaigns/${campaignId}/characters/${characterId}/assign`, {
    method: 'POST',
    body: { streamerId }
  })
  refresh()
}

const unassignCharacter = async (characterId: string) => {
  await $fetch(`/mj/campaigns/${campaignId}/characters/${characterId}/assign`, {
    method: 'DELETE'
  })
  refresh()
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">Personnages</h1>

    <div class="space-y-4">
      <UCard v-for="character in characters" :key="character.id">
        <div class="flex items-center gap-4">
          <UAvatar :src="character.avatarUrl" :alt="character.name" size="lg" />

          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold">{{ character.name }}</h3>
              <UBadge>{{ character.characterType === 'pc' ? 'PJ' : 'PNJ' }}</UBadge>
            </div>
            <p class="text-sm text-gray-600">
              {{ Object.keys(character.stats).length }} statistiques
            </p>
          </div>

          <div class="flex items-center gap-2">
            <USelectMenu
              v-if="!character.assignments?.length"
              :options="members"
              option-attribute="streamer.displayName"
              value-attribute="streamer.id"
              placeholder="Assigner à..."
              @change="assignCharacter(character.id, $event)"
            />
            <div v-else class="flex items-center gap-2">
              <span class="text-sm">
                Assigné à: {{ character.assignments[0].streamer.displayName }}
              </span>
              <UButton size="xs" color="red" variant="ghost"
                       @click="unassignCharacter(character.id)">
                Retirer
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
```

#### Component: Overlay des critiques

```vue
<!-- frontend/components/overlay/CriticalDiceOverlay.vue -->

<script setup lang="ts">
const props = defineProps<{
  streamerId: string
}>()

const criticals = ref<any[]>([])
const ws = ref<WebSocket | null>(null)

onMounted(() => {
  // Récupérer l'historique initial
  fetchCriticals()

  // Se connecter au WebSocket
  connectWebSocket()
})

onUnmounted(() => {
  ws.value?.close()
})

const fetchCriticals = async () => {
  const data = await $fetch(`/overlay/${props.streamerId}/criticals`)
  criticals.value = data
}

const connectWebSocket = () => {
  const wsUrl = `ws://localhost:3333`
  ws.value = new WebSocket(wsUrl)

  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.type === 'dice:critical') {
      // Ajouter le nouveau critique en tête
      criticals.value.unshift(data.payload)
      // Garder seulement les 5 derniers
      criticals.value = criticals.value.slice(0, 5)
    }

    if (data.type === 'dice:hidden') {
      // Afficher un dé caché avec ???
      criticals.value.unshift({
        ...data.payload,
        isHidden: true
      })
      criticals.value = criticals.value.slice(0, 5)
    }
  }
}

const getCriticalColor = (type: string) => {
  return type === 'success' ? 'text-green-500' : 'text-red-500'
}

const getCriticalIcon = (type: string) => {
  return type === 'success' ? 'i-lucide-sparkles' : 'i-lucide-skull'
}
</script>

<template>
  <div class="fixed top-4 right-4 w-80 space-y-2">
    <TransitionGroup name="slide-fade">
      <div v-for="(critical, index) in criticals" :key="critical.rollId"
           :style="{ transitionDelay: `${index * 50}ms` }"
           class="bg-black/80 backdrop-blur-sm rounded-lg p-4 border-2"
           :class="critical.isHidden ? 'border-gray-500' : getCriticalColor(critical.criticalType)">

        <div class="flex items-center gap-3">
          <UAvatar :src="critical.character.avatarUrl" :alt="critical.character.name" />

          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white">{{ critical.character.name }}</span>
              <UIcon v-if="!critical.isHidden"
                     :name="getCriticalIcon(critical.criticalType)"
                     :class="getCriticalColor(critical.criticalType)" />
            </div>

            <div class="text-sm text-gray-300">
              <span v-if="critical.isHidden">??? = ???</span>
              <span v-else>{{ critical.formula }} = {{ critical.result }}</span>
            </div>
          </div>

          <div v-if="!critical.isHidden"
               class="text-3xl font-bold"
               :class="getCriticalColor(critical.criticalType)">
            {{ critical.criticalType === 'success' ? '✓' : '✗' }}
          </div>
          <div v-else class="text-3xl text-gray-500">
            ???
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
```

#### Page: Overlay Streamer (public)

```vue
<!-- frontend/pages/overlay/[streamerId]/dice.vue -->

<script setup lang="ts">
const route = useRoute()
const streamerId = route.params.streamerId as string
</script>

<template>
  <div class="w-screen h-screen bg-transparent">
    <OverlayCriticalDiceOverlay :streamer-id="streamerId" />
  </div>
</template>
```

---

## Phase 2 : Roll20 & Alchemy RPG

### Objectifs

✅ Adapter Roll20Adapter
✅ Adapter AlchemyAdapter
✅ Tests de compatibilité multi-VTT
✅ Synchronisation des 3 providers

### 2.1 Roll20 Adapter

```typescript
// backend/app/services/vtt/adapters/roll20_adapter.ts

// Recherche préalable:
// - Roll20 API: https://roll20.zendesk.com/hc/en-us/articles/360037772793-API
// - Authentification: API Key manuelle
// - WebSocket: Non disponible (polling required)

export default class Roll20Adapter implements VttAdapterInterface {
  // TODO: Implémenter selon la doc Roll20
  // Particularité: Pas de WebSocket natif, donc polling périodique
  // pour récupérer les nouveaux lancers de dés
}
```

### 2.2 Alchemy RPG Adapter

```typescript
// backend/app/services/vtt/adapters/alchemy_adapter.ts

// Recherche préalable:
// - Alchemy API docs
// - Format des données

export default class AlchemyAdapter implements VttAdapterInterface {
  // TODO: Implémenter selon la doc Alchemy
}
```

### 2.3 Tests Multi-VTT

```typescript
// backend/tests/functional/vtt/multi_provider.spec.ts

test.group('Multi-VTT Support', () => {
  test('MJ can have connections to multiple VTT providers', async () => {
    // Créer connexions Foundry + Roll20
    // Vérifier isolation des données
  })

  test('Campaigns from different VTT can coexist', async () => {
    // Import campagne Foundry
    // Import campagne Roll20
    // Vérifier que les deux fonctionnent
  })
})
```

---

## Phase 3 : Fonctionnalités Avancées (À planifier plus tard)

### À implémenter plus tard

- 🎲 **Animations 3D des dés** (Three.js)
  - Prédire le résultat
  - Animation ralentissant jusqu'à la bonne face

- 📦 **Affichage inventaire sur overlay**
  - API publique pour extension Twitch

- 📊 **Affichage statistiques personnage**
  - API publique pour extension Twitch

- 🎨 **Extension Twitch**
  - Plugin overlay Twitch natif
  - Intégration avec l'API Tumulte

---

## Routes Backend (Récapitulatif)

### Authentification MJ

```
GET/POST/DELETE  /mj/vtt/connections
POST             /mj/vtt/connections/:id/test
GET              /mj/vtt/connections/:id/campaigns (liste VTT)
```

### Campagnes

```
POST  /mj/campaigns                            # Import depuis VTT (body: vttConnectionId, vttCampaignId)
POST  /mj/campaigns/:id/sync                   # Re-sync avec VTT
GET   /mj/campaigns/:campaignId/characters
POST  /mj/campaigns/:campaignId/characters/:characterId/assign
DELETE /mj/campaigns/:campaignId/characters/:characterId/assign
```

### Streamer

```
GET  /streamer/campaigns/:campaignId/my-character  # Personnage assigné
```

### Overlay (public)

```
GET  /overlay/:streamerId/criticals               # Historique des critiques récents
WS   /ws (events: dice:critical, dice:hidden)
```

---

## WebSocket Events

### Nouveaux événements

```typescript
// Canal: streamer:{streamerId}:dice
'dice:critical' → {
  rollId: string
  character: { id, name, avatarUrl }
  formula: string
  result: number
  criticalType: 'success' | 'failure'
  rolledAt: ISO string
}

'dice:hidden' → {
  rollId: string
  character: { id, name, avatarUrl }
  formula: '???'
  result: '???'
  isHidden: true
  rolledAt: ISO string
}

// Canal: campaign:{campaignId}:dice (MJ uniquement)
'dice:hidden-gm' → {
  ...dice:hidden payload
  formula: string (révélé)
  result: number (révélé)
  diceResults: number[]
  isCritical: boolean
  criticalType?: 'success' | 'failure'
}
```

---

## Checklist Phase 1 (MVP Foundry)

### Backend

- [ ] Créer migrations (VttProvider, VttConnection, Character, CharacterAssignment, DiceRoll)
- [ ] Migrer table campaigns (ajout champs VTT)
- [ ] Supprimer campagnes existantes (migration de nettoyage)
- [ ] Seeder VttProvider (Foundry, Roll20, Alchemy)
- [ ] Implémenter VttAdapterInterface
- [ ] Implémenter FoundryAdapter (listCampaigns, listCharacters, subscribeToEvents)
- [ ] Implémenter VttConnectionService
- [ ] Implémenter CampaignSyncService
- [ ] Implémenter DiceRollService
- [ ] Créer VttConnectionsController
- [ ] Modifier CampaignsController (import au lieu de create)
- [ ] Créer CharactersController
- [ ] Créer DiceRollsController (overlay)
- [ ] Ajouter routes /mj/vtt/*
- [ ] Tests unitaires adapters
- [ ] Tests fonctionnels end-to-end

### Frontend

- [ ] Page /mj/vtt/connections (liste + création)
- [ ] Component VttConnectionModal
- [ ] Page /mj/campaigns/import (sélection campagne VTT)
- [ ] Modifier page /mj/campaigns (bouton import au lieu de créer)
- [ ] Page /mj/campaigns/[id]/characters (assignation)
- [ ] Component OverlayCriticalDiceOverlay
- [ ] Page /overlay/[streamerId]/dice (public)
- [ ] Composable useWebSocket (écoute dice:critical, dice:hidden)
- [ ] Tests E2E Playwright

### Documentation

- [ ] Mettre à jour README.md
- [ ] Documenter API endpoints VTT
- [ ] Guide de configuration Foundry (comment générer API key)
- [ ] Guide pour streamers (comment choisir son personnage)

---

## Risques & Considérations

### Risques Techniques

1. **API Foundry limitée/non documentée**
   - Mitigation: Tester avec un serveur Foundry de dev
   - Alternative: Utiliser un module Foundry custom qui expose les événements

2. **WebSocket Foundry instable**
   - Mitigation: Système de reconnexion automatique
   - Fallback: Polling périodique si WebSocket échoue

3. **Détection des critiques variable selon le système de jeu**
   - Mitigation: Configuration par système (D&D 5e, Pathfinder, etc.)
   - Default: Natural 1/20 pour d20

4. **Performance avec plusieurs streamers**
   - Mitigation: Cache Redis pour données personnages
   - Debounce sur les événements de dés

### Dépendances Externes

- **Foundry VTT**: API v10+
- **Roll20**: API v2
- **Alchemy RPG**: À déterminer

### Impact sur le Système Existant

- **BREAKING**: Suppression des campagnes existantes
- **Cohabitation**: Polls continuent de fonctionner normalement
- **Migration**: Les utilisateurs devront recréer leurs campagnes via VTT

---

## TODO Recherche Préalable

Avant de commencer l'implémentation, rechercher :

### Foundry VTT
- [ ] Documentation API officielle
- [ ] Format des événements WebSocket
- [ ] Gestion des API keys / OAuth
- [ ] Structure des données Actor/Character
- [ ] Détection des critiques par système de jeu
- [ ] Liste des systèmes de jeu supportés (dnd5e, pf2e, etc.)

### Roll20
- [ ] API endpoints disponibles
- [ ] Authentification (API key format)
- [ ] Polling vs WebSocket
- [ ] Format des lancers de dés

### Alchemy RPG
- [ ] Documentation API
- [ ] Capacités d'intégration

---

## Notes d'Implémentation

### Sécurité

- Tous les credentials VTT sont **chiffrés** via AdonisJS Encryption
- Les API keys ne sont jamais exposées au frontend
- Les overlays sont publics mais en read-only
- Les dés cachés ne révèlent jamais le résultat aux non-MJ

### Performance

- **Cache Redis** pour:
  - Données personnages (TTL: 5 min)
  - Liste des campagnes VTT (TTL: 1 min)

- **Debounce** sur les événements WebSocket (100ms)

- **Pagination** pour l'historique des lancers

### Tests

- Tests unitaires pour chaque adapter
- Tests d'intégration VTT avec mocks
- Tests E2E avec serveur Foundry de test
- Tests de charge (10+ streamers simultanés)

---

**Fin du plan Phase 1 - Foundry VTT MVP**
