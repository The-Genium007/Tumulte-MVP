# Module Tumulte pour Alchemy RPG

## Statut : En Recherche

Alchemy RPG est un VTT web-based, ce qui signifie qu'il tourne dans le navigateur.

## Approches Possibles

### Option 1 : Extension Navigateur (Recommandé)

Créer une extension Chrome/Firefox qui :
- Injecte du JavaScript dans la page Alchemy RPG
- Écoute les événements de lancers de dés (via DOM observers)
- Envoie des webhooks vers Tumulte

**Avantages** :
- ✅ Fonctionne même sans API Alchemy officielle
- ✅ Peut capturer tous les événements du DOM
- ✅ Webhooks HTTPS vers Tumulte

**Inconvénients** :
- ⚠️ L'utilisateur doit installer une extension navigateur
- ⚠️ Peut se casser si Alchemy change leur HTML

### Option 2 : Userscript (Tampermonkey/Greasemonkey)

Créer un userscript qui :
- S'exécute sur les pages `*.alchemyrpg.com`
- Intercepte les lancers de dés
- Envoie des webhooks

**Avantages** :
- ✅ Plus simple qu'une extension
- ✅ Facile à distribuer (copier/coller script)

**Inconvénients** :
- ⚠️ Nécessite Tampermonkey installé
- ⚠️ Même fragilité que l'extension

### Option 3 : Attendre l'API Officielle

Selon leur doc : *"this is a file-based import process, but we may open up an API for this in the future."*

**Avantages** :
- ✅ Solution officielle et stable

**Inconvénients** :
- ❌ Pas de date de sortie
- ❌ Bloque l'intégration

---

## Décision Phase 1

**Approche retenue** : Extension Navigateur Chrome/Firefox

On va créer une extension qui :
1. Injecte du JavaScript sur `*.alchemyrpg.com`
2. Observe le DOM pour détecter les lancers de dés
3. Parse les résultats (formule, total, critique)
4. Envoie webhook POST vers Tumulte

---

## Structure Extension

```
modules-vtt/alchemy/
├── manifest.json          # Configuration extension
├── background.js          # Service worker
├── content.js             # Script injecté dans Alchemy
├── popup.html             # Popup de configuration
├── popup.js               # Logique popup
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## À Investiguer

- [ ] Trouver le sélecteur DOM des lancers de dés sur Alchemy
- [ ] Identifier le format des résultats (HTML structure)
- [ ] Tester avec un compte Alchemy de dev
- [ ] Voir si Alchemy a des WebSockets qu'on peut écouter

---

## Timeline

**Phase 2** (après Foundry + Roll20)
- Semaine 1 : Recherche DOM Alchemy
- Semaine 2 : Extension Chrome prototype
- Semaine 3 : Tests + Firefox support
- Semaine 4 : Release

---

## Sources

- [Alchemy RPG Developer Docs](https://alchemyrpg.github.io/slate/)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
