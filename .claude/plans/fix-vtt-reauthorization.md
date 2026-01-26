# Plan de Correction : Réautorisation VTT Foundry

## Contexte du problème

Après révocation d'une connexion VTT depuis le frontend Tumulte, le bouton "Reconnecter" ne permet pas au module Foundry de se reconnecter automatiquement. Le problème persiste même après relance de Foundry.

**Cause racine** : Le système de sécurité par fingerprint a été ajouté côté backend mais le module Foundry n'a pas été mis à jour pour stocker et envoyer ce fingerprint lors du refresh de tokens.

---

## Corrections à effectuer

### 1. TokenStorage - Ajouter le support du fingerprint

**Fichier** : `modules-vtt/foundry/scripts/lib/token-storage.js`

**Modifications** :
- Ajouter `storeFingerprint(fingerprint)` - stocke le fingerprint dans les credentials Foundry
- Ajouter `getFingerprint()` - récupère le fingerprint stocké
- Modifier `clearTokens()` - effacer aussi le fingerprint

**Impact** : Permet au module de conserver le fingerprint de sécurité entre les sessions

---

### 2. SocketClient - Stocker le fingerprint lors de la réautorisation

**Fichier** : `modules-vtt/foundry/scripts/lib/socket-client.js`

**Modifications dans `checkReauthorizationStatus()`** (lignes ~382-398) :
- Après `storeApiKey(data.apiKey)`, ajouter le stockage du fingerprint :
  ```javascript
  if (data.fingerprint) {
    await this.tokenStorage.storeFingerprint(data.fingerprint)
  }
  ```

**Impact** : Le fingerprint reçu lors de la réautorisation sera conservé pour les futurs refresh de tokens

---

### 3. SocketClient - Envoyer le fingerprint lors du refresh de token

**Fichier** : `modules-vtt/foundry/scripts/lib/socket-client.js`

**Modifications dans `refreshToken()`** (lignes ~309-332) :
- Récupérer le fingerprint stocké
- L'inclure dans le body de la requête POST :
  ```javascript
  body: JSON.stringify({
    refreshToken,
    fingerprint: this.tokenStorage.getFingerprint()
  })
  ```

**Impact** : Le backend pourra valider le fingerprint et accepter le refresh de token

---

### 4. TumulteIntegration - Démarrer le polling automatiquement au startup

**Fichier** : `modules-vtt/foundry/scripts/tumulte.js`

**Modifications dans `initialize()`** (lignes ~101-118) :
- Quand `healthStatus.status === 'revoked'`, au lieu de simplement afficher le dialogue, démarrer aussi le polling automatiquement en arrière-plan
- Le dialogue reste informatif mais le polling démarre sans action utilisateur

**Avant** :
```javascript
if (healthStatus.status === 'revoked') {
  this.showRevocationDialog(healthStatus.message)
  return
}
```

**Après** :
```javascript
if (healthStatus.status === 'revoked') {
  this.showRevocationDialog(healthStatus.message)
  this.startReauthorizationPolling() // Nouveau : polling automatique
  return
}
```

**Impact** : Dès que Foundry démarre avec une connexion révoquée, le polling commence automatiquement. Si le GM a déjà réautorisé, la reconnexion se fait sans intervention.

---

### 5. TumulteIntegration - Ajouter méthode de polling réutilisable

**Fichier** : `modules-vtt/foundry/scripts/tumulte.js`

**Nouvelle méthode** `startReauthorizationPolling()` :
- Démarre un interval de 3 secondes pour checker `/reauthorization-status`
- Arrête automatiquement quand `status === 'reauthorized'` ou `status === 'already_active'`
- Stocke l'interval ID pour pouvoir l'arrêter si nécessaire

**Impact** : Factorisation du code de polling utilisé à plusieurs endroits

---

### 6. PairingManager - Stocker le fingerprint lors du pairing initial

**Fichier** : `modules-vtt/foundry/scripts/lib/pairing-manager.js`

**Vérifier** que `completePairing()` stocke bien le fingerprint reçu lors du pairing initial.

**Impact** : Le fingerprint est conservé dès le premier pairing, pas seulement après réautorisation

---

## Ordre d'implémentation

1. **TokenStorage** (base) - Ajouter les méthodes fingerprint
2. **PairingManager** - Stocker fingerprint au pairing initial
3. **SocketClient** - Stocker fingerprint à la réautorisation + l'envoyer au refresh
4. **TumulteIntegration** - Polling automatique au startup

---

## Tests à effectuer

### Scénario 1 : Révocation puis réautorisation (Foundry ouvert)
1. Connexion active entre Foundry et Tumulte
2. GM révoque depuis le dashboard Tumulte
3. Foundry affiche le dialogue de révocation
4. GM clique "Reconnecter" sur Tumulte
5. **Attendu** : Foundry se reconnecte automatiquement en quelques secondes

### Scénario 2 : Réautorisation puis relance Foundry
1. Connexion révoquée
2. GM réautorise depuis Tumulte (Foundry fermé)
3. Relance de Foundry
4. **Attendu** : Foundry se connecte automatiquement au démarrage

### Scénario 3 : Relance Foundry avec connexion révoquée (non réautorisée)
1. Connexion révoquée, pas encore réautorisée
2. Relance de Foundry
3. **Attendu** : Dialogue s'affiche + polling automatique en arrière-plan
4. GM réautorise depuis Tumulte
5. **Attendu** : Foundry se reconnecte automatiquement

### Scénario 4 : Token refresh après reconnexion
1. Connexion rétablie après réautorisation
2. Attendre expiration du session token (1h) ou forcer un refresh
3. **Attendu** : Le refresh fonctionne car fingerprint est envoyé

---

## Fichiers modifiés (résumé)

| Fichier | Type de modification |
|---------|---------------------|
| `modules-vtt/foundry/scripts/lib/token-storage.js` | Ajout méthodes fingerprint |
| `modules-vtt/foundry/scripts/lib/socket-client.js` | Stockage + envoi fingerprint |
| `modules-vtt/foundry/scripts/lib/pairing-manager.js` | Stockage fingerprint initial |
| `modules-vtt/foundry/scripts/tumulte.js` | Polling automatique au startup |

---

## Risques et considérations

- **Rétrocompatibilité** : Les connexions existantes sans fingerprint stocké devront refaire un pairing complet (acceptable car le fingerprint est une feature de sécurité récente)
- **Migration** : Pas de migration nécessaire, le nouveau code gère le cas où fingerprint est absent
- **Performance** : Le polling à 3s est raisonnable et s'arrête dès que la connexion est rétablie
