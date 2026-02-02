# Extension du Module Foundry VTT - Gamification

Ce document décrit les modifications à apporter au module Foundry VTT pour supporter la gamification bidirectionnelle (réception de commandes depuis Tumulte).

## Vue d'ensemble

Actuellement, le module Foundry envoie des données vers Tumulte (jets de dés, événements). Pour la gamification, il faut ajouter la capacité de **recevoir des commandes** depuis Tumulte pour :

1. Supprimer des messages du chat
2. Lancer des dés avec des résultats forcés
3. Envoyer des messages dans le chat
4. Modifier les données des acteurs (stats, effets)

## Architecture

```
Tumulte Backend                     Module Foundry VTT
      │                                    │
      │  POST /api/command                 │
      │ ─────────────────────────────────► │
      │  { action, data, token }           │
      │                                    │
      │                              [Validation token]
      │                                    │
      │                              [Exécution action]
      │                                    │
      │  { success, result }               │
      │ ◄───────────────────────────────── │
```

## Endpoints à ajouter au module

### POST /api/command

Point d'entrée unique pour toutes les commandes Tumulte.

**Headers requis :**
```
Authorization: Bearer <api_key>
Content-Type: application/json
```

**Body :**
```json
{
  "action": "string",
  "data": { ... },
  "requestId": "string (optionnel, pour déduplication)"
}
```

## Actions supportées

### 1. `chat_message` - Envoyer un message

**Data :**
```json
{
  "content": "Message HTML à afficher",
  "speaker": {
    "alias": "Nom affiché (optionnel)",
    "actorId": "ID de l'acteur (optionnel)"
  },
  "whisper": ["userId1", "userId2"] // Optionnel, pour whisper
}
```

**Implémentation Foundry :**
```javascript
async function handleChatMessage(data) {
  const messageData = {
    content: data.content,
    speaker: data.speaker || {},
  };

  if (data.whisper && data.whisper.length > 0) {
    messageData.whisper = data.whisper;
  }

  const message = await ChatMessage.create(messageData);
  return { success: true, messageId: message.id };
}
```

### 2. `delete_message` - Supprimer un message

**Data :**
```json
{
  "messageId": "ID du message à supprimer"
}
```

**Implémentation Foundry :**
```javascript
async function handleDeleteMessage(data) {
  const message = game.messages.get(data.messageId);
  if (!message) {
    return { success: false, error: 'Message not found' };
  }

  await message.delete();
  return { success: true };
}
```

### 3. `roll_dice` - Lancer un dé (avec résultat optionnel forcé)

**Data :**
```json
{
  "formula": "1d20+5",
  "forcedResult": 1,  // Optionnel: force le résultat du dé principal
  "flavor": "Message de contexte",
  "speaker": {
    "actorId": "ID de l'acteur"
  }
}
```

**Implémentation Foundry :**
```javascript
async function handleRollDice(data) {
  const roll = new Roll(data.formula);

  // Évaluer le roll
  await roll.evaluate();

  // Si forcedResult est spécifié, modifier le résultat
  if (data.forcedResult !== undefined && roll.dice.length > 0) {
    const mainDie = roll.dice[0];
    const originalResult = mainDie.results[0].result;

    // Modifier le résultat
    mainDie.results[0].result = data.forcedResult;

    // Recalculer le total
    roll._total = roll._evaluateTotal();

    // Ajouter l'info dans le flavor
    data.flavor = (data.flavor || '') +
      `\n<em>(Original: ${originalResult} → Forcé: ${data.forcedResult})</em>`;
  }

  // Envoyer au chat
  await roll.toMessage({
    speaker: data.speaker || {},
    flavor: data.flavor || '',
  });

  return {
    success: true,
    total: roll.total,
    formula: roll.formula
  };
}
```

### 4. `modify_actor` - Modifier un acteur

**Data :**
```json
{
  "actorId": "ID de l'acteur",
  "updates": {
    "system.attributes.hp.value": 50,
    "system.attributes.hp.temp": 10
  }
}
```

**Implémentation Foundry :**
```javascript
async function handleModifyActor(data) {
  const actor = game.actors.get(data.actorId);
  if (!actor) {
    return { success: false, error: 'Actor not found' };
  }

  // Vérifier les permissions (doit être GM ou owner)
  if (!actor.isOwner && !game.user.isGM) {
    return { success: false, error: 'Permission denied' };
  }

  await actor.update(data.updates);
  return { success: true };
}
```

### 5. `modify_token` - Modifier un token

**Data :**
```json
{
  "tokenId": "ID du token",
  "sceneId": "ID de la scène (optionnel, current scene par défaut)",
  "updates": {
    "x": 100,
    "y": 200,
    "elevation": 10
  }
}
```

## Code complet du handler

