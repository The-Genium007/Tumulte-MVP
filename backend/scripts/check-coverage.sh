#!/bin/bash

# Script de vérification de coverage
# Usage: ./scripts/check-coverage.sh [threshold]

set -e

THRESHOLD=${1:-80}  # Défaut 80%
COVERAGE_FILE="coverage/lcov.info"

echo "🔍 Vérification du coverage (seuil: ${THRESHOLD}%)"

# Vérifier que le fichier coverage existe
if [ ! -f "$COVERAGE_FILE" ]; then
    echo "❌ Erreur: Fichier coverage non trouvé"
    echo "   Exécutez d'abord: npm run test:coverage"
    exit 1
fi

# Parser le coverage depuis lcov.info
# Format lcov: LF:lignes_trouvées, LH:lignes_couvertes
LINES_FOUND=$(grep -E "^LF:" "$COVERAGE_FILE" | awk -F: '{sum += $2} END {print sum}')
LINES_HIT=$(grep -E "^LH:" "$COVERAGE_FILE" | awk -F: '{sum += $2} END {print sum}')

if [ -z "$LINES_FOUND" ] || [ "$LINES_FOUND" -eq 0 ]; then
    echo "❌ Erreur: Impossible de parser le coverage"
    exit 1
fi

# Calculer pourcentage
COVERAGE=$(awk "BEGIN {printf \"%.2f\", ($LINES_HIT / $LINES_FOUND) * 100}")

echo ""
echo "📊 Résultats:"
echo "   Lignes totales:    $LINES_FOUND"
echo "   Lignes couvertes:  $LINES_HIT"
echo "   Coverage:          ${COVERAGE}%"
echo ""

# Comparer au seuil
if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
    echo "❌ Coverage INSUFFISANT (< ${THRESHOLD}%)"
    echo "   Différence: $(awk "BEGIN {printf \"%.2f\", $THRESHOLD - $COVERAGE}")%"
    exit 1
else
    echo "✅ Coverage OK (>= ${THRESHOLD}%)"
    DIFF=$(awk "BEGIN {printf \"%.2f\", $COVERAGE - $THRESHOLD}")
    echo "   Marge: +${DIFF}%"
    exit 0
fi
