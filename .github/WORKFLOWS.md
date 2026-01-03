# 🤖 CI/CD et Workflows GitHub

Ce dossier contient les configurations CI/CD et les scripts d'automatisation pour le projet Tumulte.

## 📁 Structure

```
.github/
├── workflows/
│   ├── staging-ci.yml        # CI/CD progressif pour staging
│   └── production-ci.yml     # CI/CD complet pour production
├── scripts/
│   ├── deploy-staging.sh     # Helper pour déployer vers staging
│   └── deploy-production.sh  # Helper pour déployer vers production
├── BRANCH_PROTECTION.md      # Guide de configuration GitHub
└── README.md                 # Ce fichier
```

## 🚀 Workflows CI/CD

### Staging CI/CD (`staging-ci.yml`)

**Déclenché sur** : Pull Request ou push vers `staging`

**Pipeline progressif** :
1. **Quality Checks** (~2 min)
   - TypeCheck backend + frontend
   - Lint backend + frontend
   - ✅ Bloquant

2. **Unit Tests** (~3 min)
   - Tests unitaires backend avec PostgreSQL + Redis
   - ✅ Bloquant

3. **Build** (~2 min)
   - Compilation backend (TypeScript)
   - Build frontend (Nuxt)
   - ✅ Bloquant

4. **Functional Tests** (~5 min)
   - Tests fonctionnels backend
   - ⚠️ Warning seulement (non-bloquant)

**Temps total** : ~12 minutes

### Production CI/CD (`production-ci.yml`)

**Déclenché sur** : Pull Request ou push vers `main`

**Pipeline complet** :
1. **Quality Checks** (~2 min) ✅ Bloquant
2. **Security Audit** (~1 min) ✅ Bloquant
3. **Unit Tests** (~3 min) ✅ Bloquant
4. **Functional Tests** (~5 min) ✅ Bloquant (différence avec staging!)
5. **Build Production** (~3 min) ✅ Bloquant
6. **E2E Tests** (~5 min) ⚠️ Warning seulement

**Temps total** : ~19 minutes

## 🛠️ Scripts Helper

### Déploiement vers Staging

```bash
# Depuis la branche developement
./.github/scripts/deploy-staging.sh
```

Ce script :
1. Vérifie que tu es sur `developement`
2. Vérifie les changements non committés
3. Te propose de créer une PR vers `staging`
4. Lance automatiquement les workflows CI/CD

### Déploiement vers Production

```bash
# Depuis la branche staging
./.github/scripts/deploy-production.sh "v0.1.0" "Notes de release"
```

Ce script :
1. Vérifie que tu es sur `staging`
2. Demande la version et les notes de release
3. Crée une PR vers `main`
4. Lance le CI/CD complet

## 📊 Badges de statut

Les badges CI/CD sont affichés dans le README principal :

```markdown
[![Staging CI](https://github.com/The-Genium007/Tumulte/actions/workflows/staging-ci.yml/badge.svg?branch=staging)](...)
[![Production CI](https://github.com/The-Genium007/Tumulte/actions/workflows/production-ci.yml/badge.svg?branch=main)](...)
```

## 🔧 Configuration requise

### Services GitHub Actions

Les workflows utilisent les services Docker suivants :
- **PostgreSQL 16** : Base de données pour les tests
- **Redis 7** : Cache pour les tests

### Secrets requis

Aucun secret GitHub n'est requis pour les tests (environnement de test mocké).

Pour le déploiement automatique vers Dokploy (futur), tu devras ajouter :
- `DOKPLOY_API_KEY`
- `DOKPLOY_URL`

## 📖 Documentation

- **Configuration complète** : Voir [`BRANCH_PROTECTION.md`](./BRANCH_PROTECTION.md)
- **Workflow GitFlow** : Voir le README principal
- **Tests backend** : Voir [`backend/tests/README.md`](../backend/tests/README.md)

## 🔍 Monitoring

### Voir les runs CI/CD

```bash
# Via GitHub CLI
gh run list --workflow=staging-ci.yml
gh run list --workflow=production-ci.yml

# Voir les détails d'un run
gh run view <run-id> --log
```

### URLs directes

- Staging CI : https://github.com/The-Genium007/Tumulte/actions/workflows/staging-ci.yml
- Production CI : https://github.com/The-Genium007/Tumulte/actions/workflows/production-ci.yml

## ⚡ Optimisations

Les workflows utilisent plusieurs optimisations :
- **Cache NPM** : Les dépendances sont mises en cache entre les runs
- **Jobs parallèles** : Quality checks + Security audit en parallèle
- **Services Docker** : PostgreSQL et Redis démarrés automatiquement
- **Artifacts** : Les builds et rapports de tests sont sauvegardés

## 🚨 En cas de problème

### Workflow échoue en staging

1. Consulter les logs : `gh run view <run-id> --log`
2. Reproduire localement :
   ```bash
   cd backend
   npm run typecheck  # Phase 1
   npm run lint       # Phase 1
   npm run test       # Phase 2
   ```
3. Corriger et re-push

### Workflow échoue en production

1. **NE PAS merger** tant que tous les checks ne sont pas verts
2. Consulter les logs détaillés
3. Si c'est un faux positif (rare), tu peux :
   - Désactiver temporairement la protection de branche
   - Merger
   - **Réactiver immédiatement la protection**

### Tests fonctionnels instables

Les tests fonctionnels peuvent être instables (timeouts, race conditions). C'est pourquoi ils sont en "warning" sur staging.

Pour débugger :
```bash
cd backend
NODE_ENV=test npm run test -- --filter=functional --bail
```

## 🎯 Prochaines étapes

- [ ] Ajouter le déploiement automatique vers Dokploy après merge sur `main`
- [ ] Configurer les tests E2E Playwright
- [ ] Ajouter des notifications Discord/Slack en cas d'échec
- [ ] Mettre en place des tests de performance
- [ ] Ajouter un workflow pour les releases automatiques avec changelog

## 💡 Conseils

- **Staging** : Utilise-le pour valider que tout compile et que les tests unitaires passent
- **Production** : Merge uniquement quand tu es sûr à 100% (tous les tests doivent être verts)
- **Developement** : Commit souvent, push régulièrement pour sauvegarder ton travail
- **Scripts helper** : Utilise-les pour éviter les erreurs de manipulation Git

## 📞 Support

Questions ou problèmes avec les workflows CI/CD ? Ouvre une issue avec le label `ci/cd`.
