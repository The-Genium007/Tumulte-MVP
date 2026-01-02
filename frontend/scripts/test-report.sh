#!/bin/bash

# Script de génération de rapport de tests complet
# Usage: ./scripts/test-report.sh

set -e

echo "🧪 Tumulte Frontend - Rapport de Tests Complet"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Unit & Component Tests avec Coverage
echo -e "${BLUE}📊 Exécution des tests unitaires et composants avec coverage...${NC}"
npm run test:coverage

echo ""
echo -e "${GREEN}✅ Tests unitaires et composants terminés${NC}"
echo ""

# 2. E2E Tests avec Playwright
echo -e "${BLUE}🎭 Exécution des tests E2E avec Playwright...${NC}"
npm run test:e2e

echo ""
echo -e "${GREEN}✅ Tests E2E terminés${NC}"
echo ""

# 3. Résumé
echo "=============================================="
echo -e "${YELLOW}📋 Résumé des Tests${NC}"
echo "=============================================="
echo ""

# Compter les fichiers de test
UNIT_TESTS=$(find tests/unit -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
COMPONENT_TESTS=$(find tests/component -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
E2E_TESTS=$(find tests/e2e -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
TOTAL_FILES=$((UNIT_TESTS + COMPONENT_TESTS + E2E_TESTS))

echo "📁 Fichiers de test:"
echo "   - Tests unitaires:  $UNIT_TESTS fichiers"
echo "   - Tests composants: $COMPONENT_TESTS fichiers"
echo "   - Tests E2E:        $E2E_TESTS fichiers"
echo "   - Total:            $TOTAL_FILES fichiers"
echo ""

# Afficher les liens vers les rapports
echo "📊 Rapports générés:"
echo "   - Coverage HTML:    coverage/index.html"
echo "   - Playwright HTML:  playwright-report/index.html"
echo ""

echo -e "${GREEN}✅ Tous les tests sont terminés avec succès!${NC}"
echo ""
echo "Pour visualiser les rapports:"
echo "  - Coverage:  npx vite preview --outDir coverage"
echo "  - Playwright: npx playwright show-report"