```javascript
// Dans le module Foundry, ajouter ce handler

class TumulteCommandHandler {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.handlers = {
      'chat_message': this.handleChatMessage.bind(this),
      'delete_message': this.handleDeleteMessage.bind(this),
      'roll_dice': this.handleRollDice.bind(this),
      'modify_actor': this.handleModifyActor.bind(this),
      'modify_token': this.handleModifyToken.bind(this),
    };
  }

  /**
   * Valide le token d'authentification
   */
  validateToken(token) {
    return token === this.apiKey;
  }

  /**
   * Traite une commande entrante
   */
  async handleCommand(action, data, token) {
    // Vérifier l'authentification
    if (!this.validateToken(token)) {
      return { success: false, error: 'Unauthorized' };
    }

    // Vérifier que l'action existe
    const handler = this.handlers[action];
    if (!handler) {
      return { success: false, error: `Unknown action: ${action}` };
    }

    // Exécuter l'action
    try {
      return await handler(data);
    } catch (error) {
      console.error(`[Tumulte] Error executing ${action}:`, error);
      return { success: false, error: error.message };
    }
  }

  async handleChatMessage(data) {
    const messageData = {
      content: data.content,
      speaker: data.speaker || {},
    };

    if (data.whisper?.length > 0) {
      messageData.whisper = data.whisper;
    }

    const message = await ChatMessage.create(messageData);
    return { success: true, messageId: message.id };
  }

  async handleDeleteMessage(data) {
    const message = game.messages.get(data.messageId);
    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    await message.delete();
    return { success: true };
  }

  async handleRollDice(data) {
    const roll = new Roll(data.formula);
    await roll.evaluate();

    if (data.forcedResult !== undefined && roll.dice.length > 0) {
      const mainDie = roll.dice[0];
      const originalResult = mainDie.results[0].result;

      mainDie.results[0].result = data.forcedResult;
      roll._total = roll._evaluateTotal();

      data.flavor = (data.flavor || '') +
        `\n<em style="color: #ff6b6b;">(🎭 Inversé par le chat: ${originalResult} → ${data.forcedResult})</em>`;
    }

    await roll.toMessage({
      speaker: data.speaker || {},
      flavor: data.flavor || '',
    });

    return { success: true, total: roll.total };
  }

  async handleModifyActor(data) {
    const actor = game.actors.get(data.actorId);
    if (!actor) {
      return { success: false, error: 'Actor not found' };
    }

    await actor.update(data.updates);
    return { success: true };
  }

  async handleModifyToken(data) {
    const scene = data.sceneId ? game.scenes.get(data.sceneId) : game.scenes.current;
    if (!scene) {
      return { success: false, error: 'Scene not found' };
    }

    const token = scene.tokens.get(data.tokenId);
    if (!token) {
      return { success: false, error: 'Token not found' };
    }

    await token.update(data.updates);
    return { success: true };
  }
}

// Initialisation dans le module
Hooks.once('ready', () => {
  const settings = game.settings.get('tumulte', 'connection');
  if (settings?.apiKey) {
    window.tumulteCommandHandler = new TumulteCommandHandler(settings.apiKey);
    console.log('[Tumulte] Command handler initialized');
  }
});
```

## Intégration avec le serveur HTTP du module

Le module doit exposer un endpoint HTTP local. Voici un exemple avec Express (si le module utilise un serveur interne) :

```javascript
// Ajouter au serveur HTTP existant du module
app.post('/api/command', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  const { action, data, requestId } = req.body;

  const result = await window.tumulteCommandHandler.handleCommand(
    action,
    data,
    token
  );

  res.json(result);
});
```

## Sécurité

1. **Authentification** : Toutes les requêtes doivent inclure le token API dans le header `Authorization: Bearer <token>`

2. **Validation** : Valider toutes les données entrantes avant exécution

3. **Permissions** : Vérifier que le module a les droits nécessaires (GM) pour les opérations sensibles

4. **Rate limiting** : Limiter le nombre de commandes par seconde pour éviter les abus

## Versioning

- **Version actuelle** : 1.x.x (webhooks uniquement, lecture seule)
- **Nouvelle version** : 1.y.0 (ajout des commandes, bidirectionnel)

Le backend Tumulte vérifiera la version du module et affichera un avertissement si elle est trop ancienne pour supporter la gamification.

## Tests

Pour tester l'intégration :

1. Lancer Foundry avec le module mis à jour
2. Se connecter à Tumulte
3. Déclencher un événement de gamification (dé critique)
4. Vérifier que l'inversion de dé fonctionne

## Roadmap

- [ ] Implémenter le handler de base (chat_message, delete_message)
- [ ] Ajouter roll_dice avec forcedResult
- [ ] Ajouter modify_actor pour les effets de stats
- [ ] Ajouter modify_token pour les effets visuels
- [ ] Ajouter le contrôle des lumières de scène
- [ ] Implémenter les macros personnalisées
