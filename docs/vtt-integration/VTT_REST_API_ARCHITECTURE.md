# Architecture REST API pour les 3 VTT

**Approche choisie** : API REST unifiée avec polling, sans module custom
**Avantages** : Uniformité entre VTT, découplage, pas de maintenance de modules

---

## 1. Architecture Globale

```
┌──────────────────────────────────────────────────────────────┐
│  VTT Instances (Foundry / Roll20 / Alchemy)                  │
│  + Modules REST API communautaires                           │
└──────────────────────────────────────────────────────────────┘
                         ↓ HTTP REST API
┌──────────────────────────────────────────────────────────────┐
│  Backend Tumulte (AdonisJS)                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  VTT Polling Service (Singleton)                    │    │
│  │  - Active connections tracking                      │    │
│  │  - Periodic polling (every 2 seconds)              │    │
│  │  - Event detection & diffing                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                         ↓                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  VTT Adapters (Factory Pattern)                    │    │
│  │  - FoundryAdapter                                   │    │
│  │  - Roll20Adapter                                    │    │
│  │  - AlchemyAdapter                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                         ↓                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Database (PostgreSQL)                              │    │
│  │  - Campaigns, Characters, DiceRolls                 │    │
│  │  - Last poll timestamps (cursor tracking)          │    │
│  └─────────────────────────────────────────────────────┘    │
│                         ↓                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  WebSocket Service (Transmit)                       │    │
│  │  - Emit dice:critical, dice:hidden                  │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                         ↓ WebSocket
┌──────────────────────────────────────────────────────────────┐
│  Frontend Nuxt                                               │
│  - Overlay affiche critiques avec ~1.5s latence             │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Modules REST API Communautaires

### Foundry VTT

**Module** : [Foundry REST API](https://github.com/ThreeHats/foundryvtt-rest-api)

**Installation MJ** :
1. Installer le module via l'interface Foundry
2. Activer dans Module Settings
3. Configurer l'API key dans les settings du module

**Endpoints disponibles** :
```
GET  /api/worlds                     # Liste des worlds
GET  /api/worlds/:worldId/actors     # Liste des acteurs
GET  /api/worlds/:worldId/actors/:id # Détails acteur
GET  /api/worlds/:worldId/chat       # Messages chat (dont dés)
```

**Authentication** :
```http
GET /api/worlds/:worldId/chat
Authorization: Bearer <foundry-api-key>
```

**Note** : Ce module expose l'API Foundry via HTTP, mais nécessite que Foundry soit accessible sur le réseau.

---

### Roll20

**API Officielle** : [Roll20 API](https://help.roll20.net/hc/en-us/articles/360037773133-API-Overview)

**Note** : Roll20 n'a PAS d'API REST externe officielle. Il faut utiliser l'API Mod (scripts internes).

**Alternative** :
- Utiliser un script Roll20 qui envoie des webhooks vers Tumulte (similaire au module Foundry qu'on voulait éviter)
- **Ou** : Utiliser un scraper/bot qui simule un client Roll20 (plus complexe)

**⚠️ Problème** : Roll20 n'a pas d'API REST externe accessible. On devra peut-être créer un petit script Roll20 quand même.

---

### Alchemy RPG

**API** : À rechercher (documentation Alchemy RPG)

**Hypothèse** : Si Alchemy a une API REST, on pourra l'utiliser directement.

---

## 3. Modifications des Modèles

### VttConnection (ajout champs pour REST)

```typescript
// backend/app/models/vtt_connection.ts

export default class VttConnection extends BaseModel {
  // ... champs existants ...

  @column()
  declare apiEndpoint: string // Ex: "https://foundry.example.com"

  @column()
  declare encryptedApiKey: string // Clé API du VTT (encrypted)

  @column()
  declare pollingEnabled: boolean // true = polling actif

  @column()
  declare pollingIntervalSeconds: number // Default: 2

  @column()
  declare lastPollAt: DateTime | null // Dernier poll réussi

  @column()
  declare lastPollCursor: string | null // Curseur pour pagination (ex: last message ID)

  // Méthode helper
  public async getDecryptedApiKey(): Promise<string> {
    const encryption = await import('@adonisjs/core/services/encryption')
    return encryption.default.decrypt(this.encryptedApiKey)!
  }
}
```

---

## 4. VTT Polling Service

### Service Principal

```typescript
// backend/app/services/vtt/vtt_polling_service.ts

