# 🎲 Intégration VTT - Documentation Complète

Intégration complète entre Virtual Tabletops (Foundry VTT, Roll20, Alchemy RPG) et Tumulte pour afficher les dice rolls sur les overlays Twitch.

## 📊 Vue d'ensemble

### Architecture Webhook

```
┌─────────────────┐      HTTPS POST       ┌──────────────────┐
│  Foundry VTT    │────────────────────────▶│  Backend         │
│  Module         │   Bearer Token Auth    │  Tumulte         │
└─────────────────┘                        └──────────────────┘
                                                    │
                                                    │ WebSocket
                                                    ▼
┌─────────────────┐                        ┌──────────────────┐
│  Roll20 Script  │───────────────────────▶│  Overlay Twitch  │
└─────────────────┘                        └──────────────────┘
                                                    ▲
┌─────────────────┐                                │
│  Alchemy        │────────────────────────────────┘
│  Extension      │
└─────────────────┘
```

### Latence
- **< 100ms** : Temps entre le dice roll dans le VTT et l'affichage sur l'overlay
- **WebSocket** : Push en temps réel vers les overlays des streamers

---

## 🗄️ Backend (AdonisJS 6)

### Modèles de Données

#### 1. VttProvider
```typescript
{
  id: string (UUID)
  name: 'foundry' | 'roll20' | 'alchemy'
  displayName: string
  authType: 'api_key'
  isActive: boolean
  configSchema: object (JSON Schema)
}
```

Seedé avec 3 providers : Foundry VTT, Roll20, Alchemy RPG

#### 2. VttConnection
```typescript
{
  id: string (UUID)
  userId: string (FK users)
  vttProviderId: string (FK vtt_providers)
  name: string
  apiKey: string (Généré par Tumulte, unique)
  webhookUrl: string
  status: 'pending' | 'active' | 'expired' | 'revoked'
  lastWebhookAt: DateTime | null
}
```

Représente la connexion d'un GM à un VTT spécifique.

#### 3. Campaign (Modifié)
```typescript
{
  // ... champs existants
  vttConnectionId: string | null (FK vtt_connections)
  vttCampaignId: string | null (ID externe du VTT)
  vttCampaignName: string | null
  vttData: object | null
  lastVttSyncAt: DateTime | null
}
```

Les campagnes peuvent désormais être importées depuis un VTT.

#### 4. Character
```typescript
{
  id: string (UUID)
  campaignId: string (FK campaigns)
  vttCharacterId: string (ID externe du VTT)
  name: string
  avatarUrl: string | null
  characterType: 'pc' | 'npc'
  stats: object | null (JSONB)
  inventory: object | null (JSONB)
  vttData: object | null (JSONB)
  lastSyncAt: DateTime | null
}
```

Unique constraint: `(campaign_id, vtt_character_id)`

#### 5. CharacterAssignment
```typescript
{
  id: string (UUID)
  characterId: string (FK characters)
  streamerId: string (FK streamers)
  campaignId: string (FK campaigns)
  assignedAt: DateTime
}
```

Assigne un personnage VTT à un streamer Twitch.

#### 6. DiceRoll
```typescript
{
  id: string (UUID)
  campaignId: string (FK campaigns)
  characterId: string (FK characters)
  vttRollId: string | null (Pour déduplication)
  rollFormula: string ('1d20+5')
  result: number
  diceResults: number[] (Array PostgreSQL)
  isCritical: boolean
  criticalType: 'success' | 'failure' | null
  isHidden: boolean (GM rolls cachés)
  rollType: string | null ('attack', 'skill', etc.)
  vttData: object | null (JSONB)
  rolledAt: DateTime
}
```

Index sur `vtt_roll_id` pour déduplication rapide.

### Controllers

#### VttController
**Endpoints:**
- `POST /webhooks/vtt/dice-roll` - Reçoit un dice roll
- `POST /webhooks/vtt/test` - Test de connexion

**Authentification:** Bearer Token (API Key)

**Rate Limiting:** 100 req/min pour dice-roll

**Validation:** Zod schema pour les payloads

### Services

#### VttWebhookService
**Responsabilités:**
- Trouve la campagne Tumulte depuis `vttConnectionId` + `vttCampaignId`
- Trouve ou crée le personnage depuis `vttCharacterId`
- Gère la déduplication via `vttRollId`
- Délègue l'enregistrement au DiceRollService

**Méthodes:**
- `processDiceRoll(connection, payload)` → DiceRoll
- `findOrCreateCharacter(campaign, payload)` → Character
- `syncCharacter(connection, campaignId, data)` → Character

#### DiceRollService
**Responsabilités:**
- Enregistre les dice rolls en base
- Émet les événements WebSocket Transmit
- Fournit l'historique et les statistiques

