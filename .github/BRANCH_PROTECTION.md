# 🔒 Configuration de la Protection des Branches

Ce guide explique comment configurer la protection des branches sur GitHub pour automatiser les workflows CI/CD.

## 📋 Stratégie de branches

```
developement (dev quotidien)
    ↓ merge via PR
staging (pré-production avec CI/CD progressif)
    ↓ merge via PR
main (production avec CI/CD complet)
```

## ⚙️ Configuration GitHub

### 1. Créer les branches

Si elles n'existent pas déjà :

```bash
# Créer la branche staging
git checkout -b staging
git push -u origin staging

# Créer la branche main
git checkout -b main
git push -u origin main
```

### 2. Configuration de la branche `staging`

1. Aller sur GitHub : `https://github.com/The-Genium007/Tumulte/settings/branches`
2. Cliquer sur **Add branch protection rule**
3. Branch name pattern : `staging`
4. Cocher les options suivantes :

**Protection de base :**
- ✅ **Require a pull request before merging**
  - Require approvals : `0` (ou `1` si tu veux t'auto-approuver)
  - ✅ Dismiss stale pull request approvals when new commits are pushed

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Status checks requis :
    - `Quality Checks (TypeCheck + Lint)`
    - `Unit Tests`
    - `Build Backend & Frontend`
    - ⚠️ `Functional Tests (Warning Only)` → **NE PAS COCHER** (optionnel)

- ✅ **Require conversation resolution before merging**

- ❌ **Require signed commits** (optionnel)

- ❌ **Include administrators** (tu peux bypass si besoin)

5. Cliquer sur **Create**

### 3. Configuration de la branche `main` (Production)

1. Même processus, Branch name pattern : `main`
2. Configuration **PLUS STRICTE** :

**Protection renforcée :**
- ✅ **Require a pull request before merging**
  - Require approvals : `1` (tu dois t'auto-approuver ou avoir un reviewer)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Status checks requis (TOUS BLOQUANTS) :
    - `Quality Checks`
    - `Security Audit`
    - `Unit Tests (Required)`
    - `Functional Tests (Required)`
    - `Build Production`

- ✅ **Require conversation resolution before merging**

- ✅ **Require linear history** (optionnel, force le rebase)

- ✅ **Include administrators** (même toi tu ne peux pas bypass)

- ✅ **Restrict who can push to matching branches** (optionnel)
  - Ajouter ton compte uniquement

3. Cliquer sur **Create**

### 4. Configuration de la branche `developement`

**Aucune protection** - Liberté totale pour le développement quotidien.

Optionnel : Tu peux activer uniquement :
- ✅ **Require conversation resolution before merging** (si tu fais des PR pour organiser ton travail)

## 🚀 Workflow de travail

### Développement quotidien → Staging

```bash
# 1. Travailler sur developement
git checkout developement
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin developement

# 2. Créer une Pull Request sur GitHub
# developement → staging

# 3. GitHub Actions exécute automatiquement :
#    ✅ Type-check + Lint
#    ✅ Tests unitaires
#    ✅ Build
#    ⚠️ Tests fonctionnels (warning)

# 4. Si tout est vert, merge la PR sur GitHub
```

### Staging → Production

```bash
# 1. Créer une Pull Request sur GitHub
# staging → main

# 2. GitHub Actions exécute automatiquement (CI/CD COMPLET) :
#    ✅ Type-check + Lint
#    ✅ Security Audit
#    ✅ Tests unitaires (BLOQUANT)
#    ✅ Tests fonctionnels (BLOQUANT)
#    ✅ Build production
#    ⚠️ Tests E2E (warning pour l'instant)

# 3. Si TOUT est vert, merge la PR sur GitHub
# 4. Déployer depuis main vers Dokploy
```

## 🎯 Commandes utiles

### Mettre à jour staging depuis developement

```bash
git checkout staging
git pull origin staging
git merge developement
git push origin staging
```

### Créer une Pull Request en CLI (avec GitHub CLI)

```bash
# Installer gh CLI : https://cli.github.com/

# Créer une PR developement → staging
gh pr create --base staging --head developement --title "Deploy to staging" --body "Déploiement des dernières modifications"

# Créer une PR staging → main
gh pr create --base main --head staging --title "Deploy to production v0.1.0" --body "Release v0.1.0 - Production deployment"
```

## 📊 Monitoring des CI/CD

### Voir les runs GitHub Actions

```bash
# Via GitHub CLI
gh run list --branch staging
gh run list --branch main

# Voir les détails d'un run
gh run view <run-id>

# Voir les logs
gh run view <run-id> --log
```

### URL directe

- Staging CI : `https://github.com/The-Genium007/Tumulte/actions/workflows/staging-ci.yml`
- Production CI : `https://github.com/The-Genium007/Tumulte/actions/workflows/production-ci.yml`

## ⚠️ En cas de problème

### Bypass temporaire (urgence uniquement)

Si tu dois absolument merger sans passer les checks :

1. Aller dans Settings → Branches
2. Modifier temporairement la règle
3. Décocher "Require status checks to pass"
4. Merger
5. **RÉACTIVER IMMÉDIATEMENT LA PROTECTION**

### Débugger un test qui échoue

```bash
# Reproduire localement les conditions CI
cd backend

# Avec les mêmes variables d'environnement que CI
NODE_ENV=test \
DB_HOST=localhost \
DB_PORT=5432 \
DB_USER=postgres \
DB_PASSWORD=postgres \
DB_DATABASE=twitch_polls_test \
REDIS_HOST=localhost \
REDIS_PORT=6379 \
SESSION_DRIVER=memory \
APP_KEY=test_key_32_characters_long_1234 \
npm run test
```

## 🔄 Mise à jour des workflows

Les workflows sont dans `.github/workflows/` :
- `staging-ci.yml` : CI/CD progressif pour staging
- `production-ci.yml` : CI/CD complet pour production

Pour modifier :
1. Éditer le fichier YAML
2. Commit sur `developement`
3. Le workflow sera mis à jour au prochain merge

## 📝 Checklist avant le premier merge

- [ ] Branches `staging` et `main` créées sur GitHub
- [ ] Protection configurée pour `staging` (CI progressif)
- [ ] Protection configurée pour `main` (CI complet)
- [ ] Tests unitaires backend fonctionnels localement
- [ ] Tests fonctionnels backend fonctionnels localement
- [ ] Build frontend réussit localement
- [ ] Variables d'environnement de test configurées (voir `.env.example`)
- [ ] PostgreSQL 16 et Redis 7 disponibles pour les tests locaux

## 🎓 Ressources

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
