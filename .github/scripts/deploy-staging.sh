#!/bin/bash

# Script pour faciliter le déploiement vers staging
# Usage: ./.github/scripts/deploy-staging.sh "Message de commit optionnel"

set -e

echo "🚀 Déploiement vers staging"
echo ""

# Vérifier qu'on est sur developement
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "developement" ]; then
    echo "❌ Erreur: Vous devez être sur la branche 'developement'"
    echo "Branche actuelle: $CURRENT_BRANCH"
    exit 1
fi

# Vérifier qu'il n'y a pas de changements non committés
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Vous avez des changements non committés."
    read -p "Voulez-vous les committer maintenant? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        if [ -z "$1" ]; then
            read -p "Message de commit: " COMMIT_MSG
        else
            COMMIT_MSG="$1"
        fi
        git commit -m "$COMMIT_MSG"
        git push origin developement
    else
        echo "❌ Déploiement annulé. Committez vos changements d'abord."
        exit 1
    fi
fi

# Pull les dernières modifications
echo "📥 Récupération des dernières modifications..."
git pull origin developement

# Proposer de créer une PR vers staging
echo ""
echo "✅ Branche developement à jour"
echo ""
echo "Options pour déployer vers staging:"
echo "  1. Créer une Pull Request (recommandé)"
echo "  2. Merger directement (sans PR)"
echo "  3. Annuler"
echo ""
read -p "Choisissez une option (1-3): " -n 1 -r
echo

case $REPLY in
    1)
        # Vérifier si gh CLI est installé
        if ! command -v gh &> /dev/null; then
            echo "❌ GitHub CLI (gh) n'est pas installé."
            echo "📖 Créez la PR manuellement sur: https://github.com/The-Genium007/Tumulte/compare/staging...developement"
            exit 1
        fi

        echo "📝 Création de la Pull Request vers staging..."
        gh pr create \
            --base staging \
            --head developement \
            --title "🚀 Deploy to staging - $(date +%Y-%m-%d)" \
            --body "**Déploiement automatique vers staging**

## Changements

<!-- Décrivez les changements importants ici -->

## Tests

- [ ] Tests unitaires passent
- [ ] Tests fonctionnels passent
- [ ] Build réussit

## CI/CD

Les vérifications suivantes seront exécutées automatiquement :
- ✅ Quality Checks (TypeCheck + Lint)
- ✅ Unit Tests
- ✅ Build
- ⚠️ Functional Tests (warning)

---
Créé automatiquement par deploy-staging.sh"

        echo ""
        echo "✅ Pull Request créée avec succès!"
        echo "🔗 Ouvrir: https://github.com/The-Genium007/Tumulte/pulls"
        ;;
    2)
        echo "⚠️  Merge direct vers staging (sans PR)..."
        read -p "Êtes-vous sûr? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout staging
            git pull origin staging
            git merge developement
            git push origin staging
            git checkout developement
            echo "✅ Merge effectué vers staging"
            echo "🔗 Voir les actions CI/CD: https://github.com/The-Genium007/Tumulte/actions"
        else
            echo "❌ Merge annulé"
            exit 1
        fi
        ;;
    *)
        echo "❌ Déploiement annulé"
        exit 1
        ;;
esac

echo ""
echo "🎉 Terminé!"