**WebSocket Channels:**
- `campaign/{campaignId}/dice-rolls` → Event pour le GM
- `streamer/{streamerId}/dice-rolls` → Events pour les streamers

**Logique de notification:**
- **Roll critique** → Tous les streamers de la campagne
- **Roll non-critique** → Uniquement le streamer assigné au personnage
- **Roll caché** → Jamais envoyé aux streamers

**Méthodes:**
- `recordDiceRoll(data)` → DiceRoll
- `getCampaignRollHistory(campaignId, limit, includeHidden)` → DiceRoll[]
- `getCharacterRollStats(characterId)` → Stats

---

## 🎭 Module Foundry VTT

### Structure
```
foundry/
├── module.json          # Manifest (compatible Foundry v11+)
├── scripts/
│   └── tumulte.js      # Script principal (~400 lignes)
├── styles/
│   └── tumulte.css     # Styles du bouton Test
├── lang/
│   ├── en.json         # Traductions EN
│   └── fr.json         # Traductions FR
└── README.md           # Doc d'installation
```

### Fonctionnalités

#### 1. Configuration via Settings
- **Enable Integration** - On/Off
- **API Key** - Clé fournie par Tumulte
- **Webhook URL** - Endpoint backend (dev ou prod)
- **Campaign ID** - ID du monde Foundry
- **Send All Rolls** - Tous les rolls ou uniquement critiques
- **Debug Mode** - Logs dans la console

#### 2. Détection des Dice Rolls
- Hook sur `createChatMessage`
- Extraction des données du roll (formula, result, dice)
- Détection des critiques (D&D 5e: natural 1/20 sur d20)
- Détection des rolls cachés (whisper)
- Identification du type de roll (attack, skill, save, etc.)

#### 3. Envoi des Webhooks
- Payload JSON avec toutes les métadonnées
- Authentification Bearer Token
- Gestion des erreurs avec notifications UI
- Déduplication via `rollId` (Foundry message ID)

#### 4. Test de Connexion
- Bouton "Test Connection" dans les settings
- Appel à `/webhooks/vtt/test`
- Affiche le nom de la connexion si succès

### Payload Envoyé
```json
{
  "campaignId": "my-foundry-world",
  "characterId": "actor-abc123",
  "characterName": "Gimli",
  "rollId": "message-xyz789",
  "rollFormula": "1d20+5",
  "result": 25,
  "diceResults": [20, 5],
  "isCritical": true,
  "criticalType": "success",
  "isHidden": false,
  "rollType": "attack",
  "metadata": {
    "foundryMessageId": "...",
    "foundryActorId": "...",
    "foundryRollId": "...",
    "flavor": "Longsword Attack",
    "timestamp": 1704067200000
  }
}
```

### Installation
1. Copier le dossier `foundry/` dans `[FoundryVTT]/Data/modules/tumulte-integration/`
2. Activer le module dans Foundry
3. Configurer les settings avec l'API key Tumulte
4. Tester la connexion

---

## 🎯 Roll20 (À Implémenter)

### Approche : API Script
Roll20 propose une **API Script** pour les comptes **Pro**.

**Structure similaire:**
```javascript
on('chat:message', function(msg) {
    if (msg.type === 'rollresult') {
        sendToTumulte(msg);
    }
});
```

**Fichier:** `modules-vtt/roll20/tumulte-integration.js`

---

## 🧪 Alchemy RPG (À Implémenter)

### Approche : Extension Navigateur
Alchemy RPG n'a **pas d'API**. Solution : extension Chrome/Firefox.

**Fonctionnement:**
1. Extension injecte un script dans la page Alchemy
2. DOM observer écoute les dice rolls
3. Extrait les données du HTML
4. Envoie le webhook vers Tumulte

**Technologies:**
- Manifest V3 (Chrome Extension)
- Content Script pour injection
- MutationObserver pour les rolls

**Fichier:** `modules-vtt/alchemy/manifest.json` + scripts

---

## 🔒 Sécurité

### API Key
- Générée par Tumulte (format: `ta_xxx...`)
- Unique par VTT Connection
- Stockée en clair côté VTT (module local)
- Envoyée via Bearer Token HTTPS

### Validation Backend
- API key vérifie dans `vtt_connections` table
- Status doit être `active`
- Rate limiting : 100 req/min par API key
- Payload validation via Zod

### WebSocket
- Channels privés par campaign/streamer
- Seuls les streamers assignés reçoivent les events
- Rolls cachés (`isHidden=true`) masqués aux streamers

---

## 📡 WebSocket Events

### Channel: `campaign/{campaignId}/dice-rolls`
**Destinataire:** GM uniquement

