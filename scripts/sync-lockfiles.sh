#!/bin/bash
# Script to synchronize package-lock.json files with package.json
# Run this whenever you modify dependencies in package.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Synchronizing package-lock.json files..."

# Backend
echo "  Backend..."
cd "$ROOT_DIR/backend"
npm install --package-lock-only
echo "    Done"

# Frontend
echo "  Frontend..."
cd "$ROOT_DIR/frontend"
npm install --package-lock-only
echo "    Done"

echo ""
echo "Lock files synchronized successfully!"
echo "Don't forget to commit the updated package-lock.json files."