import { inject } from '@adonisjs/core'
import VttConnection from '#models/vtt_connection'
import VttAdapterFactory from './vtt_adapter_factory.js'
import DiceRollService from './dice_roll_service.js'
import { DateTime } from 'luxon'

@inject()
export default class VttPollingService {
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(private diceRollService: DiceRollService) {}

  /**
   * Démarre le polling pour une connexion VTT
   */
  async startPolling(connectionId: string): Promise<void> {
    // Vérifier qu'on ne poll pas déjà
    if (this.pollingTimers.has(connectionId)) {
      console.warn(`Polling already active for connection ${connectionId}`)
      return
    }

    const connection = await VttConnection.query()
      .where('id', connectionId)
      .preload('provider')
      .preload('campaigns')
      .firstOrFail()

    if (!connection.pollingEnabled) {
      console.log(`Polling disabled for connection ${connectionId}`)
      return
    }

    const adapter = VttAdapterFactory.create(connection.provider.name)
    const intervalMs = connection.pollingIntervalSeconds * 1000

    console.log(`Starting polling for ${connection.name} (every ${connection.pollingIntervalSeconds}s)`)

    // Fonction de polling
    const poll = async () => {
      try {
        await this.pollConnection(connection, adapter)
      } catch (error) {
        console.error(`Polling error for connection ${connectionId}:`, error)
        // Continuer le polling malgré l'erreur
      }
    }

    // Poll immédiatement puis intervalle
    await poll()
    const timer = setInterval(poll, intervalMs)
    this.pollingTimers.set(connectionId, timer)
  }

  /**
   * Arrête le polling pour une connexion
   */
  stopPolling(connectionId: string): void {
    const timer = this.pollingTimers.get(connectionId)
    if (timer) {
      clearInterval(timer)
      this.pollingTimers.delete(connectionId)
      console.log(`Stopped polling for connection ${connectionId}`)
    }
  }

  /**
   * Poll une connexion spécifique
   */
  private async pollConnection(
    connection: VttConnection,
    adapter: VttAdapterInterface
  ): Promise<void> {
    // Pour chaque campagne de cette connexion
    for (const campaign of connection.campaigns) {
      try {
        // Récupérer les nouveaux messages/événements depuis le dernier cursor
        const events = await adapter.pollEvents(connection, campaign.vttCampaignId, {
          since: connection.lastPollCursor || undefined,
          limit: 100
        })

        // Traiter chaque événement
        for (const event of events) {
          await this.processEvent(campaign, event)
        }

        // Mettre à jour le cursor et timestamp
        if (events.length > 0) {
          connection.lastPollCursor = events[events.length - 1].id
        }
      } catch (error) {
        console.error(`Error polling campaign ${campaign.id}:`, error)
      }
    }

    // Mettre à jour lastPollAt
    connection.lastPollAt = DateTime.now()
    await connection.save()
  }

  /**
   * Traite un événement VTT (ex: nouveau lancer de dé)
   */
  private async processEvent(campaign: Campaign, event: any): Promise<void> {
    if (event.type === 'dice_roll') {
      await this.diceRollService.recordRoll(campaign.id, event.data)
    }
    // Ajouter d'autres types d'événements ici (character_update, etc.)
  }

  /**
   * Démarre le polling pour toutes les connexions actives
   */
  async startAllPolling(): Promise<void> {
    const connections = await VttConnection.query()
      .where('pollingEnabled', true)
      .where('status', 'active')

    for (const connection of connections) {
      await this.startPolling(connection.id)
    }

    console.log(`Started polling for ${connections.length} VTT connections`)
  }

  /**
   * Arrête tout le polling
   */
  stopAllPolling(): void {
    for (const connectionId of this.pollingTimers.keys()) {
      this.stopPolling(connectionId)
    }
  }
}
```

---

## 5. VTT Adapter Interface (Modifiée pour REST)

```typescript
// backend/app/services/vtt/contracts/vtt_adapter_interface.ts

export interface VttPollOptions {
  since?: string // Cursor (ID du dernier événement traité)
  limit?: number // Nombre max d'événements à récupérer
}

export interface VttEvent {
  id: string // ID unique de l'événement (pour cursor)
  type: 'dice_roll' | 'character_update' | 'scene_change'
  timestamp: string // ISO date
  data: any // Données spécifiques au type
}

export interface VttAdapterInterface {
  // Authentification
  validateCredentials(apiEndpoint: string, apiKey: string): Promise<boolean>