**Event:** `dice-roll:new`
```json
{
  "event": "dice-roll:new",
  "data": {
    "id": "roll-uuid",
    "characterId": "char-uuid",
    "characterName": "Gimli",
    "characterAvatar": "https://...",
    "rollFormula": "1d20+5",
    "result": 25,
    "diceResults": [20, 5],
    "isCritical": true,
    "criticalType": "success",
    "isHidden": false,
    "rollType": "attack",
    "rolledAt": "2024-01-01T12:00:00Z"
  }
}
```

### Channel: `streamer/{streamerId}/dice-rolls`
**Destinataires:** Streamers de la campagne

**Event 1:** `dice-roll:critical` (tous les streamers)
```json
{
  "event": "dice-roll:critical",
  "data": {
    // ... même structure
    "isOwnCharacter": true/false
  }
}
```

**Event 2:** `dice-roll:new` (streamer assigné uniquement)
```json
{
  "event": "dice-roll:new",
  "data": {
    // ... même structure
    "isOwnCharacter": true
  }
}
```

---

## 🚀 Prochaines Étapes

### Phase 2 : Frontend GM

**Pages à créer:**
1. `/mj/vtt-connections` - Liste des connexions VTT
2. `/mj/vtt-connections/create` - Créer une connexion
3. `/mj/campaigns/import` - Importer depuis VTT
4. `/mj/campaigns/:id/characters` - Gérer les assignments

**Composants:**
- `VttConnectionCard.vue` - Carte d'une connexion
- `CharacterAssignmentTable.vue` - Table des assignments
- `DiceRollHistory.vue` - Historique des rolls

### Phase 3 : Frontend Streamer

**Pages:**
1. `/streamer/campaigns/:id/character` - Choisir son personnage
2. `/streamer/studio/dice-rolls` - Preview des dice rolls

### Phase 4 : Overlay

**Composants:**
- `DiceRollOverlay.vue` - Affichage animé des rolls critiques
- Intégration dans l'Overlay Studio existant
- Animations CSS/GSAP pour les rolls

**Display Logic:**
- Afficher pendant 5-10 secondes
- Queue si plusieurs rolls simultanés
- Différents styles : success (vert), failure (rouge)
- Masquer les rolls `isHidden` avec "???"

### Phase 5 : Tests

**Tests Backend:**
- Tests unitaires des services
- Tests fonctionnels des endpoints webhooks
- Tests d'intégration WebSocket

**Tests Foundry:**
- Test manuel dans Foundry v11/v12
- Test avec différents systèmes (D&D 5e, Pathfinder, etc.)

---

## 📊 Base de Données

### Migrations Créées (6 total)
1. `create_vtt_providers_table` ✅
2. `create_vtt_connections_table` ✅
3. `create_characters_table` ✅
4. `create_character_assignments_table` ✅
5. `create_dice_rolls_table` ✅
6. `add_vtt_fields_to_campaigns_table` ✅

### Seeders
- `vtt_provider_seeder` ✅ (3 providers créés)

---

## 🎨 Nomenclature

### Database (snake_case)
- Tables : `vtt_connections`, `dice_rolls`, `character_assignments`
- Colonnes : `vtt_campaign_id`, `last_sync_at`, `is_critical`

### Code (camelCase)
- Properties : `vttConnectionId`, `lastSyncAt`, `isCritical`
- Methods : `processDiceRoll`, `findOrCreateCharacter`

### Models (PascalCase)
- Classes : `VttConnection`, `DiceRoll`, `Character`

---

## 📝 Checklist Complète

### Backend ✅
- [x] Migrations DB (6)
- [x] Models (5 + 1 modifié)
- [x] VttWebhookController
- [x] VttWebhookService
- [x] DiceRollService
- [x] Routes webhooks
- [x] Seeder VTT providers
- [x] Tests typecheck
- [x] Tests lint
- [x] Serveur démarre

### Foundry Module ✅
- [x] Structure du module
- [x] module.json manifest
- [x] Script principal (tumulte.js)
- [x] Traductions (EN/FR)
- [x] Styles CSS
- [x] README documentation

### À Faire 📋
- [ ] Roll20 API Script
- [ ] Alchemy Extension navigateur
- [ ] Frontend GM (pages VTT)
- [ ] Frontend Streamer (sélection perso)
- [ ] Composant Overlay
- [ ] Tests backend
- [ ] Tests manuels Foundry
- [ ] Documentation utilisateur

---

## 🔗 Ressources

### Documentation Foundry VTT
- API Reference: https://foundryvtt.com/api/
- Module Development: https://foundryvtt.com/article/module-development/
- Hooks: https://foundryvtt.com/api/hookEvents.html

### Documentation Roll20
- API: https://help.roll20.net/hc/en-us/articles/360037256714-API
- Scripts: https://github.com/Roll20/roll20-api-scripts

### Documentation Alchemy RPG
- Pas d'API officielle
- Reverse engineering du DOM nécessaire

---

**Développé avec ❤️ pour Tumulte**
