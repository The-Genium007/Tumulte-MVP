# Architecture Finale VTT - Webhooks Unifiés

Voir les fichiers détaillés :
- [VTT_INTEGRATION_PLAN.md](VTT_INTEGRATION_PLAN.md) - Plan global avec modèles de données
- [FOUNDRY_TECHNICAL_RESEARCH.md](FOUNDRY_TECHNICAL_RESEARCH.md) - Recherche Foundry VTT

## Décision Finale

**Approche retenue** : Module/Script pour chaque VTT → Webhooks HTTPS vers Tumulte Backend

### Raisons

1. **Foundry VTT** : Module Foundry custom avec webhooks
2. **Roll20** : Script API Roll20 avec webhooks
3. **Alchemy RPG** : Extension navigateur (Chrome/Firefox) avec webhooks

**Avantages** :
- ⚡ Temps réel instantané (<100ms)
- 🎯 Événements push automatiquement
- 🔧 Pas de polling côté backend
- 🚀 Scalable

---

## Phase 1 : Foundry + Roll20 (4 semaines)

### Semaine 1-2 : Backend
- Migrations + Models VTT
- Controller webhooks
- Service traitement événements
- Tests

### Semaine 2 : Module Foundry
- Repo GitHub
- Code module (hooks, settings, webhook client)
- Release v1.0.0

### Semaine 3 : Script Roll20
- Script API Roll20
- Workaround HTTP
- Documentation MJ Pro

### Semaine 4 : Frontend + Overlay
- Pages création connexions
- Overlay critiques
- Tests E2E

---

## Prochaine Étape

Commencer l'implémentation Backend Phase 1 ?
