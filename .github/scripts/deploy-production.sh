#!/bin/bash

# Script pour faciliter le déploiement vers production
# Usage: ./.github/scripts/deploy-production.sh "v0.1.0" "Message de release"

set -e

echo "🚀 Déploiement vers PRODUCTION"
echo ""

# Vérifier qu'on est sur staging
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "staging" ]; then
    echo "❌ Erreur: Vous devez être sur la branche 'staging'"
    echo "Branche actuelle: $CURRENT_BRANCH"
    exit 1
fi

# Vérifier qu'il n'y a pas de changements non committés
if ! git diff-index --quiet HEAD --; then
    echo "❌ Erreur: Vous avez des changements non committés sur staging"
    exit 1
fi

# Pull les dernières modifications
echo "📥 Récupération des dernières modifications..."
git pull origin staging

# Demander la version
if [ -z "$1" ]; then
    read -p "Version (ex: v0.1.0): " VERSION
else
    VERSION="$1"
fi

# Demander les notes de release
if [ -z "$2" ]; then
    read -p "Notes de release (optionnel): " RELEASE_NOTES
else
    RELEASE_NOTES="$2"
fi

# Confirmation
echo ""
echo "⚠️  ATTENTION: Déploiement en PRODUCTION"
echo "Version: $VERSION"
echo "Notes: $RELEASE_NOTES"
echo ""
read -p "Continuer? (yes/no) " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "❌ Déploiement annulé"
    exit 1
fi

# Vérifier si gh CLI est installé
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) n'est pas installé."
    echo "📖 Créez la PR manuellement sur: https://github.com/The-Genium007/Tumulte/compare/main...staging"
    exit 1
fi

echo ""
echo "📝 Création de la Pull Request vers main..."

BODY="**🚀 Release ${VERSION}**

## Changements

${RELEASE_NOTES}

## CI/CD Production

Les vérifications suivantes seront exécutées (TOUTES BLOQUANTES) :
- ✅ Quality Checks
- ✅ Security Audit (npm audit)
- ✅ Unit Tests (Required)
- ✅ Functional Tests (Required)
- ✅ Build Production
- ⚠️ E2E Tests (Warning)

## Checklist pré-déploiement

- [ ] Tous les tests passent en local
- [ ] Documentation à jour
- [ ] Variables d'environnement production configurées sur Dokploy
- [ ] Backup de la base de données effectué
- [ ] Plan de rollback préparé

---
Créé automatiquement par deploy-production.sh"

gh pr create \
    --base main \
    --head staging \
    --title "🚀 Release ${VERSION}" \
    --body "$BODY"

echo ""
echo "✅ Pull Request créée avec succès!"
echo ""
echo "📋 Prochaines étapes:"
echo "  1. Attendre que tous les checks CI/CD passent"
echo "  2. Reviewer les changements"
echo "  3. Merger la PR sur GitHub"
echo "  4. Créer un GitHub Release avec le tag ${VERSION}"
echo "  5. Déployer sur Dokploy depuis la branche main"
echo ""
echo "🔗 Ouvrir: https://github.com/The-Genium007/Tumulte/pulls"
echo "🔗 Actions CI/CD: https://github.com/The-Genium007/Tumulte/actions"