  // Campagnes
  listCampaigns(connection: VttConnection): Promise<VttCampaignData[]>
  getCampaign(connection: VttConnection, campaignId: string): Promise<VttCampaignData>

  // Personnages
  listCharacters(connection: VttConnection, campaignId: string): Promise<VttCharacterData[]>
  getCharacter(connection: VttConnection, campaignId: string, characterId: string): Promise<VttCharacterData>

  // Polling des événements (NOUVEAU)
  pollEvents(connection: VttConnection, campaignId: string, options: VttPollOptions): Promise<VttEvent[]>
}
```

---

## 6. Foundry Adapter (Implémentation REST)

```typescript
// backend/app/services/vtt/adapters/foundry_adapter.ts

import { VttAdapterInterface, VttEvent, VttPollOptions } from '../contracts/vtt_adapter_interface.js'
import VttConnection from '#models/vtt_connection'
import axios from 'axios'

export default class FoundryAdapter implements VttAdapterInterface {
  async validateCredentials(apiEndpoint: string, apiKey: string): Promise<boolean> {
    try {
      const response = await axios.get(`${apiEndpoint}/api/status`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      return response.status === 200
    } catch {
      return false
    }
  }

  async listCampaigns(connection: VttConnection): Promise<VttCampaignData[]> {
    const apiKey = await connection.getDecryptedApiKey()

    const response = await axios.get(`${connection.apiEndpoint}/api/worlds`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    return response.data.map(world => ({
      id: world.id,
      name: world.title,
      description: world.description,
      gameSystem: world.system,
      metadata: world
    }))
  }

  async getCampaign(connection: VttConnection, campaignId: string): Promise<VttCampaignData> {
    const apiKey = await connection.getDecryptedApiKey()

    const response = await axios.get(
      `${connection.apiEndpoint}/api/worlds/${campaignId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    )

    return {
      id: response.data.id,
      name: response.data.title,
      description: response.data.description,
      gameSystem: response.data.system,
      metadata: response.data
    }
  }

  async listCharacters(connection: VttConnection, campaignId: string): Promise<VttCharacterData[]> {
    const apiKey = await connection.getDecryptedApiKey()

    const response = await axios.get(
      `${connection.apiEndpoint}/api/worlds/${campaignId}/actors`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    )

    return response.data.actors.map(actor => ({
      id: actor._id,
      name: actor.name,
      avatarUrl: actor.img,
      type: actor.type === 'npc' ? 'npc' : 'pc',
      stats: actor.system?.attributes || {},
      inventory: actor.items || [],
      metadata: actor
    }))
  }

  async getCharacter(
    connection: VttConnection,
    campaignId: string,
    characterId: string
  ): Promise<VttCharacterData> {
    const apiKey = await connection.getDecryptedApiKey()

    const response = await axios.get(
      `${connection.apiEndpoint}/api/worlds/${campaignId}/actors/${characterId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    )

    const actor = response.data
    return {
      id: actor._id,
      name: actor.name,
      avatarUrl: actor.img,
      type: actor.type === 'npc' ? 'npc' : 'pc',
      stats: actor.system?.attributes || {},
      inventory: actor.items || [],
      metadata: actor
    }
  }

  /**
   * Poll les nouveaux messages chat (contenant les lancers de dés)
   */
  async pollEvents(
    connection: VttConnection,
    campaignId: string,
    options: VttPollOptions
  ): Promise<VttEvent[]> {
    const apiKey = await connection.getDecryptedApiKey()

    // Construire l'URL avec le cursor
    let url = `${connection.apiEndpoint}/api/worlds/${campaignId}/chat`
    const params: any = {
      limit: options.limit || 100
    }

    if (options.since) {
      params.since = options.since // Le dernier message ID traité
    }

    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      params
    })

    // Transformer les messages chat en événements
    const events: VttEvent[] = []

    for (const message of response.data.messages || []) {
      // Filtrer uniquement les messages avec des lancers de dés
      if (!message.roll) continue

      // Détecter si c'est un critique
      const critical = this.detectCritical(message)

      events.push({
        id: message._id,
        type: 'dice_roll',
        timestamp: message.timestamp,
        data: {
          id: message._id,
          formula: message.roll.formula,
          result: message.roll.total,
          diceResults: message.roll.dice.flatMap(d => d.results.map(r => r.result)),
          isCritical: critical.isCritical,
          criticalType: critical.type,
          isHidden: message.blind || message.whisper?.length > 0,
          rollType: message.flavor || 'unknown',
          characterId: message.speaker.actor,
          metadata: message
        }
      })
    }

    return events
  }

  private detectCritical(message: any): { isCritical: boolean; type?: 'success' | 'failure' } {
    // Priorité aux flags système (D&D 5e)
    if (message.flags?.dnd5e?.roll?.isCritical) {
      return { isCritical: true, type: 'success' }
    }

    // Détection générique sur d20
    const d20 = message.roll?.dice?.find(d => d.faces === 20)
    if (!d20) return { isCritical: false }

    const natural = d20.results[0]?.result
    if (natural === 20) return { isCritical: true, type: 'success' }
    if (natural === 1) return { isCritical: true, type: 'failure' }

    return { isCritical: false }
  }
}
```

---

## 7. Démarrage du Polling au Boot

```typescript
// backend/start/events.ts (ou providers/app_provider.ts)

import VttPollingService from '#services/vtt/vtt_polling_service'

// Au démarrage de l'app
export default class AppProvider {
  async boot() {
    const app = await this.app.container.make('app')

    app.ready(() => {
      // Démarrer le polling pour toutes les connexions actives
      const pollingService = await this.app.container.make(VttPollingService)
      await pollingService.startAllPolling()

      console.log('VTT Polling Service started')
    })

    // Graceful shutdown
    app.terminating(() => {
      const pollingService = this.app.container.make(VttPollingService)
      pollingService.stopAllPolling()
    })
  }
}
```

---

## 8. Frontend - Création de Connexion Foundry

```vue
<!-- frontend/pages/mj/vtt/connections/create.vue -->

<script setup lang="ts">
const form = ref({
  name: '',
  provider: 'foundry',
  apiEndpoint: '',
  apiKey: ''
})

const isLoading = ref(false)

const submit = async () => {
  isLoading.value = true
  try {
    const connection = await $fetch('/mj/vtt/connections', {
      method: 'POST',
      body: form.value
    })

    navigateTo(`/mj/vtt/connections/${connection.id}`)
  } catch (error) {
    console.error('Failed to create connection:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">Nouvelle Connexion VTT</h1>

    <UCard>
      <form @submit.prevent="submit" class="space-y-4">
        <UFormGroup label="Provider" required>
          <USelectMenu v-model="form.provider" :options="[
            { label: 'Foundry VTT', value: 'foundry' },
            { label: 'Roll20', value: 'roll20', disabled: true },
            { label: 'Alchemy RPG', value: 'alchemy', disabled: true }
          ]" />
        </UFormGroup>

        <UFormGroup label="Nom de la connexion" required>
          <UInput v-model="form.name" placeholder="Mon serveur Foundry" />
        </UFormGroup>

        <UFormGroup label="API Endpoint" required>
          <UInput v-model="form.apiEndpoint" placeholder="https://foundry.example.com" />
          <template #help>
            URL de votre serveur Foundry (avec le module REST API installé)
          </template>
        </UFormGroup>

        <UFormGroup label="API Key" required>
          <UInput v-model="form.apiKey" type="password" placeholder="Votre clé API Foundry" />
          <template #help>
            Clé générée dans les settings du module "Foundry REST API"
          </template>
        </UFormGroup>

        <div class="flex justify-end gap-2">
          <UButton type="button" variant="ghost" @click="navigateTo('/mj/vtt/connections')">
            Annuler
          </UButton>
          <UButton type="submit" :loading="isLoading">
            Créer
          </UButton>
        </div>
      </form>
    </UCard>

    <!-- Instructions d'installation -->
    <UCard class="mt-6">
      <template #header>
        <h3 class="font-semibold">Comment configurer Foundry VTT ?</h3>
      </template>

      <ol class="list-decimal list-inside space-y-2">
        <li>Installez le module <strong>Foundry REST API</strong> depuis l'interface Foundry</li>
        <li>Activez le module dans vos Game Settings</li>
        <li>Allez dans Module Settings → Foundry REST API</li>
        <li>Copiez votre <strong>API Key</strong></li>
        <li>Collez-la dans le formulaire ci-dessus</li>
      </ol>

      <UAlert class="mt-4" color="yellow" variant="soft" icon="i-lucide-alert-triangle">
        Votre serveur Foundry doit être accessible depuis Internet (HTTPS recommandé)
      </UAlert>
    </UCard>
  </div>
</template>
```

---

## 9. Backend Controller

```typescript
// backend/app/controllers/mj/vtt_connections_controller.ts

import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import VttConnectionService from '#services/vtt/vtt_connection_service'
import VttPollingService from '#services/vtt/vtt_polling_service'
import { createVttConnectionValidator } from '#validators/vtt/create_vtt_connection'

@inject()
export default class VttConnectionsController {
  constructor(
    private vttConnectionService: VttConnectionService,
    private pollingService: VttPollingService
  ) {}

  // POST /mj/vtt/connections
  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createVttConnectionValidator)

    const connection = await this.vttConnectionService.createConnection(
      auth.user!.id,
      data.provider,
      data.name,
      data.apiEndpoint,
      data.apiKey
    )

    // Démarrer le polling immédiatement
    await this.pollingService.startPolling(connection.id)

    return response.created(connection)
  }

  // DELETE /mj/vtt/connections/:id
  async destroy({ auth, params, response }: HttpContext) {
    // Arrêter le polling
    this.pollingService.stopPolling(params.id)

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

---

## 10. Sécurité & Performance

### Rate Limiting

```typescript
// backend/config/limiter.ts

export default {
  stores: {
    foundry: {
      driver: 'redis',
      connectionName: 'main'
    }
  },

  limiters: {
    'foundry-api': {
      store: 'foundry',
      requests: 60, // 60 requêtes
      duration: '1 min'
    }
  }
}
```

### Cache Redis pour Personnages

```typescript
// backend/app/services/vtt/campaign_sync_service.ts

import redis from '@adonisjs/redis/services/main'

async syncCharacters(campaign: Campaign): Promise<void> {
  const cacheKey = `campaign:${campaign.id}:characters`

  // Vérifier le cache (TTL: 5 minutes)
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // Sinon, fetcher depuis le VTT
  const adapter = VttAdapterFactory.create(campaign.vttConnection.provider.name)
  const characters = await adapter.listCharacters(campaign.vttConnection, campaign.vttCampaignId)

  // Stocker dans le cache
  await redis.setex(cacheKey, 300, JSON.stringify(characters))

  // Stocker en DB
  for (const char of characters) {
    await Character.updateOrCreate(
      { campaignId: campaign.id, vttCharacterId: char.id },
      { ...char, lastSyncAt: DateTime.now() }
    )
  }
}
```

---

## 11. Problème Roll20 & Solutions

### ⚠️ Roll20 n'a pas d'API REST externe

**Options** :

#### Option A : Script Roll20 + Webhooks
- Créer un script Roll20 Mod API (JavaScript dans Roll20)
- Le script envoie des webhooks vers Tumulte
- **Inconvénient** : Similaire au module Foundry qu'on voulait éviter

#### Option B : Scraper/Bot Roll20
- Bot qui se connecte comme un client Roll20
- Parse les événements de la page
- **Inconvénient** : Fragile, contre les ToS Roll20 ?

#### Option C : Attendre l'API officielle Roll20
- Roll20 a annoncé une API externe (en développement)
- **Inconvénient** : Pas de date de sortie

**Recommandation pour Phase 1** : Commencer par Foundry uniquement, Roll20 en Phase 2 quand on aura plus d'infos

---

## 12. Timeline Implémentation

### Phase 1A : Foundry REST (2-3 semaines)

- [ ] Migrations DB (ajout champs polling)
- [ ] VttPollingService (singleton)
- [ ] FoundryAdapter avec `pollEvents()`
- [ ] Tests polling en local
- [ ] Frontend création connexion
- [ ] Documentation installation module REST API

### Phase 1B : Overlay & Temps Réel (1 semaine)

- [ ] DiceRollService enregistre les rolls
- [ ] WebSocket emit `dice:critical`
- [ ] Overlay frontend affiche critiques
- [ ] Tests end-to-end

### Phase 2 : Roll20 (À définir)

- Recherche API Roll20
- Décision approche (script ou scraper)
- Implémentation Roll20Adapter

### Phase 3 : Alchemy RPG (À définir)

- Recherche API Alchemy
- Implémentation AlchemyAdapter

---

## 13. Checklist Démarrage

- [ ] Rechercher le module REST API Foundry exact (nom, repo GitHub)
- [ ] Tester le module sur un serveur Foundry de dev
- [ ] Valider les endpoints `/api/worlds/:id/chat`
- [ ] Confirmer le format des cursors (pagination)
- [ ] Héberger le backend Tumulte avec accès externe (Cloudflare)
- [ ] Configurer Redis pour le cache

---

**Prochaine étape** : Valider que le module REST API Foundry supporte bien le polling des messages chat avec cursor.
