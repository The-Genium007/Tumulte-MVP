#!/bin/bash
# Script to check if package-lock.json files are in sync with package.json
# Used by pre-commit hook and CI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
HAS_ERROR=0

check_lockfile() {
    local dir=$1
    local name=$2

    cd "$ROOT_DIR/$dir"

    # Generate what the lock file should look like
    npm install --package-lock-only --ignore-scripts 2>/dev/null

    # Check if there are differences
    if ! git diff --quiet package-lock.json 2>/dev/null; then
        echo "ERROR: $name/package-lock.json is out of sync with package.json"
        echo "  Run: cd $name && npm install"
        git checkout package-lock.json 2>/dev/null || true
        HAS_ERROR=1
    fi
}

echo "Checking lock file synchronization..."

check_lockfile "backend" "backend"
check_lockfile "frontend" "frontend"

if [ $HAS_ERROR -eq 1 ]; then
    echo ""
    echo "Lock files are out of sync!"
    echo "Run './scripts/sync-lockfiles.sh' to fix this."
    exit 1
fi

echo "All lock files are in sync."
exit 0
