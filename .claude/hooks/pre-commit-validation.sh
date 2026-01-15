#!/usr/bin/env bash
# Hook: PreToolUse - Validation obligatoire avant commit
# Détecte automatiquement si backend ou frontend est modifié et lance les tests appropriés

set -e

# Récupération des arguments du hook
TOOL_NAME="$1"
PROMPT="$2"

# Ne s'active que pour les commits
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

# Détection du mot "commit" dans le prompt (insensible à la casse)
if ! echo "$PROMPT" | grep -qi "commit"; then
  exit 0
fi

echo "🔍 Détection d'un commit - Validation automatique activée..."
echo ""

# Détection des fichiers modifiés
BACKEND_MODIFIED=false
FRONTEND_MODIFIED=false

# Vérifier les fichiers staged et unstaged
if git diff --name-only HEAD 2>/dev/null | grep -q "^backend/"; then
  BACKEND_MODIFIED=true
fi

if git diff --name-only HEAD 2>/dev/null | grep -q "^frontend/"; then
  FRONTEND_MODIFIED=true
fi

# Si aucun fichier modifié détecté, vérifier les fichiers non trackés
if [[ "$BACKEND_MODIFIED" == "false" ]] && [[ "$FRONTEND_MODIFIED" == "false" ]]; then
  if git status --porcelain 2>/dev/null | grep -q "backend/"; then
    BACKEND_MODIFIED=true
  fi
  if git status --porcelain 2>/dev/null | grep -q "frontend/"; then
    FRONTEND_MODIFIED=true
  fi
fi

EXIT_CODE=0

# Tests Backend
if [[ "$BACKEND_MODIFIED" == "true" ]]; then
  echo "📦 Backend modifié - Lancement des validations..."
  echo ""

  cd backend

  echo "  → Lint..."
  if ! npm run lint; then
    echo "❌ Lint backend échoué"
    EXIT_CODE=1
  fi

  echo ""
  echo "  → Typecheck..."
  if ! npm run typecheck; then
    echo "❌ Typecheck backend échoué"
    EXIT_CODE=1
  fi

  cd ..
  echo ""
fi

# Tests Frontend
if [[ "$FRONTEND_MODIFIED" == "true" ]]; then
  echo "🎨 Frontend modifié - Lancement des validations..."
  echo ""

  cd frontend

  echo "  → Lint..."
  if ! npm run lint; then
    echo "❌ Lint frontend échoué"
    EXIT_CODE=1
  fi

  echo ""
  echo "  → Typecheck..."
  if ! npm run typecheck; then
    echo "❌ Typecheck frontend échoué"
    EXIT_CODE=1
  fi

  cd ..
  echo ""
fi

# Résultat final
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✅ Toutes les validations sont passées - Commit autorisé"
  exit 0
else
  echo ""
  echo "❌ COMMIT BLOQUÉ - Corrigez les erreurs ci-dessus avant de committer"
  exit 1
fi
